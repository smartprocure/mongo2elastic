import type { JSONSchema } from 'mongochangestream'
import type { ChangeStreamDocument } from 'mongodb'
import { type Mapper } from 'obj-walker'

interface RenameOption {
  /** Dotted path to renamed dotted path */
  rename?: Record<string, string>
}

export interface SyncOptions extends RenameOption {
  index?: string
}

export interface Override extends Record<string, any> {
  path: string
  mapper?: (obj: JSONSchema, path: string) => JSONSchema
  /** Convert an array of objects to a nested type */
  nested?: boolean
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
  /**
   * Fields to pass through to the mapping (if they are present)
   * Automatically includes `type`, `fields`, and `copy_to`
   */
  passthrough?: string[]
}

export type Events = 'process'

export type OperationCounts = Partial<
  Record<ChangeStreamDocument['operationType'], number>
>
interface BaseProcessEvent {
  type: 'process'
  success: number
  fail?: number
  errors?: unknown[]
  operationCounts: OperationCounts
}

export interface InitialScanProcessEvent extends BaseProcessEvent {
  initialScan: true
}

export interface ChangeStreamProcessEvent extends BaseProcessEvent {
  changeStream: true
}

export type ProcessEvent = InitialScanProcessEvent | ChangeStreamProcessEvent
