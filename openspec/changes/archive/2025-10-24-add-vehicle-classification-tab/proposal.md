## Why

Traffic engineers need detailed vehicle classification and counting analytics to optimize signal timing, analyze traffic patterns, and make data-driven decisions. The current dashboard focuses on real-time vehicle tracking but lacks comprehensive classification analysis and historical counting capabilities. PassData (0x05) provides rich vehicle crossing events with classification data that can be leveraged for advanced traffic analytics.

## What Changes

- **NEW**: Vehicle Classification Tab with real-time and historical analytics
- **NEW**: PassData (0x05) processing for vehicle counting and classification
- **NEW**: Vehicle type distribution analysis and trends
- **NEW**: Speed-based classification filtering and analysis
- **NEW**: Lane-specific vehicle counting and occupancy analysis
- **NEW**: Time-based traffic pattern analysis (hourly, daily, weekly)
- **NEW**: Vehicle size and speed correlation analysis
- **NEW**: Traffic composition reporting and export capabilities
- **MODIFIED**: Dashboard navigation to include new classification tab
- **MODIFIED**: API endpoints to support classification data retrieval

## System Architecture

### Data Flow Diagram
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Radar System │───▶│  PassData (0x05) │───▶│ Classification  │
│   (ClairWav-T80)│    │   Packets        │    │   Processor     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │◀───│   WebSocket      │◀───│   Redis Storage │
│   UI/Charts     │    │   Real-time      │    │   Analytics     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Vehicle Classification Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────┐
│                    Vehicle Classification Dashboard            │
├─────────────────────────────────────────────────────────────────┤
│  📊 Key Metrics Cards                                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │Total Vehicles│ │Avg Speed   │ │Vehicle Types│ │Speed Viol.  ││
│  │    1,247    │ │  42.3 km/h │ │      5      │ │     23      ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  📈 Vehicle Type Distribution Chart                            │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Car ████████████████████████████████████████████████ 65.2% ││
│  │ SUV ████████████████████████████████████████ 28.4%         ││
│  │Truck████████████████████████████ 4.8%                     ││
│  │Motor████████████████████ 1.6%                              ││
│  └─────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────┤
│  🛣️ Lane Utilization Analysis                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Lane 11: ████████████████████████████████████████ 78.5%    ││
│  │ Lane 12: ████████████████████████████████████████████ 82.1%││
│  │ Lane 31: ████████████████████████████████████████ 71.3%    ││
│  │ Lane 32: ████████████████████████████████████████████ 85.2%││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Classification Processing Pipeline
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PassData      │───▶│  Vehicle Type    │───▶│  Classification │
│   Extraction    │    │  Classification  │    │  Analytics      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Speed Analysis  │    │ Lane Assignment  │    │ Time Aggregation│
│ & Violations    │    │ & Occupancy     │    │ & Trends        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Impact

- **Affected specs**: dashboard, radar-processing
- **Affected code**: 
  - `dashboard/src/app/page.tsx` (navigation)
  - `dashboard/src/app/api/` (new classification endpoints)
  - `dashboard/src/lib/` (PassData processing and analytics)
  - `dashboard/src/types/` (classification data types)
- **New capabilities**: Vehicle classification analytics, traffic composition analysis, historical counting
- **Performance**: Real-time PassData processing with sub-second latency
- **Data storage**: Enhanced Redis storage for classification metrics

## Visual Analytics Features

### Real-time Classification Charts
- **Vehicle Type Distribution**: Pie chart showing percentage breakdown of car, SUV, truck, motorcycle, van
- **Speed Analysis by Type**: Bar chart comparing average speeds across vehicle classifications
- **Lane Utilization Heatmap**: Visual representation of traffic density across intersection lanes
- **Time-based Trends**: Line charts showing traffic patterns throughout the day

### Historical Analytics Dashboard
- **Peak Hour Analysis**: Bar chart identifying busiest hours by vehicle type
- **Traffic Composition Trends**: Multi-line chart showing vehicle type percentages over time
- **Speed Violation Patterns**: Scatter plot correlating speed violations with vehicle types and lanes
- **Lane Performance Metrics**: Comparative analysis of lane efficiency and utilization rates

### Interactive Filtering and Export
- **Time Range Selector**: Date/time picker for historical analysis periods
- **Vehicle Type Filters**: Multi-select dropdown for specific vehicle classifications
- **Lane Selection**: Checkbox filters for individual or multiple lanes
- **Export Options**: CSV, JSON, and PDF report generation with customizable data ranges
