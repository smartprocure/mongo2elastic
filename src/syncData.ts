import elasticsearch from '@elastic/elasticsearch'
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey.js'
import _debug from 'debug'
import type { Redis } from 'ioredis'
import _ from 'lodash/fp.js'
import { type ChangeStreamOptions, type ScanOptions } from 'mongochangestream'
import * as mongoChangeStream from 'mongochangestream'
import { renameKeys } from 'mongochangestream'
import type {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
  Document,
} from 'mongodb'
import { compact } from 'obj-walker'
import type { QueueOptions } from 'prom-utils'

import { convertSchema } from './convertSchema.js'
import type {
  ConvertOptions,
  Events,
  OperationCounts,
  ProcessEvent,
  SyncOptions,
} from './types.js'
import { indexFromCollection } from './util.js'

/**
 * Filter errors from a bulk response
 */
const getBulkErrors = (response: BulkResponse) =>
  response.items.filter(
    (item) =>
      item.create?.error ||
      item.delete?.error ||
      item.index?.error ||
      item.update?.error
  )

const debug = _debug('mongo2elastic:sync')

interface Metadata {
  operationCounts: OperationCounts
  numDocs: number
  changeStream?: true
}

export const initSync = (
  redis: Redis,
  collection: Collection,
  elastic: elasticsearch.Client,
  options: SyncOptions & mongoChangeStream.SyncOptions = {}
) => {
  const mapper = (doc: Document) => {
    renameKeys(doc, { _id: '_mongoId', ...options.rename })
    debug('Mapped doc %o', doc)
    return doc
  }
  const index = options.index || indexFromCollection(collection)
  // Initialize sync
  const sync = mongoChangeStream.initSync<Events>(redis, collection, options)
  // Use emitter from mongochangestream
  const emitter = sync.emitter
  const compactOpts = { removeUndefined: true }
  const emit = (event: Events, data: object) => {
    emitter.emit(event, compact({ type: event, ...data }, compactOpts))
  }

  const handleResponse = (response: BulkResponse, metadata: Metadata) => {
    const { operationCounts, numDocs, changeStream } = metadata
    // There were errors
    if (response.errors) {
      const errors = getBulkErrors(response)
      const numErrors = errors.length
      debug('Errors %O', errors)
      emit('process', {
        success: numDocs - numErrors,
        fail: numErrors,
        errors,
        changeStream,
        operationCounts,
      } as ProcessEvent)
    } else {
      emit('process', {
        success: numDocs,
        changeStream,
        operationCounts,
      } as ProcessEvent)
    }
  }

  const createIndexIgnoreMalformed = async (settings: object = {}) => {
    const obj = {
      index,
      settings: _.merge(
        {
          index: {
            mapping: {
              ignore_malformed: true,
            },
          },
        },
        settings
      ),
    }
    await elastic.indices.create(obj)
  }

  const createMappingFromSchema = async (
    jsonSchema: object,
    options: ConvertOptions = {}
  ) => {
    const mappings = convertSchema(jsonSchema, options)
    return elastic.indices.putMapping({ index, ...mappings })
  }

  /**
   * Process change stream events.
   */
  const processChangeStreamRecords = async (docs: ChangeStreamDocument[]) => {
    const operations = []
    const operationCounts: OperationCounts = {}
    const numDocs = docs.length

    for (const doc of docs) {
      const incCount = () =>
        (operationCounts[doc.operationType] =
          (operationCounts[doc.operationType] ?? 0) + 1)

      if (doc.operationType === 'insert') {
        incCount()
        operations.push([
          { create: { _index: index, _id: doc.fullDocument._id.toString() } },
          mapper(doc.fullDocument),
        ])
      } else if (
        doc.operationType === 'update' ||
        doc.operationType === 'replace'
      ) {
        incCount()
        const document = doc.fullDocument ? mapper(doc.fullDocument) : {}
        operations.push([
          { index: { _index: index, _id: doc.documentKey._id.toString() } },
          document,
        ])
      } else if (doc.operationType === 'delete') {
        incCount()
        operations.push([
          { delete: { _index: index, _id: doc.documentKey._id.toString() } },
        ])
      }
    }
    const response = await elastic.bulk({
      operations: operations.flat(),
    })

    const metadata: Metadata = { operationCounts, numDocs, changeStream: true }
    handleResponse(response, metadata)
  }

  /**
   * Process initial scan documents.
   */
  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
    const operationCounts = { insert: docs.length }
    const numDocs = docs.length

    const response = await elastic.bulk({
      operations: docs.flatMap((doc) => [
        { create: { _index: index, _id: doc.fullDocument._id } },
        mapper(doc.fullDocument),
      ]),
    })

    const metadata: Metadata = { operationCounts, numDocs }
    handleResponse(response, metadata)
  }

  const processChangeStream = (options?: QueueOptions & ChangeStreamOptions) =>
    sync.processChangeStream(processChangeStreamRecords, {
      ...options,
      pipeline: [
        { $unset: ['updateDescription'] },
        ...(options?.pipeline ?? []),
      ],
    })

  const runInitialScan = (options?: QueueOptions & ScanOptions) =>
    sync.runInitialScan(processRecords, options)

  return {
    ...sync,
    /**
     * Process MongoDB change stream for the given collection.
     * `options.batchSize` defaults to 500.
     * `options.timeout` defaults to 30 seconds.
     */
    processChangeStream,
    /**
     * Run initial collection scan. `options.batchSize` defaults to 500.
     * Sorting defaults to `_id`.
     */
    runInitialScan,
    /**
     * Create index with ignore_malformed enabled for the index.
     */
    createIndexIgnoreMalformed,
    /**
     * Create mapping from MongoDB JSON schema
     */
    createMappingFromSchema,
    emitter,
  }
}
