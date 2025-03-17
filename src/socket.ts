import { Server, Socket } from 'socket.io';
import { SocketEvents, SocketUser, CallSession } from './types/socket-events';

// Store connected users and active calls
const connectedUsers = new Map<string, SocketUser>();
const activeCalls = new Map<string, CallSession>();

// Extend Socket type with our custom properties
interface CustomSocket extends Socket {
  user?: SocketUser;
  auth?: {
    token: string;
    userId: string;
    userName: string | null;
  };
}

// Define the ice candidate interface
interface IceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  usernameFragment: string | null;
}

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: CustomSocket) => {
    console.log('New client connected:', socket.id);

    // Register user when they connect
    socket.on(SocketEvents.REGISTER_USER, (data) => {
      const user: SocketUser = {
        userId: data.userId,
        userName: data.userName,
        socketId: socket.id,
        isAvailable: true,
      };

      connectedUsers.set(data.userId, user);
      socket.user = user;

      console.log('User registered:', user);
      console.log('Connected users:', Array.from(connectedUsers.entries()));
      console.log('Active calls:', Array.from(activeCalls.entries()));

      // Emit user registered event to the client
      // Or return a response if the user is successfully registered
      socket.emit(SocketEvents.USER_REGISTERED, {
        userId: data.userId,
        socketId: socket.id,
        success: true,
      });
    });

    // Check user availability
    socket.on(SocketEvents.CHECK_USER_AVAILABILITY, (data) => {
      const targetUser = connectedUsers.get(data.targetUserId);

      socket.emit(SocketEvents.USER_AVAILABILITY_RESPONSE, {
        isAvailable: !!(targetUser && targetUser.isAvailable),
      });
    });

    // Handle call initiation
    socket.on(SocketEvents.INITIATE_CALL, (data) => {
      console.log('Received call initiation request:', data);
      const targetUser = connectedUsers.get(data.targetUserId);

      console.log('Found target user:', targetUser);
      console.log('Connected users:', Array.from(connectedUsers.entries()));

      if (!targetUser) {
        console.log('Target user not found');
        socket.emit(SocketEvents.CALL_ERROR, { message: 'User not found' });
        return;
      }

      if (!targetUser.isAvailable) {
        console.log('Target user is not available');
        socket.emit(SocketEvents.CALL_ERROR, { message: 'User is busy' });
        return;
      }

      // Create a new call session
      const callSession: CallSession = {
        callId: `${data.callerId}-${data.targetUserId}-${Date.now()}`,
        callerId: data.callerId,
        targetUserId: data.targetUserId,
        status: 'pending',
        startTime: new Date(),
      };

      activeCalls.set(callSession.callId, callSession);

      // Mark both users as unavailable
      if (socket.user) socket.user.isAvailable = false;
      targetUser.isAvailable = false;
      targetUser.currentCallId = callSession.callId;

      console.log('Emitting incoming call to:', targetUser.socketId);

      // Emit incoming call event to recipient
      io.to(targetUser.socketId).emit(SocketEvents.INCOMING_CALL, {
        callerId: data.callerId,
        callerName: data.callerName,
        offer: data.offer,
      });

      console.log('Call initiated:', {
        from: data.callerId,
        to: data.targetUserId,
        callId: callSession.callId,
      });
    });

    // Handle call acceptance
    socket.on(SocketEvents.CALL_ACCEPTED, (data) => {
      const caller = connectedUsers.get(data.targetUserId);
      if (caller) {
        io.to(caller.socketId).emit(SocketEvents.CALL_ACCEPTED, {
          answer: data.answer,
        });
      }
    });

    // Handle call rejection
    socket.on(SocketEvents.CALL_REJECTED, (data) => {
      const caller = connectedUsers.get(data.targetUserId);
      if (caller) {
        // Mark both users as available again
        if (socket.user) socket.user.isAvailable = true;
        caller.isAvailable = true;

        io.to(caller.socketId).emit(SocketEvents.CALL_REJECTED);
      }
    });

    // Handle call end
    socket.on(SocketEvents.CALL_ENDED, ({ targetUserId }) => {
      const otherUser = connectedUsers.get(targetUserId);
      if (otherUser) {
        // Mark both users as available
        if (socket.user) socket.user.isAvailable = true;
        otherUser.isAvailable = true;

        io.to(otherUser.socketId).emit(SocketEvents.CALL_ENDED);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.user) {
        connectedUsers.delete(socket.user.userId);

        // If user was in a call, notify the other party
        if (socket.user.currentCallId) {
          const callSession = activeCalls.get(socket.user.currentCallId);
          if (callSession) {
            const otherUserId =
              callSession.callerId === socket.user.userId
                ? callSession.targetUserId
                : callSession.callerId;

            const otherUser = connectedUsers.get(otherUserId);
            if (otherUser) {
              otherUser.isAvailable = true;
              io.to(otherUser.socketId).emit(SocketEvents.CALL_ENDED);
            }

            activeCalls.delete(socket.user.currentCallId);
          }
        }
      }
      console.log('Client disconnected:', socket.id);
    });

    // Handle ICE candidate
    socket.on(SocketEvents.ICE_CANDIDATE, (data) => {
      const targetUser = connectedUsers.get(data.targetUserId);
      
      if (targetUser) {
        // Forward the ICE candidate to the target user
        io.to(targetUser.socketId).emit(SocketEvents.ICE_CANDIDATE, {
          candidate: data.candidate,
          userId: socket.user?.userId // Send the sender's ID
        });
      }
    });
  });
};
