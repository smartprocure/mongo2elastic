import { Document } from 'mongodb'
import _ from 'lodash/fp.js'
import { Collection } from 'mongodb'

export const indexFromCollection = (collection: Collection) =>
  collection.collectionName.toLowerCase()

export const indexFromDbAndCollection = (collection: Collection) =>
  `${collection.dbName.toLowerCase()}_${collection.collectionName.toLowerCase()}`

export const renameKey = (doc: Document, key: string, newKey: string) =>
  _.flow(_.set(newKey, _.get(key, doc)), _.omit([key]))(doc)

export const renameKeys = (doc: Document, keys: Record<string, string>) => {
  let newDoc = doc
  for (const key in keys) {
    if (_.has(key, doc)) {
      const newKey = keys[key]
      newDoc = renameKey(newDoc, key, newKey)
    }
  }
  return newDoc
}
