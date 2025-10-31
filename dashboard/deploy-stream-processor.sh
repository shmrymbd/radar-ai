#!/bin/bash
# Deploy PassData Stream Processor
# Usage: ./deploy-stream-processor.sh [start|stop|restart|logs|status]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.stream.yml"
ENV_FILE=".env.local"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker first."
        exit 1
    fi

    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose not found. Please install Docker Compose first."
        exit 1
    fi

    # Check environment file
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "Environment file $ENV_FILE not found. Using default values."
    else
        log_info "Loading environment from $ENV_FILE"
        export $(grep -v '^#' $ENV_FILE | xargs)
    fi

    # Check Redis connectivity
    log_info "Testing Redis connection..."
    REDIS_HOST=${REDIS_HOST:-192.168.6.22}
    REDIS_PORT=${REDIS_PORT:-6379}

    if ! docker run --rm redis:7-alpine redis-cli -h $REDIS_HOST -p $REDIS_PORT ping &> /dev/null; then
        log_error "Cannot connect to Redis at $REDIS_HOST:$REDIS_PORT"
        exit 1
    fi

    log_info "Redis connection OK"

    # Check MongoDB connectivity
    log_info "Testing MongoDB connection..."
    MONGODB_HOST=${MONGODB_HOST:-192.168.6.22}
    MONGODB_PORT=${MONGODB_PORT:-27017}

    if ! docker run --rm mongo:6 mongosh --host $MONGODB_HOST:$MONGODB_PORT --eval "db.adminCommand('ping')" &> /dev/null; then
        log_error "Cannot connect to MongoDB at $MONGODB_HOST:$MONGODB_PORT"
        exit 1
    fi

    log_info "MongoDB connection OK"
}

start_services() {
    log_info "Starting PassData Stream Processor..."

    # Build and start
    docker-compose -f $COMPOSE_FILE build
    docker-compose -f $COMPOSE_FILE up -d

    log_info "Waiting for services to be healthy..."
    sleep 5

    # Check health
    if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
        log_error "Some services are unhealthy. Check logs with: ./deploy-stream-processor.sh logs"
        exit 1
    fi

    log_info "Stream processor started successfully"
    show_status
}

stop_services() {
    log_info "Stopping PassData Stream Processor..."
    docker-compose -f $COMPOSE_FILE down
    log_info "Stream processor stopped"
}

restart_services() {
    log_info "Restarting PassData Stream Processor..."
    stop_services
    sleep 2
    start_services
}

show_logs() {
    SERVICE=${1:-}
    if [ -z "$SERVICE" ]; then
        docker-compose -f $COMPOSE_FILE logs -f
    else
        docker-compose -f $COMPOSE_FILE logs -f $SERVICE
    fi
}

show_status() {
    log_info "Service Status:"
    docker-compose -f $COMPOSE_FILE ps

    echo ""
    log_info "Redis Stream Stats:"

    DEVICES=${DEVICES:-test,Radar04}
    IFS=',' read -ra DEVICE_ARRAY <<< "$DEVICES"

    for device in "${DEVICE_ARRAY[@]}"; do
        STREAM_KEY="${device}/PassData:stream"
        LIST_KEY="${device}/PassData"

        echo ""
        echo "Device: $device"
        echo "----------------------------------------"

        # Stream length
        STREAM_LEN=$(docker run --rm redis:7-alpine redis-cli -h ${REDIS_HOST:-192.168.6.22} -p ${REDIS_PORT:-6379} XLEN $STREAM_KEY 2>/dev/null || echo "0")
        echo "  Stream length: $STREAM_LEN messages"

        # List length (pending to bridge)
        LIST_LEN=$(docker run --rm redis:7-alpine redis-cli -h ${REDIS_HOST:-192.168.6.22} -p ${REDIS_PORT:-6379} LLEN $LIST_KEY 2>/dev/null || echo "0")
        echo "  List length: $LIST_LEN messages (pending bridge)"

        # Consumer group info
        GROUP_INFO=$(docker run --rm redis:7-alpine redis-cli -h ${REDIS_HOST:-192.168.6.22} -p ${REDIS_PORT:-6379} XINFO GROUPS $STREAM_KEY 2>/dev/null | head -20 || echo "No consumer groups")
        echo "  Consumer group info:"
        echo "$GROUP_INFO" | sed 's/^/    /'
    done
}

validate_deployment() {
    log_info "Validating deployment..."

    # Check services are running
    if ! docker-compose -f $COMPOSE_FILE ps | grep -q "Up"; then
        log_error "Services are not running"
        return 1
    fi

    # Check consumer group exists
    DEVICES=${DEVICES:-test,Radar04}
    IFS=',' read -ra DEVICE_ARRAY <<< "$DEVICES"

    for device in "${DEVICE_ARRAY[@]}"; do
        STREAM_KEY="${device}/PassData:stream"
        if ! docker run --rm redis:7-alpine redis-cli -h ${REDIS_HOST:-192.168.6.22} -p ${REDIS_PORT:-6379} XINFO GROUPS $STREAM_KEY &> /dev/null; then
            log_warn "Consumer group not found for $device. It will be created on first message."
        else
            log_info "Consumer group exists for $device"
        fi
    done

    log_info "Deployment validation complete"
}

show_help() {
    echo "PassData Stream Processor Deployment Script"
    echo ""
    echo "Usage: ./deploy-stream-processor.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start       - Build and start all services"
    echo "  stop        - Stop all services"
    echo "  restart     - Restart all services"
    echo "  logs [svc]  - Show logs (optionally for specific service)"
    echo "  status      - Show service and stream status"
    echo "  validate    - Validate deployment"
    echo "  help        - Show this help message"
    echo ""
    echo "Services:"
    echo "  bridge        - List-to-Stream bridge"
    echo "  processor-1   - Stream processor (consumer 1)"
    echo "  processor-2   - Stream processor (consumer 2)"
    echo ""
    echo "Examples:"
    echo "  ./deploy-stream-processor.sh start"
    echo "  ./deploy-stream-processor.sh logs processor-1"
    echo "  ./deploy-stream-processor.sh status"
}

# Main script
case "${1:-help}" in
    start)
        check_prerequisites
        start_services
        validate_deployment
        ;;
    stop)
        stop_services
        ;;
    restart)
        check_prerequisites
        restart_services
        validate_deployment
        ;;
    logs)
        show_logs "${2:-}"
        ;;
    status)
        show_status
        ;;
    validate)
        validate_deployment
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
