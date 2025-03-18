import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { config } from 'dotenv';
import { setupSocketHandlers } from './socket';
import { authRouter } from './routes/auth';
import { callRouter } from './routes/call';
import errorHandler from './middleware/error';
import { uploadRouter } from './routes/upload';

config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://172.19.0.1:3000',
      'https://webrtc-saas-starter.vercel.app',
      'http://192.168.0.102:3000',
    ],
    // methods: ['GET', 'POST'],
  },
});

// Redis setup
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
  io.adapter(createAdapter(pubClient, subClient));
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/call', callRouter);
app.use('/api/upload', uploadRouter);

// Socket.io setup
setupSocketHandlers(io);

// Error handling
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
