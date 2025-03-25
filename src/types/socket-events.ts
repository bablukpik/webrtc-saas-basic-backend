import { Socket } from 'socket.io';

export enum SocketEvents {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',

  // User events
  REGISTER_USER = 'register-user',
  USER_REGISTERED = 'user-registered',
  JOIN_ROOM = 'join',
  USER_STATUS_CHANGE = 'user-status-change',

  // Call events
  CHECK_USER_AVAILABILITY = 'check-user-availability',
  USER_AVAILABILITY_RESPONSE = 'user-availability-response',
  INITIATE_CALL = 'initiate-call',
  INCOMING_CALL = 'incoming-call',
  CALL_ACCEPTED = 'call-accepted',
  CALL_REJECTED = 'call-rejected',
  CALL_ENDED = 'call-ended',
  CALL_ERROR = 'call-error',
  CANCEL_CALL = 'cancel-call',
  CALL_CANCELLED = 'call-cancelled',

  // WebRTC events
  CALL_ANSWER = 'call-answer',
  ICE_CANDIDATE = 'ice-candidate',

  // Error events
  ERROR = 'error',
}

// Extend Socket type with our custom properties
export interface CustomSocket extends Socket {
  user?: SocketUser;
  auth?: {
    token: string;
    userId: string;
    userName: string | null;
  };
}

// Define the ice candidate interface
export interface IceCandidate {
  candidate: string;
  sdpMLineIndex: number | null;
  sdpMid: string | null;
  usernameFragment: string | null;
}

export interface ActiveCall {
  callId: string;
  callerId: string;
  receiverId: string;
  startTime: Date;
  offer?: RTCSessionDescriptionInit;
}

export interface SocketUser {
  userId: string;
  userName: string | null;
  socketId: string;
  isAvailable: boolean;
  currentCallId?: string;
}

export interface CallSession {
  callId: string;
  callerId: string;
  targetUserId: string;
  status: 'pending' | 'active' | 'ended';
  startTime: Date;
  endTime?: Date;
}
