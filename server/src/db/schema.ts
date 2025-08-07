
import { serial, text, pgTable, timestamp, integer, boolean, uuid, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const roomsTable = pgTable('rooms', {
  id: varchar('id', { length: 255 }).primaryKey(), // Custom room ID or generated UUID
  created_at: timestamp('created_at').defaultNow().notNull(),
  max_participants: integer('max_participants').notNull().default(2),
  is_active: boolean('is_active').notNull().default(true)
});

export const roomParticipantsTable = pgTable('room_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  room_id: varchar('room_id', { length: 255 }).notNull().references(() => roomsTable.id, { onDelete: 'cascade' }),
  user_id: varchar('user_id', { length: 255 }).notNull(),
  joined_at: timestamp('joined_at').defaultNow().notNull(),
  is_connected: boolean('is_connected').notNull().default(true)
});

export const signalingMessagesTable = pgTable('signaling_messages', {
  id: serial('id').primaryKey(),
  room_id: varchar('room_id', { length: 255 }).notNull().references(() => roomsTable.id, { onDelete: 'cascade' }),
  from_user_id: varchar('from_user_id', { length: 255 }).notNull(),
  to_user_id: varchar('to_user_id', { length: 255 }), // Nullable for broadcast messages
  message_type: varchar('message_type', { length: 50 }).notNull(),
  payload: text('payload'), // JSON string of the payload
  timestamp: timestamp('timestamp').defaultNow().notNull()
});

// Define relations
export const roomsRelations = relations(roomsTable, ({ many }) => ({
  participants: many(roomParticipantsTable),
  messages: many(signalingMessagesTable)
}));

export const roomParticipantsRelations = relations(roomParticipantsTable, ({ one }) => ({
  room: one(roomsTable, {
    fields: [roomParticipantsTable.room_id],
    references: [roomsTable.id]
  })
}));

export const signalingMessagesRelations = relations(signalingMessagesTable, ({ one }) => ({
  room: one(roomsTable, {
    fields: [signalingMessagesTable.room_id],
    references: [roomsTable.id]
  })
}));

// TypeScript types for the table schemas
export type Room = typeof roomsTable.$inferSelect;
export type NewRoom = typeof roomsTable.$inferInsert;
export type RoomParticipant = typeof roomParticipantsTable.$inferSelect;
export type NewRoomParticipant = typeof roomParticipantsTable.$inferInsert;
export type SignalingMessage = typeof signalingMessagesTable.$inferSelect;
export type NewSignalingMessage = typeof signalingMessagesTable.$inferInsert;

// Export all tables for relation queries
export const tables = { 
  rooms: roomsTable, 
  roomParticipants: roomParticipantsTable,
  signalingMessages: signalingMessagesTable
};
