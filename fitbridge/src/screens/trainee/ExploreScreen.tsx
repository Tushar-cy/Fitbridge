import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet, ViewStyle, TextStyle,
  TouchableOpacity, RefreshControl, TextInput, Image, ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { TrainerCard } from '../../components/features/trainer/TrainerCard';
import { TrainerCardSkeleton } from '../../components/ui/Skeleton';
import { supabaseService, TrainerFilters } from '../../services/api/supabaseService';
import { useAuthStore } from '../../store/authStore';
import type { Trainer } from '../../types/user.types';

const CATEGORIES = ['All', 'Gym', 'Yoga', 'HIIT', 'Calisthenics', 'Nutrition', 'Zumba'];

type Tab = 'trainers' | 'community' | 'profile';

// ── Community post card (mini) ────────────────────────────────────────────────
const MiniPostCard: React.FC<{ post: any; onPress: () => void }> = ({ post, onPress }) => (
  <TouchableOpacity style={mp.card} onPress={onPress} activeOpacity={0.85}>
    <Image
      source={{ uri: post.imageUrl ?? `https://picsum.photos/seed/${post.id}/300/300` }}
      style={mp.img as ImageStyle}
    />
    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={mp.grad} />
    <View style={mp.footer}>
      <Text style={mp.name} numberOfLines={1}>{post.authorName}</Text>
      <View style={mp.stats}>
        <Text style={mp.stat}>❤️ {post.likes ?? 0}</Text>
        <Text style={mp.stat}>💬 {post.comments ?? 0}</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const mp = StyleSheet.create({
  card: { width: '48%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden', marginBottom: 10, backgroundColor: COLORS.SURFACE_1 } as ViewStyle,
  img:  { width: '100%', height: '100%', resizeMode: 'cover' } as ImageStyle,
  grad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' } as ViewStyle,
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 } as ViewStyle,
  name: { color: COLORS.WHITE, fontSize: 11, fontWeight: '700', fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  stats: { flexDirection: 'row', gap: 8, marginTop: 2 } as ViewStyle,
  stat: { color: COLORS.TEXT_SECONDARY, fontSize: 10, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
});

// ── Profile setup card ────────────────────────────────────────────────────────
const ProfileSetupCard: React.FC<{ onSetup: () => void; onPost: () => void }> = ({ onSetup, onPost }) => (
  <View style={ps.wrap}>
    <LinearGradient colors={['#1e1b4b', '#0f172a']} style={ps.card}>
      <Text style={ps.emoji}>✨</Text>
      <Text style={ps.title}>Build Your Fitness Identity</Text>
      <Text style={ps.sub}>Complete your profile, showcase your journey, and connect with the FitBridge community.</Text>
      <TouchableOpacity style={ps.btn} onPress={onSetup} activeOpacity={0.85}>
        <LinearGradient colors={COLORS.GRADIENT_PRIMARY as any} style={ps.btnGrad}>
          <Text style={ps.btnText}>Set Up Social Profile →</Text>
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>

    {/* Quick actions */}
    {[
      { icon: '📸', label: 'Post a Workout', color: COLORS.PRIMARY, action: onPost },
      { icon: '🏆', label: 'Log Achievement', color: COLORS.SECONDARY, action: onSetup },
      { icon: '👥', label: 'Follow Trainers', color: COLORS.ACCENT, action: onSetup },
      { icon: '🤝', label: 'Join Community', color: '#EC4899', action: onSetup },
    ].map((item) => (
      <TouchableOpacity key={item.label} style={ps.row} onPress={item.action} activeOpacity={0.8}>
        <View style={[ps.rowIcon, { backgroundColor: `${item.color}18`, borderColor: `${item.color}33` }]}>
          <Text style={{ fontSize: 20 }}>{item.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ps.rowLabel}>{item.label}</Text>
          <Text style={ps.rowSub}>Tap to get started</Text>
        </View>
        <Text style={[ps.rowArrow, { color: item.color }]}>→</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const ps = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.SCREEN_H_PAD, gap: SPACING.MD, paddingBottom: SPACING.TAB_HEIGHT + 40 } as ViewStyle,
  card: { borderRadius: 24, padding: SPACING.XL, alignItems: 'center', gap: SPACING.SM, borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)', marginBottom: SPACING.SM } as ViewStyle,
  emoji: { fontSize: 48 } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING, textAlign: 'center' } as TextStyle,
  sub: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, textAlign: 'center', lineHeight: 20 } as TextStyle,
  btn: { borderRadius: 14, overflow: 'hidden', marginTop: SPACING.SM, width: '100%' } as ViewStyle,
  btnGrad: { paddingVertical: 14, alignItems: 'center' } as ViewStyle,
  btnText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD, backgroundColor: COLORS.SURFACE_1, borderRadius: 18, padding: SPACING.MD, borderWidth: 1, borderColor: COLORS.CARD_BORDER } as ViewStyle,
  rowIcon: { width: 50, height: 50, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  rowLabel: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700', fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  rowSub: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY, marginTop: 2 } as TextStyle,
  rowArrow: { fontSize: 20, fontWeight: '700' } as TextStyle,
});

// ── Main screen ───────────────────────────────────────────────────────────────
export const ExploreScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>('trainers');
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const filters: TrainerFilters = {};
      if (activeCategory !== 'All') filters.specialisation = activeCategory;
      const [trainers, feedPosts] = await Promise.all([
        supabaseService.getTrainers(filters),
        supabaseService.getPosts(0, 12).catch(() => []),
      ]);
      setAllTrainers(trainers);
      setPosts(feedPosts as any[]);
    } catch (err) {
      console.warn('[ExploreScreen]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const filtered = allTrainers.filter((t) => {
    const q = query.toLowerCase();
    return !q
      || (t.name || '').toLowerCase().includes(q)
      || (t.specialisation || []).some((s) => (s || '').toLowerCase().includes(q))
      || (t.location || '').toLowerCase().includes(q);
  });

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: 'trainers',  label: 'Trainers',  icon: '🏋️' },
    { key: 'community', label: 'Community', icon: '📸' },
    { key: 'profile',   label: 'My Profile', icon: '✨' },
  ];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Explore</Text>
          <Text style={s.subtitle}>Discover trainers &amp; community</Text>
        </View>
        <TouchableOpacity
          style={s.postBtn}
          onPress={() => navigation.navigate('CreatePost')}
          activeOpacity={0.85}
        >
          <LinearGradient colors={COLORS.GRADIENT_PRIMARY as any} style={s.postBtnGrad}>
            <Text style={s.postBtnText}>+ Post</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && s.tabItemActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={s.tabIcon}>{t.icon}</Text>
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
            {tab === t.key && <View style={s.tabUnderline} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Trainers Tab ── */}
      {tab === 'trainers' && (
        <>
          {/* Search */}
          <View style={s.searchWrap}>
            <Text style={s.searchIcon}>🔍</Text>
            <TextInput
              style={s.searchInput}
              placeholder="Search trainers, skills, cities..."
              placeholderTextColor={COLORS.TEXT_MUTED}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {/* Category chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            style={s.chipsScroll} contentContainerStyle={s.chipsContent}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.chip, activeCategory === cat && s.chipActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[s.chipText, activeCategory === cat && s.chipTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? (
            <View style={{ paddingHorizontal: SPACING.SCREEN_H_PAD }}>
              {Array.from({ length: 4 }).map((_, i) => <TrainerCardSkeleton key={i} />)}
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TrainerCard
                  variant="landscape"
                  trainer={item}
                  onPress={(t) => navigation.navigate('TrainerProfile', { trainerId: t.id })}
                  onBook={(t) => navigation.navigate('Booking', { trainerId: t.id })}
                />
              )}
              contentContainerStyle={{ paddingHorizontal: SPACING.SCREEN_H_PAD }}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} colors={[COLORS.PRIMARY]} />}
              ListFooterComponent={<View style={{ height: SPACING.TAB_HEIGHT + 40 }} />}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={{ fontSize: 52 }}>🔍</Text>
                  <Text style={s.emptyTitle}>No trainers found</Text>
                  <Text style={s.emptySub}>Try adjusting your search or filters</Text>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ── Community Tab ── */}
      {tab === 'community' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.PRIMARY} colors={[COLORS.PRIMARY]} />}
          contentContainerStyle={{ paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.MD, paddingBottom: SPACING.TAB_HEIGHT + 40 }}
        >
          {/* Create post CTA */}
          <TouchableOpacity style={s.createPostBanner} onPress={() => navigation.navigate('CreatePost')} activeOpacity={0.85}>
            <LinearGradient colors={['#1e1b4b', '#0f172a']} style={s.createPostInner}>
              <View style={s.createPostLeft}>
                <Text style={{ fontSize: 28 }}>📸</Text>
                <View>
                  <Text style={s.createPostTitle}>Share your workout</Text>
                  <Text style={s.createPostSub}>Inspire the community</Text>
                </View>
              </View>
              <View style={s.createPostBtn}>
                <Text style={s.createPostBtnText}>Post</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Grid of posts */}
          <Text style={s.sectionLabel}>🔥 Trending Posts</Text>
          {loading ? (
            <View style={{ gap: 10 }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <View key={i} style={{ height: 160, backgroundColor: COLORS.SURFACE_1, borderRadius: 16 }} />
              ))}
            </View>
          ) : posts.length === 0 ? (
            <View style={s.empty}>
              <Text style={{ fontSize: 52 }}>🤸</Text>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Be the first to share your workout!</Text>
            </View>
          ) : (
            <View style={s.grid}>
              {posts.map((post) => (
                <MiniPostCard
                  key={post.id}
                  post={post}
                  onPress={() => navigation.navigate('FitFeed')}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* ── Profile Tab ── */}
      {tab === 'profile' && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: SPACING.MD }}>
          <ProfileSetupCard
            onSetup={() => navigation.navigate('Profile')}
            onPost={() => navigation.navigate('CreatePost')}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, paddingBottom: SPACING.MD } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING, letterSpacing: -0.5 } as TextStyle,
  subtitle: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, marginTop: 2 } as TextStyle,
  postBtn: { borderRadius: 12, overflow: 'hidden' } as ViewStyle,
  postBtnGrad: { paddingHorizontal: 18, paddingVertical: 10 } as ViewStyle,
  postBtnText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800', fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.CARD_BORDER, marginBottom: SPACING.MD } as ViewStyle,
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 2, position: 'relative' } as ViewStyle,
  tabItemActive: {} as ViewStyle,
  tabIcon: { fontSize: 18 } as TextStyle,
  tabLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '600', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  tabLabelActive: { color: COLORS.PRIMARY, fontWeight: '800' } as TextStyle,
  tabUnderline: { position: 'absolute', bottom: -1, left: '20%', right: '20%', height: 2, backgroundColor: COLORS.PRIMARY, borderRadius: 2 } as ViewStyle,
  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.SCREEN_H_PAD, marginBottom: SPACING.MD, backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, paddingHorizontal: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  searchIcon: { fontSize: 16 } as TextStyle,
  searchInput: { flex: 1, color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, paddingVertical: 12 } as TextStyle,
  // Chips
  chipsScroll: { maxHeight: 48, flexGrow: 0, marginBottom: SPACING.MD } as ViewStyle,
  chipsContent: { paddingHorizontal: SPACING.SCREEN_H_PAD, gap: SPACING.SM, alignItems: 'center' } as ViewStyle,
  chip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 24, borderWidth: 1, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_1 } as ViewStyle,
  chipActive: { backgroundColor: `${COLORS.PRIMARY}20`, borderColor: COLORS.PRIMARY } as ViewStyle,
  chipText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  chipTextActive: { color: COLORS.PRIMARY, fontWeight: '800' } as TextStyle,
  // Community
  createPostBanner: { borderRadius: 20, overflow: 'hidden', marginBottom: SPACING.LG, borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)' } as ViewStyle,
  createPostInner: { flexDirection: 'row', alignItems: 'center', padding: SPACING.LG, gap: SPACING.MD } as ViewStyle,
  createPostLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  createPostTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  createPostSub: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  createPostBtn: { backgroundColor: COLORS.PRIMARY, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 } as ViewStyle,
  createPostBtnText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800' } as TextStyle,
  sectionLabel: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', fontFamily: FONT_FAMILY.HEADING, marginBottom: SPACING.MD } as TextStyle,
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' } as ViewStyle,
  // Empty
  empty: { alignItems: 'center', marginTop: 60, gap: SPACING.MD } as ViewStyle,
  emptyTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  emptySub: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, textAlign: 'center', fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
});

export default ExploreScreen;
