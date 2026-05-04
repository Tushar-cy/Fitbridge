import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, Animated, TouchableOpacity, Dimensions,
  StyleSheet, ViewStyle, TextStyle, ListRenderItemInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';

type Props = NativeStackScreenProps<any, 'Onboarding'>;
const { width: W, height: H } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🤖',
    title: 'AI Meets Fitness',
    subtitle: 'Get a personalised workout plan powered by real-time body scan AI. Science, not guesswork.',
    gradient: COLORS.GRADIENT_VIOLET,
    accent: COLORS.PRIMARY,
  },
  {
    id: '2',
    emoji: '🏋️',
    title: 'Elite Trainers',
    subtitle: 'Connect with India\'s top verified trainers — Gym, Yoga, Zumba, Calisthenics and more. Book in seconds.',
    gradient: COLORS.GRADIENT_SECONDARY,
    accent: COLORS.SECONDARY,
  },
  {
    id: '3',
    emoji: '📈',
    title: 'Track & Transform',
    subtitle: 'See your streak, body metrics, and progress charts update in real time. Your transformation, visualised.',
    gradient: COLORS.GRADIENT_GREEN,
    accent: COLORS.SECONDARY,
  },
];

export const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [index, setIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    if (index < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      navigation.replace('RoleSelect');
    }
  };

  const renderSlide = ({ item }: ListRenderItemInfo<typeof slides[0]>) => (
    <View style={[s.slide, { width: W }]}>
      {/* SVG placeholder illustration box */}
      <View style={s.illustrationBox}>
        <LinearGradient
          colors={item.gradient as [string, string]}
          style={s.illustrationGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Geometric shapes as SVG stand-ins */}
          <View style={s.shapeOuter}>
            <View style={[s.shapeInner, { borderColor: 'rgba(255,255,255,0.3)' }]} />
          </View>
          <Text style={s.slideEmoji}>{item.emoji}</Text>
          <View style={[s.floatingChip, s.chip1]}>
            <Text style={s.chipText}>🔥 Live</Text>
          </View>
          <View style={[s.floatingChip, s.chip2]}>
            <Text style={s.chipText}>✓ Verified</Text>
          </View>
          <View style={[s.floatingChip, s.chip3]}>
            <Text style={s.chipText}>⭐ 4.9</Text>
          </View>
        </LinearGradient>
      </View>

      <View style={s.textBlock}>
        <Text style={[s.slideTitle, { color: item.accent }]}>{item.title}</Text>
        <Text style={s.slideSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <LinearGradient colors={COLORS.GRADIENT_DARK} style={StyleSheet.absoluteFill} />

      {/* Skip */}
      <TouchableOpacity style={s.skipBtn} onPress={() => navigation.replace('RoleSelect')}>
        <Text style={s.skipText}>Skip</Text>
      </TouchableOpacity>

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      <View style={s.dotsRow}>
        {slides.map((slide, i) => {
          const w = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [8, 28, 8],
            extrapolate: 'clamp',
          });
          const bg = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [COLORS.SURFACE_3, slides[i].accent, COLORS.SURFACE_3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View
              key={slide.id}
              style={[s.dot, { width: w, backgroundColor: bg }]}
            />
          );
        })}
      </View>

      {/* CTA */}
      <View style={s.footer}>
        <TouchableOpacity onPress={goNext} activeOpacity={0.9} style={s.ctaWrap}>
          <LinearGradient
            colors={COLORS.GRADIENT_PRIMARY}
            style={s.cta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={s.ctaText}>
              {index === slides.length - 1 ? 'Get Started →' : 'Next →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  skipBtn: { position: 'absolute', top: 56, right: 24, zIndex: 10, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: `${COLORS.WHITE}10`, borderRadius: 20 } as ViewStyle,
  skipText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '600' } as TextStyle,
  slide: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 40 } as ViewStyle,
  illustrationBox: { width: W * 0.85, height: H * 0.42, borderRadius: 28, overflow: 'hidden' } as ViewStyle,
  illustrationGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' } as ViewStyle,
  shapeOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  } as ViewStyle,
  shapeInner: {
    position: 'absolute',
    width: 160,
    height: 160,
    top: 40,
    left: 40,
    borderRadius: 80,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  } as ViewStyle,
  slideEmoji: { fontSize: 90, zIndex: 1 } as TextStyle,
  floatingChip: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backdropFilter: 'blur(10px)',
  } as ViewStyle,
  chip1: { top: 24, right: 24 } as ViewStyle,
  chip2: { bottom: 24, left: 24 } as ViewStyle,
  chip3: { top: 24, left: 24 } as ViewStyle,
  chipText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '700' } as TextStyle,
  textBlock: { alignItems: 'center', paddingHorizontal: 32, gap: 12 } as ViewStyle,
  slideTitle: { fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5 } as TextStyle,
  slideSubtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 24 } as TextStyle,
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingBottom: 20 } as ViewStyle,
  dot: { height: 8, borderRadius: 4 } as ViewStyle,
  footer: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: SPACING.HUGE } as ViewStyle,
  ctaWrap: { borderRadius: 14, overflow: 'hidden' } as ViewStyle,
  cta: { height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 14 } as ViewStyle,
  ctaText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', letterSpacing: 0.3 } as TextStyle,
});

export default OnboardingScreen;
