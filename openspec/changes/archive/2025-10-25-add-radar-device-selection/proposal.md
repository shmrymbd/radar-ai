# Add Radar Device Selection Capability

## Overview
Enable the traffic signal control dashboard to support multiple radar devices and allow users to select which radar system to monitor. Currently, the system is hardcoded to use "Radar04" as the device identifier. This change will make the system configurable and support multiple radar installations.

## Problem Statement
The current system has the radar device ID hardcoded as "Radar04" throughout the codebase, making it impossible to:
- Monitor multiple radar installations
- Switch between different radar systems
- Support test environments with different device IDs
- Scale to multiple intersection monitoring

## Solution Approach
Implement a radar device selection system that:
1. Allows users to choose from available radar devices
2. Dynamically updates all data sources and WebSocket connections
3. Maintains backward compatibility with existing "Radar04" setup
4. Provides a clean UI for device selection
5. Supports both test and production radar configurations

## Scope
This change affects:
- Frontend dashboard components (device selector UI)
- Backend API endpoints (device-aware data retrieval)
- Redis storage layer (dynamic key prefixing)
- WebSocket servers (device-specific connections)
- Configuration management (environment variables)

## Success Criteria
- Users can select from available radar devices (test, Radar04, etc.)
- All dashboard data updates when device selection changes
- WebSocket connections switch to selected device data
- System maintains performance with multiple device support
- Backward compatibility preserved for existing deployments

## Dependencies
- Existing Redis storage infrastructure
- Current WebSocket server architecture
- Dashboard component structure
- API endpoint patterns

## Risks & Mitigations
- **Risk**: Breaking existing Radar04 deployments
- **Mitigation**: Maintain backward compatibility with default device selection
- **Risk**: Performance impact with multiple device monitoring
- **Mitigation**: Implement efficient device switching and caching
- **Risk**: Complex state management across components
- **Mitigation**: Use centralized device context and state management
