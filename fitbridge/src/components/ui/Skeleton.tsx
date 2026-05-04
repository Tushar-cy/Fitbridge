import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, DimensionValue } from 'react-native';
import COLORS from '../../theme/colors';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.85] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: COLORS.SURFACE_3, opacity } as any,
        style,
      ]}
    />
  );
};

export const TrainerCardSkeleton: React.FC = () => (
  <View style={skStyles.card}>
    <Skeleton height={200} borderRadius={16} />
    <View style={skStyles.info}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={12} style={skStyles.gap} />
      <Skeleton width="40%" height={12} style={skStyles.gap} />
    </View>
  </View>
);

export const FeedCardSkeleton: React.FC = () => (
  <View style={skStyles.feedCard}>
    <View style={skStyles.feedHeader}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={skStyles.feedHeaderText}>
        <Skeleton width={120} height={14} />
        <Skeleton width={80} height={10} style={skStyles.gap} />
      </View>
    </View>
    <Skeleton height={240} borderRadius={12} style={skStyles.gap} />
  </View>
);

const skStyles = StyleSheet.create({
  card: { marginBottom: 16 } as ViewStyle,
  info: { paddingHorizontal: 4, paddingTop: 10, gap: 6 } as ViewStyle,
  gap: { marginTop: 6 } as ViewStyle,
  feedCard: { padding: 16, borderRadius: 16, backgroundColor: COLORS.CARD_BG, marginBottom: 12 } as ViewStyle,
  feedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 } as ViewStyle,
  feedHeaderText: { flex: 1, gap: 6 } as ViewStyle,
});

export default Skeleton;
