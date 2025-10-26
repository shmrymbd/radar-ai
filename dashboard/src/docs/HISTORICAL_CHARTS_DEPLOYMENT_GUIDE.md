# Historical Classification Charts Deployment Guide

## Overview

This guide covers the deployment of the Historical Classification Charts feature, including MongoDB setup, data migration, and production configuration.

## Prerequisites

- MongoDB 6.20.0 or later
- Node.js 18+ with @types/node ^24
- Next.js 15.1.8
- Redis 5.9.0
- Existing radar data processing system

## MongoDB Setup

### 1. Database Configuration

Ensure MongoDB is running and accessible:

```bash
# Check MongoDB status
mongosh --host 192.168.6.22 --port 27017 --username admin --password admin123

# Verify database exists
use traffic_signal_dashboard
db.stats()
```

### 2. Collection Setup

Create the required collections with proper indexes:

```javascript
// Connect to MongoDB
use traffic_signal_dashboard

// Create classification_history collection
db.createCollection("classification_history")

// Create indexes for performance
db.classification_history.createIndex({ "deviceId": 1, "timestamp": 1 })
db.classification_history.createIndex({ "timeSlot": 1 })
db.classification_history.createIndex({ "deviceId": 1, "timeSlot": 1 })

// Verify indexes
db.classification_history.getIndexes()
```

### 3. Data Migration

If migrating from existing data:

```bash
# Run data migration script
node scripts/migrate-historical-data.js

# Verify migration
mongosh --eval "db.classification_history.countDocuments()" traffic_signal_dashboard
```

## Environment Configuration

### 1. Environment Variables

Update `.env.local` with historical charts configuration:

```env
# MongoDB Configuration (existing)
MONGODB_HOST=192.168.6.22
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Historical Charts Configuration
HISTORICAL_DATA_RETENTION_DAYS=90
HISTORICAL_AGGREGATION_INTERVAL_MINUTES=15
HISTORICAL_CACHE_TTL_SECONDS=300
HISTORICAL_MAX_PAGE_SIZE=1000

# Performance Configuration
HISTORICAL_VIRTUALIZATION_THRESHOLD=500
HISTORICAL_LAZY_LOADING_DELAY_MS=100
```

### 2. Next.js Configuration

Update `next.config.ts` for production optimization:

```typescript
const nextConfig = {
  // Existing configuration...
  
  // Historical charts optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@/components/HistoricalCharts']
  },
  
  // Performance headers
  async headers() {
    return [
      {
        source: '/api/classification/historical',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300'
          }
        ]
      }
    ]
  }
}
```

## Application Deployment

### 1. Build Process

```bash
# Install dependencies
npm install

# Build application
npm run build

# Verify build
npm run start
```

### 2. Production Server

Deploy with PM2 for process management:

```bash
# Install PM2
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'dashboard',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/dashboard',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'websocket-server',
      script: 'npm',
      args: 'run websocket',
      cwd: '/path/to/dashboard',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        WS_PORT: 8080
      }
    }
  ]
}
EOF

# Start applications
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Nginx Configuration

Configure reverse proxy for production:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Main application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket server
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Data Management

### 1. Historical Data Cleanup

Set up automated cleanup for old data:

```bash
# Create cleanup script
cat > scripts/cleanup-historical-data.js << EOF
const { MongoClient } = require('mongodb');

async function cleanupOldData() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db('traffic_signal_dashboard');
  const collection = db.collection('classification_history');
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90); // Keep 90 days
  
  const result = await collection.deleteMany({
    timestamp: { $lt: cutoffDate }
  });
  
  console.log(\`Cleaned up \${result.deletedCount} old records\`);
  await client.close();
}

cleanupOldData().catch(console.error);
EOF

# Schedule cleanup (crontab)
echo "0 2 * * * cd /path/to/dashboard && node scripts/cleanup-historical-data.js" | crontab -
```

### 2. Data Backup

Set up regular backups:

```bash
# Create backup script
cat > scripts/backup-historical-data.sh << EOF
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/historical-data"
mkdir -p \$BACKUP_DIR

mongodump --host 192.168.6.22 --port 27017 \
  --username admin --password admin123 \
  --db traffic_signal_dashboard \
  --collection classification_history \
  --out \$BACKUP_DIR/backup_\$DATE

# Keep only last 7 days of backups
find \$BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;
EOF

chmod +x scripts/backup-historical-data.sh

# Schedule backup (crontab)
echo "0 1 * * * /path/to/dashboard/scripts/backup-historical-data.sh" | crontab -
```

## Monitoring and Maintenance

### 1. Health Checks

Create health check endpoints:

```bash
# Test MongoDB connection
curl http://localhost:3000/api/classification/historical?deviceId=test&timePeriod=24hrs

# Test WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" http://localhost:8080/ws
```

### 2. Performance Monitoring

Monitor key metrics:

```bash
# Check MongoDB performance
mongosh --eval "db.classification_history.explain().find({deviceId: 'test'}).limit(100)"

# Monitor application performance
pm2 monit

# Check disk usage
df -h /path/to/dashboard
```

### 3. Log Management

Configure log rotation:

```bash
# Configure PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**
   - Verify MongoDB is running
   - Check connection credentials
   - Ensure network connectivity

2. **Performance Issues**
   - Enable chart virtualization
   - Check MongoDB indexes
   - Monitor memory usage

3. **Data Not Appearing**
   - Verify data aggregation is running
   - Check time period filters
   - Validate device ID

### Support

For deployment issues:
1. Check application logs: `pm2 logs dashboard`
2. Verify MongoDB status: `mongosh --eval "db.adminCommand('ping')"`
3. Test API endpoints: `curl http://localhost:3000/api/classification/historical`

## Security Considerations

1. **Database Security**
   - Use strong passwords
   - Enable authentication
   - Restrict network access

2. **Application Security**
   - Use HTTPS in production
   - Implement rate limiting
   - Validate input data

3. **Data Privacy**
   - Anonymize sensitive data
   - Implement data retention policies
   - Regular security audits

## Rollback Plan

If issues occur:

1. **Stop Applications**
   ```bash
   pm2 stop dashboard websocket-server
   ```

2. **Restore Database**
   ```bash
   mongorestore --host 192.168.6.22 --port 27017 --username admin --password admin123 --db traffic_signal_dashboard /backups/historical-data/backup_YYYYMMDD_HHMMSS
   ```

3. **Revert Code**
   ```bash
   git checkout previous-stable-commit
   npm install
   npm run build
   pm2 restart dashboard websocket-server
   ```
