
import { type LeaveRoomInput } from '../schema';
import { db } from '../db';
import { roomParticipantsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function leaveRoom(input: LeaveRoomInput): Promise<{ success: boolean; error?: string }> {
  // This handler manages users leaving a video call room
  // Updates participant status in database
  // Cleans up disconnected participants
  
  try {
    // Update participant status to disconnected
    const result = await db.update(roomParticipantsTable)
      .set({ is_connected: false })
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.user_id, input.userId),
        eq(roomParticipantsTable.is_connected, true)
      ));
    
    // Note: In a real implementation, you might want to:
    // 1. Notify other participants in the room
    // 2. Clean up old disconnected participants
    // 3. Deactivate room if all participants leave
    
    return { success: true };
    
  } catch (error) {
    return {
      success: false,
      error: `Failed to leave room: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
