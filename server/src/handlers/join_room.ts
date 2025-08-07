
import { type JoinRoomInput, type JoinRoomResponse } from '../schema';
import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function joinRoom(input: JoinRoomInput): Promise<JoinRoomResponse> {
  // This handler manages users joining a video call room
  // Checks room capacity, adds participant to database
  // Returns room status and participant information
  
  try {
    // Check if room exists and is active
    const room = await db.select().from(roomsTable)
      .where(and(eq(roomsTable.id, input.roomId), eq(roomsTable.is_active, true)))
      .limit(1);
    
    if (room.length === 0) {
      return {
        success: false,
        error: 'Room not found or inactive'
      };
    }
    
    // Check current participant count
    const participantCount = await db.select({ count: count() })
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.is_connected, true)
      ));
    
    const currentCount = participantCount[0]?.count || 0;
    
    if (currentCount >= room[0].max_participants) {
      return {
        success: false,
        error: 'Room is full'
      };
    }
    
    // Check if user is already in room
    const existingParticipant = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.user_id, input.userId),
        eq(roomParticipantsTable.is_connected, true)
      ))
      .limit(1);
    
    if (existingParticipant.length > 0) {
      return {
        success: false,
        error: 'User already in room'
      };
    }
    
    // Add participant to room
    await db.insert(roomParticipantsTable).values({
      room_id: input.roomId,
      user_id: input.userId,
      is_connected: true
    });
    
    // Get updated room status (placeholder)
    const roomStatus = {
      roomId: input.roomId,
      participantCount: currentCount + 1,
      maxParticipants: room[0].max_participants,
      participants: [], // Should fetch actual participants
      isActive: room[0].is_active
    };
    
    return {
      success: true,
      roomStatus
    };
    
  } catch (error) {
    return {
      success: false,
      error: `Failed to join room: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}
