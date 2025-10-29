# Adaptive Signal Control Visualization Specification

## Purpose
Enable traffic engineers to visualize how ClairWav-T80 radar data (packets 0x01-0x05) drives Adaptive Traffic Signal Control (ASC) decisions in real-time, showing phase timing logic, queue management, and priority control recommendations.

## ADDED Requirements

### Requirement: Green Phase Duration Visualization
The system SHALL visualize phase timing control logic based on headway time, occupancy rate, and queue count.

#### Scenario: Headway-based gap-out indication
- **GIVEN** radar provides headway time data from 0x03 packets
- **WHEN** headway time exceeds configured threshold (default 3.0 seconds)
- **THEN** display "Gap-Out Active" indicator with green checkmark
- **AND** show current headway time vs. threshold (e.g., "3.2s / 3.0s")
- **AND** recommend "Gap-Out" with reasoning "Demand satisfied - headway exceeds threshold"

#### Scenario: Occupancy-based demand confirmation
- **GIVEN** radar provides virtual loop occupancy from 0x03 packets
- **WHEN** occupancy rate drops below minimum threshold (default 5%)
- **THEN** display circular gauge showing occupancy percentage
- **AND** color gauge red when below threshold, green when above
- **AND** add secondary gap-out confirmation to recommendation

#### Scenario: Queue-based green extension
- **GIVEN** radar provides vehicle count in queue from 0x04 packets
- **WHEN** queue count is high (>5 vehicles) and phase not at max green
- **THEN** display queue count with upward trend indicator
- **AND** show "Max Green Extension Active" status badge
- **AND** recommend "Extend +10s" with reasoning "High demand - queue count: 7 vehicles"

#### Scenario: Phase status display
- **GIVEN** signal controller is managing traffic phases
- **WHEN** a green phase is active
- **THEN** display current phase number (e.g., "Phase 2")
- **AND** show time remaining vs. max green (e.g., "00:38 / 01:20")
- **AND** show timing recommendation (extend/gap-out/maintain)

---

### Requirement: Queue & Spillback Management Visualization
The system SHALL visualize queue-based emergency controls to prevent spillback and gridlock.

#### Scenario: Queue length spillback warning
- **GIVEN** radar provides queue length data from 0x04 packets
- **WHEN** queue length approaches spillback threshold (e.g., 62m vs. 75m threshold)
- **THEN** display linear gauge with current queue length
- **AND** mark danger zone in red when >80% of threshold
- **AND** show threshold value clearly (e.g., "62m / 75m Spillback Threshold")

#### Scenario: Queue overflow emergency alert
- **GIVEN** radar reports overflow status from 0x04 packets
- **WHEN** `queue.overflow === true`
- **THEN** display prominent red alert banner "QUEUE OVERFLOW - EMERGENCY RECALL"
- **AND** recommend "Call Opposing Phase" immediately
- **AND** set urgency level to "critical"

#### Scenario: Lead vehicle position validation
- **GIVEN** radar provides lead vehicle position from 0x04 packets
- **WHEN** queue head is detected relative to stop line
- **THEN** display distance from stop line (e.g., "5.2m from stop line")
- **AND** show visual stop line indicator
- **AND** use for queue detection zone validation

#### Scenario: Multi-lane queue monitoring
- **GIVEN** multiple lanes report queue data from 0x04 packets
- **WHEN** displaying queue management panel
- **THEN** show queue status for each configured lane
- **AND** allow filtering to specific lane if selected
- **AND** highlight lanes in critical spillback condition (red)

---

### Requirement: Priority & Safety Control Visualization
The system SHALL visualize vehicle classification impact on signal timing for transit priority and pedestrian safety.

#### Scenario: Transit Signal Priority (TSP) activation
- **GIVEN** radar detects buses from 0x03 vehicle flows or 0x01 object data
- **WHEN** bus is present in approach zone (targetType === 7 or busFlow > 0)
- **THEN** display "Transit Signal Priority" indicator with bus icon 🚌
- **AND** show active status badge in blue
- **AND** display action: "Extend Green +20s" or "Shorten Opposing Phase"

#### Scenario: Pedestrian/Cyclist recall activation
- **GIVEN** radar detects pedestrians or cyclists from 0x01 object data
- **WHEN** non-motorized vehicle detected (targetType === 13 for pedestrian or 5 for bicycle)
- **THEN** display "Non-Motorized Vehicle Recall" indicator with icons 🚶🚴
- **AND** show active status badge in green
- **AND** display action: "Pedestrian Phase Called Automatically"

#### Scenario: Heavy vehicle phase extension
- **GIVEN** radar detects large trucks from 0x01 object data
- **WHEN** heavy vehicle present (targetType === 8 for large truck)
- **THEN** display "Heavy Vehicle Extension" indicator with truck icon 🚛
- **AND** show active status badge in orange
- **AND** display extension time: "+15s Clearance Time"

#### Scenario: Priority control inactive state
- **GIVEN** no priority vehicles detected
- **WHEN** displaying priority control panel
- **THEN** show all indicators in inactive/gray state
- **AND** display "Inactive" badges for TSP, NMV Recall, Heavy Vehicle
- **AND** keep indicators visible for situational awareness

---

### Requirement: Algorithm Status Indicators
The system SHALL display real-time status of active ASC rules and their recommendations.

#### Scenario: Active rule status badges
- **GIVEN** ASC logic evaluates radar data every second
- **WHEN** any ASC rule condition is met
- **THEN** display corresponding status badge with icon and label
- **AND** use color coding: green (normal), amber (caution), red (critical)
- **AND** show only active rules or gray out inactive rules

#### Scenario: Gap-out rule indication
- **GIVEN** headway time and occupancy data meet gap-out conditions
- **WHEN** headway > 3.0s AND occupancy < 5%
- **THEN** display "✅ Gap-Out Active" badge
- **AND** add tooltip: "Headway exceeds threshold - Phase can terminate"

#### Scenario: Max green extension indication
- **GIVEN** queue count is high and demand is active
- **WHEN** queue count > 5 vehicles AND headway < 3.0s
- **THEN** display "⚠️ Max Green Extension" badge
- **AND** add tooltip: "Queue count high - Phase extended to maximum"

#### Scenario: Spillback prevention indication
- **GIVEN** queue length exceeds spillback threshold
- **WHEN** queue length > 75m OR overflow === true
- **THEN** display "🚨 Spillback Prevention" badge
- **AND** add tooltip: "Queue exceeds threshold - Emergency phase call"

#### Scenario: Transit priority indication
- **GIVEN** bus detected in approach zone
- **WHEN** busFlow > 0 OR targetType === 7 detected
- **THEN** display "🚌 Transit Priority" badge
- **AND** add tooltip: "Bus detected - TSP active"

#### Scenario: Pedestrian recall indication
- **GIVEN** pedestrian or cyclist detected
- **WHEN** targetType === 13 OR targetType === 5 detected
- **THEN** display "🚶 Pedestrian Recall" badge
- **AND** add tooltip: "NMV detected - Pedestrian phase called"

---

### Requirement: ASC Threshold Configuration
The system SHALL allow traffic engineers to configure ASC thresholds per lane or device.

#### Scenario: Max headway threshold configuration
- **GIVEN** traffic engineer opens Lane Config Modal
- **WHEN** navigating to "Signal Control" tab
- **THEN** display input field for "Max Headway Threshold (seconds)"
- **AND** default value is 3.0 seconds
- **AND** allow range 1.0 - 10.0 seconds
- **AND** save to MongoDB with other lane configuration

#### Scenario: Occupancy threshold configuration
- **GIVEN** traffic engineer configures lane settings
- **WHEN** in "Signal Control" tab
- **THEN** display input field for "Min Occupancy Threshold (%)"
- **AND** default value is 5%
- **AND** allow range 1% - 20%

#### Scenario: Spillback threshold configuration
- **GIVEN** traffic engineer knows distance to upstream intersection
- **WHEN** in "Signal Control" tab
- **THEN** display input field for "Spillback Threshold (meters)"
- **AND** default value is 75 meters
- **AND** allow range 20 - 200 meters
- **AND** add helper text: "Distance to upstream intersection minus safety buffer"

#### Scenario: Priority extension times configuration
- **GIVEN** traffic engineer configures priority timing
- **WHEN** in "Signal Control" tab
- **THEN** display inputs for "Transit Priority Extension (seconds)"
- **AND** display input for "Heavy Vehicle Extension (seconds)"
- **AND** display input for "Pedestrian Recall Delay (seconds)"
- **AND** save all values per lane configuration

---

### Requirement: Real-time ASC Data Updates
The system SHALL provide sub-second latency updates for ASC visualizations using WebSocket.

#### Scenario: WebSocket signal control channel
- **GIVEN** Adaptive Signal Control dashboard is open
- **WHEN** component mounts
- **THEN** subscribe to WebSocket channel "signal_control"
- **AND** listen for "signal_control_update" events
- **AND** update all panels when new data received

#### Scenario: Debounced update frequency
- **GIVEN** radar data updates multiple times per second
- **WHEN** processing signal control logic
- **THEN** debounce updates to 1-second intervals
- **AND** batch multiple radar packets into single ASC evaluation
- **AND** only emit WebSocket events when ASC state changes

#### Scenario: Device-specific signal control data
- **GIVEN** multiple radar devices may be active
- **WHEN** fetching signal control status
- **THEN** filter data by selected device ID
- **AND** show "No Data" state if device has no recent radar data
- **AND** display last update timestamp

---

### Requirement: ASC Dashboard Integration
The system SHALL integrate adaptive signal control visualization into existing Control Center interface.

#### Scenario: Control Center ASC section
- **GIVEN** Control Center tab is active
- **WHEN** displaying three-panel layout
- **THEN** add collapsible "Adaptive Signal Control" section below panels
- **AND** show expand/collapse toggle button
- **AND** default to expanded state on first visit

#### Scenario: Responsive ASC layout
- **GIVEN** ASC dashboard renders on various screen sizes
- **WHEN** on desktop (≥1280px)
- **THEN** display 2×2 grid: Phase panel, Queue panel, Priority panel, Status bar
- **WHEN** on tablet (768-1279px)
- **THEN** display vertical stack of all 4 panels
- **WHEN** on mobile (<768px)
- **THEN** display accordion with one panel visible at a time

#### Scenario: Lane-specific ASC filtering
- **GIVEN** ASC dashboard displays multi-lane data
- **WHEN** user selects specific lane from dropdown
- **THEN** filter all ASC data to selected lane only
- **AND** show lane number in panel headers (e.g., "Phase Control - Lane 11")
- **AND** persist lane selection in session storage

---

## MODIFIED Requirements

### Requirement: Signal Control Interface
The system SHALL provide interface for traffic engineers to **visualize and monitor** signal timing **recommendations**.

**Changes**:
- Add visualization capabilities (previously only control interface)
- Add real-time monitoring of ASC algorithm decisions
- Add threshold configuration for ASC rules
- Recommendations are displayed but not automatically applied (manual control remains)

#### Scenario: ASC recommendation display
- **GIVEN** ASC algorithm evaluates traffic conditions
- **WHEN** phase timing recommendation is generated
- **THEN** display recommendation prominently (e.g., "Extend +10s")
- **AND** show reasoning (e.g., "High demand - queue count: 7")
- **AND** allow traffic engineer to manually accept or override
- **AND** log recommendation and engineer action for audit

---

### Requirement: Performance Monitoring
The system SHALL monitor and report on signal timing performance **with real-time ASC metrics**.

**Changes**:
- Add ASC rule activation frequency metrics
- Add average response time for spillback prevention
- Add priority vehicle service rate tracking

#### Scenario: ASC performance metrics
- **GIVEN** ASC system has been active for reporting period
- **WHEN** generating performance report
- **THEN** include "Gap-Out Rule Activations" count
- **AND** include "Spillback Preventions" count with severity
- **AND** include "Transit Priority Activations" and average delay savings
- **AND** include "Pedestrian Recalls" and average wait time reduction
