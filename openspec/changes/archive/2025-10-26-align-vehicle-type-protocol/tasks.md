# Implementation Tasks

## Status: ✅ ALL TASKS COMPLETED

## Phase 1: Protocol Analysis
- [x] Read Communication Protocol V2.1 document
- [x] Identify official vehicle type mapping (Section 2.2.2)
- [x] Document 15 vehicle types (codes 0-14)
- [x] Confirm ClairWav-T80LC uses Video Integrated protocol

## Phase 2: Codebase Audit
- [x] Search all files with vehicle type mappings
- [x] Identify inconsistencies (found 3 different mappings)
- [x] Document root cause of PassData/ObjectData mismatch
- [x] List all files requiring updates (19 files found)

## Phase 3: Type Definition Updates
- [x] Update `src/types/classification.ts` VEHICLE_TYPE_MAP (lines 121-137)
- [x] Add protocol reference comments
- [x] Change code 6 from "motorcycle" to "car"
- [x] Add missing types: tricycle, dangerous_goods, etc.
- [x] Expand from partial (1-9) to complete (0-14) mapping

## Phase 4: Live Tracking Updates
- [x] Update `src/lib/vehicle-tracker.ts` getVehicleTypeName() (lines 146-167)
- [x] Align with official protocol mapping
- [x] Add protocol reference comment
- [x] Change default fallback from 'unknown' to 'other'

## Phase 5: API Route Updates
- [x] Update `src/app/api/tracking/vehicles/route.ts` (lines 249-269)
- [x] Fix getVehicleTypeCode() string→code mapping
- [x] Add all 15 vehicle types
- [x] Change default fallback from 4 to 0 ('other')
- [x] Add protocol reference comment

## Phase 6: WebSocket Server Updates
- [x] Update `src/lib/unified-websocket-server.ts` (lines 584-604)
- [x] Fix getVehicleTypeCode() for sample data generation
- [x] Align with protocol mapping
- [x] Add protocol reference comment

## Phase 7: Test Data Generator Updates
- [x] Update `start-vehicle-generator-simple.js` (lines 154-174)
- [x] Fix getVehicleTypeCode() method
- [x] Expand vehicle types array to include all 15 types
- [x] Update vehicle dimension functions for new types
- [x] Add protocol reference comment

## Phase 8: Documentation
- [x] Create `dashboard/VEHICLE_TYPE_PROTOCOL.md`
- [x] Document complete 15-type mapping table
- [x] Add protocol reference (Section 2.2.2)
- [x] Include usage examples (code→name, name→code)
- [x] Document historical incorrect mappings
- [x] Add testing and verification procedures
- [x] Include Redis data format examples

## Phase 9: Testing & Verification
- [x] Test Live Tracking displays "car" for targetType=6
- [x] Verify PassData and ObjectData show consistent types
- [x] Check Classification tab metrics align with tracking
- [x] Verify all 15 vehicle types supported in UI
- [x] Test Redis data interpretation with new mappings

## Phase 10: OpenSpec Documentation
- [x] Create OpenSpec change proposal
- [x] Document problem statement and root cause
- [x] List all files updated
- [x] Create spec deltas for radar-processing
- [x] Validate with `openspec validate align-vehicle-type-protocol --strict`

---

**Total Tasks**: 40
**Completed**: 40 (100%)
**Status**: ✅ Ready for archive
