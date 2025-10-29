# Environment Setup Guide

This guide helps new developers set up the Radar AI Traffic Dashboard for local development and testing.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Setup (Automated)](#quick-setup-automated)
- [Manual Setup](#manual-setup)
- [Configuration Details](#configuration-details)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have the following installed:

### Required Software

| Software | Minimum Version | Purpose |
|----------|----------------|---------|
| **Node.js** | 18.x or higher | Runtime for Next.js application |
| **npm** | 9.x or higher | Package manager |
| **Redis** | 6.x or higher | Real-time data streaming and caching |
| **MongoDB** | 5.x or higher | Persistent data storage |

### Installation Links

- **Node.js**: [https://nodejs.org/](https://nodejs.org/)
- **Redis**: [https://redis.io/download](https://redis.io/download)
- **MongoDB**: [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

### System Requirements

- **RAM**: 4GB minimum (8GB recommended)
- **Disk Space**: 2GB free space
- **Network**: Access to Redis and MongoDB servers
- **OS**: macOS, Linux, or Windows (WSL recommended)

---

## Quick Setup (Automated)

The easiest way to set up the environment is using the automated setup script:

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd radar-ai
```

### Step 2: Run Setup Script

```bash
./setup.sh
```

The script will:
1. ✅ Verify Node.js and npm installation
2. ✅ Prompt for Redis connection details
3. ✅ Test Redis connectivity
4. ✅ Prompt for MongoDB configuration
5. ✅ Create `.env.local` configuration file
6. ✅ Install npm dependencies
7. ✅ Create MongoDB indexes
8. ✅ Verify data source connections

### Step 3: Start Development Server

```bash
cd dashboard
npm run dev:full
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Manual Setup

If you prefer manual setup or the automated script fails:

### 1. Clone Repository

```bash
git clone <repository-url>
cd radar-ai
```

### 2. Create Environment File

Create `dashboard/.env.local` with the following content:

```env
# Redis Configuration
REDIS_HOST=192.168.1.71
REDIS_PORT=6379

# MongoDB Configuration
MONGODB_HOST=192.168.1.71
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar Configuration
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=P1-center

# Dashboard Configuration
DASHBOARD_REFRESH_INTERVAL=1000
QUEUE_THRESHOLD=50
SPEED_LIMIT=60
LANES=11,12,13,485

# Development Settings
DISABLE_RATE_LIMITING=true
NODE_ENV=development
```

**⚠️ Important**: Replace the IP addresses, usernames, and passwords with your actual values.

### 3. Install Dependencies

```bash
cd dashboard
npm install
```

### 4. Create MongoDB Indexes

```bash
npm run db:indexes
```

This creates optimized indexes for:
- PassData collection (timestamp, deviceId, laneNumber)
- Classification queries
- Historical data retrieval

### 5. Verify Connections

```bash
node verify-data-sources.js
```

This script tests:
- ✅ Redis connectivity
- ✅ MongoDB connectivity
- ✅ Data availability

### 6. Start Development Server

```bash
npm run dev:full
```

---

## Configuration Details

### Redis Configuration

Redis stores real-time radar data and supports pub/sub for live updates.

```env
REDIS_HOST=192.168.1.71    # Redis server IP address
REDIS_PORT=6379            # Redis server port (default: 6379)
```

**Key Patterns Used:**
- `P1-center/passdata` - Pass event data
- `P1-center/objectdata` - Vehicle tracking data
- `P1-center/laneStatus` - Lane status data

**Validation Command:**
```bash
redis-cli -h 192.168.1.71 -p 6379 ping
# Expected output: PONG
```

### MongoDB Configuration

MongoDB stores historical data and persistent configuration.

```env
MONGODB_HOST=192.168.1.71              # MongoDB server IP
MONGODB_PORT=27017                      # MongoDB port (default: 27017)
MONGODB_USERNAME=admin                  # Database username
MONGODB_PASSWORD=admin123               # Database password
MONGODB_AUTH_DATABASE=admin             # Authentication database
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard  # App database
```

**Collections Used:**
- `passData` - Vehicle pass events with timestamp, speed, lane
- `laneConfig` - Lane configuration and thresholds
- `cameras` - Camera stream settings

**Validation Command:**
```bash
mongosh "mongodb://admin:admin123@192.168.1.71:27017/traffic_signal_dashboard?authSource=admin"
```

### Radar Configuration

```env
RADAR_PROTOCOL_VERSION=2.1     # ClairWav-T80 protocol version
RADAR_DEVICE_ID=P1-center      # Default device ID
```

**Valid Device IDs:**
- `P1-center` - Primary device (most commonly used)
- `P3` - Secondary device
- `P1-o/h` - Overhead position

**⚠️ Device IDs are case-sensitive!**

### Dashboard Configuration

```env
DASHBOARD_REFRESH_INTERVAL=1000   # UI refresh rate (milliseconds)
QUEUE_THRESHOLD=50                # Queue length warning threshold
SPEED_LIMIT=60                    # Speed limit for violation detection (km/h)
LANES=11,12,13,485                # Valid lane numbers (comma-separated)
```

### Development Settings

```env
DISABLE_RATE_LIMITING=true   # Disable API rate limits in development
NODE_ENV=development         # Environment mode
```

---

## Verification

After setup, verify everything is working:

### 1. Check Services

```bash
# Test Redis
redis-cli -h 192.168.1.71 -p 6379 ping

# Test MongoDB
mongosh "mongodb://admin:admin123@192.168.1.71:27017/?authSource=admin"
```

### 2. Verify Data Sources

```bash
cd dashboard
node verify-data-sources.js
```

**Expected Output:**
```
✓ Redis connection successful
✓ MongoDB connection successful
✓ PassData available: 1234 records
✓ Lane configuration loaded
```

### 3. Check Latest Data

```bash
node check-mongodb-latest.js
```

This shows the most recent data entries to confirm data is flowing.

### 4. Test API Endpoints

```bash
# Test simple Redis connection
curl "http://localhost:3000/api/simple-redis?device=P1-center"

# Test classification data
curl "http://localhost:3000/api/classification?deviceId=P1-center"

# Test tracking data
curl "http://localhost:3000/api/tracking?deviceId=P1-center"
```

---

## Troubleshooting

### Issue: "Cannot connect to Redis"

**Solutions:**
1. Verify Redis is running:
   ```bash
   redis-cli -h 192.168.1.71 -p 6379 ping
   ```
2. Check firewall rules allow port 6379
3. Verify Redis configuration accepts remote connections (edit `redis.conf`):
   ```conf
   bind 0.0.0.0
   protected-mode no
   ```

### Issue: "MongoDB authentication failed"

**Solutions:**
1. Verify credentials:
   ```bash
   mongosh "mongodb://admin:admin123@192.168.1.71:27017/?authSource=admin"
   ```
2. Check user permissions:
   ```javascript
   use admin
   db.getUser("admin")
   ```
3. Ensure `MONGODB_AUTH_DATABASE=admin` in `.env.local`

### Issue: "No data in dashboard"

**Solutions:**
1. Check Redis keys exist:
   ```bash
   redis-cli -h 192.168.1.71 -p 6379
   KEYS *passdata
   ```
2. Verify MongoDB has data:
   ```bash
   node dashboard/check-mongodb-latest.js
   ```
3. Check WebSocket connection (browser console):
   ```
   WebSocket connection established
   ```

### Issue: "Hydration mismatch errors"

**Solutions:**
1. Clear browser cache and reload
2. Delete `.next` folder:
   ```bash
   rm -rf dashboard/.next
   npm run dev
   ```
3. Check for `Math.random()` or `Date.now()` in initial render

### Issue: "Port 3000 already in use"

**Solutions:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

### Issue: "Module not found" errors

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

---

## Development Commands

### Starting Services

```bash
# Start Next.js + WebSocket (recommended)
npm run dev:full

# Start Next.js only
npm run dev

# Start WebSocket server only
npm run websocket

# Build for production
npm run build
```

### Database Management

```bash
# Create/update MongoDB indexes
npm run db:indexes

# Verify data sources
node verify-data-sources.js

# Check latest MongoDB entries
node check-mongodb-latest.js

# Check recent passdata
node check-recent-passdata.js
```

### Testing

```bash
# Run linter
npm run lint

# Run type checking
npx tsc --noEmit --skipLibCheck

# Test video streaming
node test-video-streaming.js
```

### Redis Operations

```bash
# Connect to Redis CLI
redis-cli -h 192.168.1.71 -p 6379

# List all keys
KEYS *

# Check passdata list
LRANGE P1-center/passdata 0 10

# Monitor real-time commands
MONITOR

# Clear specific device data
DEL P1-center/passdata
```

### MongoDB Operations

```bash
# Connect to MongoDB
mongosh "mongodb://admin:admin123@192.168.1.71:27017/traffic_signal_dashboard?authSource=admin"

# Count passData records
db.passData.countDocuments()

# Find recent entries
db.passData.find().sort({timestamp: -1}).limit(10)

# Check indexes
db.passData.getIndexes()

# Clear collection (careful!)
db.passData.deleteMany({})
```

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `192.168.1.71` | Redis server hostname or IP |
| `REDIS_PORT` | `6379` | Redis server port |
| `MONGODB_HOST` | `192.168.1.71` | MongoDB server hostname or IP |
| `MONGODB_PORT` | `27017` | MongoDB server port |
| `MONGODB_USERNAME` | `admin` | MongoDB username |
| `MONGODB_PASSWORD` | `admin123` | MongoDB password |
| `MONGODB_AUTH_DATABASE` | `admin` | Authentication database |
| `MONGODB_DASHBOARD_DATABASE` | `traffic_signal_dashboard` | Application database |
| `RADAR_PROTOCOL_VERSION` | `2.1` | ClairWav-T80 protocol version |
| `RADAR_DEVICE_ID` | `P1-center` | Default radar device ID |
| `DASHBOARD_REFRESH_INTERVAL` | `1000` | UI refresh interval (ms) |
| `QUEUE_THRESHOLD` | `50` | Queue length warning threshold |
| `SPEED_LIMIT` | `60` | Speed limit (km/h) |
| `LANES` | `11,12,13,485` | Valid lane numbers |
| `DISABLE_RATE_LIMITING` | `true` | Disable API rate limits in dev |
| `NODE_ENV` | `development` | Node environment |

---

## Next Steps

After successful setup:

1. **Explore the Dashboard**: Navigate to [http://localhost:3000](http://localhost:3000)
2. **Read Documentation**: Check `CLAUDE.md` for development guidelines
3. **Review API Docs**: See `API_DOCUMENTATION.md` for endpoint details
4. **Check Architecture**: Read `PROJECT_SUMMARY.md` for system overview

---

## Getting Help

If you encounter issues:

1. Check this troubleshooting section
2. Review error messages in browser console and terminal
3. Verify all services (Redis, MongoDB) are running
4. Check `CLAUDE.md` for common gotchas
5. Review recent commits for breaking changes

---

## Security Notes

**⚠️ Important for Production:**

1. **Never commit `.env.local`** - It contains sensitive credentials
2. **Change default passwords** - Use strong, unique passwords
3. **Enable authentication** - Configure Redis with `requirepass`
4. **Use HTTPS** - Enable SSL/TLS for production
5. **Restrict network access** - Use firewall rules to limit connections
6. **Enable rate limiting** - Set `DISABLE_RATE_LIMITING=false` in production

---

**Last Updated**: 2025-10-29
**Setup Script Version**: 1.0.0
