import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../theme/colors';
import TYPOGRAPHY from '../../../theme/typography';

interface StoryRingProps {
  uri: string;
  name: string;
  hasStory?: boolean;
  isOwn?: boolean;
  onPress?: () => void;
}

export const StoryRing: React.FC<StoryRingProps> = ({
  uri,
  name,
  hasStory = true,
  isOwn = false,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.85}>
      {hasStory ? (
        <LinearGradient
          colors={COLORS.GRADIENT_PRIMARY}
          style={styles.ring}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.innerRing}>
            <Image source={{ uri }} style={styles.avatar as ImageStyle} />
          </View>
        </LinearGradient>
      ) : (
        <View style={[styles.ring, styles.noStory]}>
          <View style={styles.innerRing}>
            <Image source={{ uri }} style={styles.avatar as ImageStyle} />
          </View>
        </View>
      )}
      {isOwn && (
        <View style={styles.addBtn}>
          <Text style={styles.addIcon}>+</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6, width: 64 } as ViewStyle,
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  noStory: { backgroundColor: COLORS.CARD_BORDER } as ViewStyle,
  innerRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  avatar: { width: 50, height: 50, borderRadius: 25 },
  addBtn: {
    position: 'absolute',
    bottom: 20,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.DARK_BG,
  } as ViewStyle,
  addIcon: {
    color: COLORS.WHITE,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  } as TextStyle,
  name: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    textAlign: 'center',
  } as TextStyle,
});

export default StoryRing;
