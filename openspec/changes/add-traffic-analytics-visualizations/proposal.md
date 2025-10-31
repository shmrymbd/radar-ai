# Proposal: Add Traffic Analytics Visualizations

## Why

The current vehicle classification dashboard provides basic real-time metrics and historical charts, but lacks the comprehensive visual analytics that traffic engineers need for in-depth traffic pattern analysis. Traffic engineers require advanced time-series visualizations, distribution charts, and exportable analytics to:

1. Analyze traffic patterns and trends over time
2. Understand vehicle classification distribution and speed compliance
3. Evaluate Level of Service (LOS) based on density and speed
4. Export comprehensive traffic data for reporting and analysis
5. Identify traffic anomalies and peak patterns visually

The screenshot reference shows a professional "TRAFFIC ANALYTIC" dashboard with 6 key visualization widgets that provide these capabilities in an intuitive, interactive format.

## What Changes

### Add Traffic Analytics Tab
Add a new "Traffic Analytics" tab to the Classification Dashboard (ClassificationDashboard.tsx) that displays 6 interactive visualization widgets:

1. **Vehicle Classification Chart** - Stacked bar chart showing vehicle type distribution over time (class1-6)
2. **Total Average Traffic Count** - Area chart showing traffic volume trends with class breakdown
3. **Speed Percentage** - Donut chart showing overspeed vs. underspeed percentage
4. **Total Average Speed Count** - Area chart showing speed distribution over time
5. **Level of Service (LOS)** - Multi-line chart showing LOS grade, density, and average speed
6. **Vehicle Count by Type** - Donut chart showing total vehicle count distribution by classification

### Add Export Functionality
- Add "Export All Graphs as Excel" button in the page header
- Enable individual widget export via info and download icons on each widget

### Technical Implementation
- Use Recharts library (already in package.json) for all visualizations
- Create reusable chart components (BarChart, AreaChart, DonutChart, LineChart wrappers)
- Add zoom/pan functionality with "drag to zoom" indicator
- Implement time-range filtering for all charts
- Add MongoDB aggregation queries for efficient data retrieval
- Ensure all widgets are responsive and device-aware

## Impact

### Affected Specs
- **dashboard** - Add Traffic Analytics visualization requirements

### Affected Code
- `dashboard/src/components/ClassificationDashboard.tsx` - Add new "Traffic Analytics" tab
- `dashboard/src/components/analytics/` (new directory) - Chart components:
  - `VehicleClassificationChart.tsx` - Stacked bar chart
  - `TrafficCountChart.tsx` - Area chart
  - `SpeedPercentageChart.tsx` - Donut chart
  - `SpeedCountChart.tsx` - Area chart
  - `LevelOfServiceChart.tsx` - Multi-line chart
  - `VehicleCountByTypeChart.tsx` - Donut chart
  - `AnalyticsExport.tsx` - Export functionality component
- `dashboard/src/app/api/analytics/` (new directory) - API endpoints:
  - `route.ts` - Main analytics data endpoint
  - `export/route.ts` - Export to Excel endpoint
- `dashboard/src/lib/analytics-processor.ts` (new file) - LOS calculation and data processing

### New Dependencies
None - will use existing Recharts library already in dependencies

### Data Requirements
- Time-series aggregation from MongoDB `passdata` collection
- Vehicle classification counts grouped by time intervals
- Speed calculations for overspeed/underspeed percentages
- LOS calculation based on density and average speed formulas
- Support for device-specific filtering

## Risks & Considerations

### Performance
- Large time ranges may require data sampling or pagination
- MongoDB aggregation queries need proper indexing
- Chart re-rendering should be optimized with useMemo/useCallback

### UX
- Charts should load progressively to avoid blank screens
- Loading states and error handling for each widget
- Responsive design for mobile/tablet viewing

### Data Quality
- Handle cases where insufficient data exists for certain time periods
- Graceful fallbacks when classification data is incomplete
- Validate LOS calculations match traffic engineering standards

## Success Criteria

1. All 6 visualization widgets render correctly with real data
2. "Traffic Analytics" tab navigation works seamlessly
3. Export to Excel functionality works for all graphs
4. Charts are interactive (zoom, hover tooltips, legends)
5. Time-range filtering updates all widgets simultaneously
6. Device selector works across all analytics widgets
7. Charts render responsively on different screen sizes
8. Performance remains acceptable with 1000+ data points
