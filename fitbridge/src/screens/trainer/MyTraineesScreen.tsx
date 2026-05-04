import React from 'react';
import {
  View, Text, FlatList, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, Image, ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { useAuth } from '../../hooks/useAuth';
import { supabaseService, BookingRecord } from '../../services/api/supabaseService';

const MOCK_TRAINEES = [
  { id: 'tr1', name: 'Alex Johnson', goal: 'Lose Weight', progress: 72, lastSession: '2 days ago', avatar: 'https://picsum.photos/seed/t1/80/80', sessionsLeft: 8, streak: 5 },
  { id: 'tr2', name: 'Priya Nair', goal: 'Build Muscle', progress: 48, lastSession: 'Yesterday', avatar: 'https://picsum.photos/seed/t2/80/80', sessionsLeft: 4, streak: 12 },
  { id: 'tr3', name: 'Rohit Sharma', goal: 'Improve Endurance', progress: 85, lastSession: 'Today', avatar: 'https://picsum.photos/seed/t3/80/80', sessionsLeft: 2, streak: 21 },
  { id: 'tr4', name: 'Sanya Gupta', goal: 'Flexibility', progress: 60, lastSession: '4 days ago', avatar: 'https://picsum.photos/seed/t4/80/80', sessionsLeft: 6, streak: 3 },
  { id: 'tr5', name: 'Karan Mehta', goal: 'Marathon Prep', progress: 35, lastSession: '1 week ago', avatar: 'https://picsum.photos/seed/t5/80/80', sessionsLeft: 12, streak: 0 },
];

const TraineeCard: React.FC<{ trainee: any; onMessage: () => void }> = ({
  trainee, onMessage,
}) => (
  <View style={tc.card}>
    <View style={tc.top}>
      <Image source={{ uri: trainee.avatar }} style={tc.avatar as ImageStyle} />
      <View style={tc.info}>
        <View style={tc.nameRow}>
          <Text style={tc.name}>{trainee.name}</Text>
          <View style={tc.streakChip}>
             <Text style={tc.streakText}>Active</Text>
          </View>
        </View>
        <Text style={tc.goal}>🎯 Fitness Goal</Text>
        <Text style={tc.lastSess}>Last session: {new Date(trainee.lastSession).toLocaleDateString()}</Text>
      </View>
      <TouchableOpacity style={tc.msgBtn} onPress={onMessage}>
        <Text style={tc.msgIcon}>💬</Text>
      </TouchableOpacity>
    </View>

    {/* Progress bar */}
    <View style={tc.progressSection}>
      <View style={tc.progressLabelRow}>
        <Text style={tc.progressLabel}>Goal Progress</Text>
        <Text style={tc.progressPct}>75%</Text>
      </View>
      <View style={tc.progressBg}>
        <LinearGradient
          colors={COLORS.GRADIENT_PRIMARY}
          style={[tc.progressFill, { width: `75%` }]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </View>
    </View>

    <View style={tc.bottom}>
      <Text style={tc.sessLeft}>
        <Text style={tc.sessLeftNum}>{trainee.sessionsLeft}</Text>
        {' '}sessions remaining
      </Text>
      <TouchableOpacity style={tc.viewBtn}>
        <Text style={tc.viewBtnText}>View Plan →</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const tc = StyleSheet.create({
  card: { backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, marginBottom: SPACING.MD, gap: SPACING.MD } as ViewStyle,
  top: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  avatar: { width: 56, height: 56, borderRadius: 16 } as ImageStyle,
  info: { flex: 1, gap: 3 } as ViewStyle,
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  name: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800' } as TextStyle,
  streakChip: { backgroundColor: `${COLORS.SECONDARY}22`, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: `${COLORS.SECONDARY}44` } as ViewStyle,
  streakText: { color: COLORS.SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  goal: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  lastSess: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  msgBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.SURFACE_3, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  msgIcon: { fontSize: 18 } as TextStyle,
  progressSection: { gap: 6 } as ViewStyle,
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  progressLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '600' } as TextStyle,
  progressPct: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '900' } as TextStyle,
  progressBg: { height: 7, backgroundColor: COLORS.SURFACE_3, borderRadius: 4, overflow: 'hidden' } as ViewStyle,
  progressFill: { height: '100%', borderRadius: 4 } as ViewStyle,
  bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  sessLeft: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  sessLeftNum: { color: COLORS.PRIMARY, fontWeight: '900' } as TextStyle,
  viewBtn: {} as ViewStyle,
  viewBtnText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
});

export const MyTraineesScreen: React.FC<NativeStackScreenProps<any>> = () => {
  const { user } = useAuth();
  const [trainees, setTrainees] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadTrainees() {
      if (!user?.id) return;
      try {
        const bookings = await supabaseService.getMyBookings(user.id, 'trainer');
        // Group by unique trainee
        const clientMap = new Map<string, any>();
        bookings.forEach((b) => {
          if (!clientMap.has(b.traineeId)) {
            clientMap.set(b.traineeId, {
              id: b.traineeId,
              name: b.traineeName ?? 'Client',
              avatar: b.traineeAvatar ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(b.traineeName ?? 'Client')}`,
              lastSession: b.sessionDate,
              sessionsLeft: 1,
            });
          } else {
            const existing = clientMap.get(b.traineeId);
            existing.sessionsLeft += 1;
            if (new Date(b.sessionDate) > new Date(existing.lastSession)) {
              existing.lastSession = b.sessionDate;
            }
          }
        });
        setTrainees(Array.from(clientMap.values()));
      } catch (err) {
        console.warn('Failed to load trainees:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTrainees();
  }, [user?.id]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <View style={s.header}>
        <View>
          <Text style={s.title}>My Trainees</Text>
          <Text style={s.sub}>{trainees.length} active clients</Text>
        </View>
        <TouchableOpacity style={s.filterBtn}>
          <Text style={s.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={s.statsRow}>
        {[
          { icon: '👥', value: trainees.length.toString(), label: 'Total Clients' },
          { icon: '✅', value: '91%', label: 'Retention' },
          { icon: '⭐', value: '4.9', label: 'Avg Rating' },
        ].map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <Text style={s.statIcon}>{stat.icon}</Text>
            <Text style={s.statValue}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.TEXT_MUTED }}>Loading clients...</Text>
        </View>
      ) : trainees.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 16 }}>No active trainees yet.</Text>
        </View>
      ) : (
        <FlatList
          data={trainees.length > 0 ? trainees : MOCK_TRAINEES}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TraineeCard trainee={item} onMessage={() => {}} />
          )}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={<View style={{ height: SPACING.TAB_HEIGHT + 20 }} />}
        />
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, paddingBottom: SPACING.MD } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  sub: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, marginTop: 2 } as TextStyle,
  filterBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  filterIcon: { fontSize: 20 } as TextStyle,
  statsRow: { flexDirection: 'row', gap: SPACING.SM, paddingHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.LG } as ViewStyle,
  statCard: { flex: 1, backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, alignItems: 'center', gap: 3 } as ViewStyle,
  statIcon: { fontSize: 20 } as TextStyle,
  statValue: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '900' } as TextStyle,
  statLabel: { color: COLORS.TEXT_MUTED, fontSize: 9 } as TextStyle,
  listContent: { paddingHorizontal: SPACING.SCREEN_H_PAD } as ViewStyle,
});

export default MyTraineesScreen;
