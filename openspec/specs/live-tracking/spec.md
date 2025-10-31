# live-tracking Specification

## Purpose
Real-time vehicle tracking and visualization system that displays live vehicle positions, trajectories, and automatically infers road lane topology from vehicle movement patterns. Provides interactive visualization with heat maps, trail-based road detection, and configurable rendering options. Uses event-driven architecture to match radar transmission rates for minimal latency. All tracking data is stored in Redis for persistence, scalability, and multi-instance coordination.
## Requirements
### Requirement: Vehicle Type-Based Trail Colors
The system SHALL display trails using colors that correspond to vehicle types for improved visual distinction.

#### Scenario: Car trail display
- **WHEN** a car vehicle is tracked with trails enabled
- **THEN** the trail SHALL be displayed in blue color (#3B82F6)
- **AND** the trail color SHALL match the vehicle's classification color

#### Scenario: Truck trail display
- **WHEN** a truck vehicle is tracked with trails enabled
- **THEN** the trail SHALL be displayed in red color (#EF4444)
- **AND** the trail color SHALL be distinct from other vehicle types

#### Scenario: Motorcycle trail display
- **WHEN** a motorcycle vehicle is tracked with trails enabled
- **THEN** the trail SHALL be displayed in green color (#10B981)
- **AND** the trail SHALL be thinner than larger vehicles

### Requirement: Speed-Based Trail Styling
The system SHALL adjust trail appearance based on vehicle speed to provide visual speed indication.

#### Scenario: High-speed trail styling
- **WHEN** a vehicle is moving at high speed (>50 km/h)
- **THEN** the trail SHALL have increased opacity (0.9-1.0)
- **AND** the trail SHALL have increased thickness (3-4px)

#### Scenario: Low-speed trail styling
- **WHEN** a vehicle is moving at low speed (<20 km/h)
- **THEN** the trail SHALL have reduced opacity (0.4-0.6)
- **AND** the trail SHALL have reduced thickness (1-2px)

#### Scenario: Medium-speed trail styling
- **WHEN** a vehicle is moving at medium speed (20-50 km/h)
- **THEN** the trail SHALL have moderate opacity (0.6-0.8)
- **AND** the trail SHALL have moderate thickness (2-3px)

### Requirement: Trail Fade Effect
The system SHALL implement a fade effect where trail points become more transparent over time.

#### Scenario: Trail fade over time
- **WHEN** trail points are older than 5 seconds
- **THEN** they SHALL gradually fade to 20% opacity
- **AND** the fade SHALL be smooth and linear

#### Scenario: Recent trail visibility
- **WHEN** trail points are less than 1 second old
- **THEN** they SHALL maintain full opacity
- **AND** they SHALL be clearly visible

### Requirement: Configurable Trail Length
The system SHALL allow users to configure the maximum number of points in each trail.

#### Scenario: Short trail configuration
- **WHEN** user sets trail length to 10 points
- **THEN** each vehicle trail SHALL display maximum 10 points
- **AND** older points SHALL be automatically removed

#### Scenario: Long trail configuration
- **WHEN** user sets trail length to 200 points
- **THEN** each vehicle trail SHALL display maximum 200 points
- **AND** trails SHALL persist longer for analysis

### Requirement: Trail Performance Optimization
The system SHALL optimize trail rendering for improved performance.

#### Scenario: Off-screen trail culling
- **WHEN** trails are outside the visible viewport
- **THEN** they SHALL not be rendered
- **AND** rendering performance SHALL be improved

#### Scenario: Trail cleanup
- **WHEN** vehicles have not been seen for 5 minutes
- **THEN** their trail data SHALL be automatically removed
- **AND** memory usage SHALL be controlled

### Requirement: Enhanced Trail Rendering
The system SHALL render trails with smooth interpolation and configurable appearance.

#### Scenario: Smooth trail interpolation
- **WHEN** trail points are rendered
- **THEN** they SHALL use smooth curve interpolation
- **AND** trails SHALL appear natural and flowing

#### Scenario: Trail configuration UI
- **WHEN** user accesses trail settings
- **THEN** they SHALL be able to configure trail length, opacity, and colors
- **AND** changes SHALL be applied in real-time

### Requirement: Trail Data Management
The system SHALL manage trail data with optimized storage and automatic cleanup.

#### Scenario: Efficient trail storage
- **WHEN** trail points are stored
- **THEN** they SHALL use circular buffer data structures
- **AND** memory usage SHALL be minimized

#### Scenario: Trail data compression
- **WHEN** trail data is stored
- **THEN** it SHALL be compressed to reduce memory footprint
- **AND** performance SHALL be maintained

#### Scenario: Automatic trail cleanup
- **WHEN** vehicles have not been seen for 5 minutes
- **THEN** their trail data SHALL be automatically removed
- **AND** memory leaks SHALL be prevented

### Requirement: Trail-Based Road Visualization
The system SHALL infer and visualize road lane topology from accumulated vehicle trail data with high-resolution heat maps and curved lane separators that adapt to actual road geometry.

#### Scenario: High-resolution heat map visualization
- **WHEN** trail data accumulates from vehicle movements
- **THEN** a heat map SHALL display traffic density using 1-meter grid cells (50% smaller than previous 2-meter blocks)
- **AND** the heat map SHALL use blue-to-red gradient (20-70% opacity)
- **AND** high-density areas SHALL appear red, low-density areas SHALL appear blue
- **AND** fine-grained traffic patterns SHALL be visible at meter-level resolution

#### Scenario: Curved lane separator visualization
- **WHEN** lanes are detected from trail data
- **THEN** dotted white lines SHALL be drawn to separate lanes (1.5px dots, 3px gaps)
- **AND** lane separators SHALL follow the natural curvature of the road based on traffic flow patterns
- **AND** separators SHALL use smooth quadratic curves when lateral variation exceeds 0.5 meters
- **AND** separators SHALL fall back to straight lines when roads are straight (lateral variation ≤ 0.5 meters)

#### Scenario: Segmented curve detection
- **WHEN** lane separators are calculated
- **THEN** the detection zone SHALL be divided into 10-meter segments along the Y-axis
- **AND** each segment SHALL sample a 2-meter wide area (1m into each adjacent lane) for traffic data
- **AND** each segment SHALL determine the weighted average lane center X position from trail density
- **AND** lateral shifts in lane centers SHALL define the curve shape
- **AND** curves SHALL be rendered using Catmull-Rom spline with Bezier curve interpolation

#### Scenario: Performance-optimized curve rendering
- **WHEN** curved lane separators are rendered
- **THEN** computed curve paths SHALL be cached and reused across frames
- **AND** curves SHALL only be recalculated when trail data changes significantly
- **AND** render time overhead SHALL remain under 5 milliseconds per frame

#### Scenario: Refined visual appearance
- **WHEN** road visualization is displayed
- **THEN** lane separator dots SHALL be 1.5 pixels with 3-pixel gaps (50% reduction from previous 3px/6px)
- **AND** lane center lines SHALL use 1px dots with 2px gaps
- **AND** visual refinement SHALL provide a more professional appearance
- **AND** separator visibility SHALL be maintained across different zoom levels

#### Scenario: Automatic lane detection
- **WHEN** at least 20 trail data points have been accumulated
- **THEN** the system SHALL analyze trail point density to detect lane centers
- **AND** lane boundaries SHALL be automatically inferred from vehicle movement patterns
- **AND** the detection algorithm SHALL work with the 1-meter grid resolution

#### Scenario: Lane labeling
- **WHEN** lanes are detected and displayed
- **THEN** each lane SHALL be labeled with "Lane 1", "Lane 2", etc.
- **AND** labels SHALL be visible with white text and black outline
- **AND** labels SHALL be positioned at lane centers regardless of curve geometry

#### Scenario: Road visualization toggle
- **WHEN** user toggles "Show Road from Trails" checkbox
- **THEN** the heat map and lane visualization SHALL be shown or hidden
- **AND** the visualization SHALL update in real-time as vehicles move
- **AND** both heat map and curved separators SHALL toggle together

#### Scenario: Continuous road updates
- **WHEN** new trail data accumulates
- **THEN** the road visualization SHALL update continuously
- **AND** lane detection SHALL improve with more accumulated data
- **AND** curves SHALL adapt to reflect changing traffic patterns

#### Scenario: Lane detection sensitivity
- **WHEN** trail points are grouped by X position
- **THEN** lane centers SHALL be detected at density peaks above 15% of maximum
- **AND** lanes within 3 meters SHALL be merged to avoid duplicates
- **AND** the 1-meter grid resolution SHALL improve lane boundary precision

#### Scenario: Straight road handling
- **WHEN** a road segment is detected as straight (lateral variance ≤ 0.2 meters)
- **THEN** lane separators SHALL be rendered as straight lines
- **AND** no curve interpolation SHALL be applied
- **AND** performance SHALL be optimized by avoiding unnecessary curve calculations

#### Scenario: Curved road adaptation
- **WHEN** a road segment has curves (lateral variance > 0.2 meters)
- **THEN** lane separators SHALL smoothly follow the detected curve using Bezier curves
- **AND** curves SHALL be visually natural and avoid sharp kinks through Catmull-Rom spline interpolation
- **AND** the curve SHALL accurately represent actual traffic flow patterns from accumulated trail data
- **AND** curves SHALL be highly sensitive to subtle road bends (0.2m detection threshold)

### Requirement: Enhanced Vehicle Persistence for Digital Twin Visualization
The system SHALL retain vehicle objects and trails for extended periods to create a realistic digital twin showing cumulative traffic patterns rather than only instantaneous active detections.

#### Scenario: Extended vehicle display retention
- **WHEN** a vehicle exits the detection zone or loses tracking
- **THEN** the vehicle object SHALL remain visible for 30 seconds after last detection
- **AND** the vehicle SHALL be rendered with reduced opacity (50%) to distinguish from active vehicles
- **AND** retained vehicles SHALL have dashed borders to indicate historical status
- **AND** the system SHALL display 20-50 vehicles simultaneously instead of only 5-10 active detections

#### Scenario: Vehicle cleanup with retention
- **WHEN** the vehicle cleanup process runs
- **THEN** vehicles SHALL only be removed if last seen more than 30 seconds ago
- **AND** the cleanup SHALL run every second to maintain accurate retention timing
- **AND** vehicles actively being tracked SHALL maintain full opacity
- **AND** vehicles in retention period (5-30s since last seen) SHALL display at 50% opacity

#### Scenario: Extended trail fade duration
- **WHEN** vehicle trails are rendered
- **THEN** trails SHALL fade over 30 seconds (increased from 5 seconds)
- **AND** the fade SHALL be linear and smooth from full opacity to zero
- **AND** trails SHALL persist even after the vehicle has exited the detection zone
- **AND** trail persistence SHALL be enabled by default for digital twin effect

#### Scenario: Digital twin mode toggle
- **WHEN** user enables "Digital Twin Mode" toggle
- **THEN** vehicle retention duration SHALL be set to 30 seconds
- **AND** trail fade duration SHALL be set to 30 seconds
- **WHEN** user disables "Digital Twin Mode"
- **THEN** vehicle retention SHALL revert to 5 seconds (near real-time)
- **AND** trail fade duration SHALL revert to 5 seconds
- **AND** the mode preference SHALL be saved to localStorage

#### Scenario: Visual distinction for retained vehicles
- **WHEN** a vehicle has not been seen for more than 5 seconds
- **THEN** it SHALL be classified as "retained" (historical)
- **AND** retained vehicles SHALL render with 50% opacity
- **AND** retained vehicles SHALL have dashed stroke borders ([2, 2] dash pattern)
- **AND** active vehicles (seen within 5 seconds) SHALL render at full opacity with solid borders
- **AND** users SHALL easily distinguish current traffic from recent historical traffic

#### Scenario: Memory management for extended retention
- **WHEN** the number of retained vehicles exceeds 100
- **THEN** the system SHALL remove the oldest retained vehicles first
- **AND** vehicles SHALL be sorted by last seen timestamp
- **AND** the 100 most recently seen vehicles SHALL be kept
- **AND** each vehicle trajectory SHALL be limited to 50 points maximum
- **AND** total memory usage SHALL remain under 500KB for vehicle data

#### Scenario: Traffic density realism
- **WHEN** digital twin mode is enabled during moderate traffic
- **THEN** the display SHALL show 20-50 vehicles across the detection zone
- **AND** this SHALL represent actual road occupancy over the last 30 seconds
- **AND** traffic density patterns SHALL be clearly visible
- **AND** the visualization SHALL provide realistic representation of traffic flow

#### Scenario: Performance with extended retention
- **WHEN** 50+ vehicles are displayed with 30-second trails
- **THEN** frame rate SHALL remain at 60fps or above
- **AND** render time per frame SHALL not exceed 16.67ms
- **AND** memory usage SHALL remain under 500KB for vehicle objects
- **AND** canvas rendering SHALL maintain smooth animations

