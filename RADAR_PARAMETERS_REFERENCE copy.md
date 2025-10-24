# Radar Parameters Reference Guide

**Last Updated:** October 12, 2025  
**Protocol Version:** Communication Protocol V2.1  
**Radar Model:** ClairWav-T80 (with camera)

## Table of Contents

1. [Object Data Parameters (0x01)](#object-data-parameters-0x01)
2. [Lane Status Parameters (0x04)](#lane-status-parameters-0x04)
3. [Pass Data Parameters (0x05)](#pass-data-parameters-0x05)
4. [Traffic Data Parameters (0x03)](#traffic-data-parameters-0x03)
5. [Region Data Parameters (0x02)](#region-data-parameters-0x02)
6. [Parameter Logic & Calculations](#parameter-logic--calculations)
7. [Real-World Examples](#real-world-examples)
8. [Parameter Validation Rules](#parameter-validation-rules)

---

## Object Data Parameters (0x01)

**Purpose:** Real-time individual vehicle tracking and detection  
**Entry Size:** 65 bytes per target  
**Update Frequency:** Real-time (multiple times per second)

### Core Identification Parameters

#### Target Timestamp (8 bytes)
- **Type:** `unsigned int` (UL)
- **Range:** Unix timestamp in milliseconds
- **Resolution:** 1 millisecond
- **Logic:** Precise detection time for vehicle tracking and correlation
- **Example:** `1728751878160` = 2025-10-12T13:11:18.160Z
- **Usage:** Vehicle trajectory analysis, speed calculations, event correlation

#### Cyclic ID (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (integer)
- **Logic:** Unique identifier for each detected vehicle within a detection cycle
- **Example:** `1234` (unique ID for this target)
- **Usage:** Vehicle tracking across multiple frames, duplicate detection prevention

### Vehicle Classification Parameters

#### Target Lane (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 1-255
- **Resolution:** 1 (integer)
- **Logic:** Physical lane assignment based on radar's lane configuration
- **Current Values:**
  - `11` = Upstream Lane 1 (Inner to Outer)
  - `12` = Upstream Lane 2 (Inner to Outer)
  - `13` = Upstream Lane 3 (Inner to Outer)
  - `485` = Unknown Lane Configuration (needs investigation)
- **Usage:** Traffic flow analysis, lane-specific statistics, congestion monitoring

#### Target Type (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-255
- **Resolution:** 1 (integer)
- **Logic:** Vehicle classification based on size, shape, and radar signature
- **Current Values:**
  - `1` = car (passenger vehicle)
  - `2` = van (commercial van)
  - `3` = SUV (sport utility vehicle)
  - `4` = truck (large commercial vehicle)
- **Usage:** Vehicle type statistics, traffic composition analysis, enforcement targeting

#### Color (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-255
- **Resolution:** 1 (integer)
- **Logic:** Vehicle color classification (if camera/ANPR is active)
- **Current Status:** Not actively used (ANPR not enabled)
- **Usage:** Vehicle identification, traffic pattern analysis, enforcement

#### Plate Number (12 bytes)
- **Type:** `string` (C)
- **Range:** ASCII characters
- **Resolution:** Character
- **Logic:** License plate recognition (requires ANPR activation)
- **Current Status:** Field exists but shows "N/A" (ANPR not active)
- **Usage:** Vehicle identification, enforcement, traffic violation tracking

### Position Parameters

#### X Coordinate (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.1 meters
- **Logic:** Horizontal position relative to radar's coordinate system
- **Example:** `150` = 15.0 meters from radar center
- **Usage:** Vehicle positioning, lane boundary detection, trajectory analysis

#### Y Coordinate (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.1 meters
- **Logic:** Longitudinal position along the road (distance from radar)
- **Example:** `250` = 25.0 meters from radar
- **Usage:** Vehicle tracking, speed calculation, position-based analysis

### Speed Parameters

#### Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 m/s
- **Logic:** Instantaneous vehicle speed in meters per second
- **Calculation:** `speed_kmh = (raw_value / 10.0) * 3.6`
- **Validation:** Filtered to 0-200 km/h range
- **Example:** `62` = 6.2 m/s = 22.3 km/h
- **Usage:** Speed monitoring, violation detection, traffic flow analysis

#### X Direction Speed (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.1 m/s
- **Logic:** Horizontal velocity component (lateral movement)
- **Example:** `-5` = -0.5 m/s (moving left)
- **Usage:** Lane change detection, lateral movement analysis

#### Y Direction Speed (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.1 m/s
- **Logic:** Longitudinal velocity component (forward/backward movement)
- **Example:** `150` = 15.0 m/s (moving forward)
- **Usage:** Forward speed validation, reverse movement detection

### Acceleration Parameters

#### Motion Acceleration (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.01 m/s²
- **Logic:** Overall acceleration magnitude
- **Example:** `250` = 2.50 m/s² acceleration
- **Usage:** Aggressive driving detection, traffic flow analysis

#### X Axis Acceleration (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.01 m/s²
- **Logic:** Horizontal acceleration (lateral)
- **Example:** `-100` = -1.00 m/s² (decelerating left)
- **Usage:** Lane change analysis, lateral movement patterns

#### Y Axis Acceleration (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 0.01 m/s²
- **Logic:** Longitudinal acceleration (forward/backward)
- **Example:** `500` = 5.00 m/s² (accelerating forward)
- **Usage:** Acceleration/deceleration analysis, traffic flow dynamics

### Image Parameters (Camera Integration)

#### X-axis in Image (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 1 pixel
- **Logic:** Horizontal pixel position in camera image
- **Special Value:** `-1` = invalid/no image data
- **Usage:** Visual correlation, image-based analysis

#### Y-axis in Image (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 1 pixel
- **Logic:** Vertical pixel position in camera image
- **Special Value:** `-1` = invalid/no image data
- **Usage:** Visual correlation, image-based analysis

#### Target Pixel Height (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 1 pixel
- **Logic:** Vehicle height in camera image
- **Special Value:** `-1` = invalid/no image data
- **Usage:** Vehicle size estimation, classification validation

#### Target Pixel Width (2 bytes)
- **Type:** `short` (S)
- **Range:** -32768 to 32767
- **Resolution:** 1 pixel
- **Logic:** Vehicle width in camera image
- **Special Value:** `-1` = invalid/no image data
- **Usage:** Vehicle size estimation, classification validation

### Physical Dimensions

#### Vehicle Length (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-255
- **Resolution:** 0.1 meters
- **Logic:** Estimated vehicle length based on radar signature
- **Example:** `45` = 4.5 meters
- **Usage:** Vehicle classification, size-based analysis

#### Vehicle Width (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-255
- **Resolution:** 0.1 meters
- **Logic:** Estimated vehicle width based on radar signature
- **Example:** `18` = 1.8 meters
- **Usage:** Vehicle classification, lane occupancy analysis

#### Vehicle Height (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-255
- **Resolution:** 0.1 meters
- **Logic:** Estimated vehicle height based on radar signature
- **Example:** `15` = 1.5 meters
- **Usage:** Vehicle classification, clearance analysis

### Status Parameters

#### Parking Status (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-1
- **Resolution:** 1 (boolean)
- **Logic:** Vehicle parking state detection
- **Values:**
  - `0` = Not Parked (moving)
  - `1` = Parked (stationary)
- **Usage:** Parking violation detection, traffic flow analysis

#### Target Azimuth Angle (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 degrees
- **Logic:** Vehicle heading direction relative to radar
- **Example:** `1800` = 180.0 degrees (facing away from radar)
- **Usage:** Direction analysis, traffic flow patterns

### GPS Parameters

#### Longitude (4 bytes)
- **Type:** `int` (L)
- **Range:** -2147483648 to 2147483647
- **Resolution:** 1e-7 degrees
- **Logic:** GPS longitude coordinate (if GPS is available)
- **Example:** `1016860000` = 101.6860000° E
- **Usage:** Geographic positioning, multi-radar correlation

#### Latitude (4 bytes)
- **Type:** `int` (L)
- **Range:** -2147483648 to 2147483647
- **Resolution:** 1e-7 degrees
- **Logic:** GPS latitude coordinate (if GPS is available)
- **Example:** `31000000` = 3.1000000° N
- **Usage:** Geographic positioning, multi-radar correlation

---

## Lane Status Parameters (0x04)

**Purpose:** Real-time lane performance metrics and queue analysis  
**Entry Size:** 32 bytes per lane  
**Update Frequency:** Real-time (multiple times per second)

### Lane Identification

#### Lane Number (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 1-65535
- **Resolution:** 1 (integer)
- **Logic:** Unique lane identifier in radar's configuration
- **Current Values:**
  - `13` = Upstream Lane 3 (Inner to Outer)
  - `485` = Unknown Lane Configuration (needs investigation)
- **Usage:** Lane-specific analysis, multi-lane correlation

### Queue Analysis Parameters

#### Queue Length (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Total length of vehicle queue in the lane
- **Calculation:** Distance from queue head to queue tail
- **Example:** `0` = 0.0m (no queue), `49` = 4.9m (queue present)
- **Usage:** Congestion monitoring, traffic management, signal timing

#### Queue Head (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Position of the front vehicle in the queue
- **Example:** `100` = 10.0m from radar
- **Usage:** Queue position tracking, signal timing optimization

#### Queue Tail (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Position of the last vehicle in the queue
- **Example:** `149` = 14.9m from radar
- **Usage:** Queue length calculation, congestion analysis

#### Vehicles in Queue (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of vehicles currently in the queue
- **Example:** `5` = 5 vehicles in queue
- **Usage:** Queue density analysis, traffic volume estimation

### Queue Status Flags

#### Exceeds Limit (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-1
- **Resolution:** 1 (boolean)
- **Logic:** Queue length exceeds configured threshold
- **Values:**
  - `0` = Queue within limits
  - `1` = Queue exceeds limit
- **Usage:** Alert generation, traffic management triggers

#### Overflow (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-1
- **Resolution:** 1 (boolean)
- **Logic:** Queue extends beyond radar detection range
- **Values:**
  - `0` = Queue within detection range
  - `1` = Queue overflow detected
- **Usage:** Detection range monitoring, system alerts

### Traffic Flow Parameters

#### Vehicle Spacing (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Average distance between consecutive vehicles
- **Calculation:** Total lane length / number of vehicles
- **Example:** `250` = 25.0m average spacing
- **Usage:** Traffic density analysis, safety assessment

#### Vehicles Online (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of vehicles currently detected in the lane
- **Example:** `8` = 8 vehicles detected
- **Usage:** Real-time traffic volume, occupancy analysis

### Speed Analysis Parameters

#### Average Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 km/h
- **Logic:** Mean speed of all vehicles in the lane
- **Calculation:** Sum of all vehicle speeds / number of vehicles
- **Example:** `450` = 45.0 km/h average speed
- **Usage:** Traffic flow analysis, speed monitoring

#### 85% Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 km/h
- **Logic:** 85th percentile speed (speed below which 85% of vehicles travel)
- **Usage:** Speed limit compliance, traffic flow analysis, safety assessment

### Lead/Trail Vehicle Analysis

#### Lead Vehicle Position (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Special Value:** `0xFFFF` = invalid/no lead vehicle
- **Logic:** Position of the frontmost vehicle in the lane
- **Example:** `120` = 12.0m from radar
- **Usage:** Queue head tracking, signal timing

#### Lead Vehicle Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 km/h
- **Logic:** Speed of the lead vehicle
- **Example:** `300` = 30.0 km/h
- **Usage:** Queue movement analysis, traffic flow dynamics

#### Trailing Vehicle Position (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Special Value:** `0xFFFF` = invalid/no trailing vehicle
- **Logic:** Position of the rearmost vehicle in the lane
- **Example:** `200` = 20.0m from radar
- **Usage:** Queue tail tracking, congestion analysis

#### Trailing Vehicle Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 km/h
- **Logic:** Speed of the trailing vehicle
- **Example:** `250` = 25.0 km/h
- **Usage:** Queue movement analysis, traffic flow dynamics

### Occupancy Parameters

#### Space Occupancy Rate (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1%
- **Logic:** Percentage of lane space occupied by vehicles
- **Calculation:** (Total vehicle length / Lane length) × 100
- **Example:** `750` = 75.0% occupancy
- **Usage:** Traffic density analysis, congestion monitoring

---

## Pass Data Parameters (0x05)

**Purpose:** Vehicle passing events through trigger lines  
**Entry Size:** 23 bytes per pass  
**Update Frequency:** Event-driven (when vehicles cross trigger lines)

### Event Identification

#### Lane Number (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 1-65535
- **Resolution:** 1 (integer)
- **Logic:** Lane where the passing event occurred
- **Usage:** Lane-specific event tracking, traffic flow analysis

#### Cross-section Position (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Y-axis distance where vehicle crossed the trigger line
- **Example:** `150` = 15.0m from radar
- **Usage:** Event location tracking, trigger line analysis

### Speed Parameters

#### Cross-section Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 km/h
- **Logic:** Vehicle speed at the moment of crossing trigger line
- **Example:** `450` = 45.0 km/h
- **Usage:** Speed monitoring, violation detection, traffic flow analysis

### Timing Parameters

#### Headway Time (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 second
- **Logic:** Time gap between this vehicle and the previous vehicle
- **Calculation:** Time difference between consecutive passing events
- **Example:** `3` = 3 seconds between vehicles
- **Usage:** Traffic flow analysis, capacity assessment, safety analysis

#### Passing Time (8 bytes)
- **Type:** `unsigned int` (UL)
- **Range:** Unix timestamp in milliseconds
- **Resolution:** 1 millisecond
- **Logic:** Precise timestamp when vehicle crossed trigger line
- **Example:** `1728751878160` = 2025-10-12T13:11:18.160Z
- **Usage:** Event correlation, temporal analysis, violation detection

#### Occupancy Duration (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 second
- **Logic:** Time vehicle spent in the detection zone
- **Example:** `2` = 2 seconds in zone
- **Usage:** Vehicle behavior analysis, zone occupancy assessment

### Status Parameters

#### Occupancy Status (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-1
- **Resolution:** 1 (boolean)
- **Logic:** Direction of vehicle movement through trigger line
- **Values:**
  - `0` = Exiting (leaving detection zone)
  - `1` = Entering (entering detection zone)
- **Usage:** Direction analysis, traffic flow patterns, event classification

#### Vehicle Type (1 byte)
- **Type:** `unsigned char` (UT)
- **Range:** 0-255
- **Resolution:** 1 (integer)
- **Logic:** Vehicle classification at time of passing
- **Values:** Same as Object Data vehicle types
- **Usage:** Vehicle type statistics, classification analysis

---

## Traffic Data Parameters (0x03)

**Purpose:** Statistical traffic flow analysis over time periods  
**Entry Size:** 50 bytes per entry  
**Update Frequency:** Periodic (typically 1 minute intervals)

### Time Parameters

#### Statistical Period (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 second
- **Logic:** Time period over which statistics were collected
- **Example:** `60` = 60-second period
- **Usage:** Statistical analysis, trend monitoring

#### Target Lane (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 1-65535
- **Resolution:** 1 (integer)
- **Logic:** Lane for which statistics are reported
- **Usage:** Lane-specific traffic analysis

#### Monitoring Location (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Y-axis distance to stop line or reference point
- **Example:** `100` = 10.0m from stop line
- **Usage:** Location-specific analysis, intersection monitoring

### Vehicle Type Flow Counters

#### Bicycle Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of bicycles detected in the period
- **Usage:** Bicycle traffic analysis, infrastructure planning

#### Motorcycle Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of motorcycles detected in the period
- **Usage:** Motorcycle traffic analysis, safety assessment

#### Tricycle Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of tricycles detected in the period
- **Usage:** Tricycle traffic analysis, mixed traffic assessment

#### Bus Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of buses detected in the period
- **Usage:** Public transport analysis, bus priority systems

#### Van Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of vans detected in the period
- **Usage:** Commercial vehicle analysis, freight traffic

#### Car Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of cars detected in the period
- **Usage:** Passenger vehicle analysis, traffic volume

#### SUV Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of SUVs detected in the period
- **Usage:** Vehicle type analysis, traffic composition

#### Large Truck Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of large trucks detected in the period
- **Usage:** Heavy vehicle analysis, freight traffic

#### Medium Truck Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of medium trucks detected in the period
- **Usage:** Commercial vehicle analysis, freight traffic

#### Light Truck Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of light trucks detected in the period
- **Usage:** Commercial vehicle analysis, delivery traffic

#### Dangerous Goods Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of dangerous goods vehicles detected
- **Usage:** Safety monitoring, hazardous material tracking

#### Engineering Vehicle Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of engineering vehicles detected
- **Usage:** Construction traffic analysis, infrastructure monitoring

#### Pedestrian Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Number of pedestrians detected in the period
- **Usage:** Pedestrian traffic analysis, safety assessment

### Aggregate Parameters

#### Total Flow (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 (count)
- **Logic:** Sum of all vehicle type flows
- **Calculation:** Sum of all individual vehicle type counts
- **Usage:** Total traffic volume analysis, capacity assessment

#### Average Speed (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 km/h
- **Logic:** Mean speed of all vehicles in the period
- **Calculation:** Sum of all vehicle speeds / number of vehicles
- **Usage:** Speed analysis, traffic flow assessment

#### Headway Time (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 second
- **Logic:** Average time between consecutive vehicles
- **Calculation:** Total time / number of vehicles
- **Usage:** Traffic flow analysis, capacity assessment

### Occupancy Parameters

#### Virtual Loop Occupancy (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1%
- **Logic:** Time-based occupancy of virtual detection loop
- **Calculation:** (Time vehicles present / Total time) × 100
- **Usage:** Traffic density analysis, signal timing

#### Max Queue Length (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Maximum queue length observed during the period
- **Usage:** Congestion analysis, capacity assessment

#### Lane Space Occupancy (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1%
- **Logic:** Space-based occupancy of the lane
- **Calculation:** (Total vehicle length / Lane length) × 100
- **Usage:** Traffic density analysis, capacity assessment

#### Vehicle Spacing (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 meters
- **Logic:** Average distance between consecutive vehicles
- **Usage:** Traffic density analysis, safety assessment

#### Traffic Density (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1 vehicles per km
- **Logic:** Number of vehicles per kilometer of road
- **Calculation:** (Number of vehicles / Lane length in km)
- **Usage:** Traffic density analysis, capacity assessment

---

## Region Data Parameters (0x02)

**Purpose:** Turn statistics and regional traffic analysis  
**Entry Size:** 12 bytes per region  
**Update Frequency:** Periodic (typically 1 minute intervals)

### Time Parameters

#### Statistical Period (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 second
- **Logic:** Time period over which turn statistics were collected
- **Example:** `60` = 60-second period
- **Usage:** Statistical analysis, trend monitoring

#### Direction (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 1 degree
- **Logic:** Compass direction of the region or turn movement
- **Example:** `90` = 90 degrees (eastbound)
- **Usage:** Directional analysis, turn movement analysis

### Turn Movement Parameters

#### Left Turn % (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1%
- **Logic:** Percentage of vehicles making left turns
- **Calculation:** (Left turn vehicles / Total vehicles) × 100
- **Example:** `250` = 25.0% left turns
- **Usage:** Turn movement analysis, signal timing optimization

#### Straight % (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1%
- **Logic:** Percentage of vehicles going straight
- **Calculation:** (Straight vehicles / Total vehicles) × 100
- **Example:** `600` = 60.0% straight through
- **Usage:** Turn movement analysis, signal timing optimization

#### Right Turn % (2 bytes)
- **Type:** `unsigned short` (US)
- **Range:** 0-65535
- **Resolution:** 0.1%
- **Logic:** Percentage of vehicles making right turns
- **Calculation:** (Right turn vehicles / Total vehicles) × 100
- **Example:** `150` = 15.0% right turns
- **Usage:** Turn movement analysis, signal timing optimization

---

## Parameter Logic & Calculations

### Speed Calculations

#### Object Data Speed
```javascript
// Raw value from radar (0.1 m/s resolution)
const rawSpeed = packet.readUInt16BE(29);
const speedMps = rawSpeed / 10.0;
const speedKmh = speedMps * 3.6;

// Validation and filtering
if (speedKmh > 200.0 || speedKmh < 0.0) {
  return null; // Filter unreasonable speeds
}
```

#### Lane Status Average Speed
```javascript
// Calculate mean speed of all vehicles in lane
const totalSpeed = vehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0);
const averageSpeed = totalSpeed / vehicles.length;
```

### Occupancy Calculations

#### Space Occupancy
```javascript
// Calculate percentage of lane space occupied
const totalVehicleLength = vehicles.reduce((sum, vehicle) => sum + vehicle.length, 0);
const laneLength = 100.0; // meters
const occupancy = (totalVehicleLength / laneLength) * 100;
```

#### Time Occupancy
```javascript
// Calculate time-based occupancy
const totalOccupiedTime = vehicles.reduce((sum, vehicle) => sum + vehicle.occupancyTime, 0);
const totalTime = 60.0; // seconds
const timeOccupancy = (totalOccupiedTime / totalTime) * 100;
```

### Queue Analysis

#### Queue Length
```javascript
// Calculate queue length from head and tail positions
const queueHead = packet.readUInt16BE(4); // 0.1m resolution
const queueTail = packet.readUInt16BE(6); // 0.1m resolution
const queueLength = queueTail - queueHead;
```

#### Vehicle Spacing
```javascript
// Calculate average spacing between vehicles
const totalSpacing = vehicles.reduce((sum, vehicle) => sum + vehicle.spacing, 0);
const averageSpacing = totalSpacing / vehicles.length;
```

### Traffic Flow Calculations

#### Flow Rate
```javascript
// Calculate vehicles per hour
const vehiclesInPeriod = packet.readUInt16BE(16); // Total flow
const periodSeconds = packet.readUInt16BE(0); // Statistical period
const flowRate = (vehiclesInPeriod / periodSeconds) * 3600; // vehicles/hour
```

#### Density
```javascript
// Calculate vehicles per kilometer
const vehicleCount = packet.readUInt16BE(16); // Total flow
const laneLengthKm = 0.1; // kilometers
const density = vehicleCount / laneLengthKm; // vehicles/km
```

---

## Real-World Examples

### Example 1: Object Data Analysis
```
Target 1: Lane 12 (Upstream Lane 2), Type van, Speed 0.0 km/h, Plate: N/A
Target 2: Lane 11 (Upstream Lane 1), Type SUV, Speed 0.0 km/h, Plate: N/A
Target 3: Lane 11 (Upstream Lane 1), Type car, Speed 22.3 km/h, Plate: N/A
```

**Analysis:**
- **Lane 12**: 1 van, stationary (0.0 km/h)
- **Lane 11**: 1 SUV stationary, 1 car moving at 22.3 km/h
- **Traffic Pattern**: Mixed traffic with some vehicles stationary (possibly queued)
- **Speed Range**: 0-22.3 km/h (realistic urban speeds)

### Example 2: Lane Status Analysis
```
Lane 1: 13 (Upstream Lane 3), Queue Length 0.0m
Lane 2: 485 (Unknown Lane), Queue Length 4.9m
```

**Analysis:**
- **Lane 13**: No queue (0.0m), free-flowing traffic
- **Lane 485**: Queue present (4.9m), possible congestion
- **Traffic Condition**: Mixed - one lane free, one lane queued
- **Action Required**: Investigate Lane 485 configuration

### Example 3: Speed Distribution Analysis
```
Speed Range: 0.0 - 61.2 km/h
Average Speed: ~25 km/h
Speed Distribution:
- 0.0 km/h: 60% (stationary/queued vehicles)
- 1-20 km/h: 25% (slow moving traffic)
- 21-40 km/h: 10% (normal urban speed)
- 41-61 km/h: 5% (faster moving traffic)
```

**Analysis:**
- **Traffic Condition**: Congested with many stationary vehicles
- **Flow Pattern**: Stop-and-go traffic typical of urban intersections
- **Capacity**: Below optimal due to high percentage of stationary vehicles

---

## Parameter Validation Rules

### Speed Validation
```javascript
function validateSpeed(speedKmh) {
  if (speedKmh < 0 || speedKmh > 200) {
    return null; // Filter unreasonable speeds
  }
  return speedKmh;
}
```

### Position Validation
```javascript
function validatePosition(x, y) {
  if (x < -3276.8 || x > 3276.7) return null; // -32768 to 32767 (0.1m resolution)
  if (y < -3276.8 || y > 3276.7) return null;
  return { x, y };
}
```

### Timestamp Validation
```javascript
function validateTimestamp(timestampMs) {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  if (timestampMs < now - oneHour || timestampMs > now + oneHour) {
    return null; // Filter timestamps more than 1 hour old/future
  }
  return timestampMs;
}
```

### Lane Number Validation
```javascript
function validateLaneNumber(laneNumber) {
  const validLanes = [11, 12, 13]; // Known valid lanes
  if (!validLanes.includes(laneNumber)) {
    console.warn(`Unknown lane configuration: ${laneNumber}`);
  }
  return laneNumber;
}
```

### Occupancy Validation
```javascript
function validateOccupancy(occupancy) {
  if (occupancy < 0 || occupancy > 100) {
    return null; // Occupancy should be 0-100%
  }
  return occupancy;
}
```

---

## Usage Recommendations

### For Traffic Management
- **Queue Length**: Use for signal timing optimization
- **Average Speed**: Monitor for congestion detection
- **Occupancy Rate**: Assess lane utilization
- **Vehicle Count**: Calculate flow rates and capacity

### For Safety Analysis
- **Speed Distribution**: Identify speeding patterns
- **Headway Time**: Assess following distance compliance
- **Acceleration**: Detect aggressive driving behavior
- **Vehicle Spacing**: Monitor safe following distances

### For Planning
- **Vehicle Type Distribution**: Understand traffic composition
- **Turn Movement Percentages**: Optimize intersection design
- **Peak Hour Analysis**: Plan capacity improvements
- **Trend Analysis**: Long-term traffic pattern monitoring

### For Enforcement
- **Speed Violations**: Identify speeding vehicles
- **Red Light Violations**: Cross-reference with signal timing
- **Vehicle Classification**: Target specific vehicle types
- **Plate Recognition**: When ANPR is activated

---

**End of Radar Parameters Reference Guide**

*This comprehensive guide covers all radar parameters with detailed explanations of their logic, calculations, and real-world applications. Last updated: October 12, 2025*
