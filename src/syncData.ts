import elasticsearch from '@elastic/elasticsearch'
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey.js'
import type { Redis } from 'ioredis'
import _ from 'lodash/fp.js'
import mongoChangeStream, {
  type ChangeStreamOptions,
  type ScanOptions,
} from 'mongochangestream'
import type {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
  Document,
} from 'mongodb'
import type { QueueOptions } from 'prom-utils'

import { convertSchema } from './convertSchema.js'
import type { ConvertOptions, Events, SyncOptions } from './types.js'
import { indexFromCollection, renameKeys } from './util.js'

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

const getInitialCounts = () => {
  const operationTypes = ['insert', 'update', 'replace', 'delete']
  const counts: Record<string, number> = {}
  for (const operationType of operationTypes) {
    counts[operationType] = 0
  }
  return counts
}

export const initSync = (
  redis: Redis,
  collection: Collection,
  elastic: elasticsearch.Client,
  options: SyncOptions & mongoChangeStream.SyncOptions = {}
) => {
  const mapper = (doc: Document) =>
    renameKeys(doc, { _id: '_mongoId', ...options.rename })
  const index = options.index || indexFromCollection(collection)
  // Initialize sync
  const sync = mongoChangeStream.initSync<Events>(redis, collection, options)
  // Use emitter from mongochangestream
  const emitter = sync.emitter
  const emit = (event: Events, data: object) => {
    emitter.emit(event, { type: event, ...data })
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
    try {
      const operations = []
      const operationCounts = getInitialCounts()
      for (const doc of docs) {
        if (doc.operationType === 'insert') {
          operationCounts[doc.operationType]++
          operations.push([
            { create: { _index: index, _id: doc.fullDocument._id.toString() } },
            mapper(doc.fullDocument),
          ])
        } else if (
          doc.operationType === 'update' ||
          doc.operationType === 'replace'
        ) {
          operationCounts[doc.operationType]++
          const document = doc.fullDocument ? mapper(doc.fullDocument) : {}
          operations.push([
            { index: { _index: index, _id: doc.documentKey._id.toString() } },
            document,
          ])
        } else if (doc.operationType === 'delete') {
          operationCounts[doc.operationType]++
          operations.push([
            { delete: { _index: index, _id: doc.documentKey._id.toString() } },
          ])
        }
      }
      const response = await elastic.bulk({
        operations: operations.flat(),
      })
      // There were errors
      if (response.errors) {
        const errors = getBulkErrors(response)
        const numErrors = errors.length
        emit('process', {
          success: docs.length - numErrors,
          fail: numErrors,
          errors,
          changeStream: true,
          operationCounts,
        })
      } else {
        emit('process', {
          success: docs.length,
          changeStream: true,
          operationCounts,
        })
      }
    } catch (e) {
      emit('error', { error: e, changeStream: true })
    }
  }
  /**
   * Process initial scan documents.
   */
  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
    const operationCounts = { insert: docs.length }
    try {
      const response = await elastic.bulk({
        operations: docs.flatMap((doc) => [
          { create: { _index: index, _id: doc.fullDocument._id } },
          mapper(doc.fullDocument),
        ]),
      })
      // There were errors
      if (response.errors) {
        const errors = getBulkErrors(response)
        const numErrors = errors.length
        emit('process', {
          success: docs.length - numErrors,
          fail: numErrors,
          errors,
          initialScan: true,
          operationCounts,
        })
      } else {
        emit('process', {
          success: docs.length,
          initialScan: true,
          operationCounts,
        })
      }
    } catch (e) {
      emit('error', { error: e, initialScan: true })
    }
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
