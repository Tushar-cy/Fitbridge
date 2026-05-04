import React from 'react';
import {
  View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../theme/colors';
import SPACING from '../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../theme/typography';
import { TabBar } from '../components/layout/TabBar';
import { BrandDashboardScreen }  from '../screens/brand/BrandDashboardScreen';
import { BrandCampaignsScreen }  from '../screens/brand/BrandCampaignsScreen';
import { CreateCampaignScreen }  from '../screens/brand/CreateCampaignScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder screens
// Phase 4 will replace each `() => <Placeholder ... />` with the real import.
// ─────────────────────────────────────────────────────────────────────────────

const Placeholder: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
  navigation?: any;
}> = ({ icon, title, subtitle, navigation }) => (
  <SafeAreaView style={ph.safe}>
    <LinearGradient
      colors={[`${COLORS.PRIMARY}18`, 'transparent']}
      style={ph.gradient}
    />
    <View style={ph.center}>
      <Text style={ph.icon}>{icon}</Text>
      <Text style={ph.title}>{title}</Text>
      {subtitle && <Text style={ph.subtitle}>{subtitle}</Text>}
      {navigation && (
        <TouchableOpacity
          style={ph.btn}
          onPress={() => navigation.navigate('CreateCampaign')}
          activeOpacity={0.8}
        >
          <Text style={ph.btnText}>+ New Campaign</Text>
        </TouchableOpacity>
      )}
    </View>
    <View style={ph.badge}>
      <Text style={ph.badgeText}>Phase 4 — Coming soon</Text>
    </View>
  </SafeAreaView>
);

const ph = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 240 } as ViewStyle,
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 } as ViewStyle,
  icon: { fontSize: 64 } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 } as TextStyle,
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 22 } as TextStyle,
  btn: { marginTop: 8, backgroundColor: COLORS.PRIMARY, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 } as ViewStyle,
  btnText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
  badge: { alignSelf: 'center', marginBottom: SPACING.TAB_HEIGHT + SPACING.LG, backgroundColor: `${COLORS.WARNING}20`, borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.WARNING}40`, paddingHorizontal: 14, paddingVertical: 6 } as ViewStyle,
  badgeText: { color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '600' } as TextStyle,
});

// ── Tab screen placeholders ───────────────────────────────────────────────────

/** BrandTrainersScreen — trainer discovery / collaboration requests */
const BrandTrainersScreen = () => (
  <Placeholder
    icon="🔍"
    title="Find Trainers"
    subtitle="Discover trainers to collaborate with for your campaigns."
  />
);

/** BrandProfileScreen — company profile, logo, contact info, verification badge */
const BrandProfileScreen = () => (
  <Placeholder
    icon="👤"
    title="Brand Profile"
    subtitle="Manage your company profile, logo, and contact details."
  />
);

// ── Stack screen placeholders ─────────────────────────────────────────────────

/** CampaignDetailScreen — full metrics, collaborators, edit controls */
const CampaignDetailScreen = ({ navigation }: any) => (
  <SafeAreaView style={ph.safe}>
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, gap: SPACING.MD }}>
      <TouchableOpacity
        style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' }}
        onPress={() => navigation.goBack()}
      >
        <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 18 }}>←</Text>
      </TouchableOpacity>
      <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' }}>Campaign Detail</Text>
    </View>
    <Placeholder icon="📈" title="Campaign Detail" subtitle="Full metrics, collaborating trainers, budget breakdown, and edit controls." />
  </SafeAreaView>
);



// ─────────────────────────────────────────────────────────────────────────────
// Navigators
// ─────────────────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Tab order: Dashboard → Campaigns → Trainers → Profile ────────────────────
const BrandTabs: React.FC = () => (
  <Tab.Navigator
    tabBar={(props) => <TabBar {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="BrandDashboard" component={BrandDashboardScreen} />
    <Tab.Screen name="BrandCampaigns" component={BrandCampaignsScreen} />
    <Tab.Screen name="BrandTrainers"  component={BrandTrainersScreen} />
    <Tab.Screen name="BrandProfile"   component={BrandProfileScreen} />
  </Tab.Navigator>
);

// ── Root stack wraps tabs + detail/creation screens ──────────────────────────
export const BrandNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: COLORS.DARK_BG },
      animation: 'slide_from_right',
    }}
  >
    {/* Tab root */}
    <Stack.Screen name="BrandTabs"       component={BrandTabs} />

    {/* Campaign detail — pushed from campaign list row press */}
    <Stack.Screen
      name="CampaignDetail"
      component={CampaignDetailScreen}
      options={{ animation: 'slide_from_right' }}
    />

    {/* Create campaign — pushed from Campaigns tab header button */}
    <Stack.Screen
      name="CreateCampaign"
      component={CreateCampaignScreen}
      options={{ animation: 'slide_from_bottom' }}
    />
  </Stack.Navigator>
);

export default BrandNavigator;
