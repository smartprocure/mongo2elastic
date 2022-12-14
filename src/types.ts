import type { Document } from 'mongodb'

export interface SyncOptions {
  mapper?: (doc: Document) => Document
  index?: string
}

export interface Override {
  path: string
  bsonType: string
}

export interface ConvertOptions {
  omit?: string[]
  overrides?: Override[]
  passthrough?: string[]
}

export type Events = 'process' | 'error'
