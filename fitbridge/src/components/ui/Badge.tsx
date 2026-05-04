import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';

const { width: W } = Dimensions.get('window');

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: { label: string; onPress: () => void };
  accentColor?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  rightAction,
  accentColor = COLORS.PRIMARY,
}) => (
  <View style={styles.container}>
    <View style={styles.left}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightAction && (
      <TouchableOpacity onPress={rightAction.onPress}>
        <Text style={[styles.rightLabel, { color: accentColor }]}>{rightAction.label}</Text>
      </TouchableOpacity>
    )}
  </View>
);

interface StatChipProps {
  icon: string;
  value: string;
  label: string;
  color?: string;
}

export const StatChip: React.FC<StatChipProps> = ({ icon, value, label, color = COLORS.PRIMARY }) => (
  <View style={[chipStyles.chip, { borderColor: `${color}33` }]}>
    <Text style={chipStyles.icon}>{icon}</Text>
    <Text style={[chipStyles.value, { color }]}>{value}</Text>
    <Text style={chipStyles.label}>{label}</Text>
  </View>
);

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'ghost' | 'secondary';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'primary', size = 'sm' }) => {
  const colorMap = {
    primary: { bg: `${COLORS.PRIMARY}25`, text: COLORS.PRIMARY_LIGHT, border: `${COLORS.PRIMARY}40` },
    success: { bg: `${COLORS.SUCCESS}25`, text: COLORS.SUCCESS, border: `${COLORS.SUCCESS}40` },
    warning: { bg: `${COLORS.WARNING}25`, text: COLORS.WARNING, border: `${COLORS.WARNING}40` },
    error: { bg: `${COLORS.ERROR}25`, text: COLORS.ERROR, border: `${COLORS.ERROR}40` },
    ghost: { bg: COLORS.SURFACE_3, text: COLORS.TEXT_SECONDARY, border: COLORS.CARD_BORDER },
    secondary: { bg: `${COLORS.SECONDARY}25`, text: COLORS.SECONDARY, border: `${COLORS.SECONDARY}40` },
  };
  const c = colorMap[variant];
  const h = size === 'sm' ? 22 : 28;
  const fs = size === 'sm' ? TYPOGRAPHY.FONT_SIZE.XS : TYPOGRAPHY.FONT_SIZE.SM;
  return (
    <View
      style={[
        badgeStyles.base,
        { backgroundColor: c.bg, borderColor: c.border, height: h, paddingHorizontal: size === 'sm' ? 8 : 12 },
      ]}
    >
      <Text style={[badgeStyles.text, { fontSize: fs, color: c.text }]}>{label}</Text>
    </View>
  );
};

interface PulseDotProps {
  color?: string;
  size?: number;
}

export const PulseDot: React.FC<PulseDotProps> = ({ color = COLORS.SUCCESS, size = 8 }) => {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return (
    <View style={{ width: size * 2, height: size * 2, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size * 2,
          height: size * 2,
          borderRadius: size,
          backgroundColor: `${color}40`,
          transform: [{ scale: pulse }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  } as ViewStyle,
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 } as ViewStyle,
  accent: { width: 3, height: 22, borderRadius: 2 } as ViewStyle,
  title: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontWeight: '800',
  } as TextStyle,
  subtitle: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    marginTop: 2,
  } as TextStyle,
  rightLabel: {
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
  } as TextStyle,
});

const chipStyles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    paddingHorizontal: SPACING.LG,
    borderRadius: TYPOGRAPHY.RADIUS.MD,
    backgroundColor: COLORS.SURFACE_2,
    borderWidth: 1,
    flex: 1,
    gap: 2,
  } as ViewStyle,
  icon: { fontSize: 22 } as TextStyle,
  value: { fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontWeight: '900' } as TextStyle,
  label: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
});

const badgeStyles = StyleSheet.create({
  base: {
    borderRadius: TYPOGRAPHY.RADIUS.ROUND,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  } as ViewStyle,
  text: { fontWeight: '700' } as TextStyle,
});

export default SectionHeader;
