import type { Document } from 'mongodb'
import { JSONSchema } from 'mongochangestream'

export interface SyncOptions {
  mapper?: (doc: Document) => Document
  index?: string
}

export interface Override extends Record<string, any> {
  path: string
  mapper?: (obj: JSONSchema, path: string) => JSONSchema
}

export interface ConvertOptions {
  omit?: string[]
  overrides?: Override[]
  passthrough?: string[]
}

export type Events = 'process' | 'error'
