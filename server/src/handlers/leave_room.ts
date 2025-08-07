
import { type LeaveRoomInput } from '../schema';
import { db } from '../db';
import { roomParticipantsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function leaveRoom(input: LeaveRoomInput): Promise<{ success: boolean; error?: string }> {
  try {
    // Update participant status to disconnected
    const result = await db.update(roomParticipantsTable)
      .set({ is_connected: false })
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.user_id, input.userId),
        eq(roomParticipantsTable.is_connected, true)
      ))
      .execute();
    
    return { success: true };
    
  } catch (error) {
    console.error('Leave room failed:', error);
    throw error;
  }
}
