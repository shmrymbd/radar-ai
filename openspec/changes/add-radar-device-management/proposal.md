# Add Radar Device Management to Settings Tab

## Why

**User Need:** Users need a unified interface to configure radar devices (deviceID, IP address, RTSP URL) without manually editing environment variables or localStorage. Currently:

- Device configuration requires manual `.env.local` editing or localStorage manipulation
- No UI for adding/editing/removing radar devices
- RTSP URL configuration is separate (in Video Streaming → Camera Settings)
- IP address for Redis connection is not user-configurable
- "Settings" tab is currently a placeholder with no functionality

**Business Value:**
- **Easier deployment:** Traffic engineers can add new radar installations via UI
- **Reduced errors:** Form validation prevents misconfiguration
- **Faster onboarding:** No developer intervention needed to configure devices
- **Better UX:** Centralized configuration in Settings tab matches user expectations

## What

Add comprehensive radar device management to the Settings tab with capabilities to:

1. **List Radar Devices:** View all configured radar devices with key details (deviceID, status, IP, RTSP URL)
2. **Add New Devices:** Form-based device creation with validation
3. **Edit Devices:** Update device configuration (name, description, IP, RTSP URL)
4. **Delete Devices:** Remove devices with confirmation (prevent deleting active device)
5. **Test Connectivity:** Verify Redis and RTSP connectivity before saving
6. **Persist Configuration:** Save to localStorage with export/import capabilities

**Key Design Decisions:**

**Storage Strategy:**
- Use localStorage for device configuration (consistent with current `DeviceContext` pattern)
- Provide export/import as JSON files for backup and migration
- Keep DEFAULT_DEVICES as fallback (test, Radar04)

**Configuration Fields per Device:**
- **Device ID** (required, alphanumeric, unique) - e.g., "Radar05", "MainStreet"
- **Display Name** (required) - e.g., "Main Street Intersection"
- **Description** (optional) - e.g., "5th Ave & Main St traffic signal"
- **Redis IP Address** (required, IPv4 validation) - e.g., "192.168.6.22" (currently hardcoded)
- **Redis Port** (required, port validation, default: 6379)
- **RTSP URL** (optional) - e.g., "rtsp://192.168.6.25:554/stream" (for integrated video)
- **Status** (auto-detected: active/inactive/test)

**UI Layout:**
```
Settings Tab
├── Device Management Section (top)
│   ├── Device List (table/cards)
│   │   ├── Device ID | Name | Status | IP | Actions
│   │   └── Edit | Delete | Test buttons per device
│   ├── Add Device Button (primary CTA)
│   └── Import/Export Configuration
└── Other Settings Sections (future expansion)
    └── System Settings, User Preferences, etc.
```

**Validation & Safety:**
- Prevent duplicate device IDs
- Prevent deleting currently selected device
- Validate IP addresses (IPv4 format)
- Validate RTSP URLs (rtsp:// protocol)
- Test connectivity before allowing save
- Confirm destructive actions (delete)

## Impact

**New Files:**
- `dashboard/src/components/RadarDeviceManager.tsx` - Device management UI component
- `dashboard/src/components/DeviceForm.tsx` - Add/Edit device form
- `dashboard/src/lib/device-config-storage.ts` - localStorage persistence layer
- `dashboard/src/lib/device-connectivity-tester.ts` - Redis/RTSP connectivity tests
- `dashboard/src/app/api/devices/test/route.ts` - API endpoint for testing connectivity

**Modified Files:**
- `dashboard/src/app/page.tsx` - Replace placeholder with `<RadarDeviceManager />`
- `dashboard/src/types/device.ts` - Extend `RadarDevice` interface with IP/RTSP fields
- `dashboard/src/contexts/DeviceContext.tsx` - Add methods for add/edit/delete devices
- `dashboard/src/lib/redis.ts` - Support dynamic Redis IP from device configuration

**Migration Path:**
- Existing devices in localStorage remain functional
- `DEFAULT_DEVICES` provide fallback if no custom devices configured
- Gradual migration: users can start with defaults, add new devices over time

**Dependencies:**
- Requires `/api/devices/test` endpoint for connectivity validation
- May require Redis client reconfiguration support (currently uses env var `REDIS_HOST`)

**Breaking Changes:**
- None - fully backward compatible with existing device configuration

## Risks

**Technical Risks:**
- **Risk:** Changing Redis IP at runtime may not work if singleton client already initialized
  - **Mitigation:** Document that Redis IP changes require service restart, OR implement client re-initialization

- **Risk:** localStorage corruption could make devices inaccessible
  - **Mitigation:** Provide "Reset to Defaults" button, export/import capabilities

- **Risk:** Invalid RTSP URLs could break video streaming
  - **Mitigation:** Strict URL validation, optional field (video remains functional without)

**User Risks:**
- **Risk:** Users might delete production devices accidentally
  - **Mitigation:** Confirmation dialog, prevent deleting active device, ability to re-add from backups

## Resolved Decisions

1. **Redis Connection Management:** ✅ **CONFIRMED** - Service restart required for Redis IP changes in Phase 1 (simpler, safer). Hot-reload in future iteration.

2. **Multi-IP Support:** No - keep single IP per device for MVP, add failover as separate feature

3. **RTSP URL per Device vs Global:** ✅ **CONFIRMED** - Per-device for simple deployments (1 radar = 1 camera). Existing camera management remains for complex setups.

4. **Permissions:** No auth for MVP (matches current dashboard security model), add role-based access later

5. **Default Device Selection:** ✅ **CONFIRMED** - Auto-switch to newly created device after successful save

6. **Import Strategy:** ✅ **CONFIRMED** - "Replace all" as default behavior (safer, clearer). Merge option available as advanced feature.

## Success Criteria

**Must Have (MVP):**
- ✅ Users can add new radar devices via Settings tab form
- ✅ Users can edit existing device configuration
- ✅ Users can delete devices (with confirmation)
- ✅ Device list shows all configured devices with status
- ✅ Configuration persists across browser sessions (localStorage)
- ✅ Form validates device ID uniqueness and IP address format
- ✅ Device selector dropdown updates immediately when devices added/removed

**Should Have (Nice to Have):**
- ✅ Test connectivity button validates Redis and RTSP before saving
- ✅ Export/import configuration as JSON file
- ✅ Visual indicators for online/offline devices
- ✅ "Reset to Defaults" button

**Could Have (Future):**
- ⏳ Multi-device bulk operations (enable/disable, test all)
- ⏳ Device health monitoring dashboard
- ⏳ Automatic failover to backup devices
- ⏳ Device groups/categories for large deployments

## Timeline

**Estimated Effort:** 2-3 days (16-24 hours development + testing)

**Phase 1: Core UI (Day 1 - 8 hours)**
- Device list table/cards UI
- Add device form with validation
- Edit device modal
- Delete with confirmation

**Phase 2: Persistence & Integration (Day 2 - 8 hours)**
- localStorage save/load logic
- DeviceContext integration (add/edit/delete methods)
- Device selector updates
- Types extended with IP/RTSP fields

**Phase 3: Connectivity Testing & Polish (Day 3 - 8 hours)**
- API endpoint for Redis/RTSP testing
- Export/import functionality
- Error handling and user feedback
- Documentation updates

**Testing:** 2-4 hours
- Manual testing with multiple devices
- Test persistence across browser sessions
- Test validation edge cases
- Test device switching after configuration changes
