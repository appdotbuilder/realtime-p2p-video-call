
import { z } from 'zod';

// WebRTC signaling message types
export const signalingMessageTypeSchema = z.enum([
  'offer',
  'answer',
  'ice-candidate',
  'join-room',
  'leave-room',
  'user-joined',
  'user-left',
  'room-full'
]);

export type SignalingMessageType = z.infer<typeof signalingMessageTypeSchema>;

// ICE candidate schema
export const iceCandidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable(),
  sdpMLineIndex: z.number().nullable(),
  usernameFragment: z.string().nullable().optional()
});

export type IceCandidate = z.infer<typeof iceCandidateSchema>;

// WebRTC session description schema
export const sessionDescriptionSchema = z.object({
  type: z.enum(['offer', 'answer']),
  sdp: z.string()
});

export type SessionDescription = z.infer<typeof sessionDescriptionSchema>;

// Signaling message payload schema
export const signalingPayloadSchema = z.union([
  sessionDescriptionSchema,
  iceCandidateSchema,
  z.object({}) // Empty payload for simple messages
]);

export type SignalingPayload = z.infer<typeof signalingPayloadSchema>;

// Complete signaling message schema
export const signalingMessageSchema = z.object({
  type: signalingMessageTypeSchema,
  payload: signalingPayloadSchema.optional(),
  fromUserId: z.string(),
  toUserId: z.string().optional(), // Optional for broadcast messages
  roomId: z.string(),
  timestamp: z.coerce.date()
});

export type SignalingMessage = z.infer<typeof signalingMessageSchema>;

// Room schema
export const roomSchema = z.object({
  id: z.string(),
  created_at: z.coerce.date(),
  max_participants: z.number().int().default(2),
  is_active: z.boolean().default(true)
});

export type Room = z.infer<typeof roomSchema>;

// Room participant schema
export const roomParticipantSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  joined_at: z.coerce.date(),
  is_connected: z.boolean().default(true)
});

export type RoomParticipant = z.infer<typeof roomParticipantSchema>;

// Input schemas
export const joinRoomInputSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1)
});

export type JoinRoomInput = z.infer<typeof joinRoomInputSchema>;

export const leaveRoomInputSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1)
});

export type LeaveRoomInput = z.infer<typeof leaveRoomInputSchema>;

export const sendSignalingMessageInputSchema = z.object({
  type: signalingMessageTypeSchema,
  payload: signalingPayloadSchema.optional(),
  fromUserId: z.string().min(1),
  toUserId: z.string().optional(),
  roomId: z.string().min(1)
});

export type SendSignalingMessageInput = z.infer<typeof sendSignalingMessageInputSchema>;

export const createRoomInputSchema = z.object({
  roomId: z.string().min(1).optional(), // If not provided, generate random ID
  maxParticipants: z.number().int().min(2).max(10).default(2)
});

export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;

// Response schemas
export const roomStatusSchema = z.object({
  roomId: z.string(),
  participantCount: z.number().int(),
  maxParticipants: z.number().int(),
  participants: z.array(z.object({
    userId: z.string(),
    joinedAt: z.coerce.date(),
    isConnected: z.boolean()
  })),
  isActive: z.boolean()
});

export type RoomStatus = z.infer<typeof roomStatusSchema>;

export const joinRoomResponseSchema = z.object({
  success: z.boolean(),
  roomStatus: roomStatusSchema.optional(),
  error: z.string().optional()
});

export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
