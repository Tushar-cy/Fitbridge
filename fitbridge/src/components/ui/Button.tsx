import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../theme/colors';
import TYPOGRAPHY from '../../theme/typography';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  icon,
  iconPosition = 'left',
}) => {
  const heights = { sm: 40, md: 48, lg: 56 };
  const fontSizes = { sm: TYPOGRAPHY.FONT_SIZE.SM, md: TYPOGRAPHY.FONT_SIZE.MD, lg: TYPOGRAPHY.FONT_SIZE.MD };
  const radii = { sm: 10, md: 12, lg: 14 };

  const h = heights[size];
  const fs = fontSizes[size];
  const r = radii[size];

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={isDisabled ? ['#3A2E6E', '#3A2E6E'] : COLORS.GRADIENT_PRIMARY}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.base, { height: h, borderRadius: r }, fullWidth && styles.fullWidth]}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.WHITE} size="small" />
          ) : (
            <View style={styles.inner}>
              {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
              <Text style={[styles.primaryText, { fontSize: fs }]}>{title}</Text>
              {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const containerStyles: ViewStyle = {
    height: h,
    borderRadius: r,
    ...(variant === 'outline' && {
      borderWidth: 1.5,
      borderColor: isDisabled ? COLORS.TEXT_MUTED : COLORS.PRIMARY,
      backgroundColor: COLORS.TRANSPARENT,
    }),
    ...(variant === 'secondary' && {
      backgroundColor: `${COLORS.SECONDARY}22`,
      borderWidth: 1.5,
      borderColor: COLORS.SECONDARY,
    }),
    ...(variant === 'ghost' && {
      backgroundColor: `${COLORS.PRIMARY}15`,
    }),
    ...(variant === 'danger' && {
      backgroundColor: `${COLORS.ERROR}22`,
      borderWidth: 1.5,
      borderColor: COLORS.ERROR,
    }),
  };

  const textColor =
    variant === 'outline' || variant === 'ghost'
      ? isDisabled ? COLORS.TEXT_MUTED : COLORS.PRIMARY
      : variant === 'secondary'
      ? COLORS.SECONDARY
      : variant === 'danger'
      ? COLORS.ERROR
      : COLORS.WHITE;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        containerStyles,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={[styles.text, { fontSize: fs, color: textColor }]}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  } as ViewStyle,
  fullWidth: { width: '100%' } as ViewStyle,
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  primaryText: {
    color: COLORS.WHITE,
    fontWeight: '700',
    letterSpacing: 0.3,
  } as TextStyle,
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  } as TextStyle,
  iconLeft: { marginRight: 8 } as ViewStyle,
  iconRight: { marginLeft: 8 } as ViewStyle,
  disabled: { opacity: 0.5 } as ViewStyle,
});

export default Button;
