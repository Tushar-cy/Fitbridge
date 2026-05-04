import React, { useState, useRef, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, Image, ImageStyle,
  TouchableOpacity, Animated, Dimensions, Share, Alert, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { supabaseService } from '../../services/api/supabaseService';
import type { Trainer } from '../../types/user.types';

const { width: W } = Dimensions.get('window');

const SLOTS = ['07:00', '09:00', '11:00', '14:00', '16:00', '18:00', '20:00'];
const REVIEWS = [
  { name: 'Rahul M.',  rating: 5, text: 'Absolutely changed my approach to training. Incredibly knowledgeable.', avatar: 'https://picsum.photos/seed/rev1/60/60' },
  { name: 'Priya K.',  rating: 5, text: 'Lost 8 kgs in 3 months. The personalised plan was perfect for my body type.', avatar: 'https://picsum.photos/seed/rev2/60/60' },
  { name: 'Aditya S.', rating: 4, text: 'Great trainer, very patient. Timings are a bit hard to get in peak hours though.', avatar: 'https://picsum.photos/seed/rev3/60/60' },
];

// Star rating breakdown (mock — backend will provide real distribution)
const RATING_BREAKDOWN = [
  { star: 5, pct: 60 },
  { star: 4, pct: 25 },
  { star: 3, pct: 10 },
  { star: 2, pct: 3  },
  { star: 1, pct: 2  },
];

// Deterministic "compatibility" score seeded by trainerId (mock)
const calcCompatibility = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffff;
  return 75 + (hash % 23); // 75–97
};

export const TrainerProfileScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation, route }) => {
  const trainerId = route.params?.trainerId;
  
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [loading, setLoading] = useState(true);
  const [bioExpanded, setBioExpanded] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    async function loadTrainer() {
      if (!trainerId) return;
      try {
        const data = await supabaseService.getTrainerById(trainerId);
        if (data) setTrainer(data);
      } catch (err) {
        console.warn('Failed to load trainer:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTrainer();
  }, [trainerId]);

  // Memoised per-trainer values
  const compatScore = useMemo(() => trainer ? calcCompatibility(trainer.id) : 0, [trainer]);
  const certifications: string[] = (trainer as any)?.certifications ?? ['NASM', 'ACE', 'ISSA'];

  const handleShare = async () => {
    if (!trainer) return;
    try {
      await Share.share({
        message: `Check out ${trainer.name}'s profile on FitBridge! 💪\nhttps://fitbridge.app/trainers/${trainer.id}`,
        title: `${trainer.name} — FitBridge Trainer`,
      });
    } catch {
      Alert.alert('Share failed', 'Could not open share sheet.');
    }
  };

  const headerHeight = scrollY.interpolate({ inputRange: [0, 200], outputRange: [280, 100], extrapolate: 'clamp' });
  const photoOpacity = scrollY.interpolate({ inputRange: [100, 200], outputRange: [1, 0.3], extrapolate: 'clamp' });

  return (
    <View style={s.container}>
      <StatusBar style="light" />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
           <ActivityIndicator color={COLORS.PRIMARY} />
        </View>
      ) : !trainer ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 20, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' }}>Profile Not Found</Text>
          <Text style={{ color: COLORS.TEXT_MUTED, textAlign: 'center', marginTop: 10, lineHeight: 22 }}>This profile belongs to a Trainee, or the trainer account hasn't been set up yet.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.SURFACE_2, borderRadius: 8, borderWidth: 1, borderColor: COLORS.CARD_BORDER }}>
            <Text style={{ color: COLORS.PRIMARY, fontWeight: '700' }}>← Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <>
      {/* Parallax hero */}
      <Animated.View style={[s.heroWrap, { height: headerHeight }]}>
        <Animated.Image
          source={{ uri: trainer!.photo }}
          style={[s.heroPhoto, { opacity: photoOpacity }] as any}
        />
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.4)', COLORS.DARK_BG]}
          style={s.heroGradient}
          locations={[0.3, 0.65, 1]}
        />
        {/* Back + Share buttons */}
        <SafeAreaView style={s.heroBar} edges={['top']}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
            <Text style={s.iconBtnText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={handleShare}>
            <Text style={s.iconBtnText}>↑</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      {/* Scrollable content */}
      <Animated.ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Spacer to clear hero */}
        <View style={{ height: 240 }} />

        {/* Name + Verified */}
        <View style={s.nameRow}>
          <Text style={s.name}>{trainer.name}</Text>
          {trainer.verified && (
            <View style={s.verifiedBadge}>
              <Text style={s.verifiedText}>✓ Verified</Text>
            </View>
          )}
        </View>
        <Text style={s.location}>📍 {trainer.location}</Text>

        {/* Rating row */}
        <View style={s.ratingRow}>
          <Text style={s.stars}>{'★'.repeat(Math.floor(trainer.rating))}</Text>
          <Text style={s.ratingNum}>{trainer.rating}</Text>
          <Text style={s.reviewCount}>({trainer.reviewCount} reviews)</Text>
          <Text style={s.experience}>· {trainer.experience} yrs exp</Text>
        </View>

        {/* Compatibility score pill */}
        <View style={s.compatRow}>
          <View style={s.compatPill}>
            <Text style={s.compatText}>🎯 {compatScore}% Match for You</Text>
          </View>
        </View>

        {/* Specialisation badges */}
        <View style={s.badgeRow}>
          {trainer.specialisation.map((spec) => (
            <Badge key={spec} label={spec} variant="primary" size="md" />
          ))}
        </View>

        {/* Certification chips */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Certifications</Text>
          <View style={s.certRow}>
            {certifications.map((cert) => (
              <View key={cert} style={s.certChip}>
                <Text style={s.certTick}>✅</Text>
                <Text style={s.certLabel}>{cert}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { label: 'Clients', value: trainer.totalClients },
            { label: 'Sessions', value: trainer.reviewCount * 4 },
            { label: 'Experience', value: `${trainer.experience}yr` },
          ].map((stat) => (
            <View key={stat.label} style={s.statItem}>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>About</Text>
          <Text style={s.bio} numberOfLines={bioExpanded ? undefined : 3}>{trainer.bio}</Text>
          <TouchableOpacity onPress={() => setBioExpanded((e) => !e)}>
            <Text style={s.bioToggle}>{bioExpanded ? 'Show less' : 'Read more →'}</Text>
          </TouchableOpacity>
        </View>

        {/* Tag pills */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Tags</Text>
          <View style={s.tagsRow}>
            {trainer.tags.map((tag) => (
              <Badge key={tag} label={tag} variant="ghost" size="sm" />
            ))}
          </View>
        </View>

        {/* Available slots */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Available Time Slots</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.slotsScroll}>
            {SLOTS.map((slot) => (
              <TouchableOpacity
                key={slot}
                onPress={() => setSelectedSlot(slot)}
                style={[s.slotChip, selectedSlot === slot && s.activeSlot]}
              >
                <Text style={[s.slotText, selectedSlot === slot && s.activeSlotText]}>{slot}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Reviews + breakdown */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Client Reviews</Text>

          {/* Rating breakdown bars */}
          <View style={s.breakdownCard}>
            <View style={s.breakdownLeft}>
              <Text style={s.bigRating}>{trainer.rating}</Text>
              <Text style={s.starsLg}>{'★'.repeat(Math.floor(trainer.rating))}</Text>
              <Text style={s.reviewCountSm}>{trainer.reviewCount} reviews</Text>
            </View>
            <View style={s.breakdownBars}>
              {RATING_BREAKDOWN.map(({ star, pct }) => (
                <View key={star} style={s.barRow}>
                  <Text style={s.barStarLabel}>{star}★</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct}%` as any }]} />
                  </View>
                  <Text style={s.barPct}>{pct}%</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Write a review CTA */}
          <TouchableOpacity
            style={s.writeReviewBtn}
            onPress={() => Alert.alert('Write a Review', 'Review submission will be available in Phase 4.')}
            activeOpacity={0.8}
          >
            <Text style={s.writeReviewText}>✏️ Write a Review</Text>
          </TouchableOpacity>

          {REVIEWS.map((rev, i) => (
            <View key={i} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <Image source={{ uri: rev.avatar }} style={s.reviewAvatar as ImageStyle} />
                <View style={s.reviewMeta}>
                  <Text style={s.reviewName}>{rev.name}</Text>
                  <Text style={s.reviewStars}>{'★'.repeat(rev.rating)}</Text>
                </View>
              </View>
              <Text style={s.reviewText}>{rev.text}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: SPACING.XL }} />
      </Animated.ScrollView>

      {/* Sticky Book CTA */}
      <View style={s.stickyBar}>
        <View>
          <Text style={s.priceMeta}>Per session</Text>
          <Text style={s.price}>₹{trainer!.pricePerSession.toLocaleString()}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.LG, gap: SPACING.SM }}>
          <Button
            title="Book Session"
            onPress={() => navigation.navigate('Booking', { trainerId: trainer!.id })}
            fullWidth
            size="lg"
          />
          {/* Free intro chat — shown when no existing thread (mock: always show) */}
          <TouchableOpacity
            style={s.introChatBtn}
            onPress={() => navigation.navigate('AITrainerChat', {
              trainerId:          trainer!.id,
              trainerName:        trainer!.name,
              trainerAvatar:      trainer!.photo,
              trainerSpeciality:  trainer!.specialisation?.[0] ?? 'Fitness',
            })}
            activeOpacity={0.82}
          >
            <LinearGradient colors={[`${COLORS.SECONDARY}22`, `${COLORS.SECONDARY}10`]} style={s.introChatGradient} />
            <Text style={s.introChatText}>💬 Free 15-min AI Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
      </>
      )}
    </View>
  );
};


const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  heroWrap: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' } as ViewStyle,
  heroPhoto: { width: '100%', height: '100%', position: 'absolute' } as ViewStyle,
  heroGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '70%' } as ViewStyle,
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.LG } as ViewStyle,
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' } as ViewStyle,
  iconBtnText: { color: COLORS.WHITE, fontSize: 18, fontWeight: '700' } as TextStyle,
  scroll: { flex: 1 } as ViewStyle,
  scrollContent: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: 20 } as ViewStyle,
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 } as ViewStyle,
  name: { color: COLORS.TEXT_PRIMARY, fontSize: 32, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', flex: 1, letterSpacing: -0.5 } as TextStyle,
  verifiedBadge: { backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)' } as ViewStyle,
  verifiedText: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, letterSpacing: 0.5 } as TextStyle,
  location: { color: COLORS.PRIMARY_LIGHT, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginBottom: SPACING.SM } as TextStyle,
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: SPACING.LG } as ViewStyle,
  stars: { color: COLORS.WARNING, fontSize: 16 } as TextStyle,
  ratingNum: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  reviewCount: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  experience: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM, marginBottom: SPACING.LG } as ViewStyle,
  statsRow: { flexDirection: 'row', backgroundColor: COLORS.SURFACE_2, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: SPACING.LG, marginBottom: SPACING.XL, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 } as ViewStyle,
  statItem: { flex: 1, alignItems: 'center', gap: 4 } as ViewStyle,
  statValue: { color: COLORS.TEXT_PRIMARY, fontSize: 24, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  statLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, textTransform: 'uppercase', letterSpacing: 0.5 } as TextStyle,
  section: { marginBottom: SPACING.XL } as ViewStyle,
  sectionLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.SM } as TextStyle,
  bio: { color: 'rgba(255,255,255,0.85)', fontSize: TYPOGRAPHY.FONT_SIZE.MD, lineHeight: 26, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  bioToggle: { color: COLORS.PRIMARY_LIGHT, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginTop: 8 } as TextStyle,
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  slotsScroll: {} as ViewStyle,
  slotChip: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: COLORS.SURFACE_2, marginRight: SPACING.MD } as ViewStyle,
  activeSlot: { borderColor: COLORS.PRIMARY, backgroundColor: 'rgba(79, 70, 229, 0.2)', shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 } as ViewStyle,
  slotText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  activeSlotText: { color: COLORS.WHITE } as TextStyle,
  reviewCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: SPACING.LG, marginBottom: SPACING.MD, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 } as ViewStyle,
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  reviewAvatar: { width: 44, height: 44, borderRadius: 22 } as ImageStyle,
  reviewMeta: { gap: 4 } as ViewStyle,
  reviewName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  reviewStars: { color: COLORS.WARNING, fontSize: 12 } as TextStyle,
  reviewText: { color: 'rgba(255,255,255,0.8)', fontSize: TYPOGRAPHY.FONT_SIZE.SM, lineHeight: 22, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  stickyBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, paddingBottom: SPACING.XXL, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20 } as ViewStyle,
  priceMeta: { color: COLORS.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONT_FAMILY.SECONDARY, marginBottom: 2 } as TextStyle,
  price: { color: COLORS.TEXT_PRIMARY, fontSize: 26, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  // Compatibility pill
  compatRow: { marginBottom: SPACING.LG } as ViewStyle,
  compatPill: { alignSelf: 'flex-start', backgroundColor: 'rgba(34, 197, 94, 0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)', paddingHorizontal: 16, paddingVertical: 8, shadowColor: COLORS.SUCCESS, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 } as ViewStyle,
  compatText: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: 0.5 } as TextStyle,
  // Certification chips
  certRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  certChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.SURFACE_2, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 8 } as ViewStyle,
  certTick: { fontSize: 14 } as TextStyle,
  certLabel: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800' } as TextStyle,
  // Rating breakdown
  breakdownCard: { backgroundColor: COLORS.SURFACE_2, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: SPACING.LG, flexDirection: 'row', gap: SPACING.LG, marginBottom: SPACING.MD, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 } as ViewStyle,
  breakdownLeft: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 70 } as ViewStyle,
  bigRating: { color: COLORS.TEXT_PRIMARY, fontSize: 42, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', lineHeight: 48 } as TextStyle,
  starsLg: { color: COLORS.WARNING, fontSize: 14 } as TextStyle,
  reviewCountSm: { color: COLORS.TEXT_MUTED, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  breakdownBars: { flex: 1, gap: 5, justifyContent: 'center' } as ViewStyle,
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  barStarLabel: { color: COLORS.TEXT_MUTED, fontSize: 11, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, width: 22, textAlign: 'right' } as TextStyle,
  barTrack: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' } as ViewStyle,
  barFill: { height: 6, backgroundColor: COLORS.WARNING, borderRadius: 3 } as ViewStyle,
  barPct: { color: COLORS.TEXT_MUTED, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, width: 30, textAlign: 'right' } as TextStyle,
  writeReviewBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(79, 70, 229, 0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.3)', paddingHorizontal: 16, paddingVertical: 8, marginBottom: SPACING.LG } as ViewStyle,
  writeReviewText: { color: COLORS.PRIMARY_LIGHT, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, fontWeight: '800' } as TextStyle,
  // Intro chat button
  introChatBtn: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.4)', paddingVertical: 12, alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(34, 197, 94, 0.1)' } as ViewStyle,
  introChatGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as ViewStyle,
  introChatText: { color: COLORS.SUCCESS, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.HEADING, fontWeight: '800', letterSpacing: 0.5 } as TextStyle,
});

export default TrainerProfileScreen;
