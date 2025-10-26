## Why

Traffic engineers need visual confirmation of radar data accuracy and real-time monitoring of intersection conditions. The current dashboard provides comprehensive radar data analysis but lacks visual verification capabilities. Adding RTSP video streaming will enable traffic engineers to correlate radar detection data with actual vehicle movements, improving system reliability and providing visual context for traffic signal optimization decisions.

## What Changes

- **ADDED**: Video streaming page with RTSP camera integration
- **ADDED**: Camera settings and configuration management
- **ADDED**: Real-time video feed display with radar data overlay
- **ADDED**: Multi-camera support for different intersection views
- **ADDED**: Video recording and playback capabilities for incident analysis
- **MODIFIED**: Dashboard navigation to include video streaming tab
- **MODIFIED**: Device context to support camera device management

## Impact

- Affected specs: `dashboard` (navigation and layout), new `video-streaming` capability
- Affected code: 
  - `src/app/page.tsx` (new video tab)
  - `src/components/DashboardLayout.tsx` (navigation update)
  - `src/contexts/DeviceContext.tsx` (camera device support)
  - New video streaming components and API routes
- New dependencies: WebRTC/RTSP streaming libraries, video processing tools
- Infrastructure: RTSP to WebRTC conversion service, video storage capabilities
