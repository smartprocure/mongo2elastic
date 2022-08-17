import { Collection } from 'mongodb'

export const indexFromCollection = (collection: Collection) =>
  `${collection.dbName.toLowerCase()}_${collection.collectionName.toLowerCase()}`
