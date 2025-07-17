# Mongo to Elastic

## Sync MongoDB to Elasticsearch

```typescript
import elasticsearch from '@elastic/elasticsearch'
import { default as Redis } from 'ioredis'
import { crate, initSync } from 'mongo2crate'
import { MongoClient } from 'mongodb'
import retry from 'p-retry'

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

## Schema Conversion Example

The `convertSchema` function transforms MongoDB JSON schemas into Elasticsearch mappings. Here's an example showing how to use the helper functions and features:

### Input MongoDB Schema

```javascript
const mongoSchema = {
  bsonType: 'object',
  additionalProperties: false,
  properties: {
    _id: {
      bsonType: 'objectId',
    },
    name: {
      bsonType: 'string',
    },
    email: {
      bsonType: 'string',
    },
    location: {
      bsonType: 'string', // Will be converted to geo_point
    },
    tags: {
      bsonType: 'array',
      items: {
        bsonType: 'string',
      },
    },
    comments: {
      bsonType: 'array',
      items: {
        bsonType: 'object',
        additionalProperties: false,
        properties: {
          text: {
            bsonType: 'string',
          },
          author: {
            bsonType: 'string',
          },
        },
      },
    },
  },
}
```

### Conversion with Helper Functions

```javascript
import { convertSchema, copyTo, isStringLike, setESType } from 'mongo2elastic'

const options = {
  overrides: [
    // Copy all string-like fields to a searchable 'all' field
    copyTo('*', 'all', isStringLike),
    // Copy name and email to a 'contact_info' field for grouped searching
    copyTo('name', 'contact_info'),
    copyTo('email', 'contact_info'),
    // Convert location field to geo_point type
    setESType('location', 'geo_point'),
    // Make comments array use nested type for complex queries
    { path: 'comments', nested: true },
  ],
}

const elasticMapping = convertSchema(mongoSchema, options)
```

### Generated Elasticsearch Mapping

```javascript
{
  properties: {
    _mongoId: {
      type: 'keyword'
    },
    name: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256
        }
      },
      copy_to: ['all', 'contact_info']
    },
    email: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256
        }
      },
      copy_to: ['all', 'contact_info']
    },
    location: {
      type: 'geo_point'
    },
    tags: {
      type: 'text',
      fields: {
        keyword: {
          type: 'keyword',
          ignore_above: 256
        }
      },
      copy_to: ['all']
    },
    comments: {
      type: 'nested',
      properties: {
        text: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256
            }
          },
          copy_to: ['all']
        },
        author: {
          type: 'text',
          fields: {
            keyword: {
              type: 'keyword',
              ignore_above: 256
            }
          },
          copy_to: ['all']
        }
      }
    }
  }
}
```

### Key Features Demonstrated

- **`copyTo('*', 'all', isStringLike)`**: Copies all string-like fields to an 'all' field for full-text search
- **`copyTo('name', 'contact_info')`**: Groups specific fields for targeted searching
- **`setESType('location', 'geo_point')`**: Converts a string field to a specialized Elasticsearch type
- **`{ path: 'comments', nested: true }`**: Converts array of objects to nested type for complex queries
- **Automatic text field enhancement**: String fields get both `text` and `keyword` sub-fields
- **Field renaming**: `_id` is automatically renamed to `_mongoId`
