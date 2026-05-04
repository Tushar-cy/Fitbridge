import 'react-native-url-polyfill/auto'; // must be first import
import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import * as Device from 'expo-device';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';

// Poppins — headings
import {
  Poppins_600SemiBold,
} from '@expo-google-fonts/poppins';

// Inter — body
import {
  Inter_400Regular,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';

// DM Sans — secondary UI
import {
  DMSans_400Regular,
  DMSans_500Medium,
} from '@expo-google-fonts/dm-sans';

// JetBrains Mono — stats / biometric data
import {
  JetBrainsMono_400Regular,
} from '@expo-google-fonts/jetbrains-mono';

import { RootNavigator } from './src/navigation/RootNavigator';
import COLORS from './src/theme/colors';
import { supabase } from './src/lib/supabase';
import { useAuthStore } from './src/store/authStore';
import { notificationService } from './src/services/api/notificationService';

// ── React Query client ────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ── Font loader splash ────────────────────────────────────────────────────────
function FontLoader({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Inter_400Regular,
    Inter_600SemiBold,
    DMSans_400Regular,
    DMSans_500Medium,
    JetBrainsMono_400Regular,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={splash.container}>
        <StatusBar style="light" />
        <Text style={splash.bolt}>⚡</Text>
        <Text style={splash.brand}>FitBridge</Text>
        <ActivityIndicator
          color={COLORS.PRIMARY}
          size="small"
          style={{ marginTop: 24 }}
        />
      </View>
    );
  }

  return <>{children}</>;
}

// ── Supabase auth bootstrap component ────────────────────────────────────────
/**
 * Mounts once at app root. Responsibilities:
 *  1. Calls initAuth() — restores persisted Supabase session from AsyncStorage.
 *  2. Sets up onAuthStateChange — keeps authStore in sync with every Supabase
 *     auth event for the lifetime of the app.
 *
 * Event handling:
 *   SIGNED_IN        → setAuth (covers OAuth callbacks, magic links, OTP verify)
 *   SIGNED_OUT       → logout()
 *   TOKEN_REFRESHED  → updateToken (silent refresh — no user interaction needed)
 *   USER_UPDATED     → refresh user metadata in store
 *   PASSWORD_RECOVERY → handled by deep link; onAuthStateChange fires SIGNED_IN
 */
function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const initAuth       = useAuthStore((s) => s.initAuth);
  const setAuth        = useAuthStore((s) => s.setAuth);
  const updateToken    = useAuthStore((s) => s.updateToken);
  const logout         = useAuthStore((s) => s.logout);

  useEffect(() => {
    // ── Step 1: restore persisted session ────────────────────────────────────
    initAuth();

    let unsubscribeNotifs: () => void = () => {};

    // ── Step 2: subscribe to auth state changes ───────────────────────────────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        switch (event) {
          case 'SIGNED_IN': {
            if (!session) break;
            
            // ✅ FIX: fetch profile from DB, not just metadata
            try {
              const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
              
              if (error) throw error;

              // Merge metadata with profile row — profile row is source of truth for role
              const meta = session.user.user_metadata ?? {};
              const user = {
                id:               session.user.id,
                email:            session.user.email ?? '',
                name:             profile.full_name ?? meta.full_name ?? meta.name ?? 'User',
                phone:            profile.phone ?? session.user.phone ?? meta.phone ?? '',
                role:             profile.role,                    // ← from profiles table, not metadata
                verified:         !!session.user.email_confirmed_at,
                isEmailVerified:  !!session.user.email_confirmed_at,
                subscriptionTier: profile.subscription_tier ?? meta.subscriptionTier ?? 'free',
                avatar:           profile.avatar_url ?? meta.avatar_url ?? '',
                createdAt:        profile.created_at,
              };
              setAuth(user as any, session.access_token, session);

              // Register the device session
              try {
                await supabase.from('user_sessions').upsert({
                  user_id: session.user.id,
                  device_name: Device.modelName || Device.deviceName || 'Unknown Device',
                  device_os: Platform.OS,
                  is_current: true,
                  last_active: new Date().toISOString(),
                });
              } catch (sessionErr) {
                console.warn('Failed to register device session:', sessionErr);
              }

              // Start real-time notifications
              unsubscribeNotifs(); // cleanup previous if any
              unsubscribeNotifs = notificationService.subscribeToNotifications(session.user.id);
            } catch (err) {
              console.warn('[FitBridge] profiles table not found — using auth metadata fallback:', err);
              // Fall back to metadata only if profile fetch fails
              const meta = session.user.user_metadata ?? {};
              const user = {
                id:               session.user.id,
                email:            session.user.email ?? '',
                name:             meta.full_name ?? meta.name ?? 'User',
                phone:            session.user.phone ?? meta.phone ?? '',
                role:             meta.role ?? 'trainee',
                verified:         !!session.user.email_confirmed_at,
                isEmailVerified:  !!session.user.email_confirmed_at,
                subscriptionTier: meta.subscriptionTier ?? 'free',
                avatar:           meta.avatar_url ?? '',
              };
              setAuth(user as any, session.access_token, session);
            }
            break;
          }

          case 'SIGNED_OUT': {
            // Call store logout without triggering supabase.auth.signOut() again
            // (already fired by Supabase) — just clear local state
            useAuthStore.setState({
              user: null, token: null, session: null,
              role: null, isAuthenticated: false,
              isEmailVerified: false, deviceSessions: [],
              subscriptionTier: 'free', isLoading: false,
            });
            unsubscribeNotifs();
            break;
          }

          case 'TOKEN_REFRESHED': {
            if (session) {
              updateToken(session.access_token, session);
            }
            break;
          }

          case 'USER_UPDATED': {
            if (session) {
              // Re-run initAuth to re-fetch profile with updated metadata
              await initAuth();
            }
            break;
          }

          default:
            break;
        }
      },
    );

    // Cleanup on unmount (never in practice for App root, but good hygiene)
    return () => {
      subscription.unsubscribe();
      unsubscribeNotifs();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

// ── Root app ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <SupabaseAuthProvider>
            <FontLoader>
              <RootNavigator />
            </FontLoader>
          </SupabaseAuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bolt: {
    fontSize: 56,
  },
  brand: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
