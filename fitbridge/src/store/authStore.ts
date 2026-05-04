/**
 * authStore.ts — Zustand auth store with Supabase session integration.
 *
 * Session lifecycle:
 *   1. App mounts → initAuth() is called once.
 *   2. initAuth() calls supabase.auth.getSession() to restore a persisted session.
 *   3. onAuthStateChange() (wired in App.tsx) keeps the store in sync with every
 *      Supabase auth event (sign-in, sign-out, token refresh, OAuth callback).
 *   4. `token` is kept in the store for backward compat with axiosInstance and
 *      paymentService — always populated from session.access_token.
 *
 * Role resolution order:
 *   user_metadata.role (set at signup) → 'trainee' (safe default)
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import type { User, UserRole } from '../types/user.types';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Lightweight device session entry stored in auth state */
export interface DeviceSessionEntry {
  id: string;
  deviceName: string; // e.g. "iPhone 14 Pro"
  lastActive: string; // ISO timestamp
  current: boolean;   // true = this device
}

interface AuthState {
  // ── Core auth state ───────────────────────────────────────────────────────
  user:            User | null;
  /** Supabase access_token — kept for axiosInstance backward compat */
  token:           string | null;
  /** Supabase Session object — full session including refresh_token */
  session:         Session | null;
  role:            UserRole | null;
  isAuthenticated: boolean;
  isLoading:       boolean;

  // ── Extended state ────────────────────────────────────────────────────────
  isEmailVerified:  boolean;
  deviceSessions:   DeviceSessionEntry[];
  subscriptionTier: 'free' | 'premium';

  // ── Actions ───────────────────────────────────────────────────────────────
  /**
   * Called once at app startup (App.tsx useEffect).
   * Restores session from AsyncStorage via Supabase, fetches profile,
   * and sets isLoading = false when done.
   */
  initAuth: () => Promise<void>;

  /** Set full auth state from a Supabase session + FitBridge User */
  setAuth: (user: User, token: string, session?: Session) => void;

  /** Update only the access token (called on TOKEN_REFRESHED event) */
  updateToken: (token: string, session: Session) => void;

  setRole:             (role: UserRole) => void;
  setLoading:          (loading: boolean) => void;
  setEmailVerified:    (verified: boolean) => void;
  setDeviceSessions:   (sessions: DeviceSessionEntry[]) => void;
  revokeSession:       (sessionId: string) => void;
  setSubscriptionTier: (tier: 'free' | 'premium') => void;

  /**
   * Signs out from Supabase AND clears local state.
   * Safe to call even if already signed out.
   */
  logout: () => Promise<void>;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Map a Supabase user + optional profile row → FitBridge User */
function buildUser(
  sbUser: Session['user'],
  profile?: Record<string, any> | null,
): User {
  const meta = sbUser.user_metadata ?? {};
  return {
    id:               sbUser.id,
    email:            sbUser.email ?? '',
    name:             profile?.full_name ?? meta.full_name ?? meta.name ?? 'User',
    phone:            sbUser.phone ?? meta.phone ?? profile?.phone ?? '',
    role:             (meta.role ?? profile?.role ?? 'trainee') as UserRole,
    verified:         !!sbUser.email_confirmed_at,
    isEmailVerified:  !!sbUser.email_confirmed_at,
    subscriptionTier: (profile?.subscription_tier ?? meta.subscriptionTier ?? 'free') as 'free' | 'premium',
    avatar:           profile?.avatar_url ?? meta.avatar_url ?? '',
  } as unknown as User;
}

/** Fetch the user's row from the `profiles` Supabase table (created in step 8.2) */
async function fetchProfile(userId: string): Promise<Record<string, any> | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // Table may not exist yet — degrade gracefully
      console.warn('[authStore.fetchProfile]', error.message);
      return null;
    }
    return data as Record<string, any>;
  } catch {
    return null;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

const LOGGED_OUT_STATE = {
  user:             null,
  token:            null,
  session:          null,
  role:             null,
  isAuthenticated:  false,
  isEmailVerified:  false,
  deviceSessions:   [] as DeviceSessionEntry[],
  subscriptionTier: 'free' as const,
};

export const useAuthStore = create<AuthState>((set, get) => ({
  // ── Defaults ──────────────────────────────────────────────────────────────
  ...LOGGED_OUT_STATE,
  isLoading: true, // true until initAuth() resolves

  // ── initAuth ──────────────────────────────────────────────────────────────
  initAuth: async () => {
    set({ isLoading: true });
    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.warn('[authStore.initAuth] getSession error:', error.message);
        set({ ...LOGGED_OUT_STATE });
        return;
      }

      if (!session) {
        // No persisted session → show auth screens
        set({ ...LOGGED_OUT_STATE });
        return;
      }

      // Session found — fetch full profile then hydrate store
      const profile = await fetchProfile(session.user.id);
      const user    = buildUser(session.user, profile);

      set({
        user,
        token:            session.access_token,
        session,
        role:             user.role,
        isAuthenticated:  true,
        isEmailVerified:  user.isEmailVerified ?? false,
        subscriptionTier: user.subscriptionTier ?? 'free',
      });
    } catch (err) {
      console.error('[authStore.initAuth] unexpected error:', err);
      set({ ...LOGGED_OUT_STATE });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── setAuth ───────────────────────────────────────────────────────────────
  setAuth: (user, token, session) =>
    set({
      user,
      token,
      session:          session ?? get().session,
      role:             user.role,
      isAuthenticated:  true,
      isEmailVerified:  user.isEmailVerified ?? false,
      subscriptionTier: user.subscriptionTier ?? 'free',
      isLoading:        false,
    }),

  // ── updateToken ───────────────────────────────────────────────────────────
  updateToken: (token, session) =>
    set({ token, session }),

  // ── logout ────────────────────────────────────────────────────────────────
  logout: async () => {
    try {
      // Sign out from Supabase (invalidates refresh token server-side)
      await supabase.auth.signOut();
    } catch (err) {
      // Always clear local state even if network call fails
      console.warn('[authStore.logout] signOut error (ignored):', err);
    } finally {
      set({ ...LOGGED_OUT_STATE, isLoading: false });
    }
  },

  // ── Utility setters ───────────────────────────────────────────────────────
  setRole:             (role) => set({ role }),
  setLoading:          (isLoading) => set({ isLoading }),
  setEmailVerified:    (verified) => set({ isEmailVerified: verified }),
  setDeviceSessions:   (sessions) => set({ deviceSessions: sessions }),
  setSubscriptionTier: (tier) => set({ subscriptionTier: tier }),

  revokeSession: (sessionId) =>
    set((state) => ({
      deviceSessions: state.deviceSessions.filter((s) => s.id !== sessionId),
    })),
}));
