import _ from 'lodash/fp.js'
import {
  ChangeStreamDocument,
  ChangeStreamInsertDocument,
  Collection,
} from 'mongodb'
import { default as Redis } from 'ioredis'
import elasticsearch from '@elastic/elasticsearch'
import mongoChangeStream, { ScanOptions } from 'mongochangestream'
import { stats } from 'print-stats'
import { QueueOptions } from 'prom-utils'

export const initSync = (
  redis: Redis,
  collection: Collection,
  elastic: elasticsearch.Client,
  docMapper = _.identity,
  index: string = `${
    collection.dbName
  }_${collection.collectionName.toLowerCase()}`
) => {
  const dbStats = stats()

  const recordMapper = _.flow(_.omit(['_id']), docMapper)

  const processRecord = async (doc: ChangeStreamDocument) => {
    try {
      if (doc.operationType === 'insert') {
        const document = recordMapper(doc.fullDocument)
        await elastic.create({
          index,
          id: doc.fullDocument._id,
          document,
        })
      } else if (doc.operationType === 'update') {
        const document = recordMapper(doc.fullDocument)
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

  const processRecords = async (docs: ChangeStreamInsertDocument[]) => {
    try {
      const response = await elastic.bulk({
        operations: docs.flatMap(doc => [
          { create: { _index: index, _id: doc.fullDocument._id } },
          recordMapper(doc.fullDocument),
        ]),
      })
      if (response.errors) {
        const errors = response.items.filter(doc => doc.create?.error)
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

  const sync = mongoChangeStream.initSync(redis)

  const processChangeStream = () =>
    sync.processChangeStream(collection, processRecord)

  const runInitialScan = (options?: QueueOptions & ScanOptions) =>
    sync.runInitialScan(collection, processRecords, options)

  const keys = mongoChangeStream.getKeys(collection)

  return { processChangeStream, runInitialScan, keys }
}
