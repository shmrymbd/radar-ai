# Tasks: Radar Device Management Implementation

## Phase 1: Type Extensions & Storage Layer (Foundation)

### Task 1.1: Extend RadarDevice type with IP and RTSP fields
- [ ] Update `src/types/device.ts` with new fields: `redisHost?`, `redisPort?`, `rtspUrl?`
- [ ] Add validation helper functions (isValidIPv4, isValidPort, isValidRTSPUrl, isValidDeviceId)
- [ ] Export validation constants (DEVICE_ID_REGEX, IPV4_REGEX, RTSP_URL_REGEX)
- [ ] Update DEFAULT_DEVICES with example values for new fields
- [ ] Verify existing code still compiles (optional fields maintain backward compatibility)

**Validation:** TypeScript compilation succeeds, no type errors

### Task 1.2: Create DeviceConfigStorage class
- [ ] Create `src/lib/device-config-storage.ts`
- [ ] Implement `save(devices: RadarDevice[]): void` method with localStorage
- [ ] Implement `load(): RadarDevice[]` method with validation and DEFAULT_DEVICES fallback
- [ ] Implement `exportToJSON(): Blob` method for configuration export
- [ ] Implement `importFromJSON(file: File): Promise<RadarDevice[]>` method with schema validation
- [ ] Implement `validateAndMigrate(config)` for handling old config versions
- [ ] Add error handling for localStorage quota exceeded

**Validation:** Unit tests for save/load/export/import, handles corrupted localStorage gracefully

### Task 1.3: Create connectivity testing utilities
- [ ] Create `src/lib/device-connectivity-tester.ts`
- [ ] Implement `testRedisConnection(host, port, deviceId)` function
- [ ] Implement `validateRTSPUrl(url)` function
- [ ] Define `TestResult` interface with status/latency/message
- [ ] Add timeout handling (5-second max for Redis test)
- [ ] Ensure temporary Redis client closes after test

**Validation:** Manual test with valid/invalid IPs returns expected results, no hanging connections

---

## Phase 2: API Endpoints (Backend Support)

### Task 2.1: Create device connectivity test API
- [ ] Create `src/app/api/devices/test/route.ts`
- [ ] Accept POST with `{ deviceId, redisHost, redisPort, rtspUrl? }`
- [ ] Call `testRedisConnection()` from connectivity tester
- [ ] Call `validateRTSPUrl()` if rtspUrl provided
- [ ] Return JSON with results for both Redis and RTSP tests
- [ ] Add rate limiting (max 10 tests per minute per client)
- [ ] Add request validation (sanitize inputs)

**Validation:** `curl -X POST http://localhost:3000/api/devices/test -d '{"deviceId":"test","redisHost":"192.168.6.22","redisPort":6379}'` returns connectivity results

---

## Phase 3: DeviceContext Enhancements (State Management)

### Task 3.1: Add CRUD methods to DeviceContext
- [ ] Update `src/contexts/DeviceContext.tsx` interface with `addDevice`, `updateDevice`, `deleteDevice` methods
- [ ] Implement `addDevice(device)` - validate uniqueness, update state, persist to localStorage
- [ ] Implement `updateDevice(device)` - validate existence, update state, persist
- [ ] Implement `deleteDevice(deviceId)` - prevent deleting selected device, update state, persist
- [ ] Implement `refreshDevices()` - reload from localStorage
- [ ] Add `exportDeviceConfig()` method using DeviceConfigStorage
- [ ] Add `importDeviceConfig(file)` method with validation and user confirmation
- [ ] Add `resetToDefaults()` method to restore DEFAULT_DEVICES

**Validation:** Call methods from browser console, verify state updates and localStorage persistence

### Task 3.2: Update device loading logic to use extended fields
- [ ] Modify `loadDeviceConfiguration()` in DeviceProvider to load new fields
- [ ] Fall back to environment variables for redisHost/redisPort if not set in device config
- [ ] Update device status initialization to check Redis connectivity (optional)

**Validation:** Devices with and without redisHost/redisPort load correctly, defaults applied properly

---

## Phase 4: UI Components (Frontend Interface)

### Task 4.1: Create DeviceForm component
- [ ] Create `src/components/DeviceForm.tsx` for add/edit modal
- [ ] Add form fields: deviceId, name, description, redisHost, redisPort, rtspUrl
- [ ] Implement real-time validation for each field
- [ ] Add "Test Connectivity" button that calls `/api/devices/test`
- [ ] Display test results (success/warning/error) with icons
- [ ] Add Save and Cancel buttons
- [ ] Disable Save if validation fails or connectivity test shows errors
- [ ] Show loading states during connectivity testing
- [ ] Implement form submission handling (call DeviceContext methods)

**Validation:** Form validates inputs correctly, connectivity test runs and displays results, save triggers DeviceContext.addDevice/updateDevice

### Task 4.2: Create DeviceListItem component
- [ ] Create `src/components/DeviceListItem.tsx` for individual device display
- [ ] Show device icon, name, description, status indicator
- [ ] Display redisHost:redisPort (or "Using default" if not set)
- [ ] Display RTSP URL (or "Not configured" if not set)
- [ ] Add Edit button (opens DeviceForm with device data)
- [ ] Add Delete button (calls DeviceContext.deleteDevice with confirmation)
- [ ] Add Test button (quick connectivity test, shows inline result)
- [ ] Show last seen timestamp and data quality indicators

**Validation:** Renders device correctly, buttons trigger appropriate actions, confirmation dialogs work

### Task 4.3: Create DeviceList component
- [ ] Create `src/components/DeviceList.tsx` for displaying all devices
- [ ] Render grid/table of DeviceListItem components
- [ ] Add empty state ("No devices configured. Click Add Device to get started.")
- [ ] Add search/filter input (filter by name or deviceId)
- [ ] Add sort options (by name, status, last seen)
- [ ] Show device count ("Showing X devices")
- [ ] Indicate currently selected device with visual highlight

**Validation:** List displays all devices correctly, search/filter/sort work, empty state shows when no devices

### Task 4.4: Create DeviceActions component
- [ ] Create `src/components/DeviceActions.tsx` for bulk operations
- [ ] Add "Add Device" button (primary CTA, opens DeviceForm)
- [ ] Add "Export Configuration" button (downloads JSON file)
- [ ] Add "Import Configuration" button (opens file picker)
- [ ] Add "Reset to Defaults" button (shows confirmation dialog)
- [ ] Implement file upload handling for import
- [ ] Show import preview modal (list devices to be imported)
- [ ] Handle import errors gracefully (invalid JSON, schema mismatch)

**Validation:** All buttons work, export downloads file, import loads and validates file, reset restores defaults

### Task 4.5: Create RadarDeviceManager container component
- [ ] Create `src/components/RadarDeviceManager.tsx` as main container
- [ ] Integrate DeviceList, DeviceForm, and DeviceActions
- [ ] Manage form open/close state
- [ ] Manage editing device state (null for add, device for edit)
- [ ] Implement device save handler (test → save → close form)
- [ ] Implement device delete handler (with confirmation)
- [ ] Implement test device handler (show results in list)
- [ ] Add success/error toast notifications
- [ ] Handle loading states (show spinner during operations)

**Validation:** All components integrated correctly, state flows properly, user can add/edit/delete devices

---

## Phase 5: Settings Tab Integration (User-Facing Feature)

### Task 5.1: Replace placeholder Settings tab with RadarDeviceManager
- [ ] Update `src/app/page.tsx` case 'settings' to render `<RadarDeviceManager />`
- [ ] Import RadarDeviceManager component
- [ ] Remove placeholder "Settings panel coming soon..." div
- [ ] Add page header ("Device Management") and description
- [ ] Test Settings tab renders correctly

**Validation:** Click Settings tab, see RadarDeviceManager with device list, can add/edit/delete devices

### Task 5.2: Update device selector to reflect configuration changes
- [ ] Verify DeviceSelector component (`src/components/DeviceSelector.tsx`) uses DeviceContext
- [ ] Test device selector updates immediately when devices added/removed
- [ ] Test device selector shows new device names after editing
- [ ] Verify device switching still works after configuration changes

**Validation:** Add device in Settings → appears in device selector dropdown, edit device name → selector updates

---

## Phase 6: Redis Connection Enhancement (Optional - Service Restart Warning)

### Task 6.1: Update Redis client to support per-device configuration
- [ ] Update `src/lib/redis.ts` getRedisClient() to accept optional deviceId
- [ ] Look up device redisHost/redisPort if deviceId provided
- [ ] Fall back to environment variables if device fields not set
- [ ] Add JSDoc comment: "Note: Redis connection is singleton. Changing host/port requires service restart."
- [ ] Update API routes to pass deviceId to getRedisClient() where applicable

**Validation:** API routes use device-specific Redis connection, service restart required warning documented

### Task 6.2: Add service restart warning to UI
- [ ] Add warning message in DeviceForm near redisHost/redisPort fields
- [ ] Text: "⚠️ Changing Redis connection requires service restart to take effect"
- [ ] Show warning only when editing existing device with different Redis IP

**Validation:** Warning appears when editing Redis connection, doesn't show for new devices or unchanged IPs

---

## Phase 7: Testing & Documentation

### Task 7.1: Write unit tests
- [ ] Test DeviceConfigStorage save/load/export/import
- [ ] Test validation functions (IP, port, RTSP URL, device ID)
- [ ] Test DeviceContext CRUD methods
- [ ] Test connectivity tester functions
- [ ] Achieve >80% code coverage for new files

**Validation:** `npm test` passes all tests, coverage report shows >80%

### Task 7.2: Write integration tests
- [ ] Test add device flow (form → test → save → display)
- [ ] Test edit device flow (load → modify → save → update)
- [ ] Test delete device flow (select → confirm → remove)
- [ ] Test import/export round-trip (export → import → verify)
- [ ] Test device selector synchronization

**Validation:** Integration test suite passes, flows work end-to-end

### Task 7.3: Manual testing checklist
- [ ] Add device with valid Redis IP → connects successfully
- [ ] Add device with invalid Redis IP → shows connectivity error
- [ ] Add duplicate device ID → prevents save with error message
- [ ] Edit device → updates everywhere (selector, list, dashboard data)
- [ ] Delete device → removes from selector and list
- [ ] Attempt to delete selected device → shows error, doesn't delete
- [ ] Export configuration → downloads valid JSON file
- [ ] Import configuration → loads devices correctly
- [ ] Import invalid JSON → shows clear error message
- [ ] Reset to defaults → restores test and Radar04 devices
- [ ] Browser refresh → persists all configuration changes
- [ ] Add 5+ devices → performance remains acceptable

**Validation:** All manual test cases pass, no console errors, smooth user experience

### Task 7.4: Update documentation
- [ ] Update `CLAUDE.md` with radar device management feature description
- [ ] Update `DEVICE_CONFIGURATION.md` with UI-based configuration instructions
- [ ] Add screenshots of Settings tab UI (device list, form, actions)
- [ ] Document localStorage schema version and migration strategy
- [ ] Add troubleshooting section for common configuration issues
- [ ] Update API_DOCUMENTATION.md with `/api/devices/test` endpoint details

**Validation:** Documentation is clear, accurate, and includes examples

---

## Phase 8: Polish & Deployment

### Task 8.1: Add responsive design
- [ ] Test Settings tab on mobile devices
- [ ] Make device list responsive (stack on mobile, grid on desktop)
- [ ] Make form modal mobile-friendly
- [ ] Ensure touch targets are appropriately sized
- [ ] Test on Safari, Chrome, Firefox

**Validation:** Settings tab works well on mobile and desktop, no layout issues

### Task 8.2: Add accessibility features
- [ ] Add ARIA labels to form fields
- [ ] Ensure keyboard navigation works (Tab through fields, Enter to submit)
- [ ] Add screen reader announcements for success/error messages
- [ ] Ensure sufficient color contrast (WCAG AA)
- [ ] Test with screen reader (VoiceOver/NVDA)

**Validation:** Accessibility audit passes, keyboard navigation works

### Task 8.3: Performance optimization
- [ ] Lazy load RadarDeviceManager component (code splitting)
- [ ] Debounce connectivity tests (prevent rapid-fire API calls)
- [ ] Add loading skeletons for better perceived performance
- [ ] Optimize device list rendering (virtualization if >50 devices)

**Validation:** Settings tab loads quickly, no jank during interactions

### Task 8.4: Final review and deployment preparation
- [ ] Code review with team (if applicable)
- [ ] Verify all TODOs resolved
- [ ] Ensure no console errors or warnings
- [ ] Test in production-like environment
- [ ] Prepare release notes with feature description
- [ ] Create user guide or video demo

**Validation:** Feature is production-ready, team approves, release notes written

---

## Summary

**Total Tasks:** 32 tasks across 8 phases
**Estimated Time:** 2-3 days (16-24 hours)
**Dependencies:** None (new feature, no blocking dependencies)
**Parallel Work Opportunities:**
- Tasks 1.1, 1.2, 1.3 can be done in parallel (different files)
- Tasks 4.1-4.4 can be developed concurrently (UI components)
- Phase 7 testing can start once Phase 5 complete

**Critical Path:**
1. Phase 1 (foundation) → Phase 3 (state management) → Phase 4 (UI) → Phase 5 (integration)
2. Phase 2 (API) can be done in parallel with Phase 4
3. Phases 6-8 are polish/optimization (can be incremental)

**Deliverables:**
- Fully functional device management interface in Settings tab
- Comprehensive documentation and tests
- Production-ready feature with accessibility and responsive design
