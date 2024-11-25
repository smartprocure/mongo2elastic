import type { Collection, Document } from 'mongodb'

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

export const renameKey = (doc: Document, key: string, newKey: string) => {
  const temp = doc[key]
  delete doc[key]
  doc[newKey] = temp
}

/**
 * Rename keys, mutating the given object.
 */
export const renameKeys = (doc: Document, keys: Record<string, string>) => {
  for (const key in keys) {
    if (key in doc) {
      const newKey = keys[key]
      renameKey(doc, key, newKey)
    }
  }
}
