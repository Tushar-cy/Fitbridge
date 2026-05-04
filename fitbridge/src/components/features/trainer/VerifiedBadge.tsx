import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../../theme/colors';

interface VerifiedBadgeProps {
  size?: number;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ size = 16 }) => {
  return (
    <View style={[styles.badge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.check, { fontSize: size * 0.6 }]}>✓</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  check: {
    color: COLORS.WHITE,
    fontWeight: '900',
    lineHeight: undefined,
  } as TextStyle,
});

export default VerifiedBadge;
