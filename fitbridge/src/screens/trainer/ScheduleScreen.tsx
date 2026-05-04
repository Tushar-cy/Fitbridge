import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, Image, ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { SectionHeader, Badge, PulseDot } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { supabaseService, BookingRecord } from '../../services/api/supabaseService';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const statusConfig = {
  upcoming: { label: 'Upcoming', color: COLORS.PRIMARY, bg: `${COLORS.PRIMARY}22` },
  live: { label: 'Live Now', color: COLORS.SUCCESS, bg: `${COLORS.SUCCESS}22` },
  completed: { label: 'Done', color: COLORS.TEXT_MUTED, bg: COLORS.SURFACE_3 },
  open: { label: 'Open Slot', color: COLORS.WARNING, bg: `${COLORS.WARNING}22` },
};

export const ScheduleScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]);
  const [slotData, setSlotData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function loadSchedule() {
      if (!user?.id) return;
      try {
        const bookings = await supabaseService.getMyBookings(user.id, 'trainer');
        const grouped: Record<string, any[]> = { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [] };
        
        bookings.forEach((b) => {
          const d = new Date(b.sessionDate);
          const dayName = DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]; // 0 is Sunday, map to index 6
          const time = d.toTimeString().slice(0, 5); // HH:MM
          
          let status: 'completed' | 'live' | 'upcoming' = 'upcoming';
          if (b.status === 'completed') status = 'completed';
          if (b.status === 'live') status = 'live';

          grouped[dayName].push({
            id: b.id,
            time,
            status,
            traineeName: b.traineeName ?? 'Client',
            sessionType: b.sessionType ?? 'Personal Training',
            duration: b.durationMinutes ?? 60,
          });
        });
        
        // Sort slots by time
        Object.keys(grouped).forEach(k => {
          grouped[k].sort((a, b) => a.time.localeCompare(b.time));
        });

        setSlotData(grouped);
      } catch (err) {
        console.warn('Failed to load schedule:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSchedule();
  }, [user?.id]);

  const slots = slotData[activeDay] ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      <View style={s.header}>
        <Text style={s.title}>Schedule</Text>
        <TouchableOpacity style={s.addSlotBtn}>
          <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.addSlotGrad}>
            <Text style={s.addSlotText}>+ Add Slot</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dayScroll} contentContainerStyle={s.dayContent}>
        {DAYS.map((day) => {
          const daySlots = slotData[day] ?? [];
          const hasSlots = daySlots.length > 0;
          const hasLive = daySlots.some((sl) => sl.status === 'live');
          return (
            <TouchableOpacity
              key={day}
              onPress={() => setActiveDay(day)}
              style={[s.dayCard, activeDay === day && s.activeDayCard]}
            >
              {hasLive && <PulseDot color={COLORS.SUCCESS} size={5} />}
              <Text style={[s.dayLabel, activeDay === day && s.activeDayLabel]}>{day}</Text>
              {hasSlots && <View style={[s.slotDot, { backgroundColor: activeDay === day ? COLORS.WHITE : COLORS.PRIMARY }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Slot list */}
      <ScrollView contentContainerStyle={s.slotsList} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 }}>
            <Text style={{ color: COLORS.TEXT_MUTED }}>Loading schedule...</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📅</Text>
            <Text style={s.emptyTitle}>No sessions on {activeDay}</Text>
            <Text style={s.emptySub}>Add a new slot to let trainees book you.</Text>
            <Button title="+ Add Slot" variant="outline" size="md" onPress={() => {}} style={{ marginTop: 8 }} />
          </View>
        ) : (
          slots.map((slot, i) => {
            const conf = statusConfig[slot.status as keyof typeof statusConfig] ?? statusConfig.upcoming;
            return (
              <View key={i} style={s.slotCard}>
                {slot.status === 'live' && (
                  <View style={s.liveRow}>
                    <PulseDot color={COLORS.SUCCESS} />
                    <Text style={s.liveText}>LIVE NOW</Text>
                  </View>
                )}
                <View style={s.slotRow}>
                  <View style={[s.timeBlock, { backgroundColor: conf.bg }]}>
                    <Text style={[s.timeText, { color: conf.color }]}>{slot.time}</Text>
                  </View>
                  <View style={s.slotInfo}>
                    {slot.status !== 'open' ? (
                      <>
                        <Text style={s.traineeName}>{slot.traineeName}</Text>
                        <Text style={s.sessionMeta}>{slot.duration} mins · {slot.sessionType}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={s.openLabel}>Open Slot</Text>
                        <Text style={s.sessionMeta}>Available for booking</Text>
                      </>
                    )}
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: conf.bg }]}>
                    <Text style={[s.statusBadgeText, { color: conf.color }]}>{conf.label}</Text>
                  </View>
                </View>
                <View style={s.slotActions}>
                  {slot.status === 'live' && (
                    <Button title="Join Session" size="sm" onPress={() => navigation.navigate('Session', { sessionId: slot.id })} style={{ flex: 1 }} />
                  )}
                  {slot.status === 'open' && (
                    <Button title="Remove Slot" size="sm" variant="ghost" onPress={() => {}} style={{ flex: 1 }} />
                  )}
                  {(slot.status === 'upcoming' || slot.status === 'completed') && (
                    <Button title="View Details" size="sm" variant="ghost" onPress={() => navigation.navigate('Session', { sessionId: slot.id })} style={{ flex: 1 }} />
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: SPACING.TAB_HEIGHT + 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, paddingBottom: SPACING.MD } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  addSlotBtn: { borderRadius: 12, overflow: 'hidden' } as ViewStyle,
  addSlotGrad: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 } as ViewStyle,
  addSlotText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  dayScroll: { maxHeight: 68, marginBottom: SPACING.MD } as ViewStyle,
  dayContent: { paddingHorizontal: SPACING.SCREEN_H_PAD, gap: SPACING.SM, alignItems: 'center' } as ViewStyle,
  dayCard: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2, alignItems: 'center', minWidth: 56, gap: 4 } as ViewStyle,
  activeDayCard: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY } as ViewStyle,
  dayLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  activeDayLabel: { color: COLORS.WHITE } as TextStyle,
  slotDot: { width: 5, height: 5, borderRadius: 3 } as ViewStyle,
  slotsList: { paddingHorizontal: SPACING.SCREEN_H_PAD, gap: SPACING.MD } as ViewStyle,
  slotCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  liveText: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', letterSpacing: 0.5 } as TextStyle,
  slotRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  timeBlock: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, minWidth: 70, alignItems: 'center' } as ViewStyle,
  timeText: { fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '900' } as TextStyle,
  slotInfo: { flex: 1, gap: 3 } as ViewStyle,
  traineeName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  openLabel: { color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  sessionMeta: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 } as ViewStyle,
  statusBadgeText: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  slotActions: {} as ViewStyle,
  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.SM } as ViewStyle,
  emptyIcon: { fontSize: 52 } as TextStyle,
  emptyTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  emptySub: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, textAlign: 'center' } as TextStyle,
});

export default ScheduleScreen;
