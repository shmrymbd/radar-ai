# Quick Reference Card

Essential commands and troubleshooting for the Radar AI Traffic Dashboard.

## 🚀 Quick Start

```bash
# First time setup
./setup.sh

# Start development
cd dashboard
npm run dev:full

# Open browser
http://localhost:3000
```

## 📦 Development Commands

### Starting Services

| Command | Purpose |
|---------|---------|
| `npm run dev:full` | **Recommended** - Start Next.js + WebSocket |
| `npm run dev` | Start Next.js only (port 3000) |
| `npm run websocket` | Start WebSocket server only (port 8080) |
| `npm run build` | Build for production |
| `npm run lint` | Run ESLint checks |

### Database Management

```bash
# Create/update MongoDB indexes
npm run db:indexes

# Verify data sources (Redis + MongoDB)
node verify-data-sources.js

# Check latest MongoDB entries
node check-mongodb-latest.js

# Check recent passdata
node check-recent-passdata.js
```

## 🔍 Testing & Debugging

### Quick Connection Tests

```bash
# Test Redis
redis-cli -h 192.168.6.22 -p 6379 ping
# Expected: PONG

# Test MongoDB
mongosh "mongodb://admin:admin123@192.168.6.22:27017/?authSource=admin"
# Expected: Connection successful
```

### API Endpoint Tests

```bash
# Test Redis connection
curl "http://localhost:3000/api/simple-redis?device=P1-center"

# Test classification data
curl "http://localhost:3000/api/classification?deviceId=P1-center"

# Test tracking data
curl "http://localhost:3000/api/tracking?deviceId=P1-center"

# Test lane status
curl "http://localhost:3000/api/lanes?deviceId=P1-center"
```

## 🗄️ Redis Commands

```bash
# Connect to Redis
redis-cli -h 192.168.6.22 -p 6379

# List all keys
KEYS *

# Check passdata (latest 10)
LRANGE P1-center/passdata -10 -1

# Check objectdata (latest 10)
LRANGE P1-center/objectdata -10 -1

# Monitor real-time commands
MONITOR

# Count keys matching pattern
KEYS P1-center/* | wc -l

# Clear specific device data (CAREFUL!)
DEL P1-center/passdata
```

## 🗃️ MongoDB Commands

```bash
# Connect to MongoDB
mongosh "mongodb://admin:admin123@192.168.6.22:27017/traffic_signal_dashboard?authSource=admin"

# Count documents
db.passData.countDocuments()

# Find recent entries (10)
db.passData.find().sort({timestamp: -1}).limit(10).pretty()

# Find by device
db.passData.find({deviceId: "P1-center"}).limit(10)

# Check indexes
db.passData.getIndexes()

# Aggregate by vehicle type
db.passData.aggregate([
  {$group: {_id: "$vehicleType", count: {$sum: 1}}},
  {$sort: {count: -1}}
])

# Clear collection (CAREFUL!)
db.passData.deleteMany({})
```

## 🐛 Common Issues & Fixes

### Issue: Port 3000 already in use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### Issue: Cannot connect to Redis

```bash
# Check Redis is running
redis-cli -h 192.168.6.22 -p 6379 ping

# Check firewall
telnet 192.168.6.22 6379

# Verify .env.local settings
cat dashboard/.env.local | grep REDIS
```

### Issue: MongoDB authentication failed

```bash
# Test connection
mongosh "mongodb://admin:admin123@192.168.6.22:27017/?authSource=admin"

# Verify credentials in .env.local
cat dashboard/.env.local | grep MONGODB
```

### Issue: No data in dashboard

```bash
# Check Redis keys
redis-cli -h 192.168.6.22 -p 6379 KEYS *passdata

# Check MongoDB data
node dashboard/check-mongodb-latest.js

# Verify device ID
echo $RADAR_DEVICE_ID  # Should be P1-center, P3, or P1-o/h
```

### Issue: Hydration mismatch errors

```bash
# Clear Next.js cache
rm -rf dashboard/.next
npm run dev

# Clear browser cache and reload
# Or use incognito mode
```

### Issue: Module not found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Clear npm cache
npm cache clean --force
npm install
```

### Issue: TypeScript errors

```bash
# Check types
npx tsc --noEmit --skipLibCheck

# Restart TypeScript server (in VS Code)
# Cmd+Shift+P > "TypeScript: Restart TS Server"
```

## 🔐 Environment Variables

### Required Variables

```env
# Redis (Required)
REDIS_HOST=192.168.6.22
REDIS_PORT=6379

# MongoDB (Required)
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar (Required)
RADAR_DEVICE_ID=P1-center
LANES=11,12,13,485
```

### Optional Variables

```env
# Performance
DASHBOARD_REFRESH_INTERVAL=1000
QUEUE_THRESHOLD=50
SPEED_LIMIT=60

# Development
DISABLE_RATE_LIMITING=true
NODE_ENV=development
```

## 📊 Valid Device IDs

| Device ID | Description |
|-----------|-------------|
| `P1-center` | Primary device (most commonly used) |
| `P3` | Secondary device |
| `P1-o/h` | Overhead position |

**⚠️ Device IDs are case-sensitive!**

## 📋 Valid Lane Numbers

Default lanes: `11, 12, 13, 485`

Configure in `.env.local`:
```env
LANES=11,12,13,485
```

## 🎯 Key Files

| File | Purpose |
|------|---------|
| `dashboard/.env.local` | Environment configuration (DO NOT COMMIT) |
| `dashboard/package.json` | Dependencies and scripts |
| `ENVIRONMENT_SETUP.md` | Complete setup guide |
| `API_DOCUMENTATION.md` | API endpoint reference |
| `CLAUDE.md` | Development guidelines |

## 🔗 URLs

| URL | Description |
|-----|-------------|
| `http://localhost:3000` | Main dashboard |
| `http://localhost:3000/api/health` | Health check |
| `ws://localhost:8080` | WebSocket server |

## 📝 Git Workflow

```bash
# Check status
git status

# Create feature branch
git checkout -b feature/your-feature

# Commit changes
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npx tsc --noEmit --skipLibCheck

# Test specific API
curl "http://localhost:3000/api/classification?deviceId=P1-center" | jq

# Monitor WebSocket (requires websocat)
websocat ws://localhost:8080
```

## 📚 Documentation Quick Links

- [Environment Setup](./ENVIRONMENT_SETUP.md) - **Start here**
- [API Documentation](./API_DOCUMENTATION.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Development Guidelines](./CLAUDE.md)
- [Video Streaming Setup](./VIDEO_STREAMING_DEPLOYMENT.md)

## 🆘 Getting Help

1. **Check logs**: Browser console + Terminal output
2. **Verify connections**: Redis + MongoDB ping tests
3. **Review docs**: ENVIRONMENT_SETUP.md + CLAUDE.md
4. **Check recent changes**: `git log --oneline -10`

## 💡 Pro Tips

- Use `npm run dev:full` for complete local development
- Check WebSocket connection in browser console
- Monitor Redis with `redis-cli MONITOR` when debugging
- Use MongoDB Compass for visual data exploration
- Keep `.env.local` updated with correct IPs
- Clear browser cache when seeing old data
- Use different terminals for different services

---

**Last Updated**: 2025-10-29
**Quick Reference Version**: 1.0.0

For detailed information, see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)
