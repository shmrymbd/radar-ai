# Design: Radar Device Management System

## Overview

This design adds a comprehensive device configuration interface to the Settings tab, enabling users to manage radar devices (deviceID, IP, RTSP URL) through a form-based UI with persistence, validation, and connectivity testing.

## Architectural Decisions

### 1. Storage Layer: localStorage with JSON Export/Import

**Decision:** Use browser localStorage as primary storage, with JSON file export/import for backups.

**Rationale:**
- Consistent with existing `DeviceContext` pattern (already uses localStorage for device selection)
- No backend storage infrastructure needed (keeps system lightweight)
- Client-side storage allows offline configuration
- Export/import provides migration path and backup capabilities

**Alternatives Considered:**
- **MongoDB Storage:** Rejected - adds complexity, requires auth, overkill for configuration
- **Environment Variables Only:** Rejected - not user-friendly, requires file system access
- **API-backed Storage:** Future enhancement - when multi-user/role-based access needed

**Implementation:**
```typescript
// New file: src/lib/device-config-storage.ts
interface DeviceConfig {
  version: string; // Schema version for migrations
  devices: RadarDevice[];
  lastModified: Date;
}

class DeviceConfigStorage {
  private STORAGE_KEY = 'radar-device-config-v2';

  save(devices: RadarDevice[]): void {
    const config: DeviceConfig = {
      version: '2.0',
      devices,
      lastModified: new Date()
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }

  load(): RadarDevice[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return DEFAULT_DEVICES;

    try {
      const config: DeviceConfig = JSON.parse(stored);
      return this.validateAndMigrate(config);
    } catch {
      return DEFAULT_DEVICES;
    }
  }

  exportToJSON(): Blob {
    const config = {
      version: '2.0',
      devices: this.load(),
      exportedAt: new Date().toISOString()
    };
    return new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  }

  importFromJSON(file: File): Promise<RadarDevice[]> {
    // Parse JSON, validate schema, return devices
  }
}
```

---

### 2. Type Extensions: Enhanced RadarDevice Interface

**Decision:** Extend existing `RadarDevice` interface with `redisHost`, `redisPort`, and `rtspUrl` fields.

**Rationale:**
- Keep device configuration centralized in one type
- Maintains backward compatibility (new fields optional)
- Simplifies UI - single form for all device properties
- Natural fit with "one radar = one camera" simple deployment pattern

**Before:**
```typescript
export interface RadarDevice {
  id: string;                    // e.g., "Radar04"
  name: string;                  // e.g., "Main Street Radar"
  description: string;
  status: 'active' | 'inactive' | 'test';
  redisPrefix: string;           // Used for Redis keys
  websocketPort?: number;
  lastSeen?: Date;
  dataQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}
```

**After:**
```typescript
export interface RadarDevice {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'test';
  redisPrefix: string;

  // NEW FIELDS (all optional for backward compatibility)
  redisHost?: string;            // e.g., "192.168.6.22" (default from env if not set)
  redisPort?: number;            // e.g., 6379 (default from env if not set)
  rtspUrl?: string;              // e.g., "rtsp://192.168.6.25:554/stream" (optional)

  websocketPort?: number;
  lastSeen?: Date;
  dataQuality?: 'excellent' | 'good' | 'fair' | 'poor';
}
```

**Migration Strategy:**
- Existing devices without `redisHost` fall back to `process.env.REDIS_HOST`
- `DeviceConfigStorage.validateAndMigrate()` adds defaults for old configs
- UI shows "(Using default)" for fields not explicitly configured

---

### 3. Redis Connection: Lazy Reconfiguration Pattern

**Decision:** Require service restart for Redis IP changes (Phase 1), add hot-reload in future.

**Rationale:**
- Current `getRedisClient()` creates singleton on first call
- Hot-reloading Redis connection adds complexity (connection pooling, active queries)
- Service restarts are acceptable for configuration changes (not frequent operation)
- Simpler implementation, fewer edge cases

**Current Implementation (src/lib/redis.ts):**
```typescript
let redisClient: ReturnType<typeof createClient> | null = null;

export async function getRedisClient() {
  if (redisClient) return redisClient; // Singleton pattern

  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379');

  redisClient = createClient({ url: `redis://${host}:${port}` });
  await redisClient.connect();
  return redisClient;
}
```

**Phase 1 Approach (Recommended for MVP):**
```typescript
export async function getRedisClient(deviceId?: string) {
  if (redisClient) return redisClient;

  // If deviceId provided, look up device config
  const device = deviceId ? getDeviceConfig(deviceId) : null;
  const host = device?.redisHost || process.env.REDIS_HOST || '127.0.0.1';
  const port = device?.redisPort || parseInt(process.env.REDIS_PORT || '6379');

  // Still creates singleton - requires restart to change
  redisClient = createClient({ url: `redis://${host}:${port}` });
  await redisClient.connect();
  return redisClient;
}

// UI shows warning: "Changing Redis connection requires service restart"
```

**Phase 2 Enhancement (Future):**
```typescript
// Device-specific connections with pooling
const redisClients = new Map<string, RedisClient>();

export async function getRedisClient(deviceId: string) {
  if (redisClients.has(deviceId)) {
    return redisClients.get(deviceId)!;
  }

  const device = getDeviceConfig(deviceId);
  const client = await createAndConnectRedisClient(device);
  redisClients.set(deviceId, client);
  return client;
}
```

---

### 4. Connectivity Testing: Parallel Validation API

**Decision:** Create dedicated `/api/devices/test` endpoint for validating Redis and RTSP connectivity.

**Rationale:**
- Prevents saving invalid configurations
- Provides immediate feedback to users
- Tests actual connectivity, not just format validation
- Can run in parallel with form submission (optimistic UI)

**API Endpoint:**
```typescript
// POST /api/devices/test
// Request:
{
  "deviceId": "Radar05",
  "redisHost": "192.168.6.22",
  "redisPort": 6379,
  "rtspUrl": "rtsp://192.168.6.25:554/stream" // optional
}

// Response:
{
  "success": true,
  "results": {
    "redis": {
      "status": "success",
      "latency": 15,
      "message": "Connected to Redis successfully"
    },
    "rtsp": {
      "status": "warning",
      "message": "RTSP URL provided but not tested (requires FFmpeg)"
    }
  }
}
```

**Testing Strategy:**
1. **Redis Test:**
   - Create temporary client with provided host/port
   - Send PING command
   - Check if device keys exist (`deviceId/passdata`, etc.)
   - Measure latency
   - Close connection

2. **RTSP Test (Optional):**
   - Validate URL format (rtsp:// protocol)
   - Optionally attempt HEAD request (if implemented)
   - Future: FFmpeg probe command for stream validation

**Implementation:**
```typescript
// New file: src/lib/device-connectivity-tester.ts
export async function testRedisConnection(
  host: string,
  port: number,
  deviceId: string
): Promise<TestResult> {
  const startTime = Date.now();
  let client: RedisClient | null = null;

  try {
    client = createClient({ url: `redis://${host}:${port}` });
    await client.connect();

    const pingResult = await client.ping();
    if (pingResult !== 'PONG') {
      return { status: 'error', message: 'Redis ping failed' };
    }

    // Check if device keys exist
    const keys = await client.keys(`${deviceId}/*`);
    const hasData = keys.length > 0;

    const latency = Date.now() - startTime;

    return {
      status: 'success',
      latency,
      message: `Connected successfully${hasData ? ` (${keys.length} keys found)` : ' (no data yet)'}`
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed'
    };
  } finally {
    if (client) await client.disconnect();
  }
}

export function validateRTSPUrl(url: string): TestResult {
  if (!url.startsWith('rtsp://')) {
    return { status: 'error', message: 'RTSP URL must start with rtsp://' };
  }

  try {
    const parsed = new URL(url);
    if (!parsed.hostname) {
      return { status: 'error', message: 'Invalid RTSP URL: missing hostname' };
    }

    return {
      status: 'warning',
      message: 'RTSP URL format valid (stream connectivity not tested)'
    };
  } catch {
    return { status: 'error', message: 'Invalid RTSP URL format' };
  }
}
```

---

### 5. UI Component Structure: Composition Pattern

**Decision:** Break UI into composable components: Manager → List → Form → Item.

**Rationale:**
- Separation of concerns (list vs form vs individual device)
- Easier testing and maintenance
- Reusable form for add/edit operations
- Clear data flow: Manager (state) → List (display) → Form (mutations)

**Component Hierarchy:**
```
RadarDeviceManager (container)
├── DeviceList (display)
│   ├── DeviceListItem (repeating)
│   │   ├── Device details
│   │   └── Action buttons (Edit, Delete, Test)
│   └── Empty state (when no devices)
├── DeviceForm (add/edit modal)
│   ├── Form fields (deviceId, name, IP, RTSP, etc.)
│   ├── Validation errors
│   ├── Test connectivity button
│   └── Save/Cancel buttons
└── DeviceActions (bulk operations)
    ├── Add Device button
    ├── Import/Export buttons
    └── Reset to Defaults button
```

**State Management:**
```typescript
// RadarDeviceManager.tsx (container component)
export default function RadarDeviceManager() {
  const { availableDevices, addDevice, updateDevice, deleteDevice } = useDevice();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<RadarDevice | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  const handleSave = async (device: RadarDevice) => {
    // Test connectivity first
    const results = await testDeviceConnectivity(device);
    setTestResults({ [device.id]: results });

    if (results.redis.status === 'error') {
      // Show error, don't save
      return;
    }

    // Save device
    if (editingDevice) {
      updateDevice(device);
    } else {
      addDevice(device);
    }

    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <DeviceActions
        onAdd={() => { setEditingDevice(null); setIsFormOpen(true); }}
        onExport={exportDevices}
        onImport={importDevices}
        onReset={resetToDefaults}
      />

      <DeviceList
        devices={availableDevices}
        testResults={testResults}
        onEdit={(device) => { setEditingDevice(device); setIsFormOpen(true); }}
        onDelete={deleteDevice}
        onTest={testDevice}
      />

      {isFormOpen && (
        <DeviceForm
          device={editingDevice}
          onSave={handleSave}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
    </div>
  );
}
```

---

### 6. Validation Strategy: Multi-Layer Validation

**Decision:** Implement validation at three layers: client-side, API, and storage.

**Validation Layers:**

1. **Client-Side (Form):**
   - Real-time field validation as user types
   - Instant feedback on format errors
   - Duplicate deviceId check
   - Required field enforcement

2. **API Layer (Connectivity Test):**
   - Actual connectivity verification
   - Redis PING command
   - RTSP URL format validation
   - Network-level errors

3. **Storage Layer (Before Save):**
   - Schema validation
   - Data integrity checks
   - Prevent saving invalid configs

**Validation Rules:**
```typescript
// Device ID validation
const DEVICE_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
const isValidDeviceId = (id: string) => {
  return id.length >= 2 && id.length <= 50 && DEVICE_ID_REGEX.test(id);
};

// IP address validation (IPv4)
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const isValidIPv4 = (ip: string) => IPV4_REGEX.test(ip);

// Port validation
const isValidPort = (port: number) => port >= 1 && port <= 65535;

// RTSP URL validation
const RTSP_URL_REGEX = /^rtsp:\/\/.+/;
const isValidRTSPUrl = (url: string) => {
  if (!RTSP_URL_REGEX.test(url)) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Duplicate check
const isDuplicateDeviceId = (id: string, existingDevices: RadarDevice[], excludeId?: string) => {
  return existingDevices.some(d => d.id === id && d.id !== excludeId);
};
```

---

### 7. DeviceContext Integration: CRUD Methods

**Decision:** Extend `DeviceContext` with `addDevice()`, `updateDevice()`, `deleteDevice()` methods.

**Current Context (Read-Only):**
```typescript
export interface DeviceContextType {
  selectedDevice: RadarDevice;
  availableDevices: RadarDevice[];
  switchDevice: (deviceId: string) => void;
  deviceStatus: Record<string, DeviceStatus>;
  isLoading: boolean;
  error?: string;
}
```

**Enhanced Context (CRUD Operations):**
```typescript
export interface DeviceContextType {
  // Existing (unchanged)
  selectedDevice: RadarDevice;
  availableDevices: RadarDevice[];
  switchDevice: (deviceId: string) => void;
  deviceStatus: Record<string, DeviceStatus>;
  isLoading: boolean;
  error?: string;

  // NEW: CRUD methods
  addDevice: (device: RadarDevice) => Promise<void>;
  updateDevice: (device: RadarDevice) => Promise<void>;
  deleteDevice: (deviceId: string) => Promise<void>;
  refreshDevices: () => Promise<void>;

  // NEW: Configuration management
  exportDeviceConfig: () => Blob;
  importDeviceConfig: (file: File) => Promise<void>;
  resetToDefaults: () => void;
}
```

**Implementation in DeviceProvider:**
```typescript
const addDevice = async (device: RadarDevice) => {
  try {
    setIsLoading(true);

    // Validate device doesn't exist
    if (availableDevices.some(d => d.id === device.id)) {
      throw new Error(`Device ${device.id} already exists`);
    }

    // Add to state
    const newDevices = [...availableDevices, device];
    setAvailableDevices(newDevices);

    // Persist to localStorage
    const storage = new DeviceConfigStorage();
    storage.save(newDevices);

    // Initialize status
    setDeviceStatus(prev => ({
      ...prev,
      [device.id]: {
        deviceId: device.id,
        status: 'online',
        lastUpdate: new Date()
      }
    }));

    // AUTO-SWITCH to newly added device (user preference)
    setSelectedDevice(device);
    await DeviceSyncService.getInstance().syncDevice(device.id);

  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to add device');
    throw err;
  } finally {
    setIsLoading(false);
  }
};

const updateDevice = async (device: RadarDevice) => {
  // Similar pattern: validate → update state → persist → update status
};

const deleteDevice = async (deviceId: string) => {
  // Prevent deleting selected device
  if (selectedDevice.id === deviceId) {
    throw new Error('Cannot delete currently selected device. Switch to another device first.');
  }

  // Remove from state and persist
  const newDevices = availableDevices.filter(d => d.id !== deviceId);
  setAvailableDevices(newDevices);

  const storage = new DeviceConfigStorage();
  storage.save(newDevices);

  // Clean up status
  setDeviceStatus(prev => {
    const { [deviceId]: removed, ...rest } = prev;
    return rest;
  });
};
```

---

## Data Flow Diagrams

### Add New Device Flow
```
User fills form
    ↓
Client-side validation
    ↓
Click "Test Connectivity"
    ↓
POST /api/devices/test
    ↓
Test Redis connection ──→ Success/Failure
    ↓                        ↓
Test RTSP URL ──────────→ Success/Warning/Failure
    ↓
Show test results to user
    ↓
User clicks "Save"
    ↓
DeviceContext.addDevice()
    ↓
Update availableDevices state
    ↓
DeviceConfigStorage.save() → localStorage
    ↓
Device selector dropdown updates
    ↓
Success message shown
```

### Edit Existing Device Flow
```
User clicks Edit button
    ↓
Load device data into form
    ↓
User modifies fields
    ↓
Test connectivity (optional)
    ↓
User clicks "Save"
    ↓
DeviceContext.updateDevice()
    ↓
Update device in availableDevices
    ↓
DeviceConfigStorage.save() → localStorage
    ↓
If selected device edited → refresh all data sources
    ↓
Success message shown
```

### Import Configuration Flow
```
User clicks "Import Configuration"
    ↓
File input dialog
    ↓
User selects JSON file
    ↓
Parse JSON
    ↓
Validate schema
    ↓
Show preview of devices to import
    ↓
Show warning: "This will REPLACE all existing devices"
    ↓
User confirms import
    ↓
DeviceConfigStorage.importFromJSON()
    ↓
REPLACE all existing devices (default behavior)
    ↓
DeviceContext.refreshDevices()
    ↓
Auto-switch to first device in imported list
    ↓
Device list updates
    ↓
Success message: "Imported X devices, replaced Y existing"
```

---

## Security Considerations

**Input Validation:**
- Sanitize all user inputs (device names, descriptions)
- Validate IP addresses against IPv4 format
- Validate ports within valid range (1-65535)
- Prevent XSS via proper React escaping

**Redis Connection:**
- No password stored in localStorage (use env var if needed)
- Connection testing uses temporary client (closes after test)
- Prevent Redis command injection (use parameterized queries)

**RTSP URLs:**
- URLs stored in localStorage (no encryption)
- Recommend using network-level security (VPN, firewalls)
- No credentials in RTSP URLs (use IP-based auth if possible)

**Export/Import:**
- Exported JSON may contain sensitive IPs
- Add warning: "Exported configuration contains IP addresses. Store securely."
- Validate imported JSON schema before applying

---

## Testing Strategy

**Unit Tests:**
- DeviceConfigStorage save/load/export/import
- Validation functions (IP, port, RTSP URL, device ID)
- DeviceContext CRUD methods

**Integration Tests:**
- Full add device flow (form → test → save → display)
- Edit device preserves other fields
- Delete device removes from all places
- Import merges correctly with existing devices

**E2E Tests:**
- Add device via Settings tab → appears in device selector
- Edit device → changes reflected in dashboard
- Delete device → no longer selectable
- Export → import round-trip preserves data

**Manual Testing Checklist:**
- [ ] Add device with valid IP → connects to Redis
- [ ] Add device with invalid IP → shows error
- [ ] Add duplicate device ID → prevents save
- [ ] Edit device → updates everywhere
- [ ] Delete device → removes from selector
- [ ] Delete selected device → shows error
- [ ] Export config → downloads JSON
- [ ] Import config → loads devices correctly
- [ ] Reset to defaults → restores test/Radar04
- [ ] Browser refresh → persists configuration

---

## Future Enhancements

**Phase 2:**
- Hot-reload Redis connection (per-device connections)
- Device health monitoring dashboard
- Automatic failover to backup devices

**Phase 3:**
- Multi-user configuration sync (API backend)
- Role-based access control (admin vs viewer)
- Device groups/categories for large deployments
- Bulk operations (test all, enable/disable multiple)

**Phase 4:**
- Automatic device discovery (scan network for radars)
- Configuration templates (preset configs for common setups)
- Device performance analytics
- Alerting on device failures
