import 'dotenv/config';
import http from 'http';
import { createApp } from './app';
import { connectRedis } from './config/redis';
import { configureCloudinary } from './config/cloudinary';
import { initSocket } from './socket/socket';
import { ENV } from './config/env';

async function bootstrap() {
  // Configure Cloudinary (used for media deletion)
  configureCloudinary();

  // Try Redis — but NEVER crash the server if it's unavailable
  // On Vercel, Redis is not available locally — that's fine
  try {
    await Promise.race([
      connectRedis(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 3000)),
    ]);
  } catch {
    console.warn('⚠️  Redis unavailable — continuing without cache (rate limiting uses memory store)');
  }

  const app = createApp();

  // Export for Vercel Serverless
  if (process.env.VERCEL) {
    return app;
  }

  const httpServer = http.createServer(app);

  // Only init Socket.IO in non-serverless environments
  // Vercel is serverless — skip Socket.IO there
  if (!ENV.IS_PRODUCTION || process.env.ENABLE_SOCKET === 'true') {
    initSocket(httpServer);
  }

  httpServer.listen(ENV.PORT, () => {
    console.log(`\n🚀 FitBridge API running on http://localhost:${ENV.PORT}`);
    console.log(`   Environment : ${ENV.NODE_ENV}`);
    console.log(`   Database    : Supabase PostgreSQL`);
    console.log(`   Health check: http://localhost:${ENV.PORT}/health\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n⚠️  Received ${signal} — shutting down gracefully...`);
    httpServer.close(() => {
      console.log('👋 Server shut down');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // Don't crash on unhandled rejections — log them instead
  process.on('unhandledRejection', (reason) => {
    console.error('🔥 Unhandled Rejection:', reason);
    // Do NOT call process.exit(1) — it kills the Vercel function
  });
  
  return app;
}

const appPromise = bootstrap().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

export default appPromise.then(app => app);
