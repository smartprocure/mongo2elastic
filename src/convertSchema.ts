import { estypes } from '@elastic/elasticsearch'
import _ from 'lodash/fp.js'
import makeError from 'make-error'
import { minimatch } from 'minimatch'
import { type JSONSchema, traverseSchema } from 'mongochangestream'
import { map, type Node, walker } from 'obj-walker'

import { ConvertOptions, Override } from './types.js'
import { arrayStartsWith } from './util.js'

export const Mongo2ElasticError = makeError('Mongo2ElasticError')

const bsonTypeToElastic: Record<string, string> = {
  number: 'long',
  double: 'double',
  int: 'integer',
  long: 'long',
  decimal: 'double',
  objectId: 'keyword',
  string: 'text',
  date: 'date',
  timestamp: 'date',
  bool: 'boolean',
}

const defaultPassthroughFields = ['type', 'fields', 'copy_to']

const convertSchemaNode = (obj: JSONSchema, passthrough: object) => {
  if (obj.bsonType === 'object') {
    // Use flattened type since object can have arbitrary keys
    if (obj?.additionalProperties !== false) {
      return { type: 'flattened', ...passthrough }
    }
    return _.pick(['properties'], obj)
  }
  // String enum -> keyword
  if (obj.bsonType === 'string' && obj.enum) {
    return { type: 'keyword', ...passthrough }
  }

  const elasticType = bsonTypeToElastic[obj.bsonType]
  // Add keyword sub-field to text type automatically
  if (elasticType === 'text') {
    return _.merge(
      {
        type: 'text',
        fields: {
          keyword: {
            type: 'keyword',
            ignore_above: 256,
          },
        },
      },
      passthrough
    )
  }
  if (elasticType) {
    return { type: elasticType, ...passthrough }
  }
  return passthrough
}

const cleanupPath = _.pullAll(['properties', 'items'])

/**
 * Omits fields from the schema and defaults to first type if multi-valued
 */
const preprocess = (omit: string[][]) => (node: Node) => {
  const { val, path } = node
  if (val?.bsonType) {
    const cleanPath = cleanupPath(path)
    // Optionally omit field
    if (omit.find(_.isEqual(cleanPath))) {
      return
    }
    // Use the first type if multi-valued
    if (Array.isArray(val.bsonType)) {
      val.bsonType = val.bsonType[0]
    }
  }
  return val
}

/**
 * Renames fields in the schema
 * @throws Mongo2ElasticError if the rename is invalid
 */
const handleRename = (schema: JSONSchema, rename: Record<string, string>) => {
  for (const dottedPath in rename) {
    const oldPath = dottedPath.split('.')
    const newPath = rename[dottedPath].split('.')
    // Only allow renames such that nodes still keep the same parent
    if (!arrayStartsWith(oldPath, newPath.slice(0, -1))) {
      throw new Mongo2ElasticError(
        `Rename path prefix does not match: ${dottedPath}`
      )
    }
  }

  // Walk every subschema, renaming properties
  walker(
    schema,
    ({ val: { bsonType, properties }, path }) => {
      // Only objects can have their properties renamed
      if (bsonType !== 'object' || !properties) {
        return
      }
      const cleanPath = _.pull('_items', path)

      for (const key in properties) {
        const childPath = [...cleanPath, key].join('.')

        // Property name to which property `key` should be renamed to
        const newProperty = _.last(rename[childPath]?.split('.')) as
          | string
          | undefined

        // Make sure we don't overwrite existing properties
        if (newProperty !== undefined && newProperty in properties) {
          throw new Mongo2ElasticError(
            `Renaming ${childPath} to ${rename[childPath]} will overwrite property "${newProperty}"`
          )
        }

        // Actually rename property
        if (newProperty) {
          const child = properties[key]
          delete properties[key]
          properties[newProperty] = child
        }
      }
    },
    { traverse: traverseSchema }
  )
}

/**
 * Applies overrides and converts the schema node to an Elasticsearch mapping
 */
const overrideAndConvert =
  (overrides: Override[], passthroughFields: string[]) => (node: Node) => {
    let { val } = node
    const { path } = node
    if (val?.bsonType) {
      const cleanPath = cleanupPath(path)
      const stringPath = cleanPath.join('.')

      // Apply all overrides that matches the node's path. If there are multiple
      // (e.g. `*` and `foo.*` both match the path `foo.bar`), they are applied
      // in sequence, such that the output of each override is passed as input
      // to the next.
      val = overrides.reduce((obj, override) => {
        const { path, mapper } = override

        return minimatch(stringPath, path)
          ? {
              ...(mapper ? mapper(obj, stringPath) : obj),
              ...override,
            }
          : obj
      }, val)

      const passthrough = _.pick(
        [...passthroughFields, ...defaultPassthroughFields],
        val
      )
      // Handle arrays
      if (val.bsonType === 'array') {
        // Convert items
        const items = convertSchemaNode(val.items, passthrough)
        // Handle arrays of objects (nested)
        if (val.nested && val.items?.bsonType === 'object') {
          return { type: 'nested', ...items }
        }
        // Flatten arrays since ES doesn't have an explicit array type
        return items
      }
      return convertSchemaNode(val, passthrough)
    }
    return val
  }

/**
 * Convert MongoDB JSON schema to Elasticsearch mapping.
 *
 * There are options that allow you to preprocess nodes, omit fields, rename
 * fields, and change the BSON type for fields (e.g. when a more specific
 * numeric type is needed).
 * @see {@link ConvertOptions} for details.
 */
export const convertSchema = (
  jsonSchema: JSONSchema,
  options: ConvertOptions = {}
) => {
  // Handle options
  const { mapSchema } = options
  const omit = options.omit ? options.omit.map(_.toPath) : []
  const overrides = options.overrides || []
  const passthroughFields = options.passthrough || []

  // Map over the schema (low-level)
  if (mapSchema) {
    jsonSchema = map(jsonSchema, mapSchema)
  }
  // Preprocess the schema
  const schema = map(jsonSchema, preprocess(omit)) as JSONSchema
  // Rename fields
  handleRename(schema, { _id: '_mongoId', ...options.rename })
  // Apply overrides and convert to ES mapping
  const mapping = map(schema, overrideAndConvert(overrides, passthroughFields))
  return mapping as estypes.MappingPropertyBase
}

/**
 * Helper function to manually set the Elasticsearch type for a given path.
 * Only applicable for scalar types.
 * @example
 * setESType('latlong', 'geo_point')
 */
export const setESType = (path: string, type: string) => ({
  path,
  mapper: ({ bsonType, ...rest }: JSONSchema) => ({ ...rest, type }),
})

/**
 * Generate an override for all fields that match the provided `path` pattern
 * and (optional) `condition`, adding the provided `groupField` to the
 * `copy_to` array. Ensures that any existing `copy_to` values are preserved.
 *
 * @param path - the path pattern to match
 * @param groupField - the group field(s) to add to this mapping's `copy_to` array
 * @param [predicate] - an optional function that must return true in order for
 * the override to be applicable to this mapping
 */
export const copyTo = (
  path: string,
  groupField: string | string[],
  predicate?: (obj: JSONSchema) => boolean
) => ({
  path,
  mapper: (obj: JSONSchema) => {
    if (predicate && !predicate(obj)) {
      return obj
    }
    // Ensure this value is an array
    const existingGroupFields: string[] = obj.copy_to
      ? _.castArray(obj.copy_to)
      : []
    const newGroupFields = _.castArray(groupField)

    return { ...obj, copy_to: [...existingGroupFields, ...newGroupFields] }
  },
})

/**
 * Helper function to determine if a field is stringlike.
 * @returns true if the field is a string or an array of strings
 */
export const isStringlike = (obj: JSONSchema) =>
  obj.bsonType === 'string' || obj.items?.bsonType === 'string'
