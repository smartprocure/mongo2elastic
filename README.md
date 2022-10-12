# Mongo to Elastic

## Sync MongoDB to Elasticsearch

```typescript
import { initSync, crate } from 'mongo2crate'
import { default as Redis } from 'ioredis'
import { MongoClient } from 'mongodb'
import retry from 'p-retry'
import elasticsearch from '@elastic/elasticsearch'

const client = await MongoClient.connect()
const db = client.db()

const elastic = new elasticsearch.Client()

const sync = initSync(new Redis(), db.collection('myCollection'), elastic, {
  omit: ['password', 'unneededStuff'],
})
// Log events
sync.emitter.on('process', console.info)
sync.emitter.on('error', console.error)
// Create index with ignore_malformed enabled
await sync.ignoreMalformed().catch(console.warn)
// Process change stream events
const changeStream = await sync.processChangeStream()
changeStream.start()
// Detect schema changes and stop change stream if detected
const schemaChange = await sync.detectSchemaChange(db)
schemaChange.start()
schemaChange.emitter.on('change', changeStream.stop)
// Run initial scan of collection batching documents by 1000
const options = { batchSize: 1000 }
const initialScan = await sync.runInitialScan(options)
initialScan.start()
```
