
import { type SendSignalingMessageInput, type SignalingMessage } from '../schema';
import { db } from '../db';
import { signalingMessagesTable } from '../db/schema';

export async function sendSignalingMessage(input: SendSignalingMessageInput): Promise<SignalingMessage> {
  try {
    // Store signaling message in database for persistence/debugging
    const result = await db.insert(signalingMessagesTable)
      .values({
        room_id: input.roomId,
        from_user_id: input.fromUserId,
        to_user_id: input.toUserId || null,
        message_type: input.type,
        payload: input.payload ? JSON.stringify(input.payload) : null
      })
      .returning()
      .execute();
    
    const newMessage = result[0];
    
    // In a real implementation, you would emit this message to WebSocket connections
    // for real-time delivery to the target user(s)
    // Example: webSocketManager.emitToRoom(input.roomId, signalingMessage);
    
    const signalingMessage: SignalingMessage = {
      type: input.type,
      payload: input.payload,
      fromUserId: input.fromUserId,
      toUserId: input.toUserId,
      roomId: input.roomId,
      timestamp: newMessage.timestamp
    };
    
    return signalingMessage;
    
  } catch (error) {
    console.error('Failed to send signaling message:', error);
    throw error;
  }
}
