import { Server } from 'socket.io';

// Define the ice candidate interface
interface IceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  usernameFragment: string | null;
}

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join', (roomId: string) => {
      socket.join(roomId);
      console.log(`Client ${socket.id} joined room ${roomId}`);
    });

    socket.on('offer', (data: { sdp: string; roomId: string }) => {
      socket.to(data.roomId).emit('offer', {
        sdp: data.sdp,
        socketId: socket.id,
      });
    });

    socket.on('answer', (data: { sdp: string; roomId: string }) => {
      socket.to(data.roomId).emit('answer', {
        sdp: data.sdp,
        socketId: socket.id,
      });
    });

    socket.on('ice-candidate', (data: { candidate: IceCandidate; roomId: string }) => {
      socket.to(data.roomId).emit('ice-candidate', {
        candidate: data.candidate,
        socketId: socket.id,
      });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
};
