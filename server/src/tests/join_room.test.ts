
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { type JoinRoomInput } from '../schema';
import { joinRoom } from '../handlers/join_room';
import { eq, and } from 'drizzle-orm';

describe('joinRoom', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testRoomId = 'test-room-123';
  const testUserId = 'user-456';

  const createTestRoom = async (maxParticipants = 2, isActive = true) => {
    await db.insert(roomsTable).values({
      id: testRoomId,
      max_participants: maxParticipants,
      is_active: isActive
    }).execute();
  };

  const addParticipant = async (roomId: string, userId: string, isConnected = true) => {
    await db.insert(roomParticipantsTable).values({
      room_id: roomId,
      user_id: userId,
      is_connected: isConnected
    }).execute();
  };

  it('should successfully join an empty room', async () => {
    await createTestRoom();

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.roomStatus).toBeDefined();
    expect(result.roomStatus!.roomId).toBe(testRoomId);
    expect(result.roomStatus!.participantCount).toBe(1);
    expect(result.roomStatus!.maxParticipants).toBe(2);
    expect(result.roomStatus!.participants).toHaveLength(1);
    expect(result.roomStatus!.participants[0].userId).toBe(testUserId);
    expect(result.roomStatus!.participants[0].isConnected).toBe(true);
    expect(result.roomStatus!.isActive).toBe(true);
  });

  it('should save participant to database', async () => {
    await createTestRoom();

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    await joinRoom(input);

    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, testRoomId),
        eq(roomParticipantsTable.user_id, testUserId)
      ))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].room_id).toBe(testRoomId);
    expect(participants[0].user_id).toBe(testUserId);
    expect(participants[0].is_connected).toBe(true);
    expect(participants[0].joined_at).toBeInstanceOf(Date);
  });

  it('should fail when room does not exist', async () => {
    const input: JoinRoomInput = {
      roomId: 'non-existent-room',
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Room not found or inactive');
    expect(result.roomStatus).toBeUndefined();
  });

  it('should fail when room is inactive', async () => {
    await createTestRoom(2, false); // Create inactive room

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Room not found or inactive');
    expect(result.roomStatus).toBeUndefined();
  });

  it('should fail when room is full', async () => {
    await createTestRoom(2); // Max 2 participants
    await addParticipant(testRoomId, 'user-1');
    await addParticipant(testRoomId, 'user-2');

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Room is full');
    expect(result.roomStatus).toBeUndefined();
  });

  it('should fail when user is already in room', async () => {
    await createTestRoom();
    await addParticipant(testRoomId, testUserId); // User already in room

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(false);
    expect(result.error).toBe('User already in room');
    expect(result.roomStatus).toBeUndefined();
  });

  it('should allow user to rejoin if previously disconnected', async () => {
    await createTestRoom();
    await addParticipant(testRoomId, testUserId, false); // User was disconnected

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(true);
    expect(result.roomStatus).toBeDefined();
    expect(result.roomStatus!.participantCount).toBe(1);

    // Check database has two records for the user (one disconnected, one connected)
    const allParticipants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, testRoomId),
        eq(roomParticipantsTable.user_id, testUserId)
      ))
      .execute();

    expect(allParticipants).toHaveLength(2);
    
    const connectedParticipants = allParticipants.filter(p => p.is_connected);
    expect(connectedParticipants).toHaveLength(1);
  });

  it('should handle multiple participants correctly', async () => {
    await createTestRoom(3); // Max 3 participants
    await addParticipant(testRoomId, 'user-1');

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(true);
    expect(result.roomStatus!.participantCount).toBe(2);
    expect(result.roomStatus!.participants).toHaveLength(2);
    
    // Check that both participants are included
    const userIds = result.roomStatus!.participants.map(p => p.userId);
    expect(userIds).toContain('user-1');
    expect(userIds).toContain(testUserId);
  });

  it('should only count connected participants for room capacity', async () => {
    await createTestRoom(2); // Max 2 participants
    await addParticipant(testRoomId, 'user-1', true);  // Connected
    await addParticipant(testRoomId, 'user-2', false); // Disconnected

    const input: JoinRoomInput = {
      roomId: testRoomId,
      userId: testUserId
    };

    const result = await joinRoom(input);

    expect(result.success).toBe(true);
    expect(result.roomStatus!.participantCount).toBe(2); // user-1 was already connected + new user
    expect(result.roomStatus!.participants).toHaveLength(2); // Only connected participants
  });
});
