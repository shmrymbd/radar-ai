#!/bin/bash

# Start Development Servers Script
# This script starts both the Next.js development server and the unified WebSocket server

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Radar AI Dashboard - Dev Environment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the dashboard directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the dashboard directory.${NC}"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
    npm install
    echo ""
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: .env.local not found. Make sure environment variables are configured.${NC}"
    echo ""
fi

# Kill any existing processes on ports 3000-3010 and 8080
echo -e "${YELLOW}Checking for existing processes...${NC}"
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 8080; do
    pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 0.5
    fi
done
echo ""

# Create logs directory
mkdir -p logs

# Start WebSocket server in background
echo -e "${GREEN}Starting Unified WebSocket Server (port 8080)...${NC}"
npm run websocket > logs/websocket.log 2>&1 &
WEBSOCKET_PID=$!
echo -e "${GREEN}✓ WebSocket server started (PID: $WEBSOCKET_PID)${NC}"
echo ""

# Wait for WebSocket server to initialize
sleep 2

# Start Next.js dev server in background
echo -e "${GREEN}Starting Next.js Development Server...${NC}"
npm run dev > logs/nextjs.log 2>&1 &
NEXTJS_PID=$!
echo -e "${GREEN}✓ Next.js server started (PID: $NEXTJS_PID)${NC}"
echo ""

# Wait for Next.js to start
echo -e "${BLUE}Waiting for Next.js to compile...${NC}"
sleep 5

# Check if servers are running
if ps -p $WEBSOCKET_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ WebSocket server is running${NC}"
else
    echo -e "${RED}✗ WebSocket server failed to start. Check logs/websocket.log${NC}"
fi

if ps -p $NEXTJS_PID > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Next.js server is running${NC}"
else
    echo -e "${RED}✗ Next.js server failed to start. Check logs/nextjs.log${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Development Servers Started${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next.js:${NC}      http://localhost:3000 (or next available port)"
echo -e "${GREEN}WebSocket:${NC}    ws://localhost:8080"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Next.js:    logs/nextjs.log"
echo -e "  WebSocket:  logs/websocket.log"
echo ""
echo -e "${YELLOW}To view logs in real-time:${NC}"
echo -e "  tail -f logs/nextjs.log"
echo -e "  tail -f logs/websocket.log"
echo ""
echo -e "${YELLOW}To stop all servers:${NC}"
echo -e "  ./stop-dev.sh"
echo -e "  or"
echo -e "  kill $NEXTJS_PID $WEBSOCKET_PID"
echo ""

# Save PIDs to file for easy cleanup
echo "$NEXTJS_PID" > .nextjs.pid
echo "$WEBSOCKET_PID" > .websocket.pid

echo -e "${GREEN}Server PIDs saved. Press Ctrl+C to stop monitoring.${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Monitor servers (optional - can be interrupted with Ctrl+C)
# This keeps the script running so PIDs don't get orphaned
trap 'echo -e "\n${YELLOW}Stopping servers...${NC}"; kill $NEXTJS_PID $WEBSOCKET_PID 2>/dev/null; rm -f .nextjs.pid .websocket.pid; echo -e "${GREEN}Servers stopped.${NC}"; exit 0' INT TERM

# Keep script running
while true; do
    if ! ps -p $NEXTJS_PID > /dev/null 2>&1; then
        echo -e "${RED}Next.js server stopped unexpectedly!${NC}"
        break
    fi
    if ! ps -p $WEBSOCKET_PID > /dev/null 2>&1; then
        echo -e "${RED}WebSocket server stopped unexpectedly!${NC}"
        break
    fi
    sleep 5
done

echo -e "${YELLOW}One or more servers stopped. Cleaning up...${NC}"
kill $NEXTJS_PID $WEBSOCKET_PID 2>/dev/null || true
rm -f .nextjs.pid .websocket.pid
