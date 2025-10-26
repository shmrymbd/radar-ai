# Historical Classification Charts User Guide

## Overview

The Historical Classification Charts feature provides comprehensive analysis of vehicle classification data over time, helping traffic engineers understand traffic patterns, optimize signal timing, and make data-driven decisions.

## Features

### Chart Types

1. **Histogram Charts**
   - Shows vehicle type distribution over time
   - Displays counts for each vehicle type (car, SUV, truck, motorcycle, van)
   - Provides visual representation of traffic composition

2. **Heatmap Charts**
   - 2D visualization of traffic density
   - Color-coded intensity based on vehicle counts
   - Time vs vehicle type analysis

3. **Trend Line Charts**
   - Shows traffic volume trends over time
   - Identifies peak hours and traffic patterns
   - Helps predict future traffic flow

4. **Comparative Charts**
   - Side-by-side comparison of different time periods
   - Useful for analyzing traffic changes
   - Supports 24hrs vs yesterday, yesterday vs month, etc.

5. **Peak Hour Analysis**
   - Identifies busiest periods
   - Shows traffic volume by hour
   - Helps optimize signal timing

6. **Vehicle Composition Charts**
   - Stacked area charts showing vehicle type evolution
   - Displays percentage breakdown over time
   - Useful for understanding traffic mix changes

7. **Lane Utilization Heatmaps**
   - Shows lane usage patterns over time
   - Color-coded utilization percentages
   - Helps identify lane-specific traffic patterns

8. **Speed Distribution Charts**
   - Histograms of speed ranges by vehicle type
   - Shows speed violations and average speeds
   - Useful for speed limit analysis

### Time Periods

- **Last 24 Hours**: Real-time data from the past 24 hours
- **Yesterday**: Complete data from the previous day
- **Last Month**: Historical data from the past 30 days

### Chart Customization

Access the settings panel by clicking the "⚙️ Settings" button to customize:

- **Grid Lines**: Show/hide chart grid lines
- **Legend**: Toggle legend visibility
- **Animation**: Enable/disable chart animations
- **Color Scheme**: Choose from default, colorblind-friendly, or monochrome
- **Font Size**: Adjust text size (small, medium, large)
- **Performance**: Enable virtualization for large datasets

### User Preferences

The system automatically saves your preferences:
- Default time period selection
- Default chart type
- Chart customization settings
- Performance settings

Preferences are stored in your browser's localStorage and will be restored when you return.

### Export Options

Export charts in multiple formats:
- **PNG**: High-quality image for presentations
- **SVG**: Vector format for scalable graphics
- **PDF**: Print-ready format with print dialog

### Performance Features

#### Virtualization
For large datasets (>500 data points), the system automatically enables virtualization:
- Shows data in pages of 100 items
- Navigation controls to browse through data
- Maintains performance with large datasets

#### Caching
- Frequently accessed data is cached for faster loading
- Cache automatically refreshes every 5 minutes
- Reduces server load and improves response times

## Usage Tips

### For Traffic Engineers

1. **Signal Timing Optimization**
   - Use peak hour analysis to identify busy periods
   - Compare different days to understand weekly patterns
   - Analyze lane utilization to optimize lane assignments

2. **Traffic Pattern Analysis**
   - Use trend charts to identify long-term patterns
   - Compare vehicle composition to understand traffic mix changes
   - Analyze speed distribution for safety assessments

3. **Performance Monitoring**
   - Monitor lane utilization heatmaps for congestion patterns
   - Use comparative charts to measure improvements
   - Track speed violations for enforcement planning

### Best Practices

1. **Data Interpretation**
   - Always consider the time period when analyzing data
   - Use comparative charts to validate findings
   - Look for patterns rather than single data points

2. **Chart Selection**
   - Use histograms for detailed vehicle type analysis
   - Use heatmaps for pattern identification
   - Use trend charts for time-based analysis

3. **Performance**
   - Enable virtualization for large datasets
   - Use appropriate time periods for your analysis
   - Export charts for offline analysis

## Troubleshooting

### Common Issues

1. **No Data Available**
   - Check if the selected time period has data
   - Verify device connection status
   - Try refreshing the data

2. **Slow Loading**
   - Enable virtualization for large datasets
   - Reduce the time period range
   - Check network connection

3. **Chart Not Displaying**
   - Ensure JavaScript is enabled
   - Check browser compatibility
   - Try refreshing the page

### Support

For technical support or feature requests, contact the system administrator.

## Data Sources

The historical charts are based on:
- Real-time radar data from ClairWav-T80 systems
- 15-minute aggregated data stored in MongoDB
- Vehicle classification data from PassData (0x05) packets
- Lane utilization data from LaneStatus (0x04) packets

## Privacy and Security

- All data is processed locally on your device
- No personal information is collected or stored
- Data is anonymized and aggregated for analysis
- Access is controlled through device authentication
