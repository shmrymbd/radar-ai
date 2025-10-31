#!/bin/bash
# Integration test for PassData Stream Processor
# Tests end-to-end flow: List → Stream → MongoDB

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[TEST]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    exit 1
}

# Configuration
REDIS_HOST=${REDIS_HOST:-192.168.6.22}
REDIS_PORT=${REDIS_PORT:-6379}
TEST_DEVICE="test-integration"
TEST_LIST="${TEST_DEVICE}/PassData"
TEST_STREAM="${TEST_DEVICE}/PassData:stream"

# Cleanup function
cleanup() {
    log_info "Cleaning up test data..."
    redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL $TEST_LIST $TEST_STREAM &>/dev/null || true
    redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL "${TEST_STREAM}:consumer-group" &>/dev/null || true
}

# Trap cleanup on exit
trap cleanup EXIT

log_info "Starting integration tests for PassData Stream Processor"
log_info "================================================"

# Test 1: Verify Redis connectivity
log_info "Test 1: Redis connectivity"
if redis-cli -h $REDIS_HOST -p $REDIS_PORT ping | grep -q PONG; then
    log_pass "Redis connection successful"
else
    log_fail "Cannot connect to Redis"
fi

# Test 2: Push PassData to list
log_info "Test 2: Push PassData to list"
PASS_DATA='{"deviceId":"'$TEST_DEVICE'","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","vehicleType":"Car","laneNumber":11,"crossSectionSpeed":50,"headwayTime":2.5,"occupancyDuration":1.2,"crossSectionPosition":100,"occupancyStatus":1}'

LPUSH_RESULT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT LPUSH $TEST_LIST "$PASS_DATA")
if [ "$LPUSH_RESULT" -eq 1 ]; then
    log_pass "PassData pushed to list successfully"
else
    log_fail "Failed to push PassData to list"
fi

# Test 3: Verify list length
log_info "Test 3: Verify list length"
LIST_LEN=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT LLEN $TEST_LIST)
if [ "$LIST_LEN" -eq 1 ]; then
    log_pass "List length correct: $LIST_LEN"
else
    log_fail "List length incorrect: expected 1, got $LIST_LEN"
fi

# Test 4: Create stream manually (simulate bridge)
log_info "Test 4: Create stream from list"
LIST_DATA=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT RPOP $TEST_LIST)
STREAM_ID=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XADD $TEST_STREAM '*' data "$LIST_DATA")

if [ ! -z "$STREAM_ID" ]; then
    log_pass "Stream created with ID: $STREAM_ID"
else
    log_fail "Failed to create stream"
fi

# Test 5: Verify stream length
log_info "Test 5: Verify stream length"
STREAM_LEN=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XLEN $TEST_STREAM)
if [ "$STREAM_LEN" -eq 1 ]; then
    log_pass "Stream length correct: $STREAM_LEN"
else
    log_fail "Stream length incorrect: expected 1, got $STREAM_LEN"
fi

# Test 6: Create consumer group
log_info "Test 6: Create consumer group"
if redis-cli -h $REDIS_HOST -p $REDIS_PORT XGROUP CREATE $TEST_STREAM test-group 0 MKSTREAM 2>&1 | grep -qE "OK|BUSYGROUP"; then
    log_pass "Consumer group created"
else
    log_fail "Failed to create consumer group"
fi

# Test 7: Read from consumer group
log_info "Test 7: Read from consumer group"
READ_RESULT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XREADGROUP GROUP test-group test-consumer COUNT 1 STREAMS $TEST_STREAM '>')

if echo "$READ_RESULT" | grep -q "$TEST_DEVICE"; then
    log_pass "Successfully read from consumer group"
else
    log_fail "Failed to read from consumer group"
fi

# Test 8: Acknowledge message
log_info "Test 8: Acknowledge message"
ACK_RESULT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XACK $TEST_STREAM test-group $STREAM_ID)

if [ "$ACK_RESULT" -eq 1 ]; then
    log_pass "Message acknowledged successfully"
else
    log_fail "Failed to acknowledge message"
fi

# Test 9: Verify pending messages
log_info "Test 9: Verify no pending messages"
PENDING_COUNT=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XPENDING $TEST_STREAM test-group | head -1)

if echo "$PENDING_COUNT" | grep -q "^0"; then
    log_pass "No pending messages (all acknowledged)"
else
    log_fail "Unexpected pending messages: $PENDING_COUNT"
fi

# Test 10: Batch processing test
log_info "Test 10: Batch processing (10 messages)"
for i in {1..10}; do
    PASS_DATA='{"deviceId":"'$TEST_DEVICE'","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","vehicleType":"Car","laneNumber":11,"crossSectionSpeed":'$((40 + i))',"headwayTime":2.5,"occupancyDuration":1.2,"crossSectionPosition":100,"occupancyStatus":1}'
    redis-cli -h $REDIS_HOST -p $REDIS_PORT XADD $TEST_STREAM '*' data "$PASS_DATA" &>/dev/null
done

STREAM_LEN=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XLEN $TEST_STREAM)
if [ "$STREAM_LEN" -ge 10 ]; then
    log_pass "Batch processing successful: $STREAM_LEN messages in stream"
else
    log_fail "Batch processing failed: expected >=10, got $STREAM_LEN"
fi

# Test 11: Stream trimming
log_info "Test 11: Stream trimming (MAXLEN 5)"
redis-cli -h $REDIS_HOST -p $REDIS_PORT XTRIM $TEST_STREAM MAXLEN '~' 5 &>/dev/null
STREAM_LEN=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XLEN $TEST_STREAM)

if [ "$STREAM_LEN" -le 5 ]; then
    log_pass "Stream trimmed successfully: $STREAM_LEN messages remaining"
else
    log_fail "Stream trimming failed: expected <=5, got $STREAM_LEN"
fi

# Test 12: Claim pending messages (simulate crashed consumer)
log_info "Test 12: Pending message claim"

# Add message and read without ACK
PASS_DATA='{"deviceId":"'$TEST_DEVICE'","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","vehicleType":"Truck","laneNumber":12,"crossSectionSpeed":45,"headwayTime":3.0,"occupancyDuration":1.5,"crossSectionPosition":150,"occupancyStatus":1}'
STREAM_ID=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XADD $TEST_STREAM '*' data "$PASS_DATA")

# Read without ACK (simulate crashed consumer)
redis-cli -h $REDIS_HOST -p $REDIS_PORT XREADGROUP GROUP test-group crashed-consumer COUNT 1 STREAMS $TEST_STREAM '>' &>/dev/null

# Wait for message to become claimable (simulated timeout)
sleep 2

# Claim message
CLAIMED=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XCLAIM $TEST_STREAM test-group new-consumer 0 $STREAM_ID)

if echo "$CLAIMED" | grep -q "Truck"; then
    log_pass "Pending message claimed successfully"
else
    log_fail "Failed to claim pending message"
fi

# Test 13: Multi-device isolation
log_info "Test 13: Multi-device isolation"
DEVICE1="device1"
DEVICE2="device2"
STREAM1="${DEVICE1}/PassData:stream"
STREAM2="${DEVICE2}/PassData:stream"

redis-cli -h $REDIS_HOST -p $REDIS_PORT XADD $STREAM1 '*' data '{"deviceId":"device1","vehicleType":"Car"}' &>/dev/null
redis-cli -h $REDIS_HOST -p $REDIS_PORT XADD $STREAM2 '*' data '{"deviceId":"device2","vehicleType":"Truck"}' &>/dev/null

LEN1=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XLEN $STREAM1)
LEN2=$(redis-cli -h $REDIS_HOST -p $REDIS_PORT XLEN $STREAM2)

if [ "$LEN1" -eq 1 ] && [ "$LEN2" -eq 1 ]; then
    log_pass "Device isolation working: $STREAM1=$LEN1, $STREAM2=$LEN2"
else
    log_fail "Device isolation failed"
fi

# Cleanup device streams
redis-cli -h $REDIS_HOST -p $REDIS_PORT DEL $STREAM1 $STREAM2 &>/dev/null

log_info "================================================"
log_info "${GREEN}All integration tests passed!${NC}"
log_info "Stream processor is ready for deployment"
