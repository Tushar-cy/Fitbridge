import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ViewStyle, TextStyle, TouchableOpacity,
  Image, ImageStyle, Dimensions, RefreshControl, Share, Modal, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { FeedCardSkeleton } from '../../components/ui/Skeleton';
import { supabaseService } from '../../services/api/supabaseService';

import { useAuthStore } from '../../store/authStore';
import { feedService } from '../../services/api/feedService';
import type { Post } from '../../types/feed.types';

const { width: W } = Dimensions.get('window');

// Story bar
const StoryRing: React.FC<{ uri: string; name: string; isNew?: boolean; onPress: () => void }> = ({
  uri, name, isNew = true, onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={stStyles.wrap} activeOpacity={0.85}>
    <LinearGradient
      colors={isNew ? COLORS.GRADIENT_VIOLET : [COLORS.CARD_BORDER, COLORS.CARD_BORDER] as any}
      style={stStyles.ring}
    >
      <Image source={{ uri }} style={stStyles.img as ImageStyle} />
    </LinearGradient>
    <Text style={stStyles.name} numberOfLines={1}>{name}</Text>
  </TouchableOpacity>
);

const stStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6, width: 72, marginRight: SPACING.SM } as ViewStyle,
  ring: { width: 68, height: 68, borderRadius: 34, padding: 2.5, shadowColor: COLORS.PRIMARY, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 } as ViewStyle,
  img: { width: 63, height: 63, borderRadius: 31.5, borderWidth: 2.5, borderColor: COLORS.DARK_BG } as ImageStyle,
  name: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, textAlign: 'center', marginTop: 2 } as TextStyle,
});

// Feed post card
const FeedCard: React.FC<{ post: any; userId?: string; isFollowing?: boolean; onLike: (id: string, isLiked: boolean) => void; onComment: (post: any) => void; onAuthorPress: (id: string) => void; onFollowToggle?: (authorId: string, now: boolean) => void; status?: string; flagReason?: string }> = ({
  post, userId, isFollowing = false, onLike, onComment, onAuthorPress, onFollowToggle, status = 'approved', flagReason,
}) => {
  const [liked, setLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [following, setFollowing] = useState(isFollowing);

  const handleLike = () => {
    const nowLiked = !liked;
    setLiked(nowLiked);
    setLikeCount((c: number) => nowLiked ? c + 1 : c - 1);
    onLike(post.id, liked);
  };

  const handleFollowToggle = async () => {
    if (!userId || userId === post.authorId) return;
    const nowFollowing = !following;
    setFollowing(nowFollowing);
    try {
      if (nowFollowing) await feedService.followUser(userId, post.authorId);
      else await feedService.unfollowUser(userId, post.authorId);
      onFollowToggle?.(post.authorId, nowFollowing);
    } catch {
      setFollowing(!nowFollowing); // revert
    }
  };

  return (
    <View style={fcStyles.card}>
      {/* Author row */}
      <View style={fcStyles.authorRow}>
        <TouchableOpacity onPress={() => onAuthorPress(post.authorId)} style={fcStyles.authorLeft}>
          <LinearGradient colors={COLORS.GRADIENT_VIOLET} style={fcStyles.avatarRing}>
            <Image source={{ uri: post.authorAvatar }} style={fcStyles.avatar as ImageStyle} />
          </LinearGradient>
          <View>
            <Text style={fcStyles.authorName}>{post.authorName}</Text>
            <Text style={fcStyles.authorRole}>{post.authorRole}</Text>
          </View>
        </TouchableOpacity>
        {userId !== post.authorId && (
          <TouchableOpacity
            style={[fcStyles.followBtn, following && fcStyles.followingBtn]}
            onPress={handleFollowToggle}
          >
            <Text style={[fcStyles.followText, following && fcStyles.followingText]}>
              {following ? '✓ Following' : '+ Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media */}
      <View style={fcStyles.mediaWrap}>
        <Image
          source={{ uri: post.imageUrl ?? post.videoUrl ?? post.thumbnailUrl ?? `https://picsum.photos/seed/${post.id}/400/440` }}
          style={fcStyles.media as ImageStyle}
        />
        {post.type === 'reel' && (
          <>
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={fcStyles.reelGrad} />
            <View style={fcStyles.playBtn}>
              <Text style={fcStyles.playIcon}>▶</Text>
            </View>
            <View style={fcStyles.reelBadge}>
              <Text style={fcStyles.reelBadgeText}>REEL</Text>
            </View>
          </>
        )}
      </View>

      {/* Actions */}
      <View style={fcStyles.actions}>
        <TouchableOpacity style={fcStyles.action} onPress={handleLike}>
          <Text style={[fcStyles.actionIcon, liked && fcStyles.likedIcon]}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={fcStyles.actionCount}>{likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fcStyles.action} onPress={() => onComment(post)}>
          <Text style={fcStyles.actionIcon}>💬</Text>
          <Text style={fcStyles.actionCount}>{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fcStyles.action} onPress={() => Share.share({ message: `Check out ${post.authorName}'s post on FitBridge: "${post.caption}"\nDownload the app to see more!` })}>
          <Text style={fcStyles.actionIcon}>↗️</Text>
          <Text style={fcStyles.actionCount}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[fcStyles.action, { marginLeft: 'auto' as any }]}>
          <Text style={fcStyles.actionIcon}>🔖</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={fcStyles.captionWrap}>
        <Text style={fcStyles.caption} numberOfLines={2}>
          <Text style={fcStyles.captionBold}>{post.authorName} </Text>
          {post.caption}
        </Text>
      </View>
      {flagReason && (
        <View style={{ paddingHorizontal: SPACING.SCREEN_H_PAD, marginTop: 4 }}>
          <Text style={{ color: '#FFD700', fontSize: 12 }}>⚠️ {flagReason}</Text>
        </View>
      )}
    </View>
  );
};

const fcStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.DARK_BG, marginBottom: SPACING.LG, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: SPACING.SM } as ViewStyle,
  authorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD } as ViewStyle,
  authorLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 } as ViewStyle,
  avatarRing: { width: 46, height: 46, borderRadius: 23, padding: 2 } as ViewStyle,
  avatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: COLORS.DARK_BG } as ImageStyle,
  authorName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  authorRole: { color: COLORS.PRIMARY_LIGHT, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, marginTop: 2 } as TextStyle,
  followBtn:    { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(79, 70, 229, 0.15)', borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)' } as ViewStyle,
  followingBtn: { backgroundColor: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.35)' } as ViewStyle,
  followText:   { color: COLORS.PRIMARY_LIGHT, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  followingText:{ color: '#22c55e' } as TextStyle,
  mediaWrap: { width: W, height: W * 1.25, position: 'relative' } as ViewStyle,
  media: { width: '100%', height: '100%' } as ImageStyle,
  reelGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' } as ViewStyle,
  playBtn: { position: 'absolute', left: '50%', top: '50%', width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', marginLeft: -32, marginTop: -32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 } as ViewStyle,
  playIcon: { color: COLORS.WHITE, fontSize: 26, marginLeft: 4 } as TextStyle,
  reelBadge: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(255, 76, 139, 0.9)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, shadowColor: '#FF4C8B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 4 } as ViewStyle,
  reelBadgeText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING, letterSpacing: 1 } as TextStyle,
  actions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.XL, paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: 16, paddingBottom: 10 } as ViewStyle,
  action: { flexDirection: 'row', alignItems: 'center', gap: 6 } as ViewStyle,
  actionIcon: { fontSize: 24 } as TextStyle,
  likedIcon: {} as TextStyle,
  actionCount: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  captionWrap: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: 4, paddingBottom: 8 } as ViewStyle,
  caption: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, lineHeight: 22, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  captionBold: { color: COLORS.TEXT_PRIMARY, fontWeight: '800', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
});

export const FitFeedScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts]           = useState<Post[]>([]);
  const [trainers, setTrainers]     = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(true);

  // Comments state
  const [commentPost, setCommentPost] = useState<Post | null>(null);
  const [commentText, setCommentText] = useState('');
  const [commenting, setCommenting]   = useState(false);

  const handleLike = useCallback(async (id: string, isLiked: boolean) => {
    if (!userId) return;
    try {
      if (isLiked) {
        await feedService.unlikePost(id, userId);
      } else {
        await feedService.likePost(id, userId);
      }
    } catch (err) {
      console.warn('Failed to like post:', err);
    }
  }, [userId]);

  const handlePostComment = async () => {
    if (!commentPost || !userId || !commentText.trim() || commenting) return;
    setCommenting(true);
    try {
      await feedService.commentOnPost(commentPost.id, userId, commentText);
      // Optimistic update
      setPosts((prev) => prev.map(p => p.id === commentPost.id ? { ...p, comments: (p.comments || 0) + 1 } : p));
      setCommentText('');
      setCommentPost(null);
    } catch (err) {
      console.warn('Failed to post comment', err);
    } finally {
      setCommenting(false);
    }
  };

  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async (pageNum = 0, replace = false) => {
    try {
      // Load posts with per-user isLiked state in one batch query
      const data = await feedService.getFeedWithLikeStatus(userId, pageNum, 20);
      if (data.length < 20) setHasMore(false);
      setPosts((prev) => replace ? data : [...prev, ...data]);
      // Batch-load which authors current user follows
      if (userId && data.length > 0) {
        const authorIds = [...new Set(data.map((p) => p.authorId))];
        feedService.getFollowingSet(userId, authorIds)
          .then(setFollowingSet)
          .catch(() => {});
      }
    } catch (err) {
      console.warn('[FitFeedScreen] loadPosts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      // Auto-refresh feed when screen comes into focus
      loadPosts(0, true);
      supabaseService.getTrainers().then((t) => setTrainers(t.slice(0, 8))).catch(() => {});
    }, [loadPosts])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    loadPosts(0, true);
  }, [loadPosts]);

  const onEndReached = useCallback(() => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadPosts(nextPage, false);
  }, [hasMore, loading, page, loadPosts]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>Fit<Text style={s.logoAccent}>Feed</Text></Text>
        <View style={s.headerActions}>
          <TouchableOpacity style={s.headerBtn}><Text style={s.headerBtnIcon}>🔔</Text></TouchableOpacity>
          <TouchableOpacity style={s.headerBtn}><Text style={s.headerBtnIcon}>✉️</Text></TouchableOpacity>
        </View>
      </View>

      {/* Feed list */}
      {loading ? (
        <View style={{ paddingTop: 16 }}>
          {Array.from({ length: 3 }).map((_, i) => <FeedCardSkeleton key={i} />)}
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.PRIMARY}
              colors={[COLORS.PRIMARY]}
              title="Refreshing feed..."
              titleColor={COLORS.TEXT_MUTED}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={
            <View style={s.storiesBar}>
              <FlatList
                data={trainers}
                horizontal
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <StoryRing
                    uri={item.photo || `https://ui-avatars.com/api/?name=${item.name.split(' ')[0]}&background=4F46E5&color=fff&size=150`}
                    name={item.name.split(' ')[0]}
                    onPress={() => navigation.navigate('TrainerProfile', { trainerId: item.id })}
                  />
                )}
              />
            </View>
          }
          renderItem={({ item }) => (
            <FeedCard
              post={item}
              userId={userId}
              isFollowing={followingSet.has(item.authorId)}
              onLike={handleLike}
              onComment={setCommentPost}
              onAuthorPress={(id) => {
                if (id === userId) {
                  navigation.navigate('Profile');
                } else {
                  navigation.navigate('TrainerProfile', { trainerId: id });
                }
              }}
              onFollowToggle={(authorId, nowFollowing) => {
                setFollowingSet((prev) => {
                  const next = new Set(prev);
                  nowFollowing ? next.add(authorId) : next.delete(authorId);
                  return next;
                });
              }}
              status={(item as any).moderation_status ?? 'approved'}
              flagReason={(item as any).flag_reason}
            />
          )}
          ListFooterComponent={<View style={{ height: SPACING.TAB_HEIGHT + 80 }} />}
        />
      )}

      {/* Create Post FAB */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.88}
      >
        <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.fabGradient}>
          <Text style={s.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Comments Modal ─────────────────────────────────────────────────── */}
      <Modal visible={!!commentPost} transparent animationType="slide" onRequestClose={() => setCommentPost(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View style={{ backgroundColor: COLORS.SURFACE_1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SPACING.LG, paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.LG }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.MD }}>
              <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: 18, fontFamily: FONT_FAMILY.HEADING, fontWeight: '800' }}>Comments</Text>
              <TouchableOpacity onPress={() => setCommentPost(null)}>
                <Text style={{ color: COLORS.TEXT_MUTED, fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <TextInput
                style={{ flex: 1, backgroundColor: COLORS.SURFACE_2, color: COLORS.TEXT_PRIMARY, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 }}
                placeholder="Write a comment..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                value={commentText}
                onChangeText={setCommentText}
                autoFocus
                multiline
              />
              <TouchableOpacity 
                style={{ backgroundColor: commentText.trim() ? COLORS.PRIMARY : COLORS.SURFACE_3, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 }}
                onPress={handlePostComment}
                disabled={!commentText.trim() || commenting}
              >
                <Text style={{ color: commentText.trim() ? COLORS.WHITE : COLORS.TEXT_MUTED, fontWeight: '700' }}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' } as ViewStyle,
  logo: { color: COLORS.TEXT_PRIMARY, fontSize: 26, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  logoAccent: { color: COLORS.PRIMARY } as TextStyle,
  headerActions: { flexDirection: 'row', gap: SPACING.MD } as ViewStyle,
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  headerBtnIcon: { fontSize: 20 } as TextStyle,
  storiesBar: { paddingVertical: SPACING.LG, paddingLeft: SPACING.SCREEN_H_PAD, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.01)' } as ViewStyle,
  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.TAB_HEIGHT + SPACING.MD,
    right: SPACING.SCREEN_H_PAD,
    borderRadius: 28,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
  } as ViewStyle,
  fabGradient: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  fabIcon: { color: COLORS.WHITE, fontSize: 32, fontWeight: '400', lineHeight: 34 } as TextStyle,
});

export default FitFeedScreen;
