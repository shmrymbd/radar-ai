# Vehicle Classification System - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Vehicle Classification System in various environments, from local development to production deployment.

## Prerequisites

### System Requirements

- **Node.js**: Version 18 or higher
- **Redis**: Version 6 or higher
- **Memory**: Minimum 4GB RAM
- **Storage**: 10GB available disk space
- **Network**: Stable internet connection

### Dependencies

- **Next.js**: React framework
- **Redis**: Data storage and caching
- **WebSocket**: Real-time communication
- **TypeScript**: Type-safe development

## Local Development Setup

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd radar-ai/dashboard

# Install dependencies
npm install

# Install Redis (macOS)
brew install redis

# Install Redis (Ubuntu/Debian)
sudo apt-get install redis-server

# Start Redis
redis-server
```

### 2. Configuration

Create environment configuration:

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=http://localhost:3000
REDIS_HOST=localhost
REDIS_PORT=6379
WEBSOCKET_PORT=8081
UPDATE_INTERVAL=5000
```

### 3. Start Services

```bash
# Terminal 1: Next.js development server
npm run dev

# Terminal 2: WebSocket server
node start-tracking-server.js

# Terminal 3: Test data generator (optional)
node start-vehicle-generator.js
```

### 4. Verify Installation

1. Open browser to `http://localhost:3000`
2. Navigate to Classification tab
3. Verify data is loading
4. Check WebSocket connection in browser console

## Docker Deployment

### 1. Dockerfile

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose ports
EXPOSE 3000 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start services
CMD ["npm", "start"]
```

### 2. Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  dashboard:
    build: .
    ports:
      - "3000:3000"
      - "8081:8081"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - WEBSOCKET_PORT=8081
    depends_on:
      - redis
    volumes:
      - ./logs:/app/logs

  websocket:
    build: .
    ports:
      - "8081:8081"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - redis

volumes:
  redis_data:
```

### 3. Build and Deploy

```bash
# Build and start services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Production Deployment

### 1. Environment Configuration

```bash
# Production environment variables
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-domain.com
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
WEBSOCKET_PORT=8081
UPDATE_INTERVAL=5000
LOG_LEVEL=info
```

### 2. Redis Configuration

```conf
# redis.conf
bind 0.0.0.0
port 6379
requirepass your-redis-password
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Nginx Configuration

```nginx
# nginx.conf
upstream dashboard {
    server localhost:3000;
}

upstream websocket {
    server localhost:8081;
}

server {
    listen 80;
    server_name your-domain.com;

    # Dashboard
    location / {
        proxy_pass http://dashboard;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 4. SSL/TLS Configuration

```nginx
# SSL configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;

    # Dashboard
    location / {
        proxy_pass http://dashboard;
        # ... proxy headers
    }

    # WebSocket
    location /ws {
        proxy_pass http://websocket;
        # ... WebSocket headers
    }
}
```

## Kubernetes Deployment

### 1. Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: radar-ai
```

### 2. ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: classification-config
  namespace: radar-ai
data:
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  WEBSOCKET_PORT: "8081"
  UPDATE_INTERVAL: "5000"
```

### 3. Redis Deployment

```yaml
# redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: radar-ai
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: radar-ai
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### 4. Dashboard Deployment

```yaml
# dashboard-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard
  namespace: radar-ai
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
    spec:
      containers:
      - name: dashboard
        image: your-registry/dashboard:latest
        ports:
        - containerPort: 3000
        - containerPort: 8081
        envFrom:
        - configMapRef:
            name: classification-config
        resources:
          requests:
            memory: "512Mi"
            cpu: "200m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: dashboard-service
  namespace: radar-ai
spec:
  selector:
    app: dashboard
  ports:
  - name: http
    port: 80
    targetPort: 3000
  - name: websocket
    port: 8081
    targetPort: 8081
```

### 5. Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: radar-ai
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: tls-secret
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-service
            port:
              number: 80
```

## Monitoring and Alerting

### 1. Health Checks

```typescript
// health-check.ts
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      redis: await checkRedisConnection(),
      websocket: await checkWebSocketServer(),
      classification: await checkClassificationProcessor()
    }
  };

  return Response.json(health);
}
```

### 2. Prometheus Metrics

```typescript
// metrics.ts
import { register, Counter, Histogram, Gauge } from 'prom-client';

const classificationCounter = new Counter({
  name: 'classification_vehicles_total',
  help: 'Total number of vehicles classified',
  labelNames: ['device_id', 'vehicle_type']
});

const processingLatency = new Histogram({
  name: 'classification_processing_duration_seconds',
  help: 'Time spent processing classification data',
  labelNames: ['device_id']
});

const memoryUsage = new Gauge({
  name: 'classification_memory_usage_bytes',
  help: 'Memory usage of classification processor'
});
```

### 3. Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Vehicle Classification Metrics",
    "panels": [
      {
        "title": "Vehicles Processed",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(classification_vehicles_total[5m])) by (device_id)"
          }
        ]
      },
      {
        "title": "Processing Latency",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(classification_processing_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Restart Redis
sudo systemctl restart redis
```

#### 2. WebSocket Connection Issues
```bash
# Check WebSocket server
netstat -tlnp | grep 8081

# Test WebSocket connection
wscat -c ws://localhost:8081
```

#### 3. Memory Issues
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Monitor Redis memory
redis-cli info memory
```

### Performance Optimization

#### 1. Redis Optimization
```conf
# redis.conf optimizations
maxmemory 2gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

#### 2. Node.js Optimization
```bash
# Increase Node.js memory limit
node --max-old-space-size=4096 start-tracking-server.js

# Enable clustering
NODE_ENV=production node -e "require('cluster').isMaster ? require('os').cpus().forEach(() => require('cluster').fork()) : require('./start-tracking-server.js')"
```

## Backup and Recovery

### 1. Data Backup

```bash
# Redis backup
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb

# Application backup
tar -czf /backup/dashboard-$(date +%Y%m%d).tar.gz /app
```

### 2. Recovery Procedures

```bash
# Restore Redis data
redis-cli FLUSHALL
cp /backup/redis-20250101.rdb /var/lib/redis/dump.rdb
sudo systemctl restart redis

# Restore application
tar -xzf /backup/dashboard-20250101.tar.gz -C /
```

## Security Considerations

### 1. Network Security
- Use HTTPS for all web traffic
- Implement WebSocket over TLS (WSS)
- Configure firewall rules
- Use VPN for remote access

### 2. Data Security
- Encrypt sensitive data at rest
- Use secure Redis configuration
- Implement access controls
- Regular security updates

### 3. Application Security
- Input validation and sanitization
- Rate limiting and DDoS protection
- Secure authentication
- Regular security audits
