import _ from 'lodash/fp.js'
import { set } from 'lodash'
import { map, Node, walkie } from 'obj-walker'
import { JSONSchema } from 'mongochangestream'
import { ConvertOptions, Override } from './types.js'

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

const expandedTextType = {
  type: 'text',
  fields: {
    keyword: {
      type: 'keyword',
      ignore_above: 256,
    },
  },
}

const getElasticType = (obj: Record<string, any>) => {
  if (obj.bsonType === 'object' && obj?.additionalProperties !== false) {
    return 'flattened'
  }
  const elasticType = bsonTypeToElastic[obj.bsonType]
  return elasticType === 'text' ? expandedTextType : elasticType
}

const convertSchemaNode = (jsonSchema: JSONSchema) => {
  const elasticType = getElasticType(jsonSchema)
  return {
    ..._.pick(['properties'], jsonSchema),
    ...(elasticType && { type: elasticType }),
  }
}

export const convertSchema = (
  jsonSchema: JSONSchema,
  options: ConvertOptions = {}
) => {
  const mapper = (node: Node) => {
    const { key, val, parents } = node
    // Ignore top-level _id field
    if (key === '_id' && parents.length === 2) {
      return
    }
    if (val?.bsonType) {
      // Unwrap arrays since ES doesn't support explicit array fields
      if (val.bsonType === 'array') {
        return convertSchemaNode(val.items)
      }
      return convertSchemaNode(val)
    }
    return val
  }
  // Recursively convert the schema
  const mappings = map(jsonSchema, mapper)

  if (options.overrides) {
    const overrides = options.overrides
    const walkFn = (node: Node) => {
      const overrideMatch = overrides.find(({ path }) =>
        _.isEqual(node.path, _.toPath(path))
      )
      if (overrideMatch) {
        set(node.val, 'type', bsonTypeToElastic[overrideMatch.bsonType])
      }
    }
    const obj = walkie(mappings, walkFn, { traverse: (x) => x?.properties })
    return { mappings: obj }
  }
  return { mappings }
}
