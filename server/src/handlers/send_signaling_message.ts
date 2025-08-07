
import { type SendSignalingMessageInput, type SignalingMessage } from '../schema';
import { db } from '../db';
import { signalingMessagesTable } from '../db/schema';

export async function sendSignalingMessage(input: SendSignalingMessageInput): Promise<SignalingMessage> {
  // This handler manages WebRTC signaling messages between peers
  // Stores signaling messages (offer, answer, ICE candidates) in database
  // In a real implementation, this would also emit to WebSocket connections
  
  try {
    // Store signaling message in database for persistence/debugging
    const newMessage = await db.insert(signalingMessagesTable).values({
      room_id: input.roomId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId || null,
      message_type: input.type,
      payload: input.payload ? JSON.stringify(input.payload) : null
    }).returning();
    
    // In a real implementation, you would emit this message to WebSocket connections
    // for real-time delivery to the target user(s)
    // Example: webSocketManager.emitToRoom(input.roomId, signalingMessage);
    
    const signalingMessage: SignalingMessage = {
      type: input.type,
      payload: input.payload,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      roomId: input.roomId,
      timestamp: newMessage[0].timestamp
    };
    
    return signalingMessage;
    
  } catch (error) {
    throw new Error(`Failed to send signaling message: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
