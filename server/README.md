# Radar AI - Backend Server

Standalone backend server for the Radar AI traffic signal dashboard. Handles WebSocket connections, real-time data processing, and Redis/MongoDB operations.

## Features

- **WebSocket Server**: Real-time communication with dashboard clients
- **Vehicle Tracking**: Live vehicle position tracking and trajectory management
- **Classification Processing**: Vehicle classification with MongoDB-first architecture
- **Redis Integration**: Real-time data storage and pub/sub messaging
- **MongoDB Integration**: Historical data storage and analytics
- **Structured Logging**: Winston-based logging with log rotation
- **Health Checks**: Monitor service health and connectivity
- **TypeScript**: Full type safety and excellent developer experience

## Prerequisites

- Node.js >= 18.0.0
- Redis server (configured in `.env`)
- MongoDB server (configured in `.env`)

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update environment variables in `.env` with your configuration.

## Development

Run the server in development mode with hot reload:

```bash
npm run dev
```

The server will start on port 8080 (configurable via `PORT` env variable).

## Production

Build the TypeScript code:

```bash
npm run build
```

Start the production server:

```bash
npm start
```

## Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate coverage report:

```bash
npm run test:coverage
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Lint code
- `npm run typecheck` - Type check without building

## Architecture

```
server/
├── src/
│   ├── websocket/          # WebSocket server and handlers
│   ├── services/           # Business logic services
│   │   ├── redis/          # Redis services
│   │   ├── mongodb/        # MongoDB services
│   │   ├── tracking/       # Vehicle tracking
│   │   └── classification/ # Classification processing
│   ├── config/             # Configuration management
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── tests/                  # Test files
└── docs/                   # Documentation
```

## Health Check

Check server health:

```bash
curl http://localhost:8080/health
```

Response:

```json
{
  "status": "healthy",
  "services": {
    "redis": "connected",
    "mongodb": "connected",
    "websocket": "running"
  },
  "uptime": 3600
}
```

## WebSocket API

Connect to WebSocket server:

```javascript
const ws = new WebSocket('ws://localhost:8080');

// Subscribe to tracking updates
ws.send(JSON.stringify({
  type: 'subscribe',
  channel: 'tracking',
  deviceId: 'P1-center'
}));

// Listen for updates
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

See [docs/API.md](docs/API.md) for full API documentation.

## License

MIT
