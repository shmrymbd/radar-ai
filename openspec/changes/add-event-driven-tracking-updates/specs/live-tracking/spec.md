# live-tracking Specification

## ADDED Requirements

### Requirement: Event-Driven Tracking Updates
The system SHALL use event-driven architecture with Redis keyspace notifications to match the radar's actual transmission rate, providing real-time tracking updates with minimal latency.

#### Scenario: Real-time tracking update on radar transmission
- **WHEN** the radar device transmits ObjectData to Redis via LPUSH/RPUSH operation
- **THEN** the system SHALL receive Redis keyspace notification immediately
- **AND** the system SHALL process and broadcast tracking updates within milliseconds
- **AND** the update rate SHALL match the radar's transmission frequency (multiple times per second)
- **AND** WebSocket clients SHALL receive tracking updates without polling delays

#### Scenario: Keyspace notification subscription
- **WHEN** the WebSocket server initializes
- **THEN** it SHALL subscribe to Redis keyspace notifications for ObjectData keys (`__keyspace@0__:{deviceId}/objectdata`)
- **AND** it SHALL register callback handlers for ObjectData messages
- **AND** it SHALL automatically process ObjectData events as they arrive

#### Scenario: Fallback polling mechanism
- **WHEN** Redis keyspace notifications are unavailable or fail
- **THEN** the system SHALL fall back to polling-based updates at 5-second intervals
- **AND** tracking updates SHALL continue to work despite notification failures
- **AND** the system SHALL log fallback activation for monitoring

#### Scenario: Tracking summary throttling
- **WHEN** ObjectData events are received at high frequency
- **THEN** tracking summary updates SHALL be throttled to maximum once per second
- **AND** individual tracking updates SHALL not be throttled
- **AND** the system SHALL prevent excessive WebSocket message spam

#### Scenario: Multi-device ObjectData support
- **WHEN** ObjectData keyspace notifications are received for different devices
- **THEN** the system SHALL correctly identify the device ID from the notification channel
- **AND** tracking updates SHALL be scoped to the correct device
- **AND** WebSocket broadcasts SHALL include device identification

