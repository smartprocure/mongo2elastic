import _ from 'lodash/fp.js'
import type {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
  Document,
} from 'mongodb'
import type { Redis } from 'ioredis'
import elasticsearch from '@elastic/elasticsearch'
import mongoChangeStream, {
  ScanOptions,
  ChangeStreamOptions,
} from 'mongochangestream'
import { QueueOptions } from 'prom-utils'
import { SyncOptions, Events, ConvertOptions } from './types.js'
import { indexFromCollection } from './util.js'
import { convertSchema } from './convertSchema.js'
import { BulkResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey.js'
import { renameKeys } from './util.js'

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
    renameKeys(_.omit(['_id'], doc), options.rename ?? {})
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
      body: {
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
      },
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
      const counts = getInitialCounts()
      for (const doc of docs) {
        counts[doc.operationType]++
        if (doc.operationType === 'insert') {
          operations.push([
            { create: { _index: index, _id: doc.fullDocument._id.toString() } },
            mapper(doc.fullDocument),
          ])
        } else if (
          doc.operationType === 'update' ||
          doc.operationType === 'replace'
        ) {
          const document = doc.fullDocument ? mapper(doc.fullDocument) : {}
          operations.push([
            { index: { _index: index, _id: doc.documentKey._id.toString() } },
            document,
          ])
        } else if (doc.operationType === 'delete') {
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
          counts,
        })
      } else {
        emit('process', { success: docs.length, changeStream: true, counts })
      }
    } catch (e) {
      emit('error', { error: e, changeStream: true })
    }
  }
  /**
   * Process initial scan documents.
   */
  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
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
        })
      } else {
        emit('process', { success: docs.length, initialScan: true })
      }
    } catch (e) {
      emit('error', { error: e, initialScan: true })
    }
  }

  const processChangeStream = (options?: QueueOptions & ChangeStreamOptions) =>
    sync.processChangeStream(processChangeStreamRecords, options)
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
