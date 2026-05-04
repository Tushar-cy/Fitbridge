import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS } from '../../../theme/colors';

interface RatingStarsProps {
  rating: number;
  size?: number;
  showNumber?: boolean;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 14,
  showNumber = false,
}) => {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return 'full';
    if (i < rating) return 'half';
    return 'empty';
  });

  return (
    <View style={styles.row}>
      {stars.map((type, index) => (
        <Text
          key={index}
          style={[
            styles.star,
            { fontSize: size },
            type === 'empty' && styles.emptyStar,
          ] as TextStyle[]}
        >
          {type === 'full' ? '★' : type === 'half' ? '⭐' : '☆'}
        </Text>
      ))}
      {showNumber && (
        <Text style={[styles.number, { fontSize: size }]}>{rating.toFixed(1)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 1 } as ViewStyle,
  star: { color: COLORS.WARNING } as TextStyle,
  emptyStar: { color: COLORS.CARD_BORDER } as TextStyle,
  number: {
    color: COLORS.TEXT_SECONDARY,
    fontWeight: '600',
    marginLeft: 4,
  } as TextStyle,
});

export default RatingStars;
