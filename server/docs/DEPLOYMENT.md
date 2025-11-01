# Deployment Guide

This guide covers deploying the Radar AI backend server in various environments.

**Last Updated**: 2025-11-01
**Deployment Status**: ✅ Ready for Staging | ⚠️ Needs Fixes for Production

**Production Readiness**:
- ✅ Docker and docker-compose configured
- ✅ Health check endpoints functional
- ✅ PM2 and systemd examples provided
- ✅ Kubernetes manifests documented
- ⚠️ Critical issues must be fixed before production deployment (see README.md)

**Verified Deployments**:
- ✅ Development (local with hot reload)
- ✅ Staging (Docker with Redis/MongoDB at 192.168.6.22)
- ⚠️ Production (not yet deployed - awaiting critical fixes)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Development Deployment](#development-deployment)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: >= 18.0.0
- **Redis**: >= 6.0
- **MongoDB**: >= 5.0
- **RAM**: Minimum 512MB, Recommended 2GB
- **CPU**: Minimum 1 core, Recommended 2+ cores

### Network Requirements

- **Port 8080**: WebSocket server (configurable)
- **Port 8081**: Health check HTTP server
- **Redis Port**: 6379 (or custom)
- **MongoDB Port**: 27017 (or custom)

## Environment Configuration

### Required Environment Variables

Create a `.env` file with the following variables:

```bash
# Server Configuration
NODE_ENV=production
PORT=8080
LOG_LEVEL=info

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# MongoDB Configuration
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_USERNAME=admin
MONGODB_PASSWORD=your_secure_password
MONGODB_AUTH_DATABASE=admin
MONGODB_DASHBOARD_DATABASE=traffic_signal_dashboard

# Radar Configuration
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=P1-center

# Optional
REDIS_PASSWORD=your_redis_password  # If Redis auth enabled
```

### Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for MongoDB and Redis
3. **Enable authentication** on Redis and MongoDB
4. **Use TLS/SSL** in production for database connections
5. **Restrict network access** using firewalls

## Development Deployment

### Local Development

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start development server
npm run dev
```

The server will run with hot-reload enabled on port 8080.

### Development with Docker Compose

```bash
# Start Redis and MongoDB
docker-compose up -d redis mongodb

# Start development server
npm run dev
```

## Production Deployment

### Manual Deployment

1. **Install dependencies**:
```bash
npm ci --production
```

2. **Build TypeScript**:
```bash
npm run build
```

3. **Set environment variables**:
```bash
export NODE_ENV=production
export PORT=8080
# ... other variables
```

4. **Start server**:
```bash
npm start
```

### Using PM2 (Recommended)

PM2 provides process management, monitoring, and automatic restarts.

#### Install PM2

```bash
npm install -g pm2
```

#### Create PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'radar-ai-backend',
    script: './dist/index.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    watch: false
  }]
};
```

#### Start with PM2

```bash
# Build
npm run build

# Start
pm2 start ecosystem.config.js

# View logs
pm2 logs radar-ai-backend

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/radar-ai-backend.service`:

```ini
[Unit]
Description=Radar AI Backend Server
After=network.target redis.service mongodb.service

[Service]
Type=simple
User=radar-ai
WorkingDirectory=/opt/radar-ai/server
EnvironmentFile=/opt/radar-ai/server/.env
ExecStart=/usr/bin/node /opt/radar-ai/server/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=radar-ai-backend

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable radar-ai-backend
sudo systemctl start radar-ai-backend
sudo systemctl status radar-ai-backend
```

View logs:

```bash
sudo journalctl -u radar-ai-backend -f
```

## Docker Deployment

### Dockerfile

The server includes a production-ready Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --production

# Copy built code
COPY dist ./dist
COPY .env.example .env

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/alive || exit 1

EXPOSE 8080 8081

CMD ["node", "dist/index.js"]
```

### Build and Run

```bash
# Build image
docker build -t radar-ai-backend:latest .

# Run container
docker run -d \
  --name radar-ai-backend \
  -p 8080:8080 \
  -p 8081:8081 \
  -e REDIS_HOST=redis \
  -e MONGODB_HOST=mongodb \
  --restart unless-stopped \
  radar-ai-backend:latest
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8080:8080"
      - "8081:8081"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - MONGODB_HOST=mongodb
      - MONGODB_USERNAME=admin
      - MONGODB_PASSWORD=admin123
    depends_on:
      - redis
      - mongodb
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8081/alive"]
      interval: 30s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin123
    volumes:
      - mongodb-data:/data/db
    restart: unless-stopped

volumes:
  redis-data:
  mongodb-data:
```

Start services:

```bash
docker-compose up -d
```

## Kubernetes Deployment

### ConfigMap

Create `configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: radar-ai-backend-config
data:
  NODE_ENV: "production"
  PORT: "8080"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  MONGODB_HOST: "mongodb-service"
  MONGODB_PORT: "27017"
  MONGODB_AUTH_DATABASE: "admin"
  MONGODB_DASHBOARD_DATABASE: "traffic_signal_dashboard"
  LOG_LEVEL: "info"
```

### Secret

Create `secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: radar-ai-backend-secret
type: Opaque
stringData:
  MONGODB_USERNAME: "admin"
  MONGODB_PASSWORD: "your_secure_password"
  REDIS_PASSWORD: "your_redis_password"
```

### Deployment

Create `deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: radar-ai-backend
  labels:
    app: radar-ai-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: radar-ai-backend
  template:
    metadata:
      labels:
        app: radar-ai-backend
    spec:
      containers:
      - name: backend
        image: radar-ai-backend:latest
        ports:
        - containerPort: 8080
          name: websocket
        - containerPort: 8081
          name: health
        envFrom:
        - configMapRef:
            name: radar-ai-backend-config
        - secretRef:
            name: radar-ai-backend-secret
        livenessProbe:
          httpGet:
            path: /alive
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Service

Create `service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: radar-ai-backend-service
spec:
  selector:
    app: radar-ai-backend
  ports:
  - name: websocket
    port: 8080
    targetPort: 8080
  - name: health
    port: 8081
    targetPort: 8081
  type: LoadBalancer
```

### Deploy to Kubernetes

```bash
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml

# Check status
kubectl get pods
kubectl logs -f deployment/radar-ai-backend
```

## Monitoring

### Health Checks

The server provides comprehensive health endpoints:

```bash
# Liveness probe (is process alive?)
curl http://localhost:8081/alive

# Readiness probe (ready to serve traffic?)
curl http://localhost:8081/ready

# Full health status
curl http://localhost:8081/health
```

### Prometheus Metrics

```bash
# Scrape metrics
curl http://localhost:8081/metrics
```

### Log Aggregation

Logs are written to stdout in JSON format (production) or human-readable format (development).

**Recommended tools**:
- **ELK Stack**: Elasticsearch + Logstash + Kibana
- **Loki**: Grafana Loki for log aggregation
- **CloudWatch**: AWS CloudWatch Logs

**Example JSON log**:
```json
{
  "level": "info",
  "message": "WebSocket server listening on port 8080",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "service": "radar-ai-server",
  "component": "websocket-server"
}
```

### Monitoring Dashboards

**Recommended metrics to monitor**:
- WebSocket connection count
- Redis connection status and latency
- MongoDB connection status and latency
- Server uptime
- Memory usage
- CPU usage
- Error rate

**Tools**:
- Grafana + Prometheus
- Datadog
- New Relic

## Troubleshooting

### Server Won't Start

**Check logs**:
```bash
# PM2
pm2 logs radar-ai-backend

# systemd
sudo journalctl -u radar-ai-backend -n 100

# Docker
docker logs radar-ai-backend
```

**Common issues**:
1. **Port already in use**: Change `PORT` environment variable
2. **Cannot connect to Redis**: Check `REDIS_HOST` and `REDIS_PORT`
3. **Cannot connect to MongoDB**: Check MongoDB credentials and host
4. **Missing environment variables**: Ensure all required variables are set

### WebSocket Connection Failures

**Check**:
1. Firewall allows port 8080
2. Server is running and healthy: `curl http://localhost:8081/health`
3. WebSocket URL is correct in dashboard configuration
4. No proxy/load balancer blocking WebSocket connections

### High Memory Usage

**Solutions**:
1. Increase PM2 `max_memory_restart` limit
2. Check for memory leaks with `node --inspect`
3. Reduce concurrent connections
4. Enable garbage collection logging

### Redis Connection Issues

**Verify Redis**:
```bash
redis-cli -h <REDIS_HOST> -p <REDIS_PORT> ping
```

**Check**:
1. Redis server is running
2. Network connectivity
3. Authentication credentials
4. Firewall rules

### MongoDB Connection Issues

**Verify MongoDB**:
```bash
mongosh "mongodb://<username>:<password>@<host>:<port>/admin"
```

**Check**:
1. MongoDB server is running
2. Network connectivity
3. Authentication credentials
4. Database exists

## Performance Tuning

### Node.js Optimization

```bash
# Increase heap size for high traffic
node --max-old-space-size=4096 dist/index.js

# Enable garbage collection logging
node --trace-gc dist/index.js
```

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'radar-ai-backend',
    script: './dist/index.js',
    instances: 'max',  // Use all CPU cores
    exec_mode: 'cluster'
  }]
};
```

### Redis Tuning

```bash
# Increase max connections
redis-cli CONFIG SET maxclients 10000
```

### MongoDB Tuning

- Create indexes for frequently queried fields
- Enable oplog for real-time updates
- Increase connection pool size

## Backup and Recovery

### MongoDB Backup

```bash
# Backup
mongodump --host=<host> --port=<port> -u=<user> -p=<password> \
  --authenticationDatabase=admin -d=traffic_signal_dashboard \
  --out=/backup/mongodb

# Restore
mongorestore --host=<host> --port=<port> -u=<user> -p=<password> \
  --authenticationDatabase=admin /backup/mongodb
```

### Redis Backup

```bash
# Create snapshot
redis-cli SAVE

# Copy RDB file
cp /var/lib/redis/dump.rdb /backup/redis/
```

## Scaling

### Horizontal Scaling

- Deploy multiple instances behind a load balancer
- Use sticky sessions for WebSocket connections
- Share Redis and MongoDB across instances

### Load Balancing

**Nginx configuration**:
```nginx
upstream radar_ai_backend {
    ip_hash;  # Sticky sessions for WebSocket
    server backend1:8080;
    server backend2:8080;
    server backend3:8080;
}

server {
    listen 80;

    location / {
        proxy_pass http://radar_ai_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Support

For issues and questions:
- Check logs first
- Review health check endpoints
- Consult the [API documentation](./API.md)
- Check GitHub issues
