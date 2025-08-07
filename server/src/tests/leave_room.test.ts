
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { type LeaveRoomInput } from '../schema';
import { leaveRoom } from '../handlers/leave_room';
import { eq, and } from 'drizzle-orm';

const testInput: LeaveRoomInput = {
  roomId: 'test-room-123',
  userId: 'user-123'
};

describe('leaveRoom', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully disconnect a participant from room', async () => {
    // Create test room
    await db.insert(roomsTable).values({
      id: testInput.roomId,
      max_participants: 4,
      is_active: true
    }).execute();

    // Create connected participant
    await db.insert(roomParticipantsTable).values({
      room_id: testInput.roomId,
      user_id: testInput.userId,
      is_connected: true
    }).execute();

    const result = await leaveRoom(testInput);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should update participant status to disconnected in database', async () => {
    // Create test room
    await db.insert(roomsTable).values({
      id: testInput.roomId,
      max_participants: 2,
      is_active: true
    }).execute();

    // Create connected participant
    await db.insert(roomParticipantsTable).values({
      room_id: testInput.roomId,
      user_id: testInput.userId,
      is_connected: true
    }).execute();

    await leaveRoom(testInput);

    // Verify participant is marked as disconnected
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, testInput.roomId),
        eq(roomParticipantsTable.user_id, testInput.userId)
      ))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].is_connected).toBe(false);
    expect(participants[0].user_id).toEqual(testInput.userId);
    expect(participants[0].room_id).toEqual(testInput.roomId);
  });

  it('should handle leaving room when participant is not connected', async () => {
    // Create test room
    await db.insert(roomsTable).values({
      id: testInput.roomId,
      max_participants: 2,
      is_active: true
    }).execute();

    // Create already disconnected participant
    await db.insert(roomParticipantsTable).values({
      room_id: testInput.roomId,
      user_id: testInput.userId,
      is_connected: false
    }).execute();

    const result = await leaveRoom(testInput);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify participant remains disconnected
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(and(
        eq(roomParticipantsTable.room_id, testInput.roomId),
        eq(roomParticipantsTable.user_id, testInput.userId)
      ))
      .execute();

    expect(participants).toHaveLength(1);
    expect(participants[0].is_connected).toBe(false);
  });

  it('should handle leaving room when participant does not exist', async () => {
    // Create test room but no participants
    await db.insert(roomsTable).values({
      id: testInput.roomId,
      max_participants: 2,
      is_active: true
    }).execute();

    const result = await leaveRoom(testInput);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify no participants exist
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(eq(roomParticipantsTable.room_id, testInput.roomId))
      .execute();

    expect(participants).toHaveLength(0);
  });

  it('should only disconnect the specific user from the room', async () => {
    // Create test room
    await db.insert(roomsTable).values({
      id: testInput.roomId,
      max_participants: 4,
      is_active: true
    }).execute();

    // Create multiple connected participants
    await db.insert(roomParticipantsTable).values([
      {
        room_id: testInput.roomId,
        user_id: testInput.userId,
        is_connected: true
      },
      {
        room_id: testInput.roomId,
        user_id: 'other-user-456',
        is_connected: true
      }
    ]).execute();

    await leaveRoom(testInput);

    // Verify only the specific user is disconnected
    const participants = await db.select()
      .from(roomParticipantsTable)
      .where(eq(roomParticipantsTable.room_id, testInput.roomId))
      .execute();

    expect(participants).toHaveLength(2);
    
    const targetUser = participants.find(p => p.user_id === testInput.userId);
    const otherUser = participants.find(p => p.user_id === 'other-user-456');
    
    expect(targetUser?.is_connected).toBe(false);
    expect(otherUser?.is_connected).toBe(true);
  });
});
