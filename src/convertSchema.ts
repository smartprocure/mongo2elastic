import _ from 'lodash/fp.js'
import { map, Node, walker } from 'obj-walker'
import { estypes } from '@elastic/elasticsearch'
import { ConvertOptions } from './types.js'
import { minimatch } from 'minimatch'
import makeError from 'make-error'
import { JSONSchema, traverseSchema } from 'mongochangestream'
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

const convertSchemaNode = (obj: JSONSchema, options: ConvertOptions) => {
  const field = options.passthrough ? _.pick(options.passthrough, obj) : {}
  if (obj.bsonType === 'object') {
    // Use flattened type since object can have arbitrary keys
    if (obj?.additionalProperties !== false) {
      return { type: 'flattened', ...field }
    }
    return _.pick(['properties'], obj)
  }
  // String enum -> keyword
  if (obj.bsonType === 'string' && obj.enum) {
    return { type: 'keyword', ...field }
  }

  const elasticType = bsonTypeToElastic[obj.bsonType]
  // Add keyword sub-field to text type automatically
  if (elasticType === 'text') {
    return {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256,
        },
      },
      ...field,
    }
  }
  if (elasticType) {
    return { type: elasticType, ...field }
  }
}

const cleanupPath = _.pullAll(['properties', 'items'])

/**
 * Convert MongoDB JSON schema to Elasticsearch mapping.
 * Optionally, omit fields and change the BSON type for fields.
 * The latter is useful where a more-specific numeric type is needed.
 */
export const convertSchema = (
  jsonSchema: JSONSchema,
  options: ConvertOptions = {}
) => {
  // Handle options
  const omit = options.omit ? options.omit.map(_.toPath) : []
  const overrides = options.overrides || []

  const omitNodes = (node: Node) => {
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

  const overrideNodes = (node: Node) => {
    let { val } = node
    const { path } = node
    if (val?.bsonType) {
      const cleanPath = cleanupPath(path)
      const stringPath = cleanPath.join('.')
      // Optionally override field
      const overrideMatch = overrides.find(({ path }) =>
        minimatch(stringPath, path)
      )
      if (overrideMatch) {
        const mapper = overrideMatch.mapper
        // check if array of primatives
        if (
          val.bsonType === 'array' &&
          !['object', 'array'].includes(val.items.bsonType)
        ) {
          val.items = {
            ...(mapper ? mapper(val.items, stringPath) : val.items),
            ...overrideMatch,
          }
        } else {
          val = {
            ...(mapper ? mapper(val, stringPath) : val),
            ...overrideMatch,
          }
        }
      }
      // Handles arrays
      if (val.bsonType === 'array') {
        // Unwrap arrays since ES doesn't support explicit array fields
        return convertSchemaNode(val.items, options)
      }
      return convertSchemaNode(val, options)
    }
    return val
  }

  // Recursively convert the schema
  const schema = map(jsonSchema, omitNodes) as JSONSchema
  handleRename(schema, { _id: '_mongoId', ...options.rename })
  return map(schema, overrideNodes) as estypes.MappingPropertyBase
}
