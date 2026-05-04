import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import COLORS from '../../theme/colors';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import SPACING from '../../theme/spacing';
import { useChatStore } from '../../store/chatStore';

const { width: W } = Dimensions.get('window');

interface TabConfig {
  activeIcon: string;
  inactiveIcon: string;
  label: string;
}

const TRAINEE_TABS: Record<string, TabConfig> = {
  Dashboard: { activeIcon: '⚡', inactiveIcon: '⚡', label: 'Home' },
  Explore:   { activeIcon: '🔍', inactiveIcon: '🔍', label: 'Explore' },
  Chat:      { activeIcon: '💬', inactiveIcon: '💬', label: 'Chat' },
  FitFeed:   { activeIcon: '📸', inactiveIcon: '📸', label: 'Feed' },
  Progress:  { activeIcon: '📊', inactiveIcon: '📊', label: 'Progress' },
};

const TRAINER_TABS: Record<string, TabConfig> = {
  TrainerHome: { activeIcon: '⚡', inactiveIcon: '⚡', label: 'Home' },
  Schedule:    { activeIcon: '📅', inactiveIcon: '📅', label: 'Schedule' },
  Trainees:    { activeIcon: '👥', inactiveIcon: '👥', label: 'Trainees' },
  Feed:        { activeIcon: '📸', inactiveIcon: '📸', label: 'Feed' },
  Earnings:    { activeIcon: '💰', inactiveIcon: '💰', label: 'Earnings' },
};

const BRAND_TABS: Record<string, TabConfig> = {
  BrandDashboard: { activeIcon: '📊', inactiveIcon: '📊', label: 'Dashboard' },
  BrandCampaigns: { activeIcon: '📣', inactiveIcon: '📣', label: 'Campaigns' },
  BrandTrainers:  { activeIcon: '🔍', inactiveIcon: '🔍', label: 'Trainers' },
  BrandProfile:   { activeIcon: '👤', inactiveIcon: '👤', label: 'Profile' },
};

const ORG_TABS: Record<string, TabConfig> = {
  OrgHome:        { activeIcon: '🏢', inactiveIcon: '🏢', label: 'Dashboard' },
  GroupBooking:   { activeIcon: '📅', inactiveIcon: '📅', label: 'Book Group' },
  OrgAttendance:  { activeIcon: '✅', inactiveIcon: '✅', label: 'Attendance' },
  OrgReports:     { activeIcon: '📄', inactiveIcon: '📄', label: 'Reports' },
};

export const TabBar: React.FC<BottomTabBarProps> = ({ state, descriptors, navigation }) => {
  const allTabConfigs = { ...TRAINEE_TABS, ...TRAINER_TABS, ...BRAND_TABS, ...ORG_TABS };
  const chatUnread = useChatStore((s) => s.unreadTotal);

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={['rgba(10,10,15,0)', 'rgba(10,10,15,0.95)']}
        style={styles.gradient}
        pointerEvents="none"
      />
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = allTabConfigs[route.name];

          if (!config) return null;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
          };

          // Badge count: show unread messages on Chat tab
          const badge = route.name === 'Chat' ? chatUnread : 0;

          return (
            <TabItem
              key={route.key}
              icon={config.activeIcon}
              label={config.label}
              focused={isFocused}
              badge={badge}
              onPress={onPress}
            />
          );
        })}
      </View>
    </View>
  );
};

const TabItem: React.FC<{
  icon: string;
  label: string;
  focused: boolean;
  badge?: number;   // show numeric badge when > 0
  onPress: () => void;
}> = ({ icon, label, focused, badge = 0, onPress }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1 : 0.9,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.5,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused, scale, opacity]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={itemStyles.btn}
    >
      <Animated.View style={[itemStyles.inner, { transform: [{ scale }], opacity }]}>
        {focused && (
          <LinearGradient
            colors={[`${COLORS.PRIMARY}30`, `${COLORS.PRIMARY}10`]}
            style={itemStyles.activeBg}
          />
        )}
        {/* Icon + badge wrapper */}
        <View style={itemStyles.iconWrap}>
          <Text style={[itemStyles.icon, focused && itemStyles.iconFocused]}>{icon}</Text>
          {badge > 0 && (
            <View style={itemStyles.badge}>
              <Text style={itemStyles.badgeText}>
                {badge > 99 ? '99+' : String(badge)}
              </Text>
            </View>
          )}
        </View>
        <Text style={[itemStyles.label, focused && itemStyles.labelFocused]}>{label}</Text>
        {focused && <View style={itemStyles.dot} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 24 : 0,
  } as ViewStyle,
  gradient: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
    height: 60,
  } as ViewStyle,
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: SPACING.TAB_HEIGHT,
    alignItems: 'center',
    paddingHorizontal: SPACING.SM,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  } as ViewStyle,
});

const itemStyles = StyleSheet.create({
  btn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    position: 'relative',
    overflow: 'hidden',
  } as ViewStyle,
  activeBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(79, 70, 229, 0.3)',
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  } as ViewStyle,
  icon: { fontSize: 22, opacity: 0.5 } as TextStyle,
  iconFocused: { opacity: 1, textShadowColor: 'rgba(79, 70, 229, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 } as TextStyle,
  iconWrap: { position: 'relative' } as ViewStyle,
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0f172a',
    shadowColor: COLORS.ERROR,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  } as ViewStyle,
  badgeText: {
    color: COLORS.WHITE,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  } as TextStyle,
  label: {
    fontSize: 10,
    color: COLORS.TEXT_MUTED,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
    fontWeight: '800',
  } as TextStyle,
  labelFocused: {
    color: COLORS.PRIMARY_LIGHT,
  } as TextStyle,
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.PRIMARY_LIGHT,
    marginTop: 2,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  } as ViewStyle,
});

export default TabBar;
