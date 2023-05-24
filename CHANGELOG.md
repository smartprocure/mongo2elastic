# 0.35.0

- Latest `mongochangestream` - More robust error code handling for `missingOplogEntry`.

# 0.34.0

- Latest `mongochangestream` - Don't emit the `cursorError` event when stopping.

# 0.33.1

- Latest `mongochangestream` - FSM bug fix.

# 0.33.0

- Latest `mongochangestream` - Drop health check code in favor of `cursorError` event.

# 0.32.0

- Latest `mongochangestream` - extend event types.

# 0.31.0

- Latest `mongochangestream` - `runInitialScan` pipeline.

# 0.30.0

- Emit errors that happened during initial bulk sync

# 0.29.0

- Optionally pass `mapper` for an override.

# 0.28.0

- Glob expressions supported for overrides `path`.
- Pass any key/value pair in `Override` object.

# 0.27.0

- Latest `mongochangestream` - Handle master failover scenario properly for initial scan.

# 0.26.0

- Latest `mongochangestream` - Longer `maxSyncDelay` default.

# 0.25.0

- Renamed `ignoreMalformed` to `createIndexIgnoreMalformed`.
- More info when emitting.

# 0.24.1

- Export `detectResync`.

# 0.24.0

- Latest `mongochangestream` - More robust cursor consumption.

# 0.23.0

- Latest `mongochangestream` - Bug fix.

# 0.22.0

- Latest `mongochangestream` - generic emitter.
- Use emitter from `mongochangestream` which now emits two events on its own.

# 0.21.0

- Latest `mongochangestream` - health checks.

# 0.20.0

- Added `passthrough` option to allow for customization of field mappings.
- Use `_.merge` instead of flattened key path.

# 0.19.0

- Use flattened key path for `ignore_malformed`.

# 0.18.0

- Add optional settings that can be added to `ignoreMalformed`.

# 0.17.1

- Unwrap first value of multi-valued BSON type. E.g., `['string', 'null']` => `'string'`.

# 0.17.0

- Added options for `omit` and `overrides` to `convertSchema`.
- Convert string enum to keyword.

# 0.16.0

- Added `createMappingFromSchema`.
- `convertSchema` bug fixes.

# 0.15.0

- Added `convertSchema` fn that converts a MongoDB JSON schema to an Elasticsearch mapping.

# 0.14.1

- Forgot to bump `prom-utils` in this repo.

# 0.14.0

- Latest `mongochangestream` - `batchBytes` option.

# 0.13.0

- Return `emitter` with events: `process` and `error`.
- Stats are no longer logged.

# 0.12.0

- Removed `clearCompletedOn`.
- Latest `mongochangestream` - `JSONSchema` type.

# 0.11.0

- Latest `mongochangestream` - Option to strip metadata from a JSON schema for `detectSchemaChange`.

# 0.10.0

- Latest `mongochangestream` - Ensure that you can call `start` after calling `stop`.

# 0.9.0

- Fix `Document` type.
- Bump `mongodb` peer dep.
- Latest `mongochangestream`.

# 0.8.2

- Bug fix from `mongochangestream`.

# 0.8.0

- Latest `mongochangestream`.

# 0.7.0

- Latest `mongochangestream`.

# 0.6.0

- Pass along `reset` and other `mongochangestream` fns.

# 0.5.0

- Latest `mongochangestream`.
- `detectSchemaChange`.

# 0.4.1

- Lower required elasticsearch dep.

# 0.3.0

- Added peer dependencies.
- Latest `mongochangestream`.

# 0.2.0

- Latest `mongochangestream`.

# 0.1.0

- Initial release.
