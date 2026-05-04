import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../theme/colors';
import SPACING from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
  bordered?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = SPACING.LG,
  bordered = true,
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding },
        bordered && styles.bordered,
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    overflow: 'hidden',
  } as ViewStyle,
  bordered: {
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
  } as ViewStyle,
});

export default Card;
