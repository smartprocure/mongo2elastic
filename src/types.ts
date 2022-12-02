import type { Document } from 'mongodb'

export interface SyncOptions {
  mapper?: (doc: Document) => Document
  index?: string
}

export type Events = 'process' | 'error'

export interface Override {
  path: string
  bsonType: string
}

export interface ConvertOptions {
  overrides?: Override[]
}
