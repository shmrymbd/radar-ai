## MODIFIED Requirements
### Requirement: Real-time Traffic Dashboard
The system SHALL provide a real-time dashboard for traffic engineers to monitor and control traffic signals using radar data from ClairWav-T80 systems with an optimized side-by-side layout for Live Tracking.

#### Scenario: Side-by-side layout display
- **WHEN** users access the Live Tracking tab
- **THEN** the radar data analysis card is displayed on the left side
- **AND** the tracking map canvas is displayed on the right side
- **AND** both components are visible simultaneously without scrolling

#### Scenario: Responsive layout behavior
- **WHEN** users view the Live Tracking tab on different screen sizes
- **THEN** the side-by-side layout adapts appropriately for desktop, tablet, and mobile views
- **AND** the radar analysis card maintains readability and functionality
- **AND** the tracking map maintains proper sizing and interactivity

#### Scenario: Preserved functionality in new layout
- **WHEN** users interact with the radar analysis card in its new left position
- **THEN** all existing functionality remains intact
- **AND** vehicle statistics, lane scenarios, and interactive elements work as before
- **AND** the tracking map maintains all zoom, pan, and vehicle selection capabilities

#### Scenario: ObjectData validation from Redis
- **WHEN** the radar analysis card displays vehicle data
- **THEN** it validates and displays real data from 0x01 packet ObjectData
- **AND** data is retrieved from Redis using the `deviceId/ObjectData` key pattern
- **AND** vehicle statistics reflect actual ObjectData entries from the radar system
- **AND** lane analysis is based on real vehicle positions from ObjectData packets
