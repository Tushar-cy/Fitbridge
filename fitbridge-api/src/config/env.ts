import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export const ENV = {
  NODE_ENV:                  optional('NODE_ENV', 'development'),
  PORT:                      parseInt(optional('PORT', '5000'), 10),
  
  // Supabase (replaces MongoDB + custom JWT)
  SUPABASE_URL:              required('SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY'),

  // Groq AI (moved from frontend — security fix)
  GROQ_API_KEY:              required('GROQ_API_KEY'),

  // Redis (keep — used for rate limiting + Socket.IO blacklist)
  REDIS_URL:                 optional('REDIS_URL', 'redis://localhost:6379'),

  // Cloudinary (keep — used for server-side deletion)
  CLOUDINARY_CLOUD_NAME:     optional('CLOUDINARY_CLOUD_NAME'),
  CLOUDINARY_API_KEY:        optional('CLOUDINARY_API_KEY'),
  CLOUDINARY_API_SECRET:     optional('CLOUDINARY_API_SECRET'),

  // Razorpay
  RAZORPAY_KEY_ID:           optional('RAZORPAY_KEY_ID'),
  RAZORPAY_KEY_SECRET:       optional('RAZORPAY_KEY_SECRET'),

  // CORS
  CLIENT_URL:                optional('CLIENT_URL', 'http://localhost:8081'),
  COOKIE_DOMAIN:             optional('COOKIE_DOMAIN', 'localhost'),
  IS_PRODUCTION:             optional('NODE_ENV') === 'production',
};
