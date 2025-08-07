
import { type RoomStatus } from '../schema';
import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function getRoomStatus(roomId: string): Promise<RoomStatus | null> {
  // This handler retrieves current status of a video call room
  // Returns participant information, capacity, and room activity status
  // Used by frontend to display room information and manage UI state
  
  try {
    // Get room information
    const room = await db.select().from(roomsTable)
      .where(eq(roomsTable.id, roomId))
      .limit(1);
    
    if (room.length === 0) {
      return null;
    }
    
    // Get active participants
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, roomId),
        eq(roomParticipantsTable.is_connected, true)
      ));
    
    const roomStatus: RoomStatus = {
      roomId: room[0].id,
      participantCount: participants.length,
      maxParticipants: room[0].max_participants,
      participants: participants.map(p => ({
        userId: p.user_id,
        joinedAt: p.joined_at,
        isConnected: p.is_connected
      })),
      isActive: room[0].is_active
    };
    
    return roomStatus;
    
  } catch (error) {
    console.error(`Failed to get room status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null;
  }
}
