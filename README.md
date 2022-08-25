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
// Create index with ignore_malformed enabled
await sync.ignoreMalformed().catch(console.warn)
// Process change stream events
sync.processChangeStream()
// Run initial scan of collection batching documents by 1000
const options = { batchSize: 1000 }
retry(() => sync.runInitialScan(options))
```
