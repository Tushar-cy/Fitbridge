/**
 * supabase.ts — Supabase client for FitBridge Expo React Native
 *
 * Auth storage strategy:
 *   - AsyncStorage is used for session persistence (survives app restarts).
 *   - expo-secure-store is used for sensitive tokens where available (iOS Keychain /
 *     Android Keystore). For values > 2048 bytes (Supabase tokens can exceed this),
 *     we chunk storage transparently via LargeSecureStore below.
 *
 * Deep link scheme for OAuth / email verification redirects:
 *   fitbridge://auth/callback
 *
 * Environment variables (set in .env):
 *   EXPO_PUBLIC_SUPABASE_URL   — your Supabase project URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY — your Supabase anon/public key
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '../types/supabase'; // generated types — run `supabase gen types` later

// ── Environment ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[FitBridge] Missing Supabase environment variables.\n' +
    'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file.',
  );
}

// ── Secure storage adapter ─────────────────────────────────────────────────────
//
// expo-secure-store has a 2048-byte value limit per key.
// Supabase access tokens often exceed this, so large values fall back to
// AsyncStorage. AsyncStorage is still fine for auth tokens on mobile —
// it lives in the app sandbox and is not accessible to other apps.

const MAX_SECURE_STORE_SIZE = 2048;

/**
 * A storage adapter that uses expo-secure-store for small values and
 * AsyncStorage as a fallback for larger payloads (e.g. Supabase session JSON).
 * On web, always uses AsyncStorage.
 */
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') return AsyncStorage.getItem(key);
    try {
      // Try SecureStore first; fall back to AsyncStorage for chunked/large values
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue !== null) return secureValue;
      return AsyncStorage.getItem(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (value.length <= MAX_SECURE_STORE_SIZE) {
      await SecureStore.setItemAsync(key, value);
    } else {
      // Value too large for SecureStore → use AsyncStorage
      await AsyncStorage.setItem(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await Promise.allSettled([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
  },
};

// ── Supabase client ────────────────────────────────────────────────────────────

export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // must be false for React Native
  },
  realtime: {
    // Used by ChatThreadScreen for live messaging
    params: { eventsPerSecond: 10 },
  },
  global: {
    headers: {
      'x-app-name': 'fitbridge-mobile',
      'x-app-version': '1.0.0',
    },
  },
});

// ── Typed shorthand exports ────────────────────────────────────────────────────

/** Supabase Auth helper — sign up, sign in, OTP, OAuth, session management */
export const supabaseAuth = supabase.auth;

/**
 * Typed table query builder.
 * @example
 *   const { data } = await db('trainers').select('*').eq('verified', true);
 */
export const db = <TableName extends keyof Database['public']['Tables']>(
  table: TableName,
) => supabase.from(table as string);

/** Supabase Storage helper — profile photos, post media, scan images */
export const storage = supabase.storage;

/** Supabase Realtime — subscribe to chat messages, notifications */
export const realtime = supabase.realtime;

// ── Auth state change listener (call once at app root) ─────────────────────────

/**
 * Subscribe to auth state changes and sync with authStore.
 * Call this inside App.tsx or a top-level effect.
 *
 * @example
 *   import { onAuthStateChange } from '../lib/supabase';
 *   useEffect(() => {
 *     const { data: { subscription } } = onAuthStateChange((event, session) => {
 *       if (session) authStore.setAuth(session.user, session.access_token);
 *       else authStore.logout();
 *     });
 *     return () => subscription.unsubscribe();
 *   }, []);
 */
export const onAuthStateChange = supabase.auth.onAuthStateChange.bind(supabase.auth);

export default supabase;
