#!/bin/bash

# Stop Development Servers Script
# This script stops both the Next.js development server and the unified WebSocket server

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Stopping Development Servers${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Stop servers using saved PIDs
if [ -f ".nextjs.pid" ]; then
    NEXTJS_PID=$(cat .nextjs.pid)
    if ps -p $NEXTJS_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping Next.js server (PID: $NEXTJS_PID)...${NC}"
        kill $NEXTJS_PID 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if ps -p $NEXTJS_PID > /dev/null 2>&1; then
            kill -9 $NEXTJS_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ Next.js server stopped${NC}"
    else
        echo -e "${YELLOW}Next.js server not running (PID: $NEXTJS_PID)${NC}"
    fi
    rm -f .nextjs.pid
else
    echo -e "${YELLOW}No Next.js PID file found${NC}"
fi

if [ -f ".websocket.pid" ]; then
    WEBSOCKET_PID=$(cat .websocket.pid)
    if ps -p $WEBSOCKET_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping WebSocket server (PID: $WEBSOCKET_PID)...${NC}"
        kill $WEBSOCKET_PID 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if ps -p $WEBSOCKET_PID > /dev/null 2>&1; then
            kill -9 $WEBSOCKET_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}✓ WebSocket server stopped${NC}"
    else
        echo -e "${YELLOW}WebSocket server not running (PID: $WEBSOCKET_PID)${NC}"
    fi
    rm -f .websocket.pid
else
    echo -e "${YELLOW}No WebSocket PID file found${NC}"
fi

# Fallback: Kill any remaining processes on known ports
echo ""
echo -e "${YELLOW}Checking for any remaining processes...${NC}"
FOUND_PROCESS=false

for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 8080; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Found process on port $port (PID: $pid), killing...${NC}"
        kill -9 $pid 2>/dev/null || true
        FOUND_PROCESS=true
    fi
done

if [ "$FOUND_PROCESS" = false ]; then
    echo -e "${GREEN}No remaining processes found${NC}"
fi

echo ""
echo -e "${GREEN}All development servers stopped.${NC}"
echo -e "${BLUE}========================================${NC}"
