import type { Collection } from 'mongodb'

export const indexFromCollection = (collection: Collection) =>
  collection.collectionName.toLowerCase()

export const indexFromDbAndCollection = (collection: Collection) =>
  `${collection.dbName.toLowerCase()}_${collection.collectionName.toLowerCase()}`

/**
 * Does arr start with startsWith array.
 */
export const arrayStartsWith = (arr: any[], startsWith: any[]) => {
  for (let i = 0; i < startsWith.length; i++) {
    if (arr[i] !== startsWith[i]) {
      return false
    }
  }
  return true
}
