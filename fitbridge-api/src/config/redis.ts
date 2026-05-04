import Redis from 'ioredis';
import { ENV } from './env';

let redisClient: Redis | null = null;
let redisAvailable = false;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(ENV.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
      // Stop retrying after first failure — avoids log spam
      retryStrategy: () => null,
    });

    redisClient.on('connect', () => {
      redisAvailable = true;
      console.log('✅ Redis connected');
    });
    redisClient.on('error', () => {
      // Silently mark as unavailable — logged once on connect attempt
      redisAvailable = false;
    });
  }
  return redisClient;
}

export async function connectRedis(): Promise<void> {
  try {
    await getRedis().connect();
  } catch {
    console.warn('⚠️  Redis unavailable — running without cache (auth blacklisting disabled)');
  }
}

/** Cache helpers — all silently no-op when Redis is unavailable */
export async function setCache(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redisAvailable) return;
  try {
    await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
  } catch { /* silent */ }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redisAvailable) return null;
  try {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function deleteCache(pattern: string): Promise<void> {
  if (!redisAvailable) return;
  try {
    const keys = await getRedis().keys(pattern);
    if (keys.length) await getRedis().del(...keys);
  } catch { /* silent */ }
}

/** Token blacklist — skipped gracefully when Redis is down */
export async function blacklistToken(jti: string, ttlSeconds: number): Promise<void> {
  if (!redisAvailable) return;
  try {
    await getRedis().setex(`bl:${jti}`, ttlSeconds, '1');
  } catch { /* silent */ }
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  if (!redisAvailable) return false; // tokens not blacklisted without Redis — acceptable for dev
  try {
    const val = await getRedis().get(`bl:${jti}`);
    return val === '1';
  } catch {
    return false;
  }
}
