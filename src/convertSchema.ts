import _ from 'lodash/fp.js'
import { map, Node } from 'obj-walker'
import { estypes } from '@elastic/elasticsearch'

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

const convertSchemaNode = (obj: Record<string, any>) => {
  if (obj.bsonType === 'object') {
    if (obj?.additionalProperties !== false) {
      return { type: 'flattened' }
    }
    return _.pick(['properties'], obj)
  }
  const elasticType = bsonTypeToElastic[obj.bsonType]
  if (elasticType === 'text') {
    return expandedTextType
  }
  if (elasticType) {
    return { type: elasticType }
  }
}

export const convertSchema = (jsonSchema: object) => {
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
  return map(jsonSchema, mapper) as Record<string, estypes.MappingProperty>
}
