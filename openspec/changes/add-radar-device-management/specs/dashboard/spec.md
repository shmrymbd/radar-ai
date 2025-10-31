# Dashboard Specification Deltas

## ADDED Requirements

### Requirement: Radar Device Management Interface
The system SHALL provide a comprehensive device management interface in the Settings tab for configuring radar devices including device ID, Redis connection parameters, and RTSP URLs.

#### Scenario: View device list in Settings tab
- **WHEN** user navigates to the Settings tab
- **THEN** they see a list of all configured radar devices
- **AND** each device shows device ID, name, status, Redis IP, and RTSP URL
- **AND** action buttons are available for edit, delete, and test connectivity

#### Scenario: Add new radar device with auto-switch
- **WHEN** user clicks "Add Device" button in Settings tab
- **THEN** a form modal opens with fields for device configuration
- **AND** fields include device ID, name, description, Redis host, Redis port, and RTSP URL
- **AND** form validates inputs in real-time (device ID format, IP address format, port range)
- **AND** user can test connectivity before saving
- **AND** after successful save, system automatically switches to the newly created device
- **AND** dashboard data refreshes to show new device's data

#### Scenario: Test device connectivity before saving
- **WHEN** user fills device form and clicks "Test Connectivity"
- **THEN** system validates Redis connection using provided host and port
- **AND** system validates RTSP URL format if provided
- **AND** test results are displayed with status icons (success/warning/error)
- **AND** save button is only enabled if connectivity test passes

#### Scenario: Edit existing radar device
- **WHEN** user clicks "Edit" button on a device in the list
- **THEN** form modal opens pre-filled with current device configuration
- **AND** user can modify any field except device ID (immutable)
- **AND** changes are validated in real-time
- **AND** connectivity can be re-tested before saving

#### Scenario: Delete radar device with confirmation
- **WHEN** user clicks "Delete" button on a device
- **THEN** a confirmation dialog appears with device name
- **AND** system prevents deleting the currently selected device
- **AND** after confirmation, device is removed from configuration
- **AND** device selector dropdown updates immediately

#### Scenario: Device configuration persistence
- **WHEN** user adds, edits, or deletes a device
- **THEN** configuration is saved to browser localStorage
- **AND** changes persist across browser sessions
- **AND** device selector dropdown reflects changes immediately
- **AND** fallback to DEFAULT_DEVICES if localStorage is corrupted

### Requirement: Device Configuration Export and Import
The system SHALL support exporting and importing device configurations as JSON files for backup and migration purposes.

#### Scenario: Export device configuration to JSON
- **WHEN** user clicks "Export Configuration" button
- **THEN** system generates JSON file with all configured devices
- **AND** file includes device schema version and timestamp
- **AND** file downloads to user's computer with descriptive filename
- **AND** warning message displays about sensitive data in export

#### Scenario: Import device configuration from JSON with replace
- **WHEN** user clicks "Import Configuration" button and selects a JSON file
- **THEN** system parses and validates the JSON file structure
- **AND** preview modal shows devices to be imported
- **AND** warning displays: "This will REPLACE all existing devices"
- **AND** after confirmation, all existing devices are replaced with imported devices
- **AND** system auto-switches to first device in imported list
- **AND** invalid JSON files show clear error messages with specific validation failures

#### Scenario: Reset to default device configuration
- **WHEN** user clicks "Reset to Defaults" button
- **THEN** confirmation dialog warns about losing custom configurations
- **AND** after confirmation, device list is reset to DEFAULT_DEVICES (test, Radar04)
- **AND** localStorage is cleared of custom device configurations
- **AND** device selector updates to show only default devices

### Requirement: Device Connectivity Validation
The system SHALL validate Redis and RTSP connectivity before allowing device configuration to be saved.

#### Scenario: Validate Redis connection parameters
- **WHEN** user provides Redis host and port for a device
- **THEN** system creates temporary Redis client with provided parameters
- **AND** sends PING command to verify connectivity
- **AND** checks if device-specific keys exist in Redis
- **AND** measures connection latency and displays result
- **AND** closes temporary connection after test

#### Scenario: Validate RTSP URL format
- **WHEN** user provides RTSP URL for a device
- **THEN** system validates URL starts with rtsp:// protocol
- **AND** validates URL has valid hostname and optional port
- **AND** displays warning that stream connectivity is not tested
- **AND** provides option to leave RTSP URL empty if not needed

#### Scenario: Handle connectivity test failures gracefully
- **WHEN** connectivity test fails for Redis or RTSP
- **THEN** detailed error message is displayed to user
- **AND** save button remains disabled until issue is resolved
- **AND** user can modify configuration and re-test
- **AND** previous test results are cleared when re-testing

### Requirement: Device Configuration Storage
The system SHALL persist device configurations in browser localStorage with schema versioning for future migrations.

#### Scenario: Save device configuration to localStorage
- **WHEN** device configuration changes (add, edit, delete)
- **THEN** DeviceConfigStorage saves updated configuration to localStorage
- **AND** configuration includes schema version for migration support
- **AND** configuration includes last modified timestamp
- **AND** localStorage quota exceeded errors are handled gracefully

#### Scenario: Load device configuration from localStorage
- **WHEN** application initializes or Settings tab is opened
- **THEN** DeviceConfigStorage attempts to load configuration from localStorage
- **AND** validates loaded configuration against expected schema
- **AND** migrates old schema versions to current version automatically
- **AND** falls back to DEFAULT_DEVICES if localStorage is empty or invalid

#### Scenario: Handle localStorage corruption or errors
- **WHEN** localStorage contains invalid or corrupted device configuration
- **THEN** system logs error to console for debugging
- **AND** displays user-friendly error message about configuration reset
- **AND** automatically falls back to DEFAULT_DEVICES
- **AND** provides "Reset to Defaults" button to clear corrupted data

## MODIFIED Requirements

### Requirement: Dashboard Navigation
The dashboard navigation SHALL include a "Settings" tab that provides access to device management and system configuration, replacing the previous placeholder.

**Previous:** Settings tab showed placeholder message "Settings panel coming soon..."

**New:** Settings tab displays full device management interface with device list, add/edit/delete capabilities, and import/export functionality.

#### Scenario: Settings tab displays device management interface
- **WHEN** user clicks Settings tab in dashboard navigation
- **THEN** RadarDeviceManager component loads with device list
- **AND** all device management features are accessible
- **AND** tab is highlighted as active in navigation
- **AND** loading state is shown while device configuration loads

### Requirement: Multi-Device Support
The system SHALL support multiple radar devices with dynamic device selection and seamless switching between different radar installations, with configuration managed via Settings tab.

**Previous:** Devices configured via environment variables or manual localStorage editing

**New:** Devices configured via Settings tab UI with form validation, connectivity testing, and export/import capabilities

#### Scenario: Device configuration via Settings tab UI
- **WHEN** user needs to add a new radar device to the system
- **THEN** they navigate to Settings tab and click "Add Device"
- **AND** complete form with device details and test connectivity
- **AND** save device which immediately appears in device selector dropdown
- **AND** no manual file editing or environment variable configuration required

#### Scenario: Device selector reflects Settings tab changes
- **WHEN** user adds, edits, or deletes a device in Settings tab
- **THEN** device selector dropdown in header updates immediately
- **AND** newly added devices are selectable
- **AND** edited device names are reflected
- **AND** deleted devices are removed from selector

## RENAMED Requirements

None

## REMOVED Requirements

None
