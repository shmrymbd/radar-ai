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
