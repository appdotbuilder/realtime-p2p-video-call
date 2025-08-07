
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { roomsTable } from '../db/schema';
import { type CreateRoomInput, createRoomInputSchema } from '../schema';
import { createRoom } from '../handlers/create_room';
import { eq } from 'drizzle-orm';

// Test inputs
const testInputWithRoomId: CreateRoomInput = {
  roomId: 'TEST123',
  maxParticipants: 4
};

const testInputWithoutRoomId: CreateRoomInput = {
  maxParticipants: 2
};

describe('createRoom', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a room with provided room ID', async () => {
    const result = await createRoom(testInputWithRoomId);

    expect(result.id).toEqual('TEST123');
    expect(result.max_participants).toEqual(4);
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a room with generated room ID when not provided', async () => {
    const result = await createRoom(testInputWithoutRoomId);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toEqual(8);
    expect(result.max_participants).toEqual(2);
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a room with default values', async () => {
    // Parse empty object through Zod to get defaults applied
    const parsedInput = createRoomInputSchema.parse({});
    const result = await createRoom(parsedInput);

    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toEqual(8);
    expect(result.max_participants).toEqual(2); // Zod default
    expect(result.is_active).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save room to database', async () => {
    const result = await createRoom(testInputWithRoomId);

    const rooms = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, result.id))
      .execute();

    expect(rooms).toHaveLength(1);
    expect(rooms[0].id).toEqual('TEST123');
    expect(rooms[0].max_participants).toEqual(4);
    expect(rooms[0].is_active).toBe(true);
    expect(rooms[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when room ID already exists', async () => {
    // Create first room
    await createRoom(testInputWithRoomId);

    // Try to create another room with the same ID
    expect(createRoom(testInputWithRoomId)).rejects.toThrow(/already exists/i);
  });

  it('should generate unique room IDs', async () => {
    const room1 = await createRoom(testInputWithoutRoomId);
    const room2 = await createRoom(testInputWithoutRoomId);

    expect(room1.id).not.toEqual(room2.id);
    expect(room1.id.length).toEqual(8);
    expect(room2.id.length).toEqual(8);
  });

  it('should handle different max_participants values', async () => {
    const inputWith10: CreateRoomInput = { maxParticipants: 10 };
    const result = await createRoom(inputWith10);

    expect(result.max_participants).toEqual(10);

    // Verify in database
    const rooms = await db.select()
      .from(roomsTable)
      .where(eq(roomsTable.id, result.id))
      .execute();

    expect(rooms[0].max_participants).toEqual(10);
  });
});
