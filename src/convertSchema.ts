import _ from 'lodash/fp.js'
import { map, Node } from 'obj-walker'
import { estypes } from '@elastic/elasticsearch'
import { ConvertOptions } from './types.js'

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

const convertSchemaNode = (
  obj: Record<string, any>,
  options: ConvertOptions
) => {
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
  jsonSchema: object,
  options: ConvertOptions = {}
) => {
  // Handle options
  const omit = options.omit ? options.omit.map(_.toPath) : []
  const overrides = options.overrides
    ? options.overrides.map((x) => ({ ...x, path: _.toPath(x.path) }))
    : []

  const mapper = (node: Node) => {
    const { key, val, parents, path } = node
    if (val?.bsonType) {
      const cleanPath = cleanupPath(path)
      // Optionally omit field
      if (omit.find(_.isEqual(cleanPath))) {
        return
      }
      // Ignore top-level _id field
      if (key === '_id' && parents.length === 2) {
        return
      }
      // Use the first type if multi-valued
      if (Array.isArray(val.bsonType)) {
        val.bsonType = val.bsonType[0]
      }
      // Optionally override bsonType
      const override = overrides.find(({ path }) => _.isEqual(cleanPath, path))
      if (override) {
        val.bsonType = override.bsonType
      }
      if (val.bsonType === 'array') {
        // Unwrap arrays since ES doesn't support explicit array fields
        return convertSchemaNode(val.items, options)
      }
      return convertSchemaNode(val, options)
    }
    return val
  }
  // Recursively convert the schema
  return map(jsonSchema, mapper) as Record<string, estypes.MappingProperty>
}
