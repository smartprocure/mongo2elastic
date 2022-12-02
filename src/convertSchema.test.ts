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
      name: {
        bsonType: 'string',
      },
      subType: {
        bsonType: 'string',
      },
      numberOfEmployees: {
        bsonType: 'string',
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
              subscriptionStatus: {
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
      mappings: {
        properties: {
          name: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          subType: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          numberOfEmployees: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          addresses: {
            properties: {
              address: {
                properties: {
                  address1: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  address2: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  city: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  county: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  state: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  zip: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  country: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  latitude: { type: 'long' },
                  longitude: { type: 'long' },
                  timezone: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                },
              },
              name: {
                type: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
              },
              isPrimary: { type: 'boolean' },
            },
          },
          logo: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          verified: { type: 'boolean' },
          partner: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          integrations: {
            properties: {
              stripe: {
                properties: {
                  priceId: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  subscriptionStatus: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                },
                type: 'flattened',
              },
            },
            type: 'flattened',
          },
          createdAt: { type: 'date' },
          permissions: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
        },
      },
    })
  })
  test('Convert MongoDB schema to Elastic with overrides', () => {
    const overrides = [
      { path: 'addresses.address.latitude', bsonType: 'double' },
      { path: 'addresses.address.longitude', bsonType: 'double' },
      { path: 'numberOfEmployees', bsonType: 'int' },
    ]
    expect(convertSchema(schema, { overrides })).toEqual({
      mappings: {
        properties: {
          name: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          subType: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          numberOfEmployees: {
            type: { type: 'integer' },
          },
          addresses: {
            properties: {
              address: {
                properties: {
                  address1: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  address2: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  city: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  county: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  state: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  zip: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  country: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  latitude: { type: 'double' },
                  longitude: { type: 'double' },
                  timezone: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                },
              },
              name: {
                type: {
                  type: 'text',
                  fields: { keyword: { type: 'keyword', ignore_above: 256 } },
                },
              },
              isPrimary: { type: 'boolean' },
            },
          },
          logo: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          verified: { type: 'boolean' },
          partner: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
          integrations: {
            properties: {
              stripe: {
                properties: {
                  priceId: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                  subscriptionStatus: {
                    type: {
                      type: 'text',
                      fields: {
                        keyword: { type: 'keyword', ignore_above: 256 },
                      },
                    },
                  },
                },
                type: 'flattened',
              },
            },
            type: 'flattened',
          },
          createdAt: { type: 'date' },
          permissions: {
            type: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
            },
          },
        },
      },
    })
  })
})
