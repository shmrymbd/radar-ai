# align-vehicle-type-protocol

## Status
**COMPLETED** - All implementation tasks finished. Ready for archive.

## Problem Statement
The codebase had **inconsistent vehicle type mappings** that did not match the official ClairWav Communication Protocol V2.1 specification. This caused discrepancies between different data sources:

- PassData (0x05) classification showed vehicles with code 6 as "car"
- Live Tracking (ObjectData 0x01) showed the same vehicles as "motorcycle"
- Classification metrics did not align with real-time tracking
- Only 4-9 vehicle types were partially supported instead of the full 0-14 range

### Root Cause
Multiple conflicting vehicle type mappings existed across the codebase:
1. `src/types/classification.ts` had code 6 = "motorcycle" (WRONG)
2. `src/lib/vehicle-tracker.ts` had code 6 = "car" (CORRECT)
3. API routes and generators had incomplete or incorrect mappings

## Solution Overview
Align the entire codebase with the official **ClairWav Communication Protocol V2.1 (Section 2.2.2)** for Video Integrated Radar Models (ClairWav-T80LC).

### Official Vehicle Type Mapping
Per protocol Section 2.2.2:
- Code 0x00 (0) = "other"
- Code 0x01 (1) = "bicycle"
- Code 0x02 (2) = "motorcycle"
- Code 0x03 (3) = "tricycle"
- Code 0x04 (4) = "bus"
- Code 0x05 (5) = "van"
- **Code 0x06 (6) = "car"** ← Critical mapping
- Code 0x07 (7) = "suv"
- Code 0x08 (8) = "large_truck"
- Code 0x09 (9) = "medium_truck"
- Code 0x0A (10) = "light_truck"
- Code 0x0B (11) = "dangerous_goods"
- Code 0x0C (12) = "engineering_vehicle"
- Code 0x0D (13) = "pedestrian"
- Code 0x0E (14) = "medium_bus"

## Implementation Summary

### Files Updated (7 total)
1. **src/types/classification.ts** - Official VEHICLE_TYPE_MAP (15 types, 0-14)
2. **src/lib/vehicle-tracker.ts** - Live Tracking type conversion
3. **src/app/api/tracking/vehicles/route.ts** - API type conversion
4. **src/lib/unified-websocket-server.ts** - WebSocket server mapping
5. **start-vehicle-generator-simple.js** - Test data generator
6. **dashboard/VEHICLE_TYPE_PROTOCOL.md** - NEW comprehensive documentation
7. All inverse mappings (string → code) updated

### Key Changes
- ✅ All files now use code 6 = "car" (not "motorcycle")
- ✅ Complete 15-type mapping (0-14) instead of partial 4-9
- ✅ Single source of truth in `src/types/classification.ts`
- ✅ Protocol reference comments added to all mappings
- ✅ Comprehensive documentation created

## Impact
- **Fixes**: PassData and ObjectData now show consistent vehicle types
- **Improves**: Classification metrics align with Live Tracking
- **Expands**: Support for all 15 vehicle types defined in protocol
- **Documents**: Official protocol mapping for future reference

## Testing
- ✅ Verified Redis data with `redis-cli LRANGE test/objectdata`
- ✅ Confirmed vehicles with targetType=6 now display as "car"
- ✅ Classification tab matches Live Tracking vehicle types
- ✅ All 15 vehicle types supported in UI

## References
- **Protocol Document**: `/Communication Protocol V2.1.docx`
- **Section**: 2.2 Communication Protocol for Video Integrated Radar Models
- **Subsection**: 2.2.2 Target Data
- **Radar Model**: ClairWav-T80LC (Video Integrated)
- **New Documentation**: `dashboard/VEHICLE_TYPE_PROTOCOL.md`

## Related Changes
- None - This is a bug fix and protocol alignment, not a new feature

## Migration Notes
No database migration required. Existing Redis data will be correctly interpreted with the updated mappings.

## Deployment Checklist
- [x] All code files updated with correct mapping
- [x] Documentation created
- [x] Testing completed
- [x] Protocol reference verified
- [ ] Archive this change with `openspec archive align-vehicle-type-protocol --yes`
