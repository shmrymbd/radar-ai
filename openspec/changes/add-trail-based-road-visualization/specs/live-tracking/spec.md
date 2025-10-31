## ADDED Requirements

### Requirement: Trail-Based Road Visualization
The system SHALL infer and visualize road lane topology from accumulated vehicle trail data, creating a dynamic road map based on actual traffic patterns.

#### Scenario: Automatic lane detection
- **WHEN** at least 20 trail data points have been accumulated
- **THEN** the system SHALL analyze trail point density to detect lane centers
- **AND** lane boundaries SHALL be automatically inferred from vehicle movement patterns

#### Scenario: Heat map visualization
- **WHEN** trail data accumulates from vehicle movements
- **THEN** a heat map SHALL display traffic density with blue-to-red gradient (20-70% opacity)
- **AND** high-density areas SHALL appear red, low-density areas SHALL appear blue

#### Scenario: Lane separator visualization
- **WHEN** lanes are detected from trail data
- **THEN** dotted white lines SHALL be drawn to separate lanes (3px dots, 6px gaps)
- **AND** lane separators SHALL extend the full length of the detection zone

#### Scenario: Lane labeling
- **WHEN** lanes are detected and displayed
- **THEN** each lane SHALL be labeled with "Lane 1", "Lane 2", etc.
- **AND** labels SHALL be visible with white text and black outline

#### Scenario: Road visualization toggle
- **WHEN** user toggles "Show Road from Trails" checkbox
- **THEN** the heat map and lane visualization SHALL be shown or hidden
- **AND** the visualization SHALL update in real-time as vehicles move

#### Scenario: Continuous road updates
- **WHEN** new trail data accumulates
- **THEN** the road visualization SHALL update continuously
- **AND** lane detection SHALL improve with more accumulated data

#### Scenario: Lane detection sensitivity
- **WHEN** trail points are grouped by X position
- **THEN** lane centers SHALL be detected at density peaks above 15% of maximum
- **AND** lanes within 3 meters SHALL be merged to avoid duplicates

