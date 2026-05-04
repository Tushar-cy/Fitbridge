import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifySupabaseToken } from '../config/supabaseAdmin';
import { ENV } from '../config/env';

let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: [ENV.CLIENT_URL, 'exp://*', 'http://localhost:8081'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for Socket.IO
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (!token) return next(new Error('No token'));
      
      const user = await verifySupabaseToken(token);
      (socket as any).userId = user.id;
      (socket as any).role = user.user_metadata?.role ?? 'trainee';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`🔌 Socket connected: ${socket.id} (user: ${userId})`);

    // Join personal room for notifications
    socket.join(userId);

    // ─── session:join ───
    socket.on('session:join', async ({ sessionId }: { sessionId: string }) => {
      socket.join(`session:${sessionId}`);
      socket.to(`session:${sessionId}`).emit('session:participant_joined', {
        userId,
        socketId: socket.id,
      });
      console.log(`👥 ${userId} joined session room: ${sessionId}`);
    });

    // ─── session:leave ───
    socket.on('session:leave', ({ sessionId }: { sessionId: string }) => {
      socket.leave(`session:${sessionId}`);
      socket.to(`session:${sessionId}`).emit('session:participant_left', { userId });
    });

    // ─── session:message ───
    socket.on(
      'session:message',
      ({ sessionId, message }: { sessionId: string; message: string }) => {
        io.to(`session:${sessionId}`).emit('session:message', {
          from: userId,
          message,
          timestamp: new Date().toISOString(),
        });
      },
    );

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  console.log('⚡ Socket.IO initialised');
  return io;
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}
