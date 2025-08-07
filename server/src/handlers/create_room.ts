
import { type CreateRoomInput, type Room } from '../schema';
import { db } from '../db';
import { roomsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  // This handler creates a new room for video calling
  // Generates a random room ID if not provided
  // Ensures room ID uniqueness in the database
  
  const roomId = input.roomId || generateRoomId();
  
  // Check if room already exists (placeholder - should check DB)
  const existingRoom = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId)).limit(1);
  
  if (existingRoom.length > 0) {
    throw new Error(`Room with ID ${roomId} already exists`);
  }
  
  // Insert new room (placeholder implementation)
  const newRoom = await db.insert(roomsTable).values({
    id: roomId,
    max_participants: input.maxParticipants,
    is_active: true
  }).returning();
  
  return {
    id: newRoom[0].id,
    created_at: newRoom[0].created_at,
    max_participants: newRoom[0].max_participants,
    is_active: newRoom[0].is_active
  } as Room;
}

function generateRoomId(): string {
  // Generate a random 8-character room ID
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
