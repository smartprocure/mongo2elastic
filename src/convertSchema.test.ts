import { convertSchema } from './convertSchema.js'
import { ConvertOptions } from './types.js'

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
        bsonType: ['objectId', 'null'],
      },
      name: {
        bsonType: 'string',
        copy_to: 'searchbar',
      },
      subType: {
        bsonType: 'string',
      },
      numberOfEmployees: {
        bsonType: 'string',
        enum: ['1 - 5', '6 - 20', '21 - 50', '51 - 200', '201 - 500', '500+'],
      },
      keywords: {
        bsonType: 'array',
        items: {
          bsonType: 'string',
        },
        copy_to: 'searchbar',
        description: 'Some description',
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
                  copy_to: 'full_address',
                },
                address2: {
                  bsonType: 'string',
                  copy_to: 'full_address',
                },
                city: {
                  bsonType: 'string',
                  copy_to: 'full_address',
                },
                county: {
                  bsonType: 'string',
                  copy_to: 'full_address',
                },
                state: {
                  bsonType: 'string',
                  copy_to: 'full_address',
                },
                zip: {
                  bsonType: 'string',
                  copy_to: 'full_address',
                },
                country: {
                  bsonType: 'string',
                  copy_to: 'full_address',
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
  test('Convert MongoDB schema to Elastic with no options', () => {
    const mappings = convertSchema(schema)
    expect(mappings).toEqual({
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
        numberOfEmployees: { type: 'keyword' },
        keywords: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
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
        _mongoId: { type: 'keyword' },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with options', () => {
    const options = {
      omit: ['integrations'],
      overrides: [
        { path: 'addresses.address.l*', bsonType: 'double' },
        { path: 'permissions', copy_to: 'searchbar' },
      ],
      passthrough: ['copy_to'],
    }
    const mappings = convertSchema(schema, options)
    expect(mappings).toEqual({
      properties: {
        parentId: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'searchbar',
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
        },
        numberOfEmployees: { type: 'keyword' },
        keywords: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'searchbar',
        },
        addresses: {
          properties: {
            address: {
              properties: {
                address1: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'full_address',
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
        permissions: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'searchbar',
        },
        _mongoId: { type: 'keyword' },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with mapper', () => {
    const options: ConvertOptions = {
      omit: ['integrations', 'permissions'],
      overrides: [
        {
          path: '*',
          mapper(obj) {
            if (obj.bsonType === 'string') {
              return { ...obj, copy_to: 'foo' }
            }
            return obj
          },
        },
      ],
      passthrough: ['copy_to'],
    }
    const mappings = convertSchema(schema, options)
    expect(mappings).toEqual({
      properties: {
        _mongoId: { type: 'keyword' },
        parentId: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'foo',
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'foo',
        },
        numberOfEmployees: { type: 'keyword', copy_to: 'foo' },
        keywords: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'searchbar',
        },
        addresses: {
          properties: {
            address: {
              properties: {
                address1: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
                latitude: { type: 'long' },
                longitude: { type: 'long' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'foo',
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
              copy_to: 'foo',
            },
            isPrimary: { type: 'boolean' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'foo',
        },
        verified: { type: 'boolean' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'foo',
        },
        createdAt: { type: 'date' },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with unified field', () => {
    const options = {
      omit: ['integrations', 'permissions'],
      overrides: [{ path: '*', copy_to: 'all' }],
      passthrough: ['copy_to'],
    }
    const mappings = convertSchema(schema, options)
    expect(mappings).toEqual({
      properties: {
        _mongoId: { type: 'keyword', copy_to: 'all' },
        parentId: { type: 'keyword', copy_to: 'all' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        numberOfEmployees: { type: 'keyword', copy_to: 'all' },
        keywords: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        addresses: {
          properties: {
            address: {
              properties: {
                address1: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                latitude: { type: 'long', copy_to: 'all' },
                longitude: { type: 'long', copy_to: 'all' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
              copy_to: 'all',
            },
            isPrimary: { type: 'boolean', copy_to: 'all' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        verified: { type: 'boolean', copy_to: 'all' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        createdAt: { type: 'date', copy_to: 'all' },
      },
    })
  })
  test('Should rename fields in the schema', () => {
    const options = {
      omit: ['integrations', 'permissions'],
      overrides: [{ path: '*', copy_to: 'all' }],
      passthrough: ['copy_to'],
      rename: {
        numberOfEmployees: 'numEmployees',
        'addresses.address.address1': 'addresses.address.street',
      },
    }
    const mappings = convertSchema(schema, options)
    expect(mappings).toEqual({
      properties: {
        _mongoId: { type: 'keyword', copy_to: 'all' },
        parentId: { type: 'keyword', copy_to: 'all' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        numEmployees: { type: 'keyword', copy_to: 'all' },
        keywords: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        addresses: {
          properties: {
            address: {
              properties: {
                street: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
                latitude: { type: 'long', copy_to: 'all' },
                longitude: { type: 'long', copy_to: 'all' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: 'all',
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
              copy_to: 'all',
            },
            isPrimary: { type: 'boolean', copy_to: 'all' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        verified: { type: 'boolean', copy_to: 'all' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: 'all',
        },
        createdAt: { type: 'date', copy_to: 'all' },
      },
    })
  })
  test('Should throw an exception if a rename field path prefix is different', () => {
    expect(() =>
      convertSchema(schema, {
        rename: {
          'integrations.stripe': 'foo.bar',
        },
      })
    ).toThrow('Rename path prefix does not match: integrations.stripe')
  })
  test('Should throw an exception if a rename results in duplicate paths', () => {
    expect(() =>
      convertSchema(schema, {
        rename: {
          parentId: 'name',
        },
      })
    ).toThrow('Renaming parentId to name will overwrite property "name"')
  })
})
