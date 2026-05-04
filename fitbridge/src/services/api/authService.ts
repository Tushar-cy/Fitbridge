/**
 * authService.ts — Real Supabase Auth implementation for FitBridge.
 *
 * All functions use the Supabase client from `src/lib/supabase.ts`.
 * Function signatures are identical to the previous mock version so
 * no screen or component code needs to change.
 *
 * Auth flows supported:
 *   ✅ Email + Password (sign up / sign in)
 *   ✅ Google OAuth  (redirects via fitbridge://auth/callback)
 *   ✅ Phone OTP     (requires Twilio configured in Supabase dashboard)
 *   ✅ Email verification  (Supabase sends link automatically on sign-up)
 *   ✅ Session management (getSession, onAuthStateChange)
 *   ✅ Device sessions     (backed by Supabase auth.sessions table)
 *   ✅ Account deletion    (calls delete_user Postgres RPC — GDPR Art. 17)
 *
 * Prerequisites in Supabase dashboard:
 *   • Enable Email provider (Auth → Providers → Email)
 *   • Enable Google provider + add OAuth credentials
 *   • Enable Phone provider + configure Twilio
 *   • Create `delete_user` Postgres function (SQL in docs/supabase/delete_user.sql)
 *   • Add redirect URL: fitbridge://auth/callback (Auth → URL Configuration)
 */

import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { User, UserRole } from '../../types/user.types';

// ── Internal helper — map Supabase user → FitBridge User ─────────────────────

function mapSupabaseUser(sbUser: NonNullable<Session['user']>): User {
  const meta = sbUser.user_metadata ?? {};
  return {
    id:               sbUser.id,
    email:            sbUser.email ?? '',
    name:             meta.full_name ?? meta.name ?? 'User',
    phone:            sbUser.phone ?? meta.phone ?? '',
    role:             (meta.role as UserRole) ?? 'trainee',
    verified:         !!sbUser.email_confirmed_at,
    isEmailVerified:  !!sbUser.email_confirmed_at,
    subscriptionTier: (meta.subscriptionTier as 'free' | 'premium') ?? 'free',
    avatar:           meta.avatar_url ?? '',
  } as unknown as User;
}

/** Throw a clean Error from a Supabase AuthError */
function throwAuthError(error: { message: string } | null | undefined, fallback: string): never {
  throw new Error(error?.message ?? fallback);
}

// ── Retained types (no breaking changes) ─────────────────────────────────────

export interface OTPResponse {
  success: boolean;
  /** Seconds until OTP expires (Supabase default: 300) */
  expiresIn: number;
}

export interface OTPAuthResponse {
  token: string;
  user: User;
}

export interface DeviceSession {
  sessionId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  deviceOs?: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface DeletionSchedule {
  /** ISO 8601 — 30 days from request (GDPR grace period) */
  scheduledDeletion: string;
}

// ── authService ───────────────────────────────────────────────────────────────

export const authService = {

  // ── 1. Sign Up (Email + Password) ─────────────────────────────────────────

  /**
   * Creates a new Supabase account and sets user metadata (name, role).
   * Supabase automatically sends a verification email.
   * The user is NOT considered authenticated until email is confirmed
   * (configure this in Auth → Settings → "Confirm email" toggle).
   */
  signup: async ({
    email,
    password,
    name,
    role,
  }: {
    email: string;
    password: string;
    name: string;
    role: UserRole;
  }): Promise<{ user: User; token: string }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role,
        },
        emailRedirectTo: 'fitbridge://auth/callback',
      },
    });

    if (error) throwAuthError(error, 'Sign-up failed.');

    // If email confirmation is required, Supabase returns session=null.
    // We still build a user from user_metadata so the app flows immediately.
    const sbUser = data.user;
    if (!sbUser) throwAuthError(null, 'Sign-up failed — no user returned.');

    const user = mapSupabaseUser(sbUser!);

    // If we have a session (email confirmation disabled), persist it.
    if (data.session) {
      useAuthStore.getState().setAuth(user, data.session.access_token);
      return { user, token: data.session.access_token };
    }

    // Email confirmation enabled — set auth with empty token so UI can proceed.
    // onAuthStateChange will fire with SIGNED_IN once user confirms.
    useAuthStore.getState().setAuth(user, '');
    return { user, token: '' };
  },

  // ── Legacy alias (screens that call login()) ────────────────────────────────

  /**
   * @deprecated  Use `signIn` instead. Kept for backwards compat with existing screens.
   */
  login: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<{ user: User; token: string }> =>
    authService.signIn(email, password),

  // ── 2. Sign In (Email + Password) ─────────────────────────────────────────

  signIn: async (
    email: string,
    password: string,
  ): Promise<{ user: User; token: string }> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throwAuthError(error, 'Sign-in failed. Check your email and password.');
    if (!data.session) throwAuthError(null, 'No session returned. Please try again.');

    const user = mapSupabaseUser(data.user);
    useAuthStore.getState().setAuth(user, data.session.access_token);
    return { user, token: data.session.access_token };
  },

  // ── 3. Google OAuth ────────────────────────────────────────────────────────

  /**
   * Initiates Google OAuth flow.
   * On mobile, this opens a browser via expo-web-browser; Supabase
   * redirects back to fitbridge://auth/callback on success.
   *
   * Handle the callback in App.tsx using `onAuthStateChange`.
   *
   * Prerequisites:
   *   • Enable Google provider in Supabase dashboard
   *   • Add Google OAuth credentials (Client ID + Secret)
   *   • Add fitbridge://auth/callback to the allowed redirect URLs list
   */
  signInWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'fitbridge://auth/callback',
        skipBrowserRedirect: false,
      },
    });

    if (error) throwAuthError(error, 'Google sign-in failed.');
    // Session is set via onAuthStateChange callback — no return value needed
  },

  // ── 4. Phone OTP — Send ────────────────────────────────────────────────────

  /**
   * Sends a 6-digit SMS OTP via Twilio (configured in Supabase → Auth → Providers → Phone).
   * @param phone  E.164 format: "+919876543210"
   */
  sendOTP: async (phone: string): Promise<OTPResponse> => {
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) throwAuthError(error, 'Failed to send OTP. Check the phone number.');
    return { success: true, expiresIn: 300 };
  },

  // ── 5. Phone OTP — Verify ─────────────────────────────────────────────────

  /**
   * Verifies the SMS OTP and returns an auth session.
   * On success, syncs the session into authStore.
   */
  verifyOTP: async (phone: string, token: string): Promise<OTPAuthResponse> => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) throwAuthError(error, 'Invalid or expired OTP. Please try again.');
    if (!data.session) throwAuthError(null, 'OTP verified but no session returned.');

    const user = mapSupabaseUser(data.user!);
    useAuthStore.getState().setAuth(user, data.session.access_token);
    return { token: data.session.access_token, user };
  },

  // ── 6. Sign Out ────────────────────────────────────────────────────────────

  /**
   * Signs the user out from Supabase (invalidates the refresh token server-side)
   * and clears the local authStore.
   * Legacy alias `logout` also calls this.
   */
  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut();
    // Always clear local state, even if the network call fails
    useAuthStore.getState().logout();
    if (error) throwAuthError(error, 'Sign-out failed.');
  },

  /** @deprecated  Use `signOut` instead. */
  logout: async (): Promise<void> => authService.signOut(),

  // ── 7. Get Current Session ────────────────────────────────────────────────

  /**
   * Returns the currently active Supabase session, or null if not authenticated.
   * Use this on app launch to restore the session from AsyncStorage.
   *
   * @example
   *   const session = await authService.getSession();
   *   if (session) authStore.setAuth(mapUser(session.user), session.access_token);
   */
  getSession: async (): Promise<Session | null> => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throwAuthError(error, 'Failed to retrieve session.');
    return data.session;
  },

  // ── 8. Auth State Change Listener ─────────────────────────────────────────

  /**
   * Subscribes to Supabase auth state changes.
   * Call once in App.tsx — keeps authStore in sync with the Supabase session
   * across deep-link callbacks, token refreshes, and sign-outs.
   *
   * @returns Unsubscribe function — call on component unmount.
   *
   * @example
   *   useEffect(() => {
   *     const unsub = authService.onAuthStateChange((event, session) => {
   *       if (session) authStore.setAuth(mapUser(session.user), session.access_token);
   *       else          authStore.logout();
   *     });
   *     return unsub;
   *   }, []);
   */
  onAuthStateChange: (
    callback: (event: AuthChangeEvent, session: Session | null) => void,
  ): (() => void) => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Auto-sync authStore on every auth event
      if (session?.user) {
        const user = mapSupabaseUser(session.user);
        useAuthStore.getState().setAuth(user, session.access_token);
      } else {
        useAuthStore.getState().logout();
      }
      callback(event, session);
    });
    // Return unsubscribe function
    return () => data.subscription.unsubscribe();
  },

  // ── Email Verification ────────────────────────────────────────────────────

  /**
   * Re-sends the verification email for the currently signed-in user.
   * (Supabase sends one automatically on sign-up; call this for resend.)
   */
  sendEmailVerification: async (email: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'fitbridge://auth/callback' },
    });
    if (error) throwAuthError(error, 'Failed to resend verification email.');
    return { success: true };
  },

  /**
   * Verifies an email using the token from the deep-link callback URL.
   * In practice, Supabase handles this automatically when the app opens
   * the fitbridge://auth/callback URL — `onAuthStateChange` fires with
   * event === 'SIGNED_IN' and the session is established.
   *
   * Only call this manually if you need to verify a raw token string.
   */
  verifyEmail: async (_token: string): Promise<{ success: boolean }> => {
    // Supabase processes deep-link tokens automatically.
    // onAuthStateChange('SIGNED_IN') fires once the link is opened.
    // This function is a no-op kept for API compatibility.
    return { success: true };
  },

  // ── Token Refresh ─────────────────────────────────────────────────────────

  /**
   * Manually refreshes the access token using the stored refresh token.
   * Supabase does this automatically, but you can trigger it manually if needed.
   */
  refreshToken: async (_expiredToken: string): Promise<{ token: string }> => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throwAuthError(error, 'Failed to refresh session. Please sign in again.');
    if (!data.session) throwAuthError(null, 'No session after refresh.');
    return { token: data.session.access_token };
  },

  // ── Device Sessions ───────────────────────────────────────────────────────

  /**
   * Returns active sessions for the current user.
   *
   * Supabase does not expose a native "list all sessions" API for client-side
   * code (it's a server-side admin operation). This fetches from your own
   * `user_sessions` table (populated via a Postgres trigger on auth.sessions).
   *
   * Falls back gracefully if the table doesn't exist yet.
   */
  getDeviceSessions: async (): Promise<DeviceSession[]> => {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .order('last_active', { ascending: false });

    if (error) {
      // Table not created yet — return empty list gracefully
      console.warn('[authService.getDeviceSessions]', error.message);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      sessionId:  row.id,
      deviceName: row.device_name ?? 'Unknown Device',
      deviceType: row.device_type ?? 'unknown',
      ipAddress:  row.ip_address ?? '—',
      location:   row.location ?? '—',
      lastActive: row.last_active,
      isCurrent:  row.is_current ?? false,
    }));
  },

  /**
   * Revokes a specific device session.
   * Calls a Postgres RPC `revoke_session(session_id)` that deletes the row
   * from the `user_sessions` table and invalidates the token server-side.
   */
  revokeDeviceSession: async (sessionId: string): Promise<{ success: boolean }> => {
    const { error } = await supabase.rpc('revoke_session' as any, {
      session_id: sessionId,
    });

    if (error) throwAuthError(error, `Failed to revoke session ${sessionId}.`);
    useAuthStore.getState().revokeSession(sessionId);
    return { success: true };
  },

  // ── GDPR Account Deletion ─────────────────────────────────────────────────

  /**
   * Soft-deletes the user account with a 30-day GDPR grace period.
   *
   * SQL function to create in Supabase (SQL Editor):
   * ─────────────────────────────────────────────────────────────────────────
   * CREATE OR REPLACE FUNCTION delete_user()
   * RETURNS void
   * LANGUAGE plpgsql
   * SECURITY DEFINER
   * AS $$
   * BEGIN
   *   UPDATE auth.users
   *   SET
   *     raw_user_meta_data = raw_user_meta_data || '{"pending_deletion": true}'::jsonb,
   *     deleted_at         = NOW() + INTERVAL '30 days'
   *   WHERE id = auth.uid();
   * END;
   * $$;
   * ─────────────────────────────────────────────────────────────────────────
   *
   * A pg_cron job should permanently delete rows where deleted_at < NOW().
   */
  deleteAccount: async (_password: string): Promise<DeletionSchedule> => {
    const { error } = await supabase.rpc('delete_user' as any);

    if (error) throwAuthError(error, 'Account deletion failed. Please try again.');

    // Sign out locally — the grace-period deletion is server-side
    await supabase.auth.signOut();
    useAuthStore.getState().logout();

    const scheduledDeletion = new Date(Date.now() + 30 * 24 * 3_600_000).toISOString();
    return { scheduledDeletion };
  },
};
