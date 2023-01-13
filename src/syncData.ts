import _ from 'lodash/fp.js'
import type {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
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

export const initSync = (
  redis: Redis,
  collection: Collection,
  elastic: elasticsearch.Client,
  options: SyncOptions & mongoChangeStream.SyncOptions = {}
) => {
  const mapper = options.mapper || _.omit(['_id'])
  const index = options.index || indexFromCollection(collection)
  // Initialize sync
  const sync = mongoChangeStream.initSync(redis, collection, options)
  // Use emitter from mongochangestream
  const emitter = sync.emitter
  const emit = (event: Events, data: object) => {
    emitter.emit(event, { type: event, ...data })
  }

  const ignoreMalformed = async (settings: object = {}) => {
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
   * Process a change stream event.
   */
  const processRecord = async (doc: ChangeStreamDocument) => {
    try {
      if (doc.operationType === 'insert') {
        await elastic.create({
          index,
          id: doc.fullDocument._id.toString(),
          document: mapper(doc.fullDocument),
        })
      } else if (
        doc.operationType === 'update' ||
        doc.operationType === 'replace'
      ) {
        const document = doc.fullDocument ? mapper(doc.fullDocument) : {}
        await elastic.index({
          index,
          id: doc.documentKey._id.toString(),
          document,
        })
      } else if (doc.operationType === 'delete') {
        await elastic.delete({
          index,
          id: doc.documentKey._id.toString(),
        })
      }
      emit('process', { success: 1 })
    } catch (e) {
      emit('error', { error: e })
    }
  }
  /**
   * Process scan documents.
   */
  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
    try {
      const response = await elastic.bulk({
        operations: docs.flatMap((doc) => [
          { create: { _index: index, _id: doc.fullDocument._id } },
          mapper(doc.fullDocument),
        ]),
      })
      if (response.errors) {
        const errors = response.items.filter((doc) => doc.create?.error)
        const numErrors = errors.length
        emit('process', {
          success: docs.length - numErrors,
          fail: numErrors,
        })
      } else {
        emit('process', { success: docs.length })
      }
    } catch (e) {
      emit('error', { error: e })
    }
  }

  const processChangeStream = (options?: ChangeStreamOptions) =>
    sync.processChangeStream(processRecord, options)
  const runInitialScan = (options?: QueueOptions & ScanOptions) =>
    sync.runInitialScan(processRecords, options)

  return {
    /**
     * Process MongoDB change stream for the given collection.
     */
    processChangeStream,
    /**
     * Run initial collection scan. `options.batchSize` defaults to 500.
     * Sorting defaults to `_id`.
     */
    runInitialScan,
    /**
     * Turn on ignore_malformed for the index.
     */
    ignoreMalformed,
    /**
     * Create mapping from MongoDB JSON schema
     */
    createMappingFromSchema,
    keys: sync.keys,
    reset: sync.reset,
    getCollectionSchema: sync.getCollectionSchema,
    detectSchemaChange: sync.detectSchemaChange,
    emitter,
  }
}
