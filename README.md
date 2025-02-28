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
sync.emitter.on('cursorError', () => process.exit(1))
// Create index with ignore_malformed enabled
await sync.createIndexIgnoreMalformed().catch(console.warn)
// Create mapping
const schema = await sync.getCollectionSchema(db)
if (schema) {
  await sync.createMappingFromSchema(schema)
}
// Process change stream events
const changeStream = await sync.processChangeStream()
changeStream.start()
// Detect schema changes and stop change stream if detected
const schemaChange = await sync.detectSchemaChange(db)
schemaChange.start()
sync.emitter.on('schemaChange', changeStream.stop)
// Run initial scan of collection batching documents by 1000
const options = { batchSize: 1000 }
const initialScan = await sync.runInitialScan(options)
initialScan.start()
```

## Run the tests locally

Create a .env file with the following variables set to the appropriate values:

```
MONGO_CONN="mongodb+srv://..."
ELASTIC_NODE='https://elastic-node-url-here.com'
ELASTIC_USERNAME="username-here"
ELASTIC_PASSWORD="password-here"
```

Then run `npm test` to run the tests.
