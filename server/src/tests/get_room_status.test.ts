
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { roomsTable, roomParticipantsTable } from '../db/schema';
import { getRoomStatus } from '../handlers/get_room_status';
import { eq } from 'drizzle-orm';

const testRoom = {
  id: 'test-room-123',
  max_participants: 4,
  is_active: true
};

const testParticipants = [
  {
    room_id: 'test-room-123',
    user_id: 'user-1',
    is_connected: true
  },
  {
    room_id: 'test-room-123',
    user_id: 'user-2',
    is_connected: true
  },
  {
    room_id: 'test-room-123',
    user_id: 'user-3',
    is_connected: false // Disconnected participant
  }
];

describe('getRoomStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return room status with active participants', async () => {
    // Create test room
    await db.insert(roomsTable).values(testRoom);
    
    // Add participants
    await db.insert(roomParticipantsTable).values(testParticipants);

    const result = await getRoomStatus('test-room-123');

    expect(result).not.toBeNull();
    expect(result!.roomId).toBe('test-room-123');
    expect(result!.participantCount).toBe(2); // Only connected participants
    expect(result!.maxParticipants).toBe(4);
    expect(result!.isActive).toBe(true);
    expect(result!.participants).toHaveLength(2);
    
    // Check that only connected participants are returned
    const userIds = result!.participants.map(p => p.userId);
    expect(userIds).toContain('user-1');
    expect(userIds).toContain('user-2');
    expect(userIds).not.toContain('user-3');
    
    // Verify participant structure
    result!.participants.forEach(participant => {
      expect(participant.userId).toBeDefined();
      expect(participant.joinedAt).toBeInstanceOf(Date);
      expect(participant.isConnected).toBe(true);
    });
  });

  it('should return room status with empty participants list', async () => {
    // Create room without participants
    await db.insert(roomsTable).values({
      id: 'empty-room',
      max_participants: 2,
      is_active: true
    });

    const result = await getRoomStatus('empty-room');

    expect(result).not.toBeNull();
    expect(result!.roomId).toBe('empty-room');
    expect(result!.participantCount).toBe(0);
    expect(result!.maxParticipants).toBe(2);
    expect(result!.isActive).toBe(true);
    expect(result!.participants).toHaveLength(0);
  });

  it('should return room status with inactive room', async () => {
    // Create inactive room
    await db.insert(roomsTable).values({
      id: 'inactive-room',
      max_participants: 3,
      is_active: false
    });

    // Add a participant
    await db.insert(roomParticipantsTable).values({
      room_id: 'inactive-room',
      user_id: 'user-active',
      is_connected: true
    });

    const result = await getRoomStatus('inactive-room');

    expect(result).not.toBeNull();
    expect(result!.roomId).toBe('inactive-room');
    expect(result!.participantCount).toBe(1);
    expect(result!.maxParticipants).toBe(3);
    expect(result!.isActive).toBe(false);
    expect(result!.participants).toHaveLength(1);
    expect(result!.participants[0].userId).toBe('user-active');
  });

  it('should return null for non-existent room', async () => {
    const result = await getRoomStatus('non-existent-room');

    expect(result).toBeNull();
  });

  it('should filter out disconnected participants', async () => {
    // Create room
    await db.insert(roomsTable).values({
      id: 'filter-test-room',
      max_participants: 5,
      is_active: true
    });

    // Add mixed connected/disconnected participants
    await db.insert(roomParticipantsTable).values([
      {
        room_id: 'filter-test-room',
        user_id: 'connected-user-1',
        is_connected: true
      },
      {
        room_id: 'filter-test-room',
        user_id: 'disconnected-user-1',
        is_connected: false
      },
      {
        room_id: 'filter-test-room',
        user_id: 'connected-user-2',
        is_connected: true
      },
      {
        room_id: 'filter-test-room',
        user_id: 'disconnected-user-2',
        is_connected: false
      }
    ]);

    const result = await getRoomStatus('filter-test-room');

    expect(result).not.toBeNull();
    expect(result!.participantCount).toBe(2); // Only connected participants
    expect(result!.participants).toHaveLength(2);
    
    const userIds = result!.participants.map(p => p.userId);
    expect(userIds).toContain('connected-user-1');
    expect(userIds).toContain('connected-user-2');
    expect(userIds).not.toContain('disconnected-user-1');
    expect(userIds).not.toContain('disconnected-user-2');
    
    // All returned participants should be connected
    result!.participants.forEach(participant => {
      expect(participant.isConnected).toBe(true);
    });
  });

  it('should handle room with default values correctly', async () => {
    // Create room using default values (should use schema defaults)
    await db.insert(roomsTable).values({
      id: 'default-room'
      // max_participants will default to 2
      // is_active will default to true
    });

    const result = await getRoomStatus('default-room');

    expect(result).not.toBeNull();
    expect(result!.roomId).toBe('default-room');
    expect(result!.maxParticipants).toBe(2); // Schema default
    expect(result!.isActive).toBe(true); // Schema default
    expect(result!.participantCount).toBe(0);
    expect(result!.participants).toHaveLength(0);
  });

  it('should save participants to database correctly', async () => {
    // Create test room
    await db.insert(roomsTable).values(testRoom);
    await db.insert(roomParticipantsTable).values(testParticipants);

    // Verify data was saved correctly in the database
    const roomsInDb = await db.select().from(roomsTable).where(eq(roomsTable.id, 'test-room-123'));
    const participantsInDb = await db.select().from(roomParticipantsTable).where(eq(roomParticipantsTable.room_id, 'test-room-123'));

    expect(roomsInDb).toHaveLength(1);
    expect(roomsInDb[0].id).toBe('test-room-123');
    expect(roomsInDb[0].max_participants).toBe(4);
    expect(roomsInDb[0].is_active).toBe(true);
    expect(roomsInDb[0].created_at).toBeInstanceOf(Date);

    expect(participantsInDb).toHaveLength(3);
    participantsInDb.forEach(participant => {
      expect(participant.room_id).toBe('test-room-123');
      expect(participant.user_id).toMatch(/^user-[123]$/);
      expect(participant.joined_at).toBeInstanceOf(Date);
      expect(participant.id).toBeDefined(); // UUID should be generated
    });

    // Now test the handler
    const result = await getRoomStatus('test-room-123');
    expect(result).not.toBeNull();
    expect(result!.participantCount).toBe(2); // Only connected ones
  });
});
