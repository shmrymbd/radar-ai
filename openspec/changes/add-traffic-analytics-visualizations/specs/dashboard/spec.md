# dashboard Spec Delta

## ADDED Requirements

### Requirement: Traffic Analytics Visualizations
The system SHALL provide a comprehensive Traffic Analytics dashboard with interactive visualizations for traffic pattern analysis, vehicle classification trends, speed compliance, and Level of Service metrics.

#### Scenario: Traffic Analytics tab displays six visualization widgets
- **WHEN** user clicks the "Traffic Analytics" tab in the Classification Dashboard
- **THEN** the dashboard displays 6 visualization widgets in a 2-column grid layout
- **AND** widgets include: Vehicle Classification, Traffic Count, Speed Percentage, Speed Count, Level of Service, and Vehicle Count by Type
- **AND** all widgets load with data from the selected device
- **AND** the tab is highlighted as active

#### Scenario: Time range filtering updates all visualizations
- **WHEN** user selects a time range (Last Hour, Last 24 Hours, Last 7 Days, or Custom)
- **THEN** all 6 visualization widgets update simultaneously with the new time range
- **AND** loading indicators show while data is being fetched
- **AND** charts maintain zoom/pan state where applicable

#### Scenario: Device switching updates analytics data
- **WHEN** user changes the selected device using the device selector
- **THEN** all analytics visualizations refresh with data from the new device
- **AND** current time range selection is preserved
- **AND** chart configurations (zoom level, selected metrics) are preserved

### Requirement: Vehicle Classification Time-Series Chart
The system SHALL provide a stacked bar chart showing vehicle classification distribution over time.

#### Scenario: Classification chart displays time-series data
- **WHEN** user views the Vehicle Classification widget
- **THEN** a stacked bar chart displays vehicle counts grouped by classification (class1-6)
- **AND** X-axis shows time intervals (hourly or daily based on time range)
- **AND** Y-axis shows volume count with appropriate scale
- **AND** each vehicle class is represented with a distinct color
- **AND** legend shows all 6 classes with their colors

#### Scenario: Interactive zoom on classification chart
- **WHEN** user drags across the classification chart
- **THEN** the chart zooms into the selected time range
- **AND** a "drag to zoom" indicator is shown before dragging
- **AND** zoom can be reset via a reset button or double-click
- **AND** zoom state persists until user changes time range or resets

#### Scenario: Hover tooltips on classification bars
- **WHEN** user hovers over a bar segment in the classification chart
- **THEN** a tooltip displays the time period, vehicle class, and exact count
- **AND** the hovered segment is highlighted
- **AND** tooltip follows cursor movement

### Requirement: Traffic Count Area Chart
The system SHALL provide an area chart showing total average traffic count with class breakdown over time.

#### Scenario: Traffic count chart displays stacked areas
- **WHEN** user views the Total Average Traffic Count widget
- **THEN** an area chart displays traffic volume with stacked areas for each class
- **AND** areas use gradient fills from dark to light
- **AND** X-axis shows time with smart interval selection
- **AND** Y-axis shows volume count
- **AND** curves are smooth for visual clarity

#### Scenario: Traffic count zoom functionality
- **WHEN** user drags to select a region on the traffic count chart
- **THEN** the chart zooms into the selected time range
- **AND** all stacked areas remain visible and proportional
- **AND** zoom can be reset to show full time range

### Requirement: Speed Compliance Visualization
The system SHALL provide visualizations for speed compliance analysis showing overspeed and underspeed percentages.

#### Scenario: Speed percentage donut chart
- **WHEN** user views the Speed Percentage widget
- **THEN** a donut chart displays overspeed vs. underspeed percentages
- **AND** overspeed is shown in orange color
- **AND** underspeed is shown in yellow color
- **AND** percentage values are displayed on the chart
- **AND** legend shows both categories with counts and percentages

#### Scenario: Speed percentage calculation
- **WHEN** speed data is processed for the speed percentage chart
- **THEN** vehicles exceeding the speed limit threshold are counted as overspeed
- **AND** vehicles below the speed limit threshold are counted as underspeed
- **AND** percentages are calculated as (count / total vehicles) * 100
- **AND** percentages are rounded to one decimal place

#### Scenario: Total average speed count area chart
- **WHEN** user views the Total Average Speed Count widget
- **THEN** an area chart displays average speed distribution over time
- **AND** area uses gradient fill from dark orange to light orange
- **AND** curve is smooth and continuous
- **AND** speed thresholds can be shown as reference lines

### Requirement: Level of Service Analysis
The system SHALL provide a multi-metric chart showing Level of Service (LOS) grade, traffic density, and average speed.

#### Scenario: LOS chart displays three metrics
- **WHEN** user views the Level of Service (LOS) widget
- **THEN** a chart displays three metrics: LOS grade (A-F), density, and average speed
- **AND** LOS grade is shown as orange bars with dual Y-axis
- **AND** density is shown as a blue line
- **AND** average speed is shown as a yellow line
- **AND** legend identifies all three metrics

#### Scenario: LOS grade calculation
- **WHEN** LOS data is calculated for display
- **THEN** LOS grade (A-F) is derived from traffic density and average speed
- **AND** calculation follows traffic engineering standards (HCM methodology)
- **AND** grade A represents free-flow conditions
- **AND** grade F represents forced-flow/congested conditions
- **AND** intermediate grades (B-E) represent degrading service levels

#### Scenario: Dual Y-axis for LOS metrics
- **WHEN** LOS chart is rendered
- **THEN** left Y-axis shows LOS grade from A to F
- **AND** right Y-axis shows numeric values for speed and density
- **AND** axes are clearly labeled with units
- **AND** grid lines correspond to left Y-axis

### Requirement: Vehicle Type Distribution
The system SHALL provide a donut chart showing the total count of vehicles by classification type.

#### Scenario: Vehicle count donut chart displays distribution
- **WHEN** user views the Vehicle Count by Type widget
- **THEN** a donut chart shows the proportion of each vehicle class
- **AND** each segment uses a distinct color matching other charts
- **AND** total count for each class is displayed next to the class label
- **AND** segments are ordered by count (largest to smallest)

#### Scenario: Vehicle count percentages
- **WHEN** vehicle count donut chart is rendered
- **THEN** each segment's percentage of total vehicles is calculated
- **AND** percentages sum to 100%
- **AND** small segments (<2%) are still visible with minimum size

### Requirement: Analytics Data Export
The system SHALL provide comprehensive export functionality for all analytics visualizations and underlying data.

#### Scenario: Export all graphs to Excel
- **WHEN** user clicks "Export All Graphs as Excel" button
- **THEN** an Excel file is generated with one sheet per visualization widget
- **AND** each sheet contains the raw data table for that visualization
- **AND** sheets include metadata (device ID, time range, export timestamp)
- **AND** file downloads automatically with filename format: `traffic-analytics-{deviceId}-{timestamp}.xlsx`

#### Scenario: Export individual chart as image
- **WHEN** user clicks the download icon on a specific widget
- **THEN** the chart is exported as a PNG image file
- **AND** image captures the current zoom level and visible data range
- **AND** image includes chart title, legend, and axes labels
- **AND** filename follows format: `{chart-name}-{deviceId}-{timestamp}.png`

#### Scenario: Export individual chart as CSV
- **WHEN** user clicks the info icon and selects "Export as CSV" on a widget
- **THEN** a CSV file is generated with the chart's data table
- **AND** CSV includes column headers matching chart axes
- **AND** CSV includes a metadata row with device, time range, and export timestamp
- **AND** filename follows format: `{chart-name}-data-{deviceId}-{timestamp}.csv`

#### Scenario: Export with large datasets
- **WHEN** export is requested for a large dataset (>1000 data points)
- **THEN** data is exported without sampling or truncation
- **AND** a loading indicator shows export progress
- **AND** export completes within 10 seconds for datasets up to 10,000 points
- **AND** user receives notification when export is complete

### Requirement: Chart Interactivity and UX
The system SHALL provide consistent interactive features across all chart widgets for optimal user experience.

#### Scenario: Hover tooltips on all charts
- **WHEN** user hovers over any data point on any chart
- **THEN** a tooltip displays relevant data values for that point
- **AND** tooltip follows cursor movement smoothly
- **AND** tooltip formatting matches chart units and decimal places
- **AND** tooltip includes time/category label and metric values

#### Scenario: Loading states for widgets
- **WHEN** analytics data is being fetched or processed
- **THEN** each widget shows a skeleton loader matching the widget dimensions
- **AND** skeleton loader animates to indicate loading progress
- **AND** widgets that load faster appear before slower ones (progressive loading)
- **AND** loading never blocks user interaction with loaded widgets

#### Scenario: Error handling for widgets
- **WHEN** a widget fails to load data due to an error
- **THEN** an error message is displayed within the widget frame
- **AND** error message explains the issue (e.g., "No data available for selected time range")
- **AND** a "Retry" button allows user to attempt reload
- **AND** other widgets continue to function normally

#### Scenario: Responsive layout on different devices
- **WHEN** user views Traffic Analytics on a mobile device (width < 768px)
- **THEN** widgets stack in a single column layout
- **AND** charts resize to fit mobile screen width
- **AND** interactive features (zoom, tooltips) remain functional
- **AND** export buttons are accessible and functional

#### Scenario: Chart info icons display metadata
- **WHEN** user clicks the info icon on any widget
- **THEN** a popover displays widget description and metadata
- **AND** metadata includes data source, calculation method, and update frequency
- **AND** popover includes link to full documentation (if available)
- **AND** popover can be closed by clicking outside or pressing ESC
