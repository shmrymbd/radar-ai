# Vehicle Type Classification Protocol

## Official ClairWav Communication Protocol V2.1

This document defines the official vehicle type codes used in the ClairWav radar system based on the **Communication Protocol V2.1** specification.

### Radar Model: ClairWav-T80LC (Video Integrated)

The project uses the **Video Integrated Radar Models** protocol (Section 2.2.2) which supports detailed vehicle classification with camera integration.

## Vehicle Type Mapping

### Code to Type Name Mapping

| Code (Hex) | Code (Dec) | Vehicle Type | Category | Description |
|------------|------------|--------------|----------|-------------|
| 0x00 | 0 | other | Unknown | Unclassified or other vehicle types |
| 0x01 | 1 | bicycle | Two-wheel | Standard bicycle |
| 0x02 | 2 | motorcycle | Two-wheel | Motorized two-wheel vehicle |
| 0x03 | 3 | tricycle | Three-wheel | Three-wheel vehicle |
| 0x04 | 4 | bus | Public transport | Public bus |
| 0x05 | 5 | van | Commercial | Van/minivan |
| **0x06** | **6** | **car** | **Passenger** | **Standard passenger car** |
| 0x07 | 7 | suv | Passenger | Sport Utility Vehicle |
| 0x08 | 8 | large_truck | Commercial | Large commercial truck |
| 0x09 | 9 | medium_truck | Commercial | Medium commercial truck |
| 0x0A | 10 | light_truck | Commercial | Light commercial truck |
| 0x0B | 11 | dangerous_goods | Special | Dangerous goods transport vehicle |
| 0x0C | 12 | engineering_vehicle | Special | Engineering/construction vehicle |
| 0x0D | 13 | pedestrian | Non-vehicle | Pedestrian detected |
| 0x0E | 14 | medium_bus | Public transport | Medium-sized bus |

### Important Notes

1. **Code 0x06 (6) = "car"** - This is the most common vehicle type
2. **Default fallback**: Use code 0 ("other") for unrecognized types
3. **Protocol section**: Video Integrated Models - Section 2.2.2

## Implementation Files

All code files MUST use this exact mapping. The following files have been updated to match the official protocol:

### Core Type Definitions
- **src/types/classification.ts** - `VEHICLE_TYPE_MAP` constant (lines 121-137)
  - This is the single source of truth for vehicle type mapping
  - All other files should reference or mirror this mapping

### Data Processing
- **src/lib/vehicle-tracker.ts** - `getVehicleTypeName()` method (lines 146-167)
  - Converts numeric codes to string names for Live Tracking

- **src/app/api/tracking/vehicles/route.ts** - `getVehicleTypeCode()` function (lines 249-269)
  - Converts string names to numeric codes for API responses

### Data Generation
- **start-vehicle-generator-simple.js** - `getVehicleTypeCode()` method (lines 154-174)
  - Test data generator mapping

- **src/lib/unified-websocket-server.ts** - `getVehicleTypeCode()` method (lines 584-604)
  - WebSocket server sample data generation

## Usage in Code

### TypeScript/JavaScript - Code to Name
```typescript
// Import the official mapping
import { VEHICLE_TYPE_MAP } from '@/types/classification';

// Convert code to name
const vehicleType = VEHICLE_TYPE_MAP[6]; // Returns: "car"
const defaultType = VEHICLE_TYPE_MAP[0]; // Returns: "other"
```

### TypeScript/JavaScript - Name to Code
```typescript
// Inverse mapping
const vehicleTypeCode: Record<string, number> = {
  'other': 0,
  'bicycle': 1,
  'motorcycle': 2,
  'tricycle': 3,
  'bus': 4,
  'van': 5,
  'car': 6,
  'suv': 7,
  'large_truck': 8,
  'medium_truck': 9,
  'light_truck': 10,
  'dangerous_goods': 11,
  'engineering_vehicle': 12,
  'pedestrian': 13,
  'medium_bus': 14
};

const code = vehicleTypeCode['car']; // Returns: 6
```

## Data Packet Structure

### ObjectData (0x01) - Field #3: Target Type
- **Byte offset**: 3
- **Size**: 1 byte (unsigned char)
- **Range**: 0x00 to 0x0E (0-14)
- **Used in**: Real-time vehicle tracking

### PassData (0x05) - Field #8: Target Type
- **Byte offset**: Varies by packet structure
- **Size**: 1 byte (signed char)
- **Range**: 0x00 to 0x0E (0-14)
- **Used in**: Vehicle classification analytics

## Historical Context

### Previous Incorrect Mappings (DO NOT USE)

The codebase previously had **inconsistent mappings** that did NOT match the official protocol:

**Incorrect Mapping #1** (Old VEHICLE_TYPE_MAP):
```typescript
{
  1: 'car',        // WRONG - should be 'bicycle'
  6: 'motorcycle', // WRONG - should be 'car'
}
```

**Incorrect Mapping #2** (Old vehicle-tracker):
```typescript
{
  1: 'motorcycle', // Partially correct
  6: 'car',        // Correct
}
```

These inconsistencies caused:
- ❌ PassData showing "car" but Live Tracking showing "motorcycle" for code 6
- ❌ Classification metrics not matching real-time tracking
- ❌ Confusion between different data sources

## Verification

To verify the mapping is correct across the codebase:

```bash
# Search for vehicle type mappings
cd dashboard
grep -r "motorcycle.*:.*1\|car.*:.*6" src/

# Should return files with CORRECT mapping:
# 'bicycle': 1, 'car': 6, 'motorcycle': 2
```

## Redis Data Format

### ObjectData in Redis
```json
{
  "frameType": "0x01",
  "deviceId": "Radar04",
  "entries": [
    {
      "targetId": "1760884738917_363",
      "targetType": 6,  // Code 6 = "car"
      "laneNo": 12,
      "speedKmh": 34.56
    }
  ]
}
```

### PassData in Redis (Already Decoded)
```json
{
  "frameType": "0x05",
  "deviceId": "Radar04",
  "entries": [
    {
      "vehicleType": {
        "code": 6,
        "name": "car",  // Already decoded by radar processor
        "category": "passenger"
      }
    }
  ]
}
```

## Testing

### Verify Correct Mapping
```bash
# Start the dev server
npm run dev

# Check Live Tracking displays "car" for vehicles with targetType=6
# Check Classification tab shows matching vehicle types
```

### Test Data Generation
```bash
# Generate test data with correct mapping
node generate-test-data.js

# Verify Redis contains correct codes
redis-cli -h 192.168.6.22 -p 6379 LRANGE test/objectdata 0 1
```

## References

- **Official Protocol**: `/Communication Protocol V2.1.docx`
- **Section**: 2.2 Communication Protocol for Video Integrated Radar Models
- **Subsection**: 2.2.2 Target Data
- **Radar Model**: ClairWav-T80LC (Video Integrated)
- **Protocol Version**: 2.1 (For Loranet only)

## Changelog

### 2025-10-26 - Protocol Alignment
- ✅ Updated all code files to match official Communication Protocol V2.1
- ✅ Fixed inconsistencies between PassData and ObjectData processing
- ✅ Aligned code 6 = "car" across entire codebase
- ✅ Added comprehensive mapping for all 15 vehicle types (0-14)
- ✅ Updated documentation with protocol reference

---

**IMPORTANT**: Always refer to this document and the official Communication Protocol V2.1 when working with vehicle type codes. DO NOT create custom mappings.
