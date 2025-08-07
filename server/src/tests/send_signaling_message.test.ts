
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { signalingMessagesTable, roomsTable } from '../db/schema';
import { type SendSignalingMessageInput } from '../schema';
import { sendSignalingMessage } from '../handlers/send_signaling_message';
import { eq } from 'drizzle-orm';

// Test room setup
const testRoomId = 'test-room-123';

// Test input for offer message
const testOfferInput: SendSignalingMessageInput = {
  type: 'offer',
  payload: {
    type: 'offer',
    sdp: 'v=0\r\no=- 123456789 1 IN IP4 192.168.1.100\r\ns=-\r\n'
  },
  fromUserId: 'user-123',
  toUserId: 'user-456',
  roomId: testRoomId
};

// Test input for ICE candidate message
const testIceCandidateInput: SendSignalingMessageInput = {
  type: 'ice-candidate',
  payload: {
    candidate: 'candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host',
    sdpMid: '0',
    sdpMLineIndex: 0,
    usernameFragment: null
  },
  fromUserId: 'user-123',
  toUserId: 'user-456',
  roomId: testRoomId
};

// Test input for broadcast message (no toUserId)
const testBroadcastInput: SendSignalingMessageInput = {
  type: 'user-joined',
  payload: {},
  fromUserId: 'user-789',
  roomId: testRoomId
};

describe('sendSignalingMessage', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test room
    await db.insert(roomsTable)
      .values({
        id: testRoomId,
        max_participants: 4,
        is_active: true
      })
      .execute();
  });
  
  afterEach(resetDB);

  it('should send offer signaling message', async () => {
    const result = await sendSignalingMessage(testOfferInput);

    // Verify returned message structure
    expect(result.type).toEqual('offer');
    expect(result.payload).toBeDefined();
    if (result.payload && 'type' in result.payload && 'sdp' in result.payload) {
      expect(result.payload.type).toEqual('offer');
      expect(result.payload.sdp).toEqual('v=0\r\no=- 123456789 1 IN IP4 192.168.1.100\r\ns=-\r\n');
    }
    expect(result.fromUserId).toEqual('user-123');
    expect(result.toUserId).toEqual('user-456');
    expect(result.roomId).toEqual(testRoomId);
    expect(result.timestamp).toBeInstanceOf(Date);
  });

  it('should save signaling message to database', async () => {
    const result = await sendSignalingMessage(testOfferInput);

    // Query database to verify message was saved
    const messages = await db.select()
      .from(signalingMessagesTable)
      .where(eq(signalingMessagesTable.room_id, testRoomId))
      .execute();

    expect(messages).toHaveLength(1);
    const savedMessage = messages[0];
    
    expect(savedMessage.room_id).toEqual(testRoomId);
    expect(savedMessage.from_user_id).toEqual('user-123');
    expect(savedMessage.to_user_id).toEqual('user-456');
    expect(savedMessage.message_type).toEqual('offer');
    expect(savedMessage.payload).toEqual(JSON.stringify(testOfferInput.payload));
    expect(savedMessage.timestamp).toBeInstanceOf(Date);
    expect(savedMessage.timestamp).toEqual(result.timestamp);
  });

  it('should send ICE candidate signaling message', async () => {
    const result = await sendSignalingMessage(testIceCandidateInput);

    // Verify message fields
    expect(result.type).toEqual('ice-candidate');
    expect(result.payload).toBeDefined();
    if (result.payload && 'candidate' in result.payload) {
      expect(result.payload.candidate).toEqual('candidate:1 1 UDP 2130706431 192.168.1.100 54400 typ host');
      expect(result.payload.sdpMid).toEqual('0');
      expect(result.payload.sdpMLineIndex).toEqual(0);
      expect(result.payload.usernameFragment).toBeNull();
    }
    expect(result.fromUserId).toEqual('user-123');
    expect(result.toUserId).toEqual('user-456');
    expect(result.roomId).toEqual(testRoomId);

    // Verify database storage
    const messages = await db.select()
      .from(signalingMessagesTable)
      .where(eq(signalingMessagesTable.message_type, 'ice-candidate'))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].payload).toEqual(JSON.stringify(testIceCandidateInput.payload));
  });

  it('should send broadcast message without toUserId', async () => {
    const result = await sendSignalingMessage(testBroadcastInput);

    // Verify broadcast message structure
    expect(result.type).toEqual('user-joined');
    expect(result.payload).toEqual({});
    expect(result.fromUserId).toEqual('user-789');
    expect(result.toUserId).toBeUndefined();
    expect(result.roomId).toEqual(testRoomId);

    // Verify database storage
    const messages = await db.select()
      .from(signalingMessagesTable)
      .where(eq(signalingMessagesTable.from_user_id, 'user-789'))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].to_user_id).toBeNull();
    expect(messages[0].message_type).toEqual('user-joined');
  });

  it('should handle message without payload', async () => {
    const simpleMessage: SendSignalingMessageInput = {
      type: 'leave-room',
      fromUserId: 'user-123',
      roomId: testRoomId
    };

    const result = await sendSignalingMessage(simpleMessage);

    expect(result.type).toEqual('leave-room');
    expect(result.payload).toBeUndefined();

    // Verify database storage
    const messages = await db.select()
      .from(signalingMessagesTable)
      .where(eq(signalingMessagesTable.message_type, 'leave-room'))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].payload).toBeNull();
  });

  it('should store multiple messages correctly', async () => {
    // Send multiple different messages
    await sendSignalingMessage(testOfferInput);
    await sendSignalingMessage(testIceCandidateInput);
    await sendSignalingMessage(testBroadcastInput);

    // Verify all messages were stored
    const messages = await db.select()
      .from(signalingMessagesTable)
      .where(eq(signalingMessagesTable.room_id, testRoomId))
      .execute();

    expect(messages).toHaveLength(3);
    
    // Verify message types are distinct
    const messageTypes = messages.map(m => m.message_type);
    expect(messageTypes).toContain('offer');
    expect(messageTypes).toContain('ice-candidate');
    expect(messageTypes).toContain('user-joined');
  });
});
