import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, Dimensions, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';

type Props = NativeStackScreenProps<any, 'Splash'>;
const { width: W, height: H } = Dimensions.get('window');

export const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.5)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      // Ring pulse
      Animated.parallel([
        Animated.spring(ringScale, { toValue: 1, useNativeDriver: true, damping: 8, stiffness: 60 }),
        Animated.timing(ringOpacity, { toValue: 0.25, duration: 600, useNativeDriver: true }),
      ]),
      // Logo bounce in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, damping: 10, stiffness: 120 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // Tagline slides up
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(taglineY, { toValue: 0, useNativeDriver: true, damping: 14, stiffness: 100 }),
      ]),
    ]).start(() => {
      setTimeout(() => navigation.replace('Onboarding'), 1400);
    });
  }, []);

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={COLORS.GRADIENT_SPLASH}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      {/* Ambient glow rings */}
      <Animated.View
        style={[s.outerRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />
      <Animated.View
        style={[s.innerRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />

      {/* Logo */}
      <Animated.View
        style={[s.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}
      >
        <LinearGradient
          colors={COLORS.GRADIENT_VIOLET}
          style={s.logoBox}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={s.bolt}>⚡</Text>
        </LinearGradient>
        <View style={s.logoTextRow}>
          <Text style={s.logoBlack}>Fit</Text>
          <Text style={s.logoPurple}>Bridge</Text>
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[s.taglineWrap, { opacity: taglineOpacity, transform: [{ translateY: taglineY }] }]}>
        <Text style={s.tagline}>Train Smarter.{'\n'}Connect Better.</Text>
        <View style={s.pillRow}>
          {['AI-Powered', 'Verified Trainers', 'Real Results'].map((t) => (
            <View key={t} style={s.pill}>
              <Text style={s.pillText}>{t}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Loading bar */}
      <Animated.View style={[s.loadingBar, { opacity: taglineOpacity }]}>
        <LinearGradient
          colors={COLORS.GRADIENT_PRIMARY}
          style={s.loadingFill}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
        />
      </Animated.View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.DARK_BG, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  outerRing: {
    position: 'absolute',
    width: W * 0.9,
    height: W * 0.9,
    borderRadius: W * 0.45,
    borderWidth: 1,
    borderColor: `${COLORS.PRIMARY}20`,
  } as ViewStyle,
  innerRing: {
    position: 'absolute',
    width: W * 0.6,
    height: W * 0.6,
    borderRadius: W * 0.3,
    borderWidth: 1,
    borderColor: `${COLORS.PRIMARY}30`,
  } as ViewStyle,
  logoWrap: { alignItems: 'center', gap: 20, marginBottom: 60 } as ViewStyle,
  logoBox: {
    width: 110,
    height: 110,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.PRIMARY,
    shadowOpacity: 0.7,
    shadowRadius: 40,
    elevation: 25,
  } as ViewStyle,
  bolt: { fontSize: 58 } as TextStyle,
  logoTextRow: { flexDirection: 'row' } as ViewStyle,
  logoBlack: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.HERO, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -2 } as TextStyle,
  logoPurple: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.HERO, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -2 } as TextStyle,
  taglineWrap: { alignItems: 'center', gap: 24, position: 'absolute', bottom: 120 } as ViewStyle,
  tagline: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XXL,
    fontFamily: FONT_FAMILY.HEADING,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.5,
  } as TextStyle,
  pillRow: { flexDirection: 'row', gap: 8 } as ViewStyle,
  pill: {
    backgroundColor: COLORS.SURFACE_2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    paddingHorizontal: 12,
    paddingVertical: 5,
  } as ViewStyle,
  pillText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '600' } as TextStyle,
  loadingBar: {
    position: 'absolute',
    bottom: 60,
    width: 60,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.SURFACE_3,
    overflow: 'hidden',
  } as ViewStyle,
  loadingFill: { width: '100%', height: '100%' } as ViewStyle,
});

export default SplashScreen;
