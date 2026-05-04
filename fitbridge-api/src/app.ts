import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes    from './routes/auth.routes';
import trainerRoutes from './routes/trainer.routes';
import sessionRoutes from './routes/session.routes';
import bookingRoutes from './routes/booking.routes';
import feedRoutes    from './routes/feed.routes';
import reviewRoutes  from './routes/review.routes';
import userRoutes    from './routes/user.routes';
import mediaRoutes   from './routes/media.routes';
import aiRoutes      from './routes/ai.routes';



export function createApp() {
  const app = express();

  // ─── Security ────────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      // Allow localhost dev
      if (/^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+)/.test(origin)) return callback(null, true);
      // Allow Expo Go
      if (origin.startsWith('exp://')) return callback(null, true);
      // Allow all HTTPS origins (production)
      if (origin.startsWith('https://')) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With'],
  }));

  // ─── Parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(cookieParser());

  // ─── Logging ─────────────────────────────────────────────────────────────
  if (!ENV.IS_PRODUCTION) {
    app.use(morgan('dev'));
  } else {
    app.use(morgan('combined'));
  }

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  app.use(generalLimiter);

  // ─── Health ───────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), env: ENV.NODE_ENV });
  });

  // ─── Routes ───────────────────────────────────────────────────────────────
  app.use('/api/auth',     authRoutes);
  app.use('/api/trainers', trainerRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/feed',     feedRoutes);
  app.use('/api/reviews',  reviewRoutes);
  app.use('/api/users',    userRoutes);
  app.use('/api/media',    mediaRoutes);   // Cloudinary signed delete proxy
  app.use('/api/ai',       aiRoutes);

  // ─── 404 ──────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ─── Error Handler ────────────────────────────────────────────────────────
  app.use(errorHandler);

  return app;
}

export default createApp;
