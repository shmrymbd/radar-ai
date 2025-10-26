## Why

Traffic engineers need comprehensive historical analysis of vehicle classification data to identify traffic patterns, optimize signal timing, and make data-driven decisions. The current classification system provides real-time analytics but lacks historical charting capabilities with time-based filtering. Engineers need to analyze traffic patterns over different time periods (24 hours, yesterday, monthly) using histogram visualizations and other infographic representations to understand long-term traffic behavior and intersection performance.

## What Changes

- **NEW**: Historical classification data storage in MongoDB with 15-minute aggregation intervals
- **NEW**: Time-based filtering for classification charts (24hrs, yesterday, month)
- **NEW**: Histogram charting for vehicle classification distribution analysis
- **NEW**: Advanced infographic visualizations (heatmaps, trend lines, comparative charts)
- **NEW**: MongoDB integration for persistent historical data storage
- **NEW**: 15-minute data aggregation and archival system
- **MODIFIED**: Classification processor to include MongoDB historical storage
- **MODIFIED**: Dashboard UI to include historical chart selection and filtering
- **MODIFIED**: API endpoints to support historical data retrieval with time filtering

## Impact

- **Affected specs**: dashboard, radar-processing
- **Affected code**: 
  - `dashboard/src/lib/classification-processor.ts` (MongoDB integration)
  - `dashboard/src/lib/mongodb.ts` (historical data schema)
  - `dashboard/src/app/classification/page.tsx` (historical chart UI)
  - `dashboard/src/app/api/classification/` (historical data endpoints)
  - `dashboard/src/types/classification.ts` (historical data types)
- **New capabilities**: Historical classification analytics, time-based filtering, advanced charting
- **Performance**: 15-minute aggregation reduces storage overhead while maintaining analytical value
- **Data storage**: MongoDB collections for persistent historical classification data
