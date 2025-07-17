import _ from 'lodash/fp.js'
import { describe, expect, test } from 'vitest'

import {
  convertSchema,
  copyTo,
  isStringlike,
  setESType,
} from './convertSchema.js'
import type { ConvertOptions } from './types.js'

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

describe('convertSchema', () => {
  test('Convert MongoDB schema to Elastic with no options', () => {
    const mapping = convertSchema(schema)
    expect(mapping).toEqual({
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
        {
          path: 'permissions',
          copy_to: 'searchbar',
          fields: { exact: { analyzer: 'exact', type: 'text' } },
        },
      ],
    }
    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
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
          fields: {
            keyword: { type: 'keyword', ignore_above: 256 },
            exact: { analyzer: 'exact', type: 'text' },
          },
          copy_to: 'searchbar',
        },
        _mongoId: { type: 'keyword' },
      },
    })
  })
  test('Convert bsonType to Elastic type manually using setESType helper function', () => {
    const options = {
      overrides: [setESType('latlong', 'geo_point')],
    }
    const schema = {
      bsonType: 'object',
      additionalProperties: false,
      properties: {
        latlong: {
          bsonType: 'string',
        },
      },
    }
    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
      properties: {
        latlong: {
          type: 'geo_point',
        },
      },
    })
  })
  test('Copy to grouped field using copyTo helper function', () => {
    const options = {
      overrides: [
        copyTo('firstName', ['full_name', 'all']),
        copyTo('lastName', ['full_name', 'all']),
      ],
    }
    const schema = {
      bsonType: 'object',
      additionalProperties: false,
      properties: {
        firstName: {
          bsonType: 'string',
        },
        lastName: {
          bsonType: 'string',
        },
      },
    }
    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
      properties: {
        firstName: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['full_name', 'all'],
        },
        lastName: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['full_name', 'all'],
        },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with mapper and passthrough', () => {
    const options: ConvertOptions = {
      omit: ['integrations', 'permissions'],
      overrides: [
        {
          path: '*',
          mapper(obj) {
            if (obj.bsonType === 'string') {
              return { ...obj, fielddata: true }
            }
            return obj
          },
        },
      ],
      passthrough: ['fielddata'],
    }
    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
      properties: {
        parentId: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          fielddata: true,
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          fielddata: true,
        },
        numberOfEmployees: { type: 'keyword', fielddata: true },
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
                  fielddata: true,
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
                latitude: { type: 'long' },
                longitude: { type: 'long' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  fielddata: true,
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
              fielddata: true,
            },
            isPrimary: { type: 'boolean' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          fielddata: true,
        },
        verified: { type: 'boolean' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          fielddata: true,
        },
        createdAt: { type: 'date' },
        _mongoId: { type: 'keyword' },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with unified field', () => {
    const options = {
      omit: ['integrations', 'permissions'],
      overrides: [{ path: '*', copy_to: 'all' }],
    }
    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
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
  test('Should apply multiple updates in sequence while using isStringlike', () => {
    const options = {
      omit: ['integrations', 'permissions'],
      overrides: [
        // Copy to 'all' for all string fields.
        copyTo('*', 'all', isStringlike),
        // Additionally, copy to 'full_address' for string fields within the
        // `addresses.address` object.
        copyTo('addresses.address.*', 'full_address', isStringlike),
      ],
    }

    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
      properties: {
        _mongoId: { type: 'keyword' },
        parentId: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['all'],
        },
        subType: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['all'],
        },
        numberOfEmployees: { type: 'keyword', copy_to: ['all'] },
        keywords: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['all'],
        },
        addresses: {
          properties: {
            address: {
              properties: {
                address1: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                address2: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                city: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                county: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                state: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                zip: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                country: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
                latitude: { type: 'long' },
                longitude: { type: 'long' },
                timezone: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                  copy_to: ['all', 'full_address'],
                },
              },
            },
            name: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
              copy_to: ['all'],
            },
            isPrimary: { type: 'boolean' },
          },
        },
        logo: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['all'],
        },
        verified: { type: 'boolean' },
        partner: {
          type: 'text',
          fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          copy_to: ['all'],
        },
        createdAt: { type: 'date' },
      },
    })
  })
  test('Should rename fields in the schema', () => {
    const options = {
      omit: ['integrations', 'permissions'],
      overrides: [{ path: '*', copy_to: 'all' }],
      rename: {
        numberOfEmployees: 'numEmployees',
        'addresses.address.address1': 'addresses.address.street',
      },
    }
    const mapping = convertSchema(schema, options)
    expect(mapping).toEqual({
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
  describe('the `mapSchema` option', () => {
    test('can replace a leaf node', () => {
      const mapping = convertSchema(schema, {
        mapSchema: ({ path, val }) => {
          if (
            _.isEqual(path, [
              'properties',
              'addresses',
              'items',
              'properties',
              'address',
              'properties',
              'zip',
              'bsonType',
            ])
          ) {
            // Was originally 'string'. In the expected output below, 'text'
            // is replaced with 'long'.
            return 'number'
          }

          return val
        },
      })
      expect(mapping).toEqual({
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
                  zip: { type: 'long' },
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
  })
})
