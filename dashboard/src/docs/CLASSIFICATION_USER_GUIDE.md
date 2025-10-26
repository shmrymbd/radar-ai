# Vehicle Classification Dashboard - User Guide

## Overview

The Vehicle Classification Dashboard provides comprehensive analytics for traffic engineers to analyze vehicle types, traffic composition, and intersection performance. This guide will help you navigate and utilize all the features effectively.

## Getting Started

### Accessing the Dashboard

1. Navigate to the main dashboard
2. Click on the "Classification" tab in the navigation menu
3. The dashboard will load with real-time data from your selected radar device

### Device Selection

The dashboard automatically uses your currently selected radar device. To switch devices:

1. Use the device selector in the top navigation
2. The classification data will update automatically to reflect the new device
3. All metrics and charts will refresh with device-specific data

## Dashboard Components

### Key Performance Indicators (KPIs)

The top section displays five key metrics:

- **Total Vehicles**: Current count of vehicles processed
- **Average Speed**: Mean speed across all vehicle types
- **Vehicle Types**: Number of different vehicle classifications detected
- **Speed Violations**: Count of vehicles exceeding speed limits
- **Peak Hour**: Hour with highest traffic volume

### Vehicle Type Distribution

This section shows the breakdown of vehicles by type:

- **Cars**: Passenger vehicles
- **SUVs**: Sport utility vehicles
- **Trucks**: Commercial vehicles
- **Motorcycles**: Two-wheeled vehicles
- **Vans**: Commercial passenger vehicles

Each type displays:
- Percentage of total traffic
- Vehicle count
- Average speed

### Lane Utilization Analysis

Shows traffic distribution across intersection lanes:

- **Lane 11/12**: Northbound lanes
- **Lane 31/32**: Southbound lanes

For each lane, you can see:
- Utilization percentage
- Vehicle count
- Average speed

## Real-time Features

### Live Data Updates

The dashboard updates automatically via WebSocket connections with:
- New vehicle classifications in real-time
- Updated speed statistics and metrics
- Live vehicle counting and distribution
- Performance monitoring and alerts
- Device-specific data synchronization
- Current lane utilization
- Real-time traffic counts

### WebSocket Connection

The dashboard maintains a persistent WebSocket connection for:
- Sub-second data updates
- Live vehicle counting
- Real-time speed analysis
- Dynamic lane utilization

## Historical Analysis

### Time-based Filtering

Access historical data by:
1. Selecting date/time ranges
2. Choosing aggregation periods (1min, 15min, 1hour, daily)
3. Filtering by vehicle types or lanes

### Peak Hour Analysis

Identify traffic patterns:
- Busiest hours of the day
- Vehicle type distribution by hour
- Speed patterns throughout the day
- Congestion indicators

## Data Export

### Export Options

1. **CSV Export**: Download raw data for external analysis
2. **JSON Export**: Machine-readable format for integration
3. **PDF Reports**: Formatted reports for documentation

### Custom Reports

Generate reports with:
- Custom time ranges
- Specific vehicle types
- Lane-specific data
- Performance metrics

## Troubleshooting

### Common Issues

#### No Data Displayed
- Check device selection
- Verify radar connection
- Ensure PassData (0x05) packets are being received

#### Slow Updates
- Check WebSocket connection status
- Verify network connectivity
- Refresh the page if needed

#### Missing Vehicle Types
- Confirm radar classification settings
- Check PassData packet structure
- Verify vehicle detection parameters

### Error Messages

#### "Error loading data"
- API connection issue
- Device not responding
- Data processing error

#### "Failed to fetch classification data"
- Network connectivity problem
- Server processing error
- Invalid device ID

## Best Practices

### For Traffic Engineers

1. **Regular Monitoring**: Check the dashboard every 15-30 minutes during peak hours
2. **Pattern Recognition**: Look for recurring traffic patterns and congestion points
3. **Speed Analysis**: Monitor speed violations and average speeds by vehicle type
4. **Lane Optimization**: Use utilization data to optimize lane assignments

### Data Analysis

1. **Peak Hour Planning**: Use historical data to plan signal timing
2. **Vehicle Type Trends**: Monitor changes in traffic composition
3. **Speed Violation Patterns**: Identify problem areas and times
4. **Lane Efficiency**: Compare utilization rates across lanes

### Performance Optimization

1. **Real-time Monitoring**: Use live data for immediate traffic management
2. **Historical Analysis**: Review past data for long-term planning
3. **Export Data**: Download data for detailed analysis in external tools
4. **Custom Reports**: Generate specific reports for stakeholders

## Advanced Features

### Custom Analytics

- **Query Builder**: Create custom data queries
- **Advanced Filters**: Filter by multiple criteria
- **Comparative Analysis**: Compare different time periods or lanes

### Integration

- **API Access**: Use REST API for custom integrations
- **WebSocket Streaming**: Real-time data streaming for custom applications
- **Data Export**: Multiple format support for external systems

## Support

### Technical Support

For technical issues:
1. Check the browser console for error messages
2. Verify network connectivity
3. Ensure all required services are running
4. Contact system administrator

### Documentation

- API Documentation: `/docs/API_CLASSIFICATION.md`
- Technical Specifications: `/docs/TECHNICAL_SPECS.md`
- System Architecture: `/docs/ARCHITECTURE.md`

## Glossary

- **PassData (0x05)**: Radar packet containing vehicle crossing events
- **Vehicle Classification**: Process of categorizing vehicles by type
- **Lane Utilization**: Percentage of lane capacity being used
- **Speed Violation**: Vehicle exceeding posted speed limit
- **Peak Hour**: Hour with highest traffic volume
- **Traffic Composition**: Distribution of vehicle types in traffic flow
- **Occupancy Rate**: Percentage of time a lane is occupied
- **Headway Time**: Time between consecutive vehicles
