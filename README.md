# WebRTC SaaS Platform - Backend

A WebRTC-based video calling platform built with Express.js and Socket.IO.

## Features

- Real-time video/audio calling
- Screen sharing
- Call recording
- User authentication and authorization
- Call history tracking
- Redis-based session management
- STUN/TURN server integration

## Tech Stack

- Node.js + Express.js
- TypeScript
- Socket.IO (Signaling server)
- PostgreSQL (Database)
- Redis (Session management)
- Prisma (ORM)
- JWT Authentication
- AWS S3 (Call recording storage)
- Docker

## Prerequisites

- Node.js >= 18
- PostgreSQL
- Redis
- Docker and Docker Compose (optional)

## Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/webrtc_saas?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-jwt-secret"

# AWS
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
AWS_REGION="your-aws-region"
AWS_BUCKET_NAME="your-bucket-name"

# CORS
FRONTEND_URL="http://localhost:3000"

# TURN Server
TURN_SERVER_URL="your-turn-server-url"
TURN_USERNAME="your-turn-username"
TURN_PASSWORD="your-turn-password"
```

## Installation

1. Clone the repository

```bash
git clone <repository-url>
cd webrtc-saas
```

2. Install dependencies

```bash
npm install
```

3. Generate Prisma client

```bash
npm run prisma:generate
```

4. Run migrations

```bash
npm run prisma:migrate
```

## Running the Application

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```bash
docker-compose up
```

## API Documentation

### Authentication

- POST `/auth/register` - Register new user
- POST `/auth/login` - User login
- GET `/auth/me` - Get current user

### Call Management

- POST `/call/start` - Start a new call
- GET `/call/history` - Get call history
- POST `/call/recording` - Upload call recording

## WebSocket Events

### Connection Events

- `connect` - Client connection
- `disconnect` - Client disconnection
- `connect_error` - Connection error

### User Events

- `register-user` - Register user for WebRTC
- `user-status-change` - User status updates

### Call Events

- `initiate-call` - Start call
- `incoming-call` - Receive call
- `call-accepted` - Call acceptance
- `call-rejected` - Call rejection
- `call-ended` - Call termination
- `ice-candidate` - ICE candidate exchange

## Architecture

The application follows a modular architecture:

- Socket handling for real-time communication
- Express routes for REST API
- Prisma for database operations
- Redis for session management
- S3 for file storage

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
