import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, TouchableOpacity,
  Image, ImageStyle, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import { PulseDot } from '../../components/ui/Badge';
import { supabaseService, BookingRecord } from '../../services/api/supabaseService';

const { width: W } = Dimensions.get('window');

export const SessionScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation, route }) => {
  const sessionId = route.params?.sessionId;
  const [session, setSession] = useState<BookingRecord | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadSession() {
      if (!sessionId) {
        setLoading(false);
        return;
      }
      const data = await supabaseService.getBookingById(sessionId);
      setSession(data);
      setLoading(false);
    }
    loadSession();
  }, [sessionId]);

  const isLive = session?.status === 'live';
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="light" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.TEXT_MUTED }}>Loading session details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar style="light" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.TEXT_MUTED }}>Session not found.</Text>
          <Button title="Go Back" variant="outline" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLive && inCall) {
    // Full-screen call view
    return (
      <View style={callS.container}>
        <StatusBar style="light" hidden />

        {/* "Camera feeds" */}
        <View style={callS.mainFeed}>
          <LinearGradient colors={['#1A0A35', '#0A0A20']} style={callS.mainFeedBg} />
          <Image source={{ uri: (session as any).trainerAvatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent((session as any).trainerName ?? 'Trainer')}` }} style={callS.trainerFeed as ImageStyle} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={callS.feedGrad} />
          <View style={callS.trainerOverlay}>
            <Text style={callS.trainerName}>{(session as any).trainerName ?? 'Trainer'}</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <PulseDot color={COLORS.SUCCESS} />
              <Text style={callS.liveLabel}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Self preview */}
        <View style={callS.selfView}>
          <LinearGradient colors={['#0A0A20', '#13131A']} style={callS.selfViewBg} />
          <Text style={callS.selfIcon}>👤</Text>
        </View>

        {/* Timer */}
        <View style={callS.timerWrap}>
          <PulseDot color={COLORS.SUCCESS} />
          <Text style={callS.timerText}>12:34</Text>
        </View>

        {/* Controls */}
        <View style={callS.controls}>
          <TouchableOpacity style={[callS.controlBtn, muted && callS.activeControlBtn]} onPress={() => setMuted(!muted)}>
            <Text style={callS.controlIcon}>{muted ? '🔇' : '🎤'}</Text>
            <Text style={callS.controlLabel}>{muted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[callS.controlBtn, cameraOff && callS.activeControlBtn]} onPress={() => setCameraOff(!cameraOff)}>
            <Text style={callS.controlIcon}>{cameraOff ? '📵' : '📹'}</Text>
            <Text style={callS.controlLabel}>{cameraOff ? 'Show Cam' : 'Camera'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={callS.controlBtn}>
            <Text style={callS.controlIcon}>💬</Text>
            <Text style={callS.controlLabel}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={callS.controlBtn}>
            <Text style={callS.controlIcon}>🔊</Text>
            <Text style={callS.controlLabel}>Speaker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={callS.endBtn} onPress={() => setInCall(false)}>
            <Text style={callS.endIcon}>📵</Text>
            <Text style={callS.controlLabel}>End</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Session detail view
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Back */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Session Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Trainer card header */}
        <LinearGradient
          colors={isLive ? [COLORS.SUCCESS + '22', COLORS.ACCENT_GREEN + '11'] : [COLORS.SURFACE_3, COLORS.SURFACE_2]}
          style={s.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {isLive && (
            <View style={s.liveRow}>
              <PulseDot color={COLORS.SUCCESS} />
              <Text style={s.liveText}>LIVE SESSION IN PROGRESS</Text>
            </View>
          )}
          <View style={s.trainerRow}>
            <Image source={{ uri: (session as any).trainerAvatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent((session as any).trainerName ?? 'Trainer')}` }} style={s.photo as ImageStyle} />
            <View style={s.trainerInfo}>
              <Text style={s.trainerName}>{(session as any).trainerName ?? 'Trainer'}</Text>
              <Text style={s.trainerSpec}>{(session as any).sessionType ?? 'Personal Training'}</Text>
              <View style={[s.statusChip, { backgroundColor: isLive ? `${COLORS.SUCCESS}22` : `${COLORS.PRIMARY}22`, borderColor: isLive ? `${COLORS.SUCCESS}44` : `${COLORS.PRIMARY}44` }]}>
                <Text style={[s.statusText, { color: isLive ? COLORS.SUCCESS : COLORS.PRIMARY }]}>
                  {session.status === 'live' ? '🔴 Live' : session.status === 'upcoming' || session.status === 'confirmed' ? '⏰ Upcoming' : session.status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Details grid */}
        <View style={s.detailsGrid}>
          {[
            { icon: '📅', label: 'Date', value: new Date(session.sessionDate).toLocaleDateString() },
            { icon: '⏰', label: 'Time', value: new Date(session.sessionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
            { icon: '⏱️', label: 'Duration', value: `${session.durationMinutes} mins` },
            { icon: session.sessionType === 'virtual' ? '📹' : '🏋️', label: 'Mode', value: session.sessionType === 'virtual' ? 'Online' : 'In-Person' },
            { icon: '💰', label: 'Price', value: `₹${session.amount.toLocaleString()}` },
          ].map((d) => (
            <View key={d.label} style={s.detailItem}>
              <Text style={s.detailIcon}>{d.icon}</Text>
              <Text style={s.detailLabel}>{d.label}</Text>
              <Text style={s.detailValue}>{d.value}</Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {session.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesLabel}>Session Notes</Text>
            <Text style={s.notesText}>{session.notes}</Text>
          </View>
        )}

        {/* Meet link for upcoming/live */}
        {session.meetLink && (
          <View style={s.meetCard}>
            <Text style={s.meetLabel}>Meeting Link</Text>
            <Text style={s.meetUrl}>{session.meetLink}</Text>
          </View>
        )}

        {/* CTA */}
        <View style={s.ctaArea}>
          {isLive ? (
            <Button
              title="Join Live Session 🔴"
              onPress={() => setInCall(true)}
              fullWidth
              size="lg"
            />
          ) : session.status === 'upcoming' || session.status === 'confirmed' ? (
            <>
              <Button
                title="Join when Live"
                disabled
                fullWidth
                size="lg"
                variant="outline"
              />
              <TouchableOpacity style={s.cancelLink}>
                <Text style={s.cancelText}>Cancel Booking</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Button
              title="Book Again"
              onPress={() => navigation.navigate('Booking', { trainerId: session.trainerId })}
              fullWidth
              size="lg"
            />
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const callS = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050515' } as ViewStyle,
  mainFeed: { flex: 1, position: 'relative' } as ViewStyle,
  mainFeedBg: { ...StyleSheet.absoluteFillObject } as ViewStyle,
  trainerFeed: { width: '100%', height: '100%', opacity: 0.85 } as ImageStyle,
  feedGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 } as ViewStyle,
  trainerOverlay: { position: 'absolute', bottom: 120, left: 20, gap: 6 } as ViewStyle,
  trainerName: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontWeight: '800' } as TextStyle,
  liveLabel: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800', letterSpacing: 1 } as TextStyle,
  selfView: { position: 'absolute', top: 50, right: 16, width: 90, height: 130, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: COLORS.PRIMARY } as ViewStyle,
  selfViewBg: { ...StyleSheet.absoluteFillObject } as ViewStyle,
  selfIcon: { margin: 'auto' as any, fontSize: 40, paddingTop: 30, textAlign: 'center' } as TextStyle,
  timerWrap: { position: 'absolute', top: 50, left: 20, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 } as ViewStyle,
  timerText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', fontVariant: ['tabular-nums'] } as TextStyle,
  controls: { flexDirection: 'row', gap: 0, justifyContent: 'space-around', paddingHorizontal: SPACING.LG, paddingVertical: SPACING.XL, backgroundColor: 'rgba(10,10,20,0.95)', borderTopWidth: 1, borderTopColor: COLORS.CARD_BORDER } as ViewStyle,
  controlBtn: { alignItems: 'center', gap: 6, flex: 1, paddingVertical: SPACING.SM, borderRadius: 14 } as ViewStyle,
  activeControlBtn: { backgroundColor: `${COLORS.PRIMARY}22` } as ViewStyle,
  controlIcon: { fontSize: 24 } as TextStyle,
  controlLabel: { color: COLORS.TEXT_SECONDARY, fontSize: 10, fontWeight: '600' } as TextStyle,
  endBtn: { alignItems: 'center', gap: 6, flex: 1, paddingVertical: SPACING.SM, borderRadius: 14, backgroundColor: `${COLORS.ERROR}22` } as ViewStyle,
  endIcon: { fontSize: 24 } as TextStyle,
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD } as ViewStyle,
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  pageTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800' } as TextStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: 40, gap: SPACING.LG } as ViewStyle,
  heroCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.LG, gap: SPACING.MD } as ViewStyle,
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  liveText: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', letterSpacing: 1 } as TextStyle,
  trainerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  photo: { width: 64, height: 64, borderRadius: 18 } as ImageStyle,
  trainerInfo: { flex: 1, gap: 4 } as ViewStyle,
  trainerName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  trainerSpec: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  statusChip: { alignSelf: 'flex-start', borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 3 } as ViewStyle,
  statusText: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  detailItem: { width: '47%', backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: 4 } as ViewStyle,
  detailIcon: { fontSize: 24 } as TextStyle,
  detailLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  detailValue: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  notesCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: 8 } as ViewStyle,
  notesLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  notesText: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, lineHeight: 22 } as TextStyle,
  meetCard: { backgroundColor: `${COLORS.PRIMARY}15`, borderRadius: 14, borderWidth: 1, borderColor: `${COLORS.PRIMARY}30`, padding: SPACING.MD, gap: 6 } as ViewStyle,
  meetLabel: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  meetUrl: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  ctaArea: { gap: SPACING.SM } as ViewStyle,
  cancelLink: { alignItems: 'center', padding: SPACING.SM } as ViewStyle,
  cancelText: { color: COLORS.ERROR, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
});

export default SessionScreen;
