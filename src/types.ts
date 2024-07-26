import type { JSONSchema } from 'mongochangestream'
import type { Document } from 'mongodb'

interface RenameOption {
  /** Dotted path to renamed dotted path */
  rename?: Record<string, string>
}

export interface SyncOptions extends RenameOption {
  mapper?: (doc: Document) => Document
  index?: string
}

export interface Override extends Record<string, any> {
  path: string
  mapper?: (obj: JSONSchema, path: string) => JSONSchema
}

export interface ConvertOptions extends RenameOption {
  omit?: string[]
  overrides?: Override[]
  passthrough?: string[]
}

export type Events = 'process' | 'error'
