import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  hasStory?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 48,
  hasStory = false,
  isOnline = false,
  style,
}) => {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const inner = uri ? (
    <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }] as ImageStyle} />
  ) : (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );

  if (hasStory) {
    return (
      <View style={[styles.wrapper, style]}>
        <LinearGradient
          colors={COLORS.GRADIENT_PRIMARY}
          style={[styles.ring, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}
        >
          <View style={[styles.innerRing, { width: size + 2, height: size + 2, borderRadius: (size + 2) / 2 }]}>
            {inner}
          </View>
        </LinearGradient>
        {isOnline && (
          <View style={[styles.dot, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 }]} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, style]}>
      {inner}
      {isOnline && (
        <View style={[styles.dot, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { position: 'relative', alignSelf: 'flex-start' } as ViewStyle,
  image: {} as ImageStyle,
  placeholder: {
    backgroundColor: COLORS.CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  initials: {
    color: COLORS.TEXT_PRIMARY,
    fontWeight: '700',
  } as TextStyle,
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  innerRing: {
    backgroundColor: COLORS.DARK_BG,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  dot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.SUCCESS,
    borderWidth: 2,
    borderColor: COLORS.DARK_BG,
  } as ViewStyle,
});

export default Avatar;
