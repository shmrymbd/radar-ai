#!/bin/bash

# Radar AI Traffic Dashboard Setup Script
# This script helps new developers set up the environment for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup
print_header "Radar AI Traffic Dashboard Setup"

echo "This script will help you set up the development environment."
echo "You'll need to provide configuration for Redis and MongoDB."
echo ""

# Check Node.js
print_info "Checking Node.js installation..."
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js found: $NODE_VERSION"
else
    print_error "Node.js is not installed!"
    echo "Please install Node.js 18.x or higher from https://nodejs.org/"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm found: $NPM_VERSION"
else
    print_error "npm is not installed!"
    exit 1
fi

# Get Redis configuration
print_header "Redis Configuration"
echo "Enter your Redis connection details:"
read -p "Redis Host [192.168.1.71]: " REDIS_HOST
REDIS_HOST=${REDIS_HOST:-192.168.1.71}

read -p "Redis Port [6379]: " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}

# Test Redis connection
print_info "Testing Redis connection..."
if command_exists redis-cli; then
    if redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping >/dev/null 2>&1; then
        print_success "Redis connection successful!"
    else
        print_warning "Could not connect to Redis. Please verify the host and port."
        read -p "Continue anyway? (y/n): " continue_redis
        if [[ ! $continue_redis =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
else
    print_warning "redis-cli not found. Skipping connection test."
fi

# Get MongoDB configuration
print_header "MongoDB Configuration"
echo "Enter your MongoDB connection details:"
read -p "MongoDB Host [192.168.1.71]: " MONGODB_HOST
MONGODB_HOST=${MONGODB_HOST:-192.168.1.71}

read -p "MongoDB Port [27017]: " MONGODB_PORT
MONGODB_PORT=${MONGODB_PORT:-27017}

read -p "MongoDB Username [admin]: " MONGODB_USERNAME
MONGODB_USERNAME=${MONGODB_USERNAME:-admin}

read -sp "MongoDB Password [admin123]: " MONGODB_PASSWORD
echo ""
MONGODB_PASSWORD=${MONGODB_PASSWORD:-admin123}

read -p "MongoDB Auth Database [admin]: " MONGODB_AUTH_DATABASE
MONGODB_AUTH_DATABASE=${MONGODB_AUTH_DATABASE:-admin}

read -p "MongoDB Dashboard Database [traffic_signal_dashboard]: " MONGODB_DASHBOARD_DATABASE
MONGODB_DASHBOARD_DATABASE=${MONGODB_DASHBOARD_DATABASE:-traffic_signal_dashboard}

# Get Radar Configuration
print_header "Radar Configuration"
read -p "Default Radar Device ID [P1-center]: " RADAR_DEVICE_ID
RADAR_DEVICE_ID=${RADAR_DEVICE_ID:-P1-center}

read -p "Valid Lane Numbers (comma-separated) [11,12,13,485]: " LANES
LANES=${LANES:-11,12,13,485}

read -p "Speed Limit (km/h) [60]: " SPEED_LIMIT
SPEED_LIMIT=${SPEED_LIMIT:-60}

read -p "Queue Threshold [50]: " QUEUE_THRESHOLD
QUEUE_THRESHOLD=${QUEUE_THRESHOLD:-50}

# Create .env.local file
print_header "Creating Configuration File"
ENV_FILE="dashboard/.env.local"

cat > "$ENV_FILE" <<EOF
# Redis Configuration
REDIS_HOST=$REDIS_HOST
REDIS_PORT=$REDIS_PORT

# MongoDB Configuration
MONGODB_HOST=$MONGODB_HOST
MONGODB_PORT=$MONGODB_PORT
MONGODB_USERNAME=$MONGODB_USERNAME
MONGODB_PASSWORD=$MONGODB_PASSWORD
MONGODB_AUTH_DATABASE=$MONGODB_AUTH_DATABASE
MONGODB_DASHBOARD_DATABASE=$MONGODB_DASHBOARD_DATABASE

# Radar Configuration
RADAR_PROTOCOL_VERSION=2.1
RADAR_DEVICE_ID=$RADAR_DEVICE_ID

# Dashboard Configuration
DASHBOARD_REFRESH_INTERVAL=1000
QUEUE_THRESHOLD=$QUEUE_THRESHOLD
SPEED_LIMIT=$SPEED_LIMIT
LANES=$LANES

# Development Settings
DISABLE_RATE_LIMITING=true
NODE_ENV=development
EOF

print_success "Configuration file created: $ENV_FILE"

# Install dependencies
print_header "Installing Dependencies"
cd dashboard
print_info "Running npm install..."
if npm install; then
    print_success "Dependencies installed successfully!"
else
    print_error "Failed to install dependencies"
    exit 1
fi
cd ..

# Create MongoDB indexes
print_header "Setting Up Database Indexes"
read -p "Create MongoDB indexes now? (recommended) (y/n): " create_indexes
if [[ $create_indexes =~ ^[Yy]$ ]]; then
    cd dashboard
    if npm run db:indexes; then
        print_success "MongoDB indexes created successfully!"
    else
        print_warning "Could not create indexes. You can run 'npm run db:indexes' later."
    fi
    cd ..
fi

# Verify data sources
print_header "Verifying Data Sources"
read -p "Test connections to Redis and MongoDB? (y/n): " test_connections
if [[ $test_connections =~ ^[Yy]$ ]]; then
    cd dashboard
    if node verify-data-sources.js 2>/dev/null; then
        print_success "Data source verification completed!"
    else
        print_warning "Could not verify data sources. Check your configuration."
    fi
    cd ..
fi

# Final instructions
print_header "Setup Complete!"
echo ""
print_success "Environment configured successfully!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start the development server:"
echo "   ${GREEN}cd dashboard && npm run dev:full${NC}"
echo ""
echo "2. Open your browser:"
echo "   ${GREEN}http://localhost:3000${NC}"
echo ""
echo "3. Available commands:"
echo "   • ${BLUE}npm run dev${NC}          - Start Next.js only"
echo "   • ${BLUE}npm run dev:full${NC}     - Start Next.js + WebSocket"
echo "   • ${BLUE}npm run websocket${NC}    - Start WebSocket server only"
echo "   • ${BLUE}npm run build${NC}        - Build for production"
echo "   • ${BLUE}npm run lint${NC}         - Run ESLint"
echo "   • ${BLUE}npm run db:indexes${NC}   - Create MongoDB indexes"
echo ""
echo "4. Useful scripts:"
echo "   • ${BLUE}node dashboard/verify-data-sources.js${NC}      - Check Redis/MongoDB"
echo "   • ${BLUE}node dashboard/check-mongodb-latest.js${NC}     - View latest data"
echo "   • ${BLUE}redis-cli -h $REDIS_HOST -p $REDIS_PORT${NC}    - Access Redis CLI"
echo ""
echo "📚 Documentation:"
echo "   • README.md                    - Project overview"
echo "   • CLAUDE.md                    - Development guidelines"
echo "   • API_DOCUMENTATION.md         - API reference"
echo "   • DEPLOYMENT_GUIDE.md          - Production deployment"
echo ""
echo "⚠️  Important Notes:"
echo "   • Device IDs: Use P1-center, P3, or P1-o/h (case-sensitive)"
echo "   • Redis keys: Always lowercase (e.g., P1-center/passdata)"
echo "   • MongoDB is the single source of truth (no in-memory caching)"
echo ""
print_success "Happy coding! 🚀"
echo ""
