import _ from 'lodash/fp.js'
import {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
} from 'mongodb'
import { default as Redis } from 'ioredis'
import elasticsearch from '@elastic/elasticsearch'
import mongoChangeStream, { ScanOptions, getKeys } from 'mongochangestream'
import { stats } from 'print-stats'
import { QueueOptions } from 'prom-utils'
import { SyncOptions } from './types.js'
import { indexFromCollection } from './util.js'

export const initSync = (
  redis: Redis,
  collection: Collection,
  elastic: elasticsearch.Client,
  options: SyncOptions & mongoChangeStream.SyncOptions = {}
) => {
  const mapper = options.mapper || _.omit(['_id'])
  const index = options.index || indexFromCollection(collection)
  const dbStats = stats(index)

  /**
   * Turn on ignore_malformed for the index.
   */
  const ignoreMalformed = async () => {
    const obj = {
      index,
      body: {
        settings: {
          index: {
            mapping: {
              ignore_malformed: true,
            },
          },
        },
      },
    }
    await elastic.indices.create(obj)
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
      dbStats.incRows()
    } catch (e) {
      console.error('ERROR', e)
      dbStats.incErrors()
    }
    dbStats.print()
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
        console.error('ERRORS %d', numErrors)
        console.dir(errors, { depth: 10 })
        dbStats.incErrors(numErrors)
        dbStats.incRows(docs.length - numErrors)
      } else {
        dbStats.incRows(docs.length)
      }
    } catch (e) {
      console.error('ERROR', e)
      dbStats.incErrors()
    }
    dbStats.print()
  }

  const sync = mongoChangeStream.initSync(redis, options)
  /**
   * Process MongoDB change stream for the given collection.
   */
  const processChangeStream = (pipeline?: Document[]) =>
    sync.processChangeStream(collection, processRecord, pipeline)
  /**
   * Run initial collection scan. `options.batchSize` defaults to 500.
   * Sorting defaults to `_id`.
   */
  const runInitialScan = (options?: QueueOptions & ScanOptions) =>
    sync.runInitialScan(collection, processRecords, options)
  const keys = getKeys(collection)

  return { processChangeStream, runInitialScan, keys, ignoreMalformed }
}
