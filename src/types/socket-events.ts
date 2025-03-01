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

  // WebRTC events
  CALL_ANSWER = 'call-answer',
  ICE_CANDIDATE = 'ice-candidate',

  // Error events
  ERROR = 'error',
}

// Type for socket event payloads
export interface SocketEventPayloads {
  [SocketEvents.REGISTER_USER]: {
    userId: string;
    userName: string | null;
    socketId: string;
  };

  [SocketEvents.CHECK_USER_AVAILABILITY]: {
    targetUserId: string;
  };

  [SocketEvents.INITIATE_CALL]: {
    targetUserId: string;
    callerId: string;
    callerName: string;
    offer?: RTCSessionDescriptionInit;
  };

  [SocketEvents.CALL_ANSWER]: {
    targetUserId: string;
    answer: RTCSessionDescriptionInit;
  };

  [SocketEvents.ICE_CANDIDATE]: {
    targetUserId: string;
    candidate: RTCIceCandidate;
  };

  [SocketEvents.CANCEL_CALL]: {
    targetUserId: string;
  };
}

// Type for socket event responses
export interface SocketEventResponses {
  [SocketEvents.USER_AVAILABILITY_RESPONSE]: {
    isAvailable: boolean;
  };

  [SocketEvents.USER_REGISTERED]: {
    userId: string;
    socketId: string;
    success: boolean;
  };

  [SocketEvents.INCOMING_CALL]: {
    callerId: string;
    callerName: string;
    offer?: RTCSessionDescriptionInit;
  };
}

// Server-side specific types
export interface ConnectedUser {
  userId: string;
  socketId: string;
  userName: string | null;
}

export interface ActiveCall {
  callId: string;
  callerId: string;
  receiverId: string;
  startTime: Date;
  offer?: RTCSessionDescriptionInit;
}

// Additional types specific to backend
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

// Type for socket with auth data
export interface AuthenticatedSocket extends Socket {
  auth: {
    token: string;
    userId: string;
    userName: string | null;
  };
  user?: SocketUser;
}
