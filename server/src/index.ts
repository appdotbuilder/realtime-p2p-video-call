
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createRoomInputSchema,
  joinRoomInputSchema,
  leaveRoomInputSchema,
  sendSignalingMessageInputSchema
} from './schema';

// Import handlers
import { createRoom } from './handlers/create_room';
import { joinRoom } from './handlers/join_room';
import { leaveRoom } from './handlers/leave_room';
import { sendSignalingMessage } from './handlers/send_signaling_message';
import { getRoomStatus } from './handlers/get_room_status';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // Room management procedures
  createRoom: publicProcedure
    .input(createRoomInputSchema)
    .mutation(({ input }) => createRoom(input)),
    
  joinRoom: publicProcedure
    .input(joinRoomInputSchema)
    .mutation(({ input }) => joinRoom(input)),
    
  leaveRoom: publicProcedure
    .input(leaveRoomInputSchema)
    .mutation(({ input }) => leaveRoom(input)),
    
  getRoomStatus: publicProcedure
    .input(z.string())
    .query(({ input }) => getRoomStatus(input)),
  
  // WebRTC signaling procedures
  sendSignalingMessage: publicProcedure
    .input(sendSignalingMessageInputSchema)
    .mutation(({ input }) => sendSignalingMessage(input)),
    
  // Note: In a real implementation, you would also need WebSocket support
  // for real-time signaling message delivery between peers
  // This could be implemented using @trpc/server/adapters/ws or a separate WebSocket server
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC WebRTC signaling server listening at port: ${port}`);
  console.log(`WebRTC video calling application ready`);
}

start();
