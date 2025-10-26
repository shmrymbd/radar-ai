## Context

The traffic signal control dashboard currently processes real-time radar data from ClairWav-T80 systems but lacks visual verification capabilities. Traffic engineers need to correlate radar detection data with actual vehicle movements to ensure system accuracy and make informed signal timing decisions. This requires integrating RTSP video streams from intersection cameras with the existing radar data processing pipeline.

## Goals / Non-Goals

### Goals
- Provide real-time video streaming from intersection cameras via RTSP
- Enable visual correlation between radar data and actual vehicle movements
- Support multiple camera views for comprehensive intersection monitoring
- Integrate video feeds with existing radar data dashboard
- Provide camera configuration and management capabilities
- Ensure low-latency video streaming for real-time decision making

### Non-Goals
- Video analytics or AI-based vehicle detection (radar data is primary source)
- Complex video editing or post-processing capabilities
- Mobile app development (web-based solution only)
- Integration with external video management systems

## Decisions

### Decision: WebRTC over HLS for Real-time Streaming
**Rationale**: WebRTC provides lower latency (<500ms) compared to HLS (2-5s), which is critical for real-time traffic signal control decisions. WebRTC also supports bidirectional communication for camera control.

**Alternatives considered**:
- HLS: Better browser compatibility but higher latency
- Direct RTSP: Not supported by browsers without plugins
- WebSocket streaming: More complex implementation

### Decision: RTSPtoWebRTC Conversion Service
**Rationale**: Use existing open-source solution (RTSPtoWebRTC) to convert RTSP streams to WebRTC format. This provides a proven, lightweight solution that can be deployed alongside the existing infrastructure.

**Alternatives considered**:
- Custom FFmpeg-based solution: More complex to maintain
- Commercial streaming services: Additional cost and dependency
- Browser plugins: Poor user experience and security concerns

### Decision: Camera Device Integration with Existing Device Context
**Rationale**: Extend the existing device management system to include camera devices, maintaining consistency with radar device selection patterns.

**Alternatives considered**:
- Separate camera management system: Would create inconsistency
- External camera management: Would require additional authentication

### Decision: Video Storage for Incident Analysis
**Rationale**: Store video recordings for traffic incidents and system validation, enabling post-event analysis and system improvement.

**Alternatives considered**:
- No video storage: Would limit incident analysis capabilities
- Cloud storage: Additional cost and complexity
- Local storage only: Limited scalability

## Risks / Trade-offs

### Risk: Network Bandwidth Requirements
**Mitigation**: Implement adaptive bitrate streaming and video quality controls to manage bandwidth usage.

### Risk: Browser Compatibility
**Mitigation**: Provide fallback to HLS streaming for older browsers, with clear user notifications about optimal browser requirements.

### Risk: RTSP Camera Authentication
**Mitigation**: Implement secure credential management and support for various camera authentication methods.

### Risk: Performance Impact on Dashboard
**Mitigation**: Lazy load video components and implement efficient video rendering to minimize impact on radar data processing.

## Migration Plan

### Phase 1: Infrastructure Setup
1. Deploy RTSPtoWebRTC conversion service
2. Configure camera network access
3. Set up video storage infrastructure

### Phase 2: Core Video Streaming
1. Implement video streaming page
2. Add camera device management
3. Integrate with existing dashboard navigation

### Phase 3: Advanced Features
1. Add video recording capabilities
2. Implement camera settings and controls
3. Add radar data overlay on video feeds

### Rollback Plan
- Disable video streaming tab in dashboard
- Remove video-related API routes
- Keep RTSPtoWebRTC service for future use

## Open Questions

- What is the expected number of concurrent video streams?
- Are there specific camera models or RTSP implementations to support?
- What video quality and resolution requirements exist?
- Should video recordings be automatically triggered by radar events?
- What are the data retention requirements for video recordings?
