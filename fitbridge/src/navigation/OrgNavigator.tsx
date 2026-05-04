import React from 'react';
import {
  View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity, ScrollView,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../theme/colors';
import SPACING from '../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../theme/typography';
import { TabBar } from '../components/layout/TabBar';

// ── Existing org screens ──────────────────────────────────────────────────────
import { OrgDashboardScreen } from '../screens/org/OrgDashboardScreen';
import { GroupBookingScreen } from '../screens/org/GroupBookingScreen';

// ── Shared stack screens ──────────────────────────────────────────────────────
import { TrainerProfileScreen } from '../screens/trainee/TrainerProfileScreen';
import { SessionScreen }        from '../screens/shared/SessionScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder helper (matches BrandNavigator pattern)
// Phase 4 will replace each usage with the real screen import.
// ─────────────────────────────────────────────────────────────────────────────

const Placeholder: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  navigation?: any;
}> = ({ icon, title, subtitle }) => (
  <SafeAreaView style={ph.safe}>
    <LinearGradient
      colors={[`${COLORS.SECONDARY}18`, 'transparent']}
      style={ph.gradient}
    />
    <View style={ph.center}>
      <Text style={ph.icon}>{icon}</Text>
      <Text style={ph.title}>{title}</Text>
      {subtitle && <Text style={ph.subtitle}>{subtitle}</Text>}
    </View>
    <View style={ph.badge}>
      <Text style={ph.badgeText}>Phase 4 — Coming soon</Text>
    </View>
  </SafeAreaView>
);

const ph = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 } as ViewStyle,
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 12, paddingHorizontal: 40,
  } as ViewStyle,
  icon: { fontSize: 64 } as TextStyle,
  title: {
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontFamily: FONT_FAMILY.HEADING, fontWeight: '700',
    textAlign: 'center', letterSpacing: -0.5,
  } as TextStyle,
  subtitle: {
    color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 22,
  } as TextStyle,
  badge: {
    alignSelf: 'center',
    marginBottom: SPACING.TAB_HEIGHT + SPACING.LG,
    backgroundColor: `${COLORS.WARNING}20`,
    borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.WARNING}40`,
    paddingHorizontal: 14, paddingVertical: 6,
  } as ViewStyle,
  badgeText: {
    color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '600',
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// New placeholder tab screens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * OrgAttendanceScreen — per-session QR check-in, attendance heatmap, no-shows.
 * Phase 4 builds: QR scanner integration, employee list with check-in state.
 */
const OrgAttendanceScreen = () => (
  <Placeholder
    icon="✅"
    title="Attendance"
    subtitle="Track employee check-ins, view attendance heatmaps, and manage no-shows across all group sessions."
  />
);

/**
 * OrgReportsScreen — downloadable reports: spend, attendance rate, trainer performance.
 * Phase 4 builds: PDF export, date-range picker, chart breakdowns.
 */
const OrgReportsScreen = () => (
  <Placeholder
    icon="📑"
    title="Reports"
    subtitle="Download spend summaries, attendance rates, and trainer performance reports for your organisation."
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// New placeholder stack screens
// ─────────────────────────────────────────────────────────────────────────────

/** SessionDetailScreen — org-specific session view: attendee list, notes, status */
const SessionDetailScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => (
  <SafeAreaView style={ph.safe}>
    <View style={sd.header}>
      <TouchableOpacity style={sd.back} onPress={() => navigation.goBack()}>
        <Text style={sd.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={sd.headerTitle}>Session Detail</Text>
      <View style={{ width: 38 }} />
    </View>
    <Placeholder
      icon="📅"
      title="Session Detail"
      subtitle="Full session info: attendee list, trainer notes, check-in status, and session replay."
    />
  </SafeAreaView>
);

const sd = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.SCREEN_H_PAD,
    paddingVertical: SPACING.MD, gap: SPACING.MD,
  } as ViewStyle,
  back: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    alignItems: 'center', justifyContent: 'center',
  } as ViewStyle,
  backArrow: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  headerTitle: {
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontFamily: FONT_FAMILY.HEADING, fontWeight: '700',
  } as TextStyle,
});

// ─────────────────────────────────────────────────────────────────────────────
// Navigators
// ─────────────────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab order: Dashboard → Group Booking → Attendance → Reports ───────────────
const OrgTabs: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="OrgHome"       component={OrgDashboardScreen} />
    <Tab.Screen name="GroupBooking"  component={GroupBookingScreen} />
    <Tab.Screen name="OrgAttendance" component={OrgAttendanceScreen} />
    <Tab.Screen name="OrgReports"    component={OrgReportsScreen} />
  </Tab.Navigator>
);

// ── Root stack: tabs + shared detail screens ──────────────────────────────────
export const OrgNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.DARK_BG },
      animation: 'slide_from_right',
    }}
  >
    {/* Tab root */}
    <Stack.Screen name="OrgTabs"       component={OrgTabs} />

    {/* Session detail — pushed from Dashboard upcoming sessions list */}
    <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />

    {/* Trainer profile — pushed from GroupBooking trainer card press */}
    <Stack.Screen name="TrainerProfile" component={TrainerProfileScreen} />

    {/* Full session view (shared screen — re-used across roles) */}
    <Stack.Screen name="Session"        component={SessionScreen} />

    {/* Group booking — also accessible as a stack push from Dashboard */}
    <Stack.Screen name="BookGroupSession" component={GroupBookingScreen} />
  </Stack.Navigator>
);

export default OrgNavigator;
