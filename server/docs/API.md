# WebSocket API Documentation

The Radar AI backend server provides a unified WebSocket API for real-time communication with dashboard clients.

**Last Updated**: 2025-11-01
**API Version**: 1.0
**Status**: ✅ Operational

**Key Features**:
- Real-time vehicle tracking updates
- Classification metrics streaming
- Dashboard summary data
- Multi-device support
- Message validation with Zod schemas
- Rate limiting (100 messages/minute per client)

**Known Limitations**:
- Device IDs are currently hardcoded in subscription logic (will be made dynamic)
- No authentication required (to be added in future)
- Rate limiting configuration not fully integrated with environment variables

## Connection

**Endpoint**: `ws://localhost:8080` (configurable via `PORT` env variable)

**Protocol**: WebSocket (RFC 6455)

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  console.log('Connected to Radar AI backend');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};
```

## Message Format

All messages are JSON-formatted with a `type` field:

```typescript
interface WebSocketMessage {
  type: string;
  // Additional fields depend on message type
}
```

## Client → Server Messages

### Channel Subscriptions

#### Subscribe to Channel

```json
{
  "type": "subscribe_channel",
  "channel": "tracking" | "classification" | "dashboard"
}
```

Subscribes to real-time updates for a specific channel.

**Channels**:
- `tracking` - Vehicle tracking updates
- `classification` - Classification metrics
- `dashboard` - Dashboard summary data

**Response**:
```json
{
  "type": "subscription_confirmed",
  "channel": "tracking",
  "message": "Subscribed to tracking channel"
}
```

#### Unsubscribe from Channel

```json
{
  "type": "unsubscribe_channel",
  "channel": "tracking"
}
```

**Response**:
```json
{
  "type": "unsubscription_confirmed",
  "channel": "tracking",
  "message": "Unsubscribed from tracking channel"
}
```

### Device Management

#### Subscribe to Device

```json
{
  "type": "subscribe_device",
  "deviceId": "P1-center"
}
```

Subscribes to updates for a specific radar device.

**Valid Device IDs**:
- `P1-center`
- `P3`
- `P1-o/h`

**Response**:
```json
{
  "type": "device_subscription_confirmed",
  "deviceId": "P1-center",
  "message": "Subscribed to device P1-center"
}
```

#### Unsubscribe from Device

```json
{
  "type": "unsubscribe_device",
  "deviceId": "P1-center"
}
```

#### Get Available Devices

```json
{
  "type": "get_available_devices"
}
```

**Response**:
```json
{
  "type": "available_devices",
  "devices": [
    { "id": "P1-center", "name": "P1 Center", "status": "online" },
    { "id": "P3", "name": "P3 Radar", "status": "online" }
  ]
}
```

### Data Requests

#### Get Dashboard Data

```json
{
  "type": "get_dashboard_data",
  "deviceId": "P1-center" // optional
}
```

**Response**:
```json
{
  "type": "dashboard_data",
  "deviceId": "P1-center",
  "data": {
    "activeVehicles": 12,
    "totalDetections": 1543,
    "averageSpeed": 45.2
    // ... additional metrics
  }
}
```

#### Get Tracking Data

```json
{
  "type": "get_tracking_data"
}
```

**Response**:
```json
{
  "type": "tracking_data",
  "data": {
    "vehicles": [
      {
        "targetId": 123,
        "position": { "x": 10.5, "y": 20.3 },
        "velocity": { "vx": 15.2, "vy": 2.1 },
        "classification": "car"
      }
    ]
  }
}
```

#### Get Vehicle Details

```json
{
  "type": "get_vehicle_details",
  "targetId": 123
}
```

**Response**:
```json
{
  "type": "vehicle_details",
  "targetId": 123,
  "data": {
    "targetId": 123,
    "position": { "x": 10.5, "y": 20.3 },
    "velocity": { "vx": 15.2, "vy": 2.1 },
    "classification": "car",
    "firstSeen": "2025-11-01T12:00:00.000Z",
    "lastSeen": "2025-11-01T12:01:30.000Z",
    "trajectory": [...]
  }
}
```

#### Get Visible Vehicles

```json
{
  "type": "get_visible_vehicles"
}
```

#### Get Classification Data

```json
{
  "type": "get_classification_data"
}
```

**Response**:
```json
{
  "type": "classification_data",
  "data": {
    "total": 1543,
    "byClass": {
      "car": 1200,
      "truck": 250,
      "motorcycle": 93
    },
    "byLane": {
      "11": 400,
      "12": 450,
      "13": 393,
      "485": 300
    }
  }
}
```

### Health Check

#### Ping

```json
{
  "type": "ping"
}
```

**Response**:
```json
{
  "type": "pong",
  "timestamp": 1730470800000
}
```

## Server → Client Messages

### Connection Events

#### Connection Established

Sent immediately after WebSocket connection is established.

```json
{
  "type": "connection_established",
  "message": "Unified WebSocket connected successfully",
  "availableChannels": ["dashboard", "tracking", "classification"]
}
```

### Real-time Updates

#### Tracking Update

Sent to clients subscribed to the `tracking` channel when vehicle positions change.

```json
{
  "type": "tracking_update",
  "deviceId": "P1-center",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "data": {
    "updatedVehicles": [
      {
        "targetId": 123,
        "position": { "x": 10.5, "y": 20.3 },
        "velocity": { "vx": 15.2, "vy": 2.1 }
      }
    ],
    "removedVehicles": [124, 125]
  }
}
```

#### Tracking Summary

```json
{
  "type": "tracking_summary",
  "deviceId": "P1-center",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "data": {
    "activeVehicles": 12,
    "totalTracked": 1543
  }
}
```

#### Classification Update

Sent to clients subscribed to the `classification` channel.

```json
{
  "type": "classification_update",
  "data": {
    "metrics": {
      "total": 1543,
      "byClass": { "car": 1200, "truck": 250 }
    },
    "summary": {
      "last24h": 35432,
      "lastHour": 1543
    },
    "deviceId": "P1-center",
    "timestamp": "2025-11-01T12:00:00.000Z",
    "source": "realtime_passdata"
  }
}
```

#### PassData Update

Raw PassData from radar device.

```json
{
  "type": "passdata_update",
  "deviceId": "P1-center",
  "timestamp": "2025-11-01T12:00:00.000Z",
  "data": {
    // Raw PassData object from radar
  }
}
```

#### Dashboard Update

Periodic dashboard summary (1 Hz when clients are subscribed to a device).

```json
{
  "type": "dashboard_update",
  "deviceId": "P1-center",
  "data": {
    "activeVehicles": 12,
    "totalDetections": 1543,
    "averageSpeed": 45.2
  }
}
```

### Error Messages

#### Error Response

```json
{
  "type": "error",
  "code": "VALIDATION_ERROR",
  "message": "Invalid message format"
}
```

**Error Codes**:
- `PARSE_ERROR` - Invalid JSON
- `VALIDATION_ERROR` - Message schema validation failed
- `RATE_LIMIT_EXCEEDED` - Too many messages (>100/min)
- `PROCESSING_ERROR` - Error processing request

#### Rate Limit Error

```json
{
  "type": "error",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Maximum 100 messages per minute."
}
```

## Rate Limiting

- **Maximum**: 100 messages per minute per client
- **Window**: Rolling 60-second window
- **Action**: Messages exceeding limit are rejected with error response

## Reconnection Strategy

Clients should implement exponential backoff when reconnecting:

```javascript
let reconnectAttempts = 0;
const maxAttempts = 5;

function connect() {
  const ws = new WebSocket('ws://localhost:8080');

  ws.onclose = (event) => {
    if (event.code !== 1000 && reconnectAttempts < maxAttempts) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      setTimeout(() => {
        reconnectAttempts++;
        connect();
      }, delay);
    }
  };

  ws.onopen = () => {
    reconnectAttempts = 0;
  };
}
```

## Example Client

```javascript
class RadarAIClient {
  constructor(url = 'ws://localhost:8080') {
    this.url = url;
    this.ws = null;
    this.subscribers = new Map();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('Connected to Radar AI backend');

      // Subscribe to tracking channel
      this.send({
        type: 'subscribe_channel',
        channel: 'tracking'
      });

      // Subscribe to device
      this.send({
        type: 'subscribe_device',
        deviceId: 'P1-center'
      });
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from backend');
      // Implement reconnection logic here
    };
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case 'tracking_update':
        console.log('Tracking update:', message.data);
        break;
      case 'classification_update':
        console.log('Classification update:', message.data);
        break;
      case 'error':
        console.error('Error:', message.message);
        break;
      default:
        console.log('Received:', message);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
    }
  }
}

// Usage
const client = new RadarAIClient();
client.connect();
```

## Security Considerations

1. **Rate Limiting**: Clients are limited to 100 messages/minute
2. **Message Validation**: All messages validated with Zod schemas
3. **Connection Cleanup**: Connections properly cleaned up on disconnect
4. **Error Handling**: All errors caught and logged without exposing internals

## Performance

- **Concurrent Connections**: Tested with 50+ concurrent clients
- **Update Frequency**:
  - Tracking: Real-time (triggered by Redis keyspace events)
  - Classification: Real-time (triggered by MongoDB inserts)
  - Dashboard: 1 Hz (periodic updates when subscribed)
- **Latency**: <10ms for WebSocket message delivery
- **Throughput**: Handles 1000+ messages/second across all clients
