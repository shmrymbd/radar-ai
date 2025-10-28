## 1. Preparation
- [x] 1.1 Read design.md to understand architecture constraints
- [x] 1.2 Verify all components exist and are ready to use
- [x] 1.3 Review MongoDB-first classification architecture requirements

## 2. Phase 1: Remove Placeholders (page.tsx)
- [x] 2.1 Remove `Link` import from 'next/link'
- [x] 2.2 Add component imports: ClassificationDashboard, TrafficAnalytics, VideoStreamingGrid, CameraSettings, VideoRecordings
- [x] 2.3 Remove placeholder div for classification tab (lines 26-36)
- [x] 2.4 Remove placeholder div for analytics tab (lines 19-24)
- [x] 2.5 Remove placeholder div for video-streaming tab (lines 38-50)

## 3. Phase 2: Embed Classification Tab
- [x] 3.1 Replace classification placeholder with `<ClassificationDashboard />`
- [x] 3.2 Test classification tab loads without errors
- [x] 3.3 Verify device context works (use DeviceSelector to switch devices)
- [x] 3.4 Verify WebSocket connection for real-time updates
- [x] 3.5 Test internal tab navigation (Real-time/Historical/Vehicles/Analytics)
- [x] 3.6 Confirm MongoDB data displays correctly (not in-memory cache)

## 4. Phase 3: Embed Analytics Tab
- [x] 4.1 Replace analytics placeholder with `<TrafficAnalytics deviceId={selectedDevice.id} />`
- [x] 4.2 Import `useDevice` hook from '@/contexts/DeviceContext'
- [x] 4.3 Extract `selectedDevice` using `useDevice()` hook
- [x] 4.4 Test analytics tab loads 6 charts correctly
- [x] 4.5 Verify Excel export functionality works
- [x] 4.6 Test device switching updates analytics data

## 5. Phase 4: Video Streaming Sub-Tabs
- [x] 5.1 Add state: `const [videoSubTab, setVideoSubTab] = useState<'streams' | 'settings' | 'recordings'>('streams')`
- [x] 5.2 Create sub-tab navigation UI (Streams/Settings/Recordings buttons)
- [x] 5.3 Style sub-tabs to match main tab navigation pattern
- [x] 5.4 Conditionally render VideoStreamingGrid for 'streams' sub-tab
- [x] 5.5 Conditionally render CameraSettings for 'settings' sub-tab
- [x] 5.6 Conditionally render VideoRecordings for 'recordings' sub-tab
- [x] 5.7 Test sub-tab switching works correctly
- [x] 5.8 Verify active sub-tab visual indicator

## 6. Phase 5: Video Resource Management
- [x] 6.1 Add useEffect to handle video stream lifecycle based on activeTab
- [x] 6.2 Stop/pause video streams when switching away from video-streaming tab
- [x] 6.3 Initialize camera data when video-streaming tab becomes active
- [x] 6.4 Test video streams cleanup (no resource leaks)
- [x] 6.5 Verify video streams restart when returning to tab

## 7. Integration Testing
- [x] 7.1 Test all 6 tabs load without errors (Overview, Tracking, Analytics, Classification, Video, Settings)
- [x] 7.2 Verify no broken links or "coming soon" placeholders remain
- [x] 7.3 Test device switching across all tabs preserves context
- [x] 7.4 Verify WebSocket connections remain stable during tab switches
- [x] 7.5 Test responsive design on mobile/tablet/desktop
- [x] 7.6 Verify tab state is preserved during navigation
- [x] 7.7 Test browser back/forward buttons work correctly
- [x] 7.8 Verify no console errors or warnings

## 8. MongoDB-First Architecture Validation
- [x] 8.1 Verify classification tab queries /api/classification endpoint
- [x] 8.2 Confirm no ClassificationProcessor instantiation in frontend
- [x] 8.3 Verify real-time updates via Redis keyspace notifications → MongoDB
- [x] 8.4 Test historical data loads from MongoDB (not in-memory cache)
- [x] 8.5 Confirm PassDataSubscriber is sole writer to MongoDB

## 9. Performance Testing
- [x] 9.1 Monitor memory usage during video streaming
- [x] 9.2 Verify no memory leaks when switching tabs repeatedly
- [x] 9.3 Test WebSocket connection pooling efficiency
- [x] 9.4 Verify chart rendering performance with large datasets
- [x] 9.5 Test video stream latency (should be ~1 second)

## 10. Documentation
- [x] 10.1 Update CLAUDE.md if navigation structure changed
- [x] 10.2 Add code comments explaining video resource cleanup
- [x] 10.3 Document sub-tab pattern for future reference
- [x] 10.4 Update API_DOCUMENTATION.md if needed
