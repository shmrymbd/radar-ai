# Add Live Vehicle Tracking View

## Why

The current dashboard provides excellent traffic signal control capabilities but lacks a real-time visual representation of vehicle movements. Traffic engineers need to see live vehicle tracking to:

- **Visualize Traffic Flow**: Understand how vehicles move through the intersection in real-time
- **Identify Congestion Patterns**: Spot bottlenecks and queue formation visually
- **Validate Radar Data**: Confirm that radar detection matches actual traffic conditions
- **Optimize Signal Timing**: Make informed decisions based on visual traffic patterns
- **Monitor System Performance**: Ensure radar system is detecting vehicles accurately

## What Changes

### New Live Tracking Tab
- **Real-time Vehicle Visualization**: WebSocket-powered live view showing vehicle positions, sizes, and movements
- **Coordinate System Mapping**: Convert radar X,Y coordinates to visual representation (0-300m range)
- **Vehicle Classification Display**: Show different vehicle types with size-appropriate visual indicators
- **Movement Tracking**: Display vehicle trajectories and speed vectors
- **Lane Visualization**: Overlay lane boundaries and detection zones

### Enhanced WebSocket Infrastructure
- **Dedicated Tracking Channel**: Separate WebSocket stream for high-frequency vehicle position updates
- **Optimized Data Processing**: Real-time coordinate transformation and vehicle state management
- **Client-Side Rendering**: Canvas-based visualization for smooth 60fps vehicle tracking
- **Efficient Updates**: Delta-based updates to minimize bandwidth usage

### Vehicle Tracking Features
- **Position Tracking**: Real-time X,Y coordinates with 0.1m resolution
- **Size-Based Rendering**: Vehicles rendered proportional to actual dimensions (length, width, height)
- **Speed Visualization**: Color-coded speed indicators and movement vectors
- **Vehicle Classification**: Visual distinction between cars, trucks, motorcycles, etc.
- **Trajectory History**: Optional trail display showing recent vehicle paths

## Impact

### User Experience
- **Enhanced Monitoring**: Traffic engineers can visually verify radar data accuracy
- **Improved Decision Making**: Visual context for signal timing adjustments
- **Real-time Awareness**: Immediate understanding of traffic conditions and patterns
- **System Validation**: Visual confirmation that radar system is working correctly

### Technical Benefits
- **WebSocket Optimization**: Dedicated high-frequency data stream for tracking
- **Performance**: Canvas-based rendering for smooth real-time visualization
- **Scalability**: Efficient data processing for multiple simultaneous users
- **Integration**: Seamless integration with existing dashboard architecture

### Traffic Engineering Value
- **Queue Visualization**: See how queues form and dissipate in real-time
- **Flow Pattern Analysis**: Understand traffic movement patterns and bottlenecks
- **Signal Timing Validation**: Visual confirmation of signal timing effectiveness
- **Incident Detection**: Spot unusual traffic patterns or system issues quickly

## Success Criteria

- **Real-time Performance**: Vehicle positions update within 100ms of radar detection
- **Visual Accuracy**: Vehicle sizes and positions accurately represent radar measurements
- **Smooth Rendering**: 60fps visualization with no lag or stuttering
- **Multi-user Support**: Support 10+ concurrent users viewing live tracking
- **Data Efficiency**: WebSocket updates optimized for minimal bandwidth usage
- **User Adoption**: Traffic engineers actively use live tracking for decision making
