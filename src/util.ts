import { Collection } from 'mongodb'

export const indexFromCollection = (collection: Collection) =>
  collection.collectionName.toLowerCase()

export const indexFromDbAndCollection = (collection: Collection) =>
  `${collection.dbName.toLowerCase()}_${collection.collectionName.toLowerCase()}`
