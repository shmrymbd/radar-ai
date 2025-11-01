## Why

ObjectData processing currently lacks validation for the `entries` property, which can cause runtime crashes if data is malformed or missing. Additionally, type mismatches between declared TypeScript types (`ProcessedObjectData[]`) and actual runtime data (`ObjectData[]`) create potential runtime errors. The system needs defensive validation to handle edge cases gracefully.

## What Changes

- Add validation to `convertToObjectData()` to ensure `entries` array exists and is valid
- Add defensive checks in `processObjectData()` to handle missing or invalid entries
- Add validation in `storeRawObjectData()` to prevent storing invalid ObjectData
- Fix type annotation in `getDeviceObjectData()` to match actual runtime data format
- Add error logging and graceful degradation when ObjectData is malformed

## Impact

- **Affected specs:** `radar-processing`, `live-tracking`
- **Affected code:**
  - `dashboard/src/lib/unified-websocket-server.ts` - `convertToObjectData()` method
  - `dashboard/src/lib/vehicle-tracker.ts` - `processObjectData()` method
  - `dashboard/src/lib/redis-storage.ts` - `getDeviceObjectData()` and `storeRawObjectData()` methods
  - `dashboard/src/lib/tracking-websocket-server.ts` - `convertToObjectData()` method
- **Breaking changes:** None - this is a defensive enhancement that improves error handling

