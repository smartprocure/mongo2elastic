import elasticsearch from '@elastic/elasticsearch'
import Redis from 'ioredis'
import _ from 'lodash/fp.js'
import {
  initState as initRedisAndMongoState,
  numDocs,
} from 'mongochangestream-testing'
import { type Db, MongoClient } from 'mongodb'
import ms from 'ms'
import { setTimeout } from 'node:timers/promises'
import { describe, expect, test } from 'vitest'

import { initSync, SyncOptions } from './index.js'

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
    // Wait for initial scan to complete
    await initialScan.start()
    await setTimeout(ms('1s'))
    // Stop
    await initialScan.stop()
    const countResponse = await elasticClient.count({ index })
    expect(countResponse.count).toBe(numDocs)
  })
  test('should process records via change stream', async () => {
    const { coll, db, elasticClient } = await getConns()
    const sync = await getSync()
    await initRedisAndMongoState(sync, db, coll)
    await initElasticState(sync, db)

    const changeStream = await sync.processChangeStream()
    changeStream.start()
    await setTimeout(ms('1s'))
    const date = new Date()
    // Update records
    coll.updateMany({}, { $set: { createdAt: date } })
    // Wait for the change stream events to be processed
    await setTimeout(ms('2s'))
    const countResponse = await elasticClient.count({
      index,
      query: { range: { createdAt: { gte: date } } },
    })
    // Stop
    await changeStream.stop()
    expect(countResponse.count).toBe(numDocs)
  })
})
