# Multi-stage build for PassData Stream Processor
# Optimized for production deployment

# Stage 1: Build TypeScript
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src/services/stream-processor ./src/services/stream-processor
COPY src/types ./src/types

# Build TypeScript
RUN npm run build

# Stage 2: Production runtime
FROM node:18-alpine AS runtime

# Install production dependencies only
WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S processor && \
    adduser -S -u 1001 -G processor processor

# Change ownership
RUN chown -R processor:processor /app

# Switch to non-root user
USER processor

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('redis').createClient({socket:{host:process.env.REDIS_HOST,port:process.env.REDIS_PORT}}).connect().then(c=>c.ping()).then(()=>process.exit(0)).catch(()=>process.exit(1))"

# Environment variables (overridable at runtime)
ENV NODE_ENV=production
ENV REDIS_HOST=192.168.6.22
ENV REDIS_PORT=6379
ENV DEVICES=test,Radar04
ENV LOG_LEVEL=info

# Entry point
CMD ["node", "dist/services/stream-processor/PassDataStreamProcessor.js"]
