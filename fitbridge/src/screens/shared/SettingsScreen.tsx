import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { authService, type DeviceSession } from '../../services/api/authService';

export const SettingsScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const data = await authService.getDeviceSessions();
      setSessions(data);
    } catch (err) {
      console.warn('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = (sessionId: string) => {
    Alert.alert(
      'Sign out this device?',
      'This will immediately sign out the selected device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out Device',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.revokeDeviceSession(sessionId);
              setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
              // Note: A real app might use a global toast here
              Alert.alert('Success', 'Device signed out successfully.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to sign out device');
            }
          },
        },
      ]
    );
  };

  const getRelativeTime = (isoString: string) => {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diff = new Date().getTime() - new Date(isoString).getTime();
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return rtf.format(-minutes, 'minute');
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return rtf.format(-hours, 'hour');
    return rtf.format(-Math.floor(hours / 24), 'day');
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <Text style={s.sectionTitle}>Active Sessions</Text>
        <Text style={s.sectionDesc}>Manage the devices currently signed in to your account.</Text>
        
        {loading ? (
          <Text style={s.loadingText}>Loading sessions...</Text>
        ) : sessions.length === 0 ? (
          <Text style={s.loadingText}>No active sessions found.</Text>
        ) : (
          <View style={s.sessionList}>
            {sessions.map((session) => (
              <View key={session.sessionId} style={s.sessionCard}>
                <View style={s.sessionHeader}>
                  <Text style={s.deviceName}>{session.deviceName}</Text>
                  {session.isCurrent && (
                    <View style={s.currentBadge}>
                      <Text style={s.currentBadgeText}>Current</Text>
                    </View>
                  )}
                </View>
                
                <Text style={s.deviceOs}>{session.deviceOs || session.deviceType}</Text>
                <Text style={s.lastActive}>Active {getRelativeTime(session.lastActive)}</Text>

                <TouchableOpacity
                  style={[s.revokeBtn, session.isCurrent && s.revokeBtnDisabled]}
                  disabled={session.isCurrent}
                  onPress={() => handleRevoke(session.sessionId)}
                >
                  <Text style={[s.revokeText, session.isCurrent && s.revokeTextDisabled]}>
                    Revoke
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.LG },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 },
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' },
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: 40 },
  sectionTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', marginBottom: 4 },
  sectionDesc: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, marginBottom: SPACING.LG },
  loadingText: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontStyle: 'italic', marginTop: SPACING.SM },
  sessionList: { gap: SPACING.SM },
  sessionCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  deviceName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' },
  currentBadge: { backgroundColor: 'rgba(0, 229, 160, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  currentBadgeText: { color: COLORS.SUCCESS, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  deviceOs: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, marginBottom: 2 },
  lastActive: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, marginBottom: SPACING.MD },
  revokeBtn: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)' },
  revokeBtnDisabled: { backgroundColor: 'transparent', borderColor: 'transparent' },
  revokeText: { color: COLORS.ERROR, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' },
  revokeTextDisabled: { color: COLORS.TEXT_MUTED, opacity: 0.5 },
});

export default SettingsScreen;
