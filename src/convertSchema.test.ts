import { convertSchema } from './convertSchema.js'

describe('convertSchema', () => {
  const schema = {
    bsonType: 'object',
    additionalProperties: false,
    required: ['name', 'type'],
    properties: {
      _id: {
        bsonType: 'objectId',
      },
      parentId: {
        bsonType: 'objectId',
      },
      name: {
        bsonType: 'string',
      },
      subType: {
        bsonType: 'string',
      },
      numberOfEmployees: {
        bsonType: 'string',
        enum: ['1 - 5', '6 - 20', '21 - 50', '51 - 200', '201 - 500', '500+'],
      },
      addresses: {
        bsonType: 'array',
        items: {
          bsonType: 'object',
          additionalProperties: false,
          properties: {
            address: {
              bsonType: 'object',
              additionalProperties: false,
              properties: {
                address1: {
                  bsonType: 'string',
                },
                address2: {
                  bsonType: 'string',
                },
                city: {
                  bsonType: 'string',
                },
                county: {
                  bsonType: 'string',
                },
                state: {
                  bsonType: 'string',
                },
                zip: {
                  bsonType: 'string',
                },
                country: {
                  bsonType: 'string',
                },
                latitude: {
                  bsonType: 'number',
                },
                longitude: {
                  bsonType: 'number',
                },
                timezone: {
                  bsonType: 'string',
                },
              },
            },
            name: {
              bsonType: 'string',
            },
            isPrimary: {
              bsonType: 'bool',
            },
          },
        },
      },
      logo: {
        bsonType: 'string',
      },
      verified: {
        bsonType: 'bool',
      },
      partner: {
        bsonType: 'string',
      },
      integrations: {
        bsonType: 'object',
        additionalProperties: true,
        properties: {
          stripe: {
            bsonType: 'object',
            additionalProperties: true,
            properties: {
              priceId: {
                bsonType: 'string',
              },
            },
          },
        },
      },
      createdAt: {
        bsonType: 'date',
      },
      permissions: {
        bsonType: 'array',
        items: {
          bsonType: 'string',
        },
      },
    },
  }
  test('Convert MongoDB schema to Elastic', () => {
    expect(convertSchema(schema)).toEqual({
      properties: {
        parentId: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        numberOfEmployees: {
          type: 'keyword',
        },
        addresses: {
          properties: {
            address: {
              properties: {
                address1: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                latitude: { type: 'long' },
                longitude: { type: 'long' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
            isPrimary: { type: 'boolean' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        verified: { type: 'boolean' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        integrations: { type: 'flattened' },
        createdAt: { type: 'date' },
        permissions: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with options', () => {
    const options = {
      omit: ['integrations', 'permissions'],
      overrides: [
        { path: 'addresses.address.latitude', bsonType: 'double' },
        { path: 'addresses.address.longitude', bsonType: 'double' },
      ],
    }
    expect(convertSchema(schema, options)).toEqual({
      properties: {
        parentId: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        numberOfEmployees: {
          type: 'keyword',
        },
        addresses: {
          properties: {
            address: {
              properties: {
                address1: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
                latitude: { type: 'double' },
                longitude: { type: 'double' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
            isPrimary: { type: 'boolean' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        verified: { type: 'boolean' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        createdAt: { type: 'date' },
      },
    })
  })
})
