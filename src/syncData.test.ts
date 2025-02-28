import elasticsearch from '@elastic/elasticsearch'
import debug from 'debug'
import Redis from 'ioredis'
import _ from 'lodash/fp.js'
import {
  initState as initRedisAndMongoState,
  numDocs,
} from 'mongochangestream-testing'
import { type Db, MongoClient } from 'mongodb'
import ms from 'ms'
import { setTimeout } from 'node:timers/promises'
import { TimeoutError, WaitOptions, waitUntil } from 'prom-utils'
import { assert, describe, test } from 'vitest'

import { initSync, SyncOptions } from './index.js'

// FIXME: Pull in `assertEventually` from mongochangestream-testing instead.

/**
 * Asserts that the provided predicate eventually returns true.
 *
 * @param pred - The predicate to check: an async function returning a boolean.
 * @param failureMessage - The message to display if the predicate does not
 * return true before the timeout.
 * @param [waitOptions] - Options to override the default options passed into
 * `waitUntil`.
 *
 * @throws AssertionError if the predicate does not return true before the
 * timeout.
 */
export const assertEventually = async (
  pred: () => Promise<boolean>,
  failureMessage = 'Failed to satisfy predicate',
  waitOptions: WaitOptions = {}
) => {
  try {
    await waitUntil(pred, {
      timeout: ms('60s'),
      checkFrequency: ms('50ms'),
      ...waitOptions,
    })
  } catch (e) {
    if (e instanceof TimeoutError) {
      assert.fail(failureMessage)
    } else {
      throw e
    }
  }
}

// Output via console.info (stdout) instead of stderr.
// Without this debug statements are swallowed by vitest.
debug.log = console.info.bind(console)

const index = 'testing'

const getConns = _.memoize(async () => {
  // Redis
  const redis = new Redis({ keyPrefix: 'testing:' })
  // MongoDB
  const mongoClient = await MongoClient.connect(
    process.env.MONGO_CONN as string
  )
  const db = mongoClient.db()
  const coll = db.collection('testing')
  // Elastic
  const elasticClient = new elasticsearch.Client({
    node: process.env.ELASTIC_NODE as string,
    auth: {
      username: process.env.ELASTIC_USERNAME as string,
      password: process.env.ELASTIC_PASSWORD as string,
    },
  })
  return { mongoClient, elasticClient, db, coll, redis }
})

const getSync = async (options?: SyncOptions) => {
  const { redis, coll, elasticClient } = await getConns()
  const sync = initSync(redis, coll, elasticClient, { ...options, index })
  sync.emitter.on('stateChange', console.log)
  return sync
}

const initElasticState = async (
  sync: Awaited<ReturnType<typeof getSync>>,
  db: Db
) => {
  const { elasticClient } = await getConns()
  // Delete index
  await elasticClient.indices.delete({ index }).catch((e) => console.warn(e))
  // Index
  await sync.createIndexIgnoreMalformed().catch((e: any) => {
    // Ignore this error message that is thrown when the index already exists
    if (!e?.message?.startsWith('resource_already_exists_exception')) {
      console.warn(e)
    }
  })
  // Mapping
  const schema = await sync.getCollectionSchema(db)
  if (schema) {
    await sync
      .createMappingFromSchema(schema)
      .catch((e: unknown) => console.warn(e))
  } else {
    console.error('Missing schema')
  }
}

describe.sequential('syncCollection', () => {
  test('initialScan should work', async () => {
    const { coll, db, elasticClient } = await getConns()
    const sync = await getSync()
    await initRedisAndMongoState(sync, db, coll)
    await initElasticState(sync, db)

    const initialScan = await sync.runInitialScan()
    await initialScan.start()
    // Test that all of the records are eventually synced.
    await assertEventually(async () => {
      const countResponse = await elasticClient.count({ index })
      return countResponse.count == numDocs
    }, `Less than ${numDocs} records were processed`)
    // Stop
    await initialScan.stop()
  })
  test('should process records via change stream', async () => {
    const { coll, db, elasticClient } = await getConns()
    const sync = await getSync()
    await initRedisAndMongoState(sync, db, coll)
    await initElasticState(sync, db)

    const changeStream = await sync.processChangeStream()
    changeStream.start()
    // Give change stream time to connect.
    await setTimeout(ms('1s'))
    const date = new Date()
    // Update records
    coll.updateMany({}, { $set: { createdAt: date } })
    // Test that all of the records are eventually synced.
    await assertEventually(async () => {
      const countResponse = await elasticClient.count({
        index,
        query: { range: { createdAt: { gte: date } } },
      })
      return countResponse.count == numDocs
    }, `Less than ${numDocs} records were processed`)
    // Stop
    await changeStream.stop()
  })
})
