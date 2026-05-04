import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useNotificationStore } from '../../store/notificationStore';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  /** Show the notification bell icon in the right slot (default: false) */
  showBell?: boolean;
  /** Slot for any custom right-side element (overrides showBell) */
  rightAction?: React.ReactNode;
  transparent?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack    = false,
  showBell    = false,
  rightAction,
  transparent = false,
}) => {
  const navigation = useNavigation<any>();
  const insets     = useSafeAreaInsets();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  // Build right slot content
  const rightContent = (() => {
    // Explicit rightAction always wins
    if (rightAction) return rightAction;

    if (showBell) {
      return (
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.8}
        >
          <Text style={styles.bellIcon}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {unreadCount > 9 ? '9+' : String(unreadCount)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return <View style={styles.placeholder} />;
  })();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + SPACING.SM },
        transparent && styles.transparent,
      ]}
    >
      <View style={styles.row}>
        {/* Left slot */}
        {showBack ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            activeOpacity={0.8}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>

        {/* Right slot */}
        <View style={styles.rightSlot}>{rightContent}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.DARK_BG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.CARD_BORDER,
    paddingBottom: SPACING.MD,
    paddingHorizontal: SPACING.LG,
  } as ViewStyle,
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  } as ViewStyle,
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  } as ViewStyle,

  // Back button
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: TYPOGRAPHY.RADIUS.MD,
    backgroundColor: COLORS.CARD_BG,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  backArrow: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 18,
  } as TextStyle,

  // Title
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '700',
  } as TextStyle,

  // Slots
  placeholder: { width: 40 } as ViewStyle,
  rightSlot: { width: 40, alignItems: 'flex-end' } as ViewStyle,

  // Bell button
  bellBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: TYPOGRAPHY.RADIUS.MD,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1, borderColor: COLORS.CARD_BORDER,
    position: 'relative',
  } as ViewStyle,
  bellIcon: { fontSize: 18 } as TextStyle,

  // Badge on bell
  bellBadge: {
    position: 'absolute',
    top: -3, right: -3,
    minWidth: 16, height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.DARK_BG,
  } as ViewStyle,
  bellBadgeText: {
    color: COLORS.WHITE,
    fontSize: 8,
    fontWeight: '900',
    fontFamily: FONT_FAMILY.MONO,
    lineHeight: 11,
  } as TextStyle,
});

export default Header;
