
import { type JoinRoomInput, type JoinRoomResponse } from '../schema';
import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function joinRoom(input: JoinRoomInput): Promise<JoinRoomResponse> {
  try {
    // Check if room exists and is active
    const room = await db.select().from(roomsTable)
      .where(and(eq(roomsTable.id, input.roomId), eq(roomsTable.is_active, true)))
      .limit(1)
      .execute();
    
    if (room.length === 0) {
      return {
        success: false,
        error: 'Room not found or inactive'
      };
    }
    
    // Check if user is already in room and connected
    const existingParticipant = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.user_id, input.userId),
        eq(roomParticipantsTable.is_connected, true)
      ))
      .limit(1)
      .execute();
    
    if (existingParticipant.length > 0) {
      return {
        success: false,
        error: 'User already in room'
      };
    }
    
    // Check current connected participant count
    const participantCountResult = await db.select({ count: count() })
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.is_connected, true)
      ))
      .execute();
    
    const currentCount = participantCountResult[0]?.count || 0;
    
    if (currentCount >= room[0].max_participants) {
      return {
        success: false,
        error: 'Room is full'
      };
    }
    
    // Add participant to room
    await db.insert(roomParticipantsTable).values({
      room_id: input.roomId,
      user_id: input.userId,
      is_connected: true
    }).execute();
    
    // Get all current participants for room status
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, input.roomId),
        eq(roomParticipantsTable.is_connected, true)
      ))
      .execute();
    
    const roomStatus = {
      roomId: input.roomId,
      participantCount: currentCount + 1,
      maxParticipants: room[0].max_participants,
      participants: participants.map(p => ({
        userId: p.user_id,
        joinedAt: p.joined_at,
        isConnected: p.is_connected
      })),
      isActive: room[0].is_active
    };
    
    return {
      success: true,
      roomStatus
    };
    
  } catch (error) {
    console.error('Failed to join room:', error);
    throw error;
  }
}
