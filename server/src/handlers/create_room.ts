
import { type CreateRoomInput, type Room } from '../schema';
import { db } from '../db';
import { roomsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  try {
    // Generate room ID if not provided
    const roomId = input.roomId || generateRoomId();
    
    // Check if room already exists
    const existingRoom = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, roomId))
      .limit(1)
      .execute();
    
    if (existingRoom.length > 0) {
      throw new Error(`Room with ID ${roomId} already exists`);
    }
    
    // Insert new room
    const result = await db.insert(roomsTable)
      .values({
        id: roomId,
        max_participants: input.maxParticipants,
        is_active: true
      })
      .returning()
      .execute();
    
    const room = result[0];
    return {
      id: room.id,
      created_at: room.created_at,
      max_participants: room.max_participants,
      is_active: room.is_active
    };
  } catch (error) {
    console.error('Room creation failed:', error);
    throw error;
  }
}

function generateRoomId(): string {
  // Generate a random 8-character room ID
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
