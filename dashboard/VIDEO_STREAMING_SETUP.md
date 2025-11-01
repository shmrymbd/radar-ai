# Video Streaming Setup Guide

This guide explains how to set up and use the video streaming capabilities in the Traffic Signal Control Dashboard.

## Overview

The video streaming system provides real-time camera feeds from RTSP cameras, enabling traffic engineers to visually correlate radar data with actual vehicle movements. The system uses WebRTC technology for low-latency streaming in web browsers.

## Architecture

- **RTSPtoWebRTC Service**: Converts RTSP streams to WebRTC format
- **WebRTC Client**: Handles browser-based video streaming
- **Video Storage**: Manages recorded video files
- **API Endpoints**: RESTful APIs for camera and stream management

## Prerequisites

- Docker installed and running
- Node.js 18+ for the dashboard
- RTSP cameras with network access
- Modern web browser with WebRTC support

## Quick Start

### 1. Start the Video Streaming Service

```bash
# Start the RTSPtoWebRTC service
./start-video-streaming.sh

# Test the service
./test-video-service.sh
```

### 2. Access the Dashboard

1. Start the dashboard: `npm run dev`
2. Navigate to the "Video Streaming" tab
3. Configure cameras in the "Camera Settings" tab
4. View live streams in the "Live Streams" tab

## Configuration

### Camera Configuration

1. **Navigate to Camera Settings**: Click the "Camera Settings" tab
2. **Add New Camera**: Click "Add Camera" button
3. **Fill in Details**:
   - **Camera Name**: Descriptive name for the camera
   - **RTSP URL**: Full RTSP URL (e.g., `rtsp://192.168.1.100:554/stream`)
   - **Username/Password**: Camera authentication credentials
   - **Resolution**: Video resolution (default: 1920x1080)
   - **Frame Rate**: Frames per second (default: 30)
   - **Bitrate**: Video bitrate in bps (default: 2,000,000)

4. **Test Connection**: Click "Test" to verify camera connectivity
5. **Save Configuration**: Camera will be available for streaming

### Service Configuration

The RTSPtoWebRTC service runs on port 8083 by default. To change this:

1. Edit `docker-compose.video.yml`
2. Update the port mapping: `"8083:8083"` → `"YOUR_PORT:8083"`
3. Restart the service: `docker compose -f docker-compose.video.yml down && ./start-video-streaming.sh`

**Note**: The startup script auto-detects modern `docker compose` or legacy `docker-compose`.

## Usage

### Live Streaming

1. **Start Streams**: Go to "Live Streams" tab
2. **Select Camera**: Choose from configured cameras
3. **Start Stream**: Click "Start Stream" button
4. **View Video**: Video feed will appear in the grid
5. **Stop Stream**: Click "Stop Stream" to end the feed

### Video Recording

1. **Manual Recording**: Click record button on active streams
2. **Automatic Recording**: Configure automatic recording on radar events
3. **View Recordings**: Access recordings in the "Recordings" tab
4. **Download**: Download recordings for offline analysis

### Multi-Camera Support

- **Grid View**: View multiple cameras simultaneously
- **Individual Control**: Start/stop streams independently
- **Status Monitoring**: Real-time connection status for each camera

## API Endpoints

### Camera Management
- `GET /api/video/cameras` - List all cameras
- `POST /api/video/cameras` - Add new camera
- `PUT /api/video/cameras` - Update camera configuration
- `DELETE /api/video/cameras?id={id}` - Delete camera
- `POST /api/video/cameras/test` - Test camera connection

### Stream Management
- `GET /api/video/streams` - List active streams
- `POST /api/video/streams` - Start new stream
- `DELETE /api/video/streams?cameraId={id}` - Stop stream

### Recording Management
- `GET /api/video/recordings` - List recordings
- `POST /api/video/recordings` - Start recording
- `DELETE /api/video/recordings?filename={name}` - Delete recording
- `GET /api/video/recordings/download?filename={name}` - Download recording

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check Docker status
docker info

# Check service logs
docker compose -f docker-compose.video.yml logs

# Restart service
docker compose -f docker-compose.video.yml down
./start-video-streaming.sh
```

#### Camera Connection Failed
1. **Verify RTSP URL**: Ensure URL is correct and accessible
2. **Check Network**: Test network connectivity to camera
3. **Authentication**: Verify username/password are correct
4. **Camera Settings**: Check camera's RTSP settings and ports

#### Video Not Displaying
1. **Browser Support**: Ensure browser supports WebRTC
2. **Service Status**: Check if RTSPtoWebRTC service is running
3. **Network Issues**: Check for firewall or network restrictions
4. **Stream Status**: Verify stream is active in the API

#### Performance Issues
1. **Resolution**: Lower video resolution for better performance
2. **Bitrate**: Reduce bitrate to decrease bandwidth usage
3. **Frame Rate**: Lower frame rate for smoother playback
4. **Network**: Check network bandwidth and latency

### Debug Mode

Enable debug logging by setting environment variables:

```bash
export DEBUG=webrtc:*
export RTSP_TO_WEBRTC_DEBUG=true
```

### Service Health Check

```bash
# Test service health
curl http://localhost:8083/api/health

# Test with sample camera
curl -X POST http://localhost:8083/api/stream/test \
  -H "Content-Type: application/json" \
  -d '{"url":"rtsp://test.example.com:554/stream"}'
```

## Security Considerations

### Network Security
- Use VPN or secure network for camera access
- Implement firewall rules for RTSP ports
- Use HTTPS for dashboard access in production

### Authentication
- Secure camera credentials
- Implement user authentication for dashboard
- Use strong passwords for camera access

### Data Privacy
- Configure video retention policies
- Implement access controls for recordings
- Consider data encryption for sensitive footage

## Performance Optimization

### Bandwidth Management
- Use adaptive bitrate streaming
- Implement quality controls
- Monitor network usage

### Storage Management
- Configure automatic cleanup policies
- Monitor disk space usage
- Implement compression for recordings

### Scalability
- Use load balancing for multiple cameras
- Implement caching for frequently accessed streams
- Consider CDN for video distribution

## Integration with Radar Data

The video streaming system integrates with the existing radar data processing:

1. **Data Correlation**: Overlay radar objects on video feeds
2. **Event Recording**: Automatic recording on radar events
3. **Unified Dashboard**: Single interface for radar and video data
4. **Device Management**: Unified device selection for radar and cameras

## Support

For technical support or questions:

1. Check the troubleshooting section above
2. Review service logs for error messages
3. Test with the provided test scripts
4. Verify camera and network configuration

## Future Enhancements

Planned features for future releases:

- **AI Analytics**: Vehicle detection and classification
- **Motion Detection**: Automatic event detection
- **Cloud Storage**: Integration with cloud video storage
- **Mobile Support**: Mobile app for remote monitoring
- **Advanced Controls**: PTZ camera controls and presets
