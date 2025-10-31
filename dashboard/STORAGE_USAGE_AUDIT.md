# Storage Usage Audit - UI Components

This document lists all UI components that use localStorage or MongoDB.

## localStorage Usage

### 1. DeviceContext.tsx
**Location:** `dashboard/src/contexts/DeviceContext.tsx`

**Usage:**
- **Key:** `radar-device-config`
- **Stores:** 
  - `selectedDevice` - Currently selected radar device ID
  - `availableDevices` - List of available devices
  - `lastUpdated` - Timestamp of last update
- **Purpose:** Persist device selection across page refreshes
- **Migration:** Automatically migrates old device IDs (Radar04, radar04, test) to P1-center

**Code references:**
```typescript
// Line 59: Load saved config
const savedConfig = localStorage.getItem('radar-device-config');

// Line 79: Save migrated config
localStorage.setItem('radar-device-config', JSON.stringify(config));

// Line 103: Remove invalid config
localStorage.removeItem('radar-device-config');

// Line 143: Save device selection
localStorage.setItem('radar-device-config', JSON.stringify(config));
```

---

### 2. ControlCenterContext.tsx
**Location:** `dashboard/src/contexts/ControlCenterContext.tsx`

**Usage:**
- **Key:** `controlCenterOverlay`
- **Stores:** Boolean value for video overlay visibility preference
- **Purpose:** Remember user's preference for showing/hiding video overlay in Control Center

**Code references:**
```typescript
// Line 83: Load overlay preference
const saved = localStorage.getItem('controlCenterOverlay');

// Line 94: Save overlay preference
localStorage.setItem('controlCenterOverlay', JSON.stringify(showVideoOverlay));
```

---

### 3. HistoricalCharts.tsx
**Location:** `dashboard/src/components/HistoricalCharts.tsx`

**Usage:**
- **Key:** `historical-charts-preferences`
- **Stores:**
  - `defaultTimePeriod` - Default time period (24hrs, yesterday, month)
  - `defaultChartType` - Default chart type (histogram, heatmap, trend, etc.)
  - `chartOptions` - Chart customization options (grid, legend, animation, colors, font size)
  - `lastUpdated` - Timestamp
- **Purpose:** Persist user preferences for historical chart visualizations

**Code references:**
```typescript
// Line 45: Load saved preferences
const savedPreferences = localStorage.getItem('historical-charts-preferences');

// Line 74: Save preferences
localStorage.setItem('historical-charts-preferences', JSON.stringify(preferences));
```

---

## MongoDB Usage

### Server-Side API Routes (Not UI Components)

MongoDB is **NOT directly accessed** from UI components. All MongoDB access happens through API routes:

1. **`/api/analytics/route.ts`**
   - Uses MongoDB to fetch PassData for analytics
   - Client calls via: `fetch('/api/analytics?deviceId=...&timeRange=...')`

2. **`/api/classification/*` routes**
   - Multiple classification endpoints use MongoDB
   - Client calls via: `fetch('/api/classification/...')`

3. **`/api/classification-mongodb/route.ts`**
   - Direct MongoDB queries for classification data

4. **`/api/dashboard/route.ts`**
   - May use MongoDB for dashboard data aggregation

### UI Components → MongoDB Flow

```
UI Component → fetch() → API Route → MongoDB
```

**No direct MongoDB connections in UI components** ✅ (Good architecture)

---

## Summary

### localStorage Keys:
1. `radar-device-config` - Device selection and configuration
2. `controlCenterOverlay` - Video overlay visibility preference  
3. `historical-charts-preferences` - Chart visualization preferences

### MongoDB Access:
- **UI Components:** None (no direct access) ✅
- **API Routes:** Multiple routes access MongoDB (expected behavior)

### Recommendations:

1. **Device Configuration Migration:**
   - ✅ Already implemented automatic migration from old device IDs
   - Consider adding version to localStorage keys for future migrations

2. **Chart Preferences:**
   - Consider adding expiration/cleanup for old preferences
   - Add versioning for preferences schema

3. **Video Overlay Preference:**
   - Consider making this device-specific if multiple devices have different preferences

4. **No MongoDB in UI:**
   - Current architecture is correct - all MongoDB access via API routes
   - Maintain this pattern for security and performance

---

## Testing localStorage

To test or clear localStorage:

```javascript
// In browser console (F12):

// View all localStorage keys
console.log(Object.keys(localStorage));

// Clear device config
localStorage.removeItem('radar-device-config');

// Clear chart preferences
localStorage.removeItem('historical-charts-preferences');

// Clear overlay preference
localStorage.removeItem('controlCenterOverlay');

// Clear all localStorage
localStorage.clear();
```

---

**Last Updated:** 2025-01-31
**Audited By:** AI Assistant

