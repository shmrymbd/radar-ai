# Radar Device Selection Specification

## ADDED Requirements

### Requirement: Device Selection Interface
The system SHALL provide a device selector interface that allows traffic engineers to choose which radar device to monitor.

#### Scenario: Device selector dropdown
- **WHEN** a traffic engineer opens the dashboard
- **THEN** they see a device selector dropdown in the header
- **AND** the dropdown shows available radar devices (test, Radar04, Radar05)
- **AND** the currently selected device is highlighted
- **AND** device status indicators show online/offline status

#### Scenario: Device switching
- **WHEN** a traffic engineer selects a different radar device
- **THEN** all dashboard data immediately updates to show data from the selected device
- **AND** WebSocket connections switch to the selected device
- **AND** device switching completes within 2 seconds
- **AND** no page reload is required

### Requirement: Multi-Device Data Management
The system SHALL support multiple radar devices with isolated data streams.

#### Scenario: Device-specific data isolation
- **WHEN** multiple radar devices are configured (Radar04, Radar05)
- **THEN** data from each device is stored separately in Redis
- **AND** WebSocket channels are device-specific
- **AND** API endpoints return data only for the selected device
- **AND** no cross-device data contamination occurs

#### Scenario: Device-specific real-time updates
- **WHEN** multiple traffic engineers monitor different devices
- **THEN** each engineer receives real-time updates only for their selected device
- **AND** WebSocket server supports 10+ concurrent device connections
- **AND** device-specific data channels prevent cross-device updates

### Requirement: Device Configuration Management
The system SHALL support configurable radar device management.

#### Scenario: Device configuration
- **WHEN** a system administrator adds a new radar device
- **THEN** the device appears in the device selector dropdown
- **AND** device configuration is manageable via environment variables
- **AND** device status monitoring and health checks are available
- **AND** configuration validation prevents invalid device setups

## MODIFIED Requirements

### Requirement: Enhanced Dashboard Header
The existing dashboard header SHALL include radar device selection capabilities.

#### Scenario: Device selector integration
- **WHEN** the dashboard header is displayed
- **THEN** it includes a device selector dropdown
- **AND** the selected device is visually indicated
- **AND** device status indicators show online/offline status
- **AND** the design is responsive for different screen sizes

### Requirement: Device-Aware API Endpoints
The existing API endpoints SHALL support device-specific data retrieval.

#### Scenario: Device parameter support
- **WHEN** API endpoints are called with a device parameter
- **THEN** they return data specific to that device
- **AND** Redis keys are constructed using the device prefix
- **AND** fallback to default device occurs if no device is specified
- **AND** consistent device parameter handling across all endpoints

### Requirement: Multi-Device WebSocket Server
The existing WebSocket server SHALL support device-specific subscriptions.

#### Scenario: Device-specific WebSocket channels
- **WHEN** clients connect to the WebSocket server
- **THEN** they can subscribe to specific device channels
- **AND** device-specific data is broadcast to subscribers
- **AND** connection management supports multiple devices
- **AND** efficient broadcasting prevents performance degradation

## REMOVED Requirements

### Requirement: Hardcoded Device References
The system SHALL remove all hardcoded "Radar04" references throughout the codebase.

#### Scenario: Dynamic device selection
- **WHEN** the system is deployed
- **THEN** no hardcoded device IDs exist in Redis key construction
- **AND** no hardcoded device references exist in API endpoints
- **AND** no hardcoded device references exist in WebSocket servers
- **AND** dynamic device selection is used throughout the system