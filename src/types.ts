import type { JSONSchema } from 'mongochangestream'
import type { Document } from 'mongodb'
import { type Mapper } from 'obj-walker'

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
  /**
   * An obj-walker Mapper function that can be used as an "escape hatch" to
   * preprocess each node in the object (using `map`) before using `walk` to
   * convert the object into the output Elastic mapping.
   *
   * This can be useful in situations where you want to replace or remove a
   * non-leaf node.
   *
   * @example
   * ```typescript
   * const mapSchema = ({ path, val }) => {
   *   if (_.isEqual(path, ['properties', 'addresses', 'items'])) {
   *     // This should result in removing all other properties (e.g.
   *     // `properties`, `additionalProperties`) besides `bsonType`.
   *     return { bsonType: 'object' }
   *   }
   *
   *   return val
   * }
   * ```
   */
  mapSchema?: Mapper
  omit?: string[]
  overrides?: Override[]
  passthrough?: string[]
}

export type Events = 'process' | 'error'
