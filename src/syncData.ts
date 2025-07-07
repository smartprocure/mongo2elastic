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
import { type QueueOptions, rateLimit } from 'prom-utils'

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

const getInitialCounts = () => {
  const operationTypes = ['insert', 'update', 'replace', 'delete']
  const counts: Record<string, number> = {}
  for (const operationType of operationTypes) {
    counts[operationType] = 0
  }
  return counts
}

const debug = _debug('mongo2elastic:sync')

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
  const appender = options.appender
  const appenderLimit = options.appenderLimit || 100
  // Initialize sync
  const sync = mongoChangeStream.initSync<Events>(redis, collection, options)
  // Use emitter from mongochangestream
  const emitter = sync.emitter
  const emit = (event: Events, data: object) => {
    emitter.emit(event, { type: event, ...data })
  }

  const handleBulkResponse = (
    response: BulkResponse,
    operationCounts: OperationCounts,
    numDocs: number
  ) => {
    // There were errors
    if (response.errors) {
      const errors = getBulkErrors(response)
      const numErrors = errors.length
      debug('Errors %O', errors)
      emit('process', {
        success: numDocs - numErrors,
        fail: numErrors,
        errors,
        changeStream: true,
        operationCounts,
      } as ProcessEvent)
    } else {
      emit('process', {
        success: numDocs,
        changeStream: true,
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

  const getOperations = (docs: ChangeStreamDocument[]) => {
    const operations = []
    const counts = getInitialCounts()
    for (const doc of docs) {
      if (doc.operationType === 'insert') {
        counts[doc.operationType]++
        const mapped = mapper(doc.fullDocument)
        operations.push([
          { create: { _index: index, _id: doc.fullDocument._id.toString() } },
          mapped,
        ])
      } else if (
        doc.operationType === 'update' ||
        doc.operationType === 'replace'
      ) {
        counts[doc.operationType]++
        const mapped = doc.fullDocument ? mapper(doc.fullDocument) : {}
        operations.push([
          { index: { _index: index, _id: doc.documentKey._id.toString() } },
          mapped,
        ])
      } else if (doc.operationType === 'delete') {
        counts[doc.operationType]++
        operations.push([
          { delete: { _index: index, _id: doc.documentKey._id.toString() } },
        ])
      }
    }
    return { operations, counts }
  }

  /**
   * Process change stream events.
   */
  const processChangeStreamRecords = async (docs: ChangeStreamDocument[]) => {
    const { operations, counts } = getOperations(docs)

    // Append additional fields
    if (appender) {
      const limiter = rateLimit(appenderLimit)
      for (const operation of operations) {
        if (operation.length === 2) {
          const cb = async () => {
            const mapped = operation[1]
            const final = _.merge(mapped, await appender(mapped))
            operation[1] = final
          }
          await limiter.add(cb())
        }
      }
      await limiter.finish()
    }
    const response = await elastic.bulk({
      operations: operations.flat(),
    })

    handleBulkResponse(response, counts, docs.length)
  }

  /**
   * Process initial scan documents.
   */
  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
    const operationCounts = { insert: docs.length }
    const response = await elastic.bulk({
      operations: docs.flatMap((doc) => [
        { create: { _index: index, _id: doc.fullDocument._id } },
        mapper(doc.fullDocument),
      ]),
    })

    handleBulkResponse(response, operationCounts, docs.length)
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
