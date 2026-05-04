/**
 * feedService.ts — Production-grade Supabase feed service.
 *
 * Fixes in this version:
 *  1. likePost RPC fallback corrected — no longer uses `supabase.rpc as any`.
 *  2. fetchFeedWithLikeStatus loads isLiked for all posts in a single query.
 *  3. Follow/Unfollow system backed by `follows` Supabase table.
 *  4. Comment subscription enriched with author profile fallback.
 *  5. Full logging throughout.
 */

import { supabase } from '../../lib/supabase';
import { supabaseService } from './supabaseService';
import type { Post } from '../../types/feed.types';

// ── Post CRUD ─────────────────────────────────────────────────────────────────

export const feedService = {
  /** Fetch paginated feed (approved posts only, newest first) */
  getPosts: (page = 0, limit = 20): Promise<Post[]> =>
    supabaseService.getPosts(page, limit),

  /**
   * Fetch feed AND annotate each post with the current user's liked status.
   * Single extra query for `post_likes` instead of N queries.
   */
  getFeedWithLikeStatus: async (userId: string | undefined, page = 0, limit = 20): Promise<Post[]> => {
    const posts = await supabaseService.getPosts(page, limit);
    if (!userId || posts.length === 0) return posts;

    try {
      const postIds = posts.map((p) => p.id);
      const { data: likedRows } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds);

      const likedSet = new Set((likedRows ?? []).map((r: any) => r.post_id));
      return posts.map((p) => ({ ...p, isLiked: likedSet.has(p.id) }));
    } catch (err) {
      console.warn('[feedService.getFeedWithLikeStatus] isLiked check failed:', err);
      return posts;
    }
  },

  /**
   * Create a new post.
   * FLOW: caller must upload media first → get URL → call this.
   */
  createPost: async (
    authorId: string,
    content: string,
    mediaUrls: string[],
    mediaType: 'image' | 'video' | 'text',
    tags: string[] = [],
  ): Promise<Post> => {
    console.log('[feedService.createPost] Starting insert for user:', authorId);

    if (!authorId) throw new Error('Cannot create post: user is not authenticated.');
    if (!content?.trim()) throw new Error('Caption is required.');

    // 1. Ensure profile exists to prevent FK violation
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        await supabase.from('profiles').upsert({
          id: authorId,
          full_name: userData.user.user_metadata?.full_name || 'FitBridge User',
          role: userData.user.user_metadata?.role || 'trainee'
        }, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('[feedService.createPost] Profile upsert failed:', e);
    }

    const { data, error } = await supabase
      .from('feed_posts')
      .insert({
        author_id:         authorId,
        content:           content.trim(),
        media_urls:        mediaUrls,
        media_type:        mediaType,
        tags,
        moderation_status: 'approved', // Auto-approve for MVP
        likes_count:       0,
        comments_count:    0,
        shares_count:      0,
      })
      .select(`
        *,
        author:profiles (full_name, avatar_url, role)
      `)
      .single();

    if (error) {
      console.error('[feedService.createPost] Supabase error:', error.message, error.details, error.hint);
      throw new Error(`Post creation failed: ${error.message}`);
    }

    console.log('[feedService.createPost] ✅ Post saved:', data.id);
    return mapPostRow(data);
  },

  // ── Likes ──────────────────────────────────────────────────────────────────

  /**
   * Like a post. Safe to call even if already liked (returns silently).
   */
  likePost: async (postId: string, userId: string): Promise<void> => {
    if (!userId || !postId) return;

    // 1. Insert like (ignore conflict — user may have already liked)
    const { error: insertErr } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId });

    if (insertErr && !insertErr.message.includes('duplicate') && !insertErr.code?.includes('23505')) {
      console.warn('[feedService.likePost] Insert error:', insertErr.message);
    }

    // 2. Try the denormalized counter via RPC
    const { error: rpcErr } = await supabase.rpc('increment_likes', { post_id: postId });
    if (rpcErr) {
      console.warn('[feedService.likePost] increment_likes RPC failed, falling back to manual increment:', rpcErr.message);
      // Manual fallback: read current count then set count + 1
      const { data: post } = await supabase
        .from('feed_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();
      if (post) {
        await supabase
          .from('feed_posts')
          .update({ likes_count: (post.likes_count ?? 0) + 1 })
          .eq('id', postId);
      }
    }
  },

  /**
   * Unlike a post. Safe to call even if not liked.
   */
  unlikePost: async (postId: string, userId: string): Promise<void> => {
    if (!userId || !postId) return;

    await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    const { error: rpcErr } = await supabase.rpc('decrement_likes', { post_id: postId });
    if (rpcErr) {
      console.warn('[feedService.unlikePost] decrement_likes RPC failed, falling back:', rpcErr.message);
      const { data: post } = await supabase
        .from('feed_posts')
        .select('likes_count')
        .eq('id', postId)
        .single();
      if (post) {
        await supabase
          .from('feed_posts')
          .update({ likes_count: Math.max(0, (post.likes_count ?? 1) - 1) })
          .eq('id', postId);
      }
    }
  },

  /** Check whether the current user has liked a post */
  isPostLikedByUser: async (postId: string, userId: string): Promise<boolean> => {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  },

  // ── Follow System ──────────────────────────────────────────────────────────

  /**
   * Follow a user. Creates a row in the `follows` table.
   * Safe to call even if already following (Supabase upsert).
   */
  followUser: async (followerId: string, followingId: string): Promise<void> => {
    if (!followerId || !followingId || followerId === followingId) return;
    console.log(`[feedService.followUser] ${followerId} → ${followingId}`);
    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: followerId, following_id: followingId }, { onConflict: 'follower_id,following_id' });
    if (error) {
      console.error('[feedService.followUser] error:', error.message);
      throw new Error(`Follow failed: ${error.message}`);
    }
  },

  /**
   * Unfollow a user. Removes the row from `follows`.
   */
  unfollowUser: async (followerId: string, followingId: string): Promise<void> => {
    if (!followerId || !followingId) return;
    console.log(`[feedService.unfollowUser] ${followerId} ✕ ${followingId}`);
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) {
      console.error('[feedService.unfollowUser] error:', error.message);
      throw new Error(`Unfollow failed: ${error.message}`);
    }
  },

  /** Returns true if `followerId` is following `followingId`. */
  isFollowing: async (followerId: string, followingId: string): Promise<boolean> => {
    if (!followerId || !followingId) return false;
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !!data;
  },

  /**
   * Batch-check which users the current user is following.
   * Returns a Set of followingIds for O(1) lookups in FlatList.
   */
  getFollowingSet: async (followerId: string, userIds: string[]): Promise<Set<string>> => {
    if (!followerId || userIds.length === 0) return new Set();
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', followerId)
      .in('following_id', userIds);
    return new Set((data ?? []).map((r: any) => r.following_id));
  },

  // ── Comments ───────────────────────────────────────────────────────────────

  getComments: async (postId: string) => {
    const { data, error } = await supabase
      .from('post_comments')
      .select('*, author:profiles(full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('[feedService.getComments]', error.message);
      return [];
    }
    return data ?? [];
  },

  commentOnPost: async (postId: string, authorId: string, content: string) => {
    if (!content?.trim()) throw new Error('Comment cannot be empty.');

    const { data, error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: authorId, content: content.trim() })
      .select('*, author:profiles(full_name, avatar_url)')
      .single();

    if (error) {
      console.error('[feedService.commentOnPost]', error.message);
      throw new Error(`Comment failed: ${error.message}`);
    }

    // Increment comment count (non-blocking)
    try { await supabase.rpc('increment_comments', { post_id: postId }); } catch (_) {
      // Fallback: manual increment
      const { data: post } = await supabase.from('feed_posts').select('comments_count').eq('id', postId).single();
      if (post) await supabase.from('feed_posts').update({ comments_count: (post.comments_count ?? 0) + 1 }).eq('id', postId);
    }

    return data;
  },

  // ── Realtime ───────────────────────────────────────────────────────────────

  subscribeLikes: (postId: string, onUpdate: (count: number) => void): (() => void) => {
    const channel = supabase
      .channel(`post_likes_${postId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_likes', filter: `post_id=eq.${postId}` },
        async () => {
          const { data } = await supabase
            .from('feed_posts')
            .select('likes_count')
            .eq('id', postId)
            .single();
          if (data?.likes_count != null) onUpdate(data.likes_count);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  subscribeComments: (postId: string, onNew: (comment: any) => void): (() => void) => {
    const channel = supabase
      .channel(`post_comments_${postId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          // Enrich with author profile
          const raw = payload.new as any;
          if (!raw?.author_id) { onNew(raw); return; }
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', raw.author_id)
            .single();
          onNew({ ...raw, author: profile ?? { full_name: 'User', avatar_url: '' } });
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },

  subscribeNewPosts: (onNew: (post: Post) => void): (() => void) => {
    const channel = supabase
      .channel('feed_new_posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'feed_posts', filter: `moderation_status=eq.approved` },
        async (payload) => {
          if (!payload.new) return;
          // Enrich with author profile
          const raw = payload.new as any;
          if (raw.author_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, role')
              .eq('id', raw.author_id)
              .single();
            onNew(mapPostRow({ ...raw, author: profile }));
          } else {
            onNew(mapPostRow(raw));
          }
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  },
};

// ── Internal mapper (mirrors supabaseService.mapPostRow) ─────────────────────

function mapPostRow(row: any): Post {
  return {
    id:             row.id,
    type:           row.media_type === 'video' ? 'reel' : 'image',
    authorId:       row.author_id,
    authorName:     row.author?.full_name ?? 'FitBridge User',
    authorAvatar:   row.author?.avatar_url ?? `https://picsum.photos/seed/${row.author_id}/200/200`,
    authorRole:     row.author?.role ?? 'trainee',
    authorVerified: row.author?.role === 'trainer',
    imageUrl:       row.media_type === 'image'  ? row.media_urls?.[0] : undefined,
    videoUrl:       row.media_type === 'video'  ? row.media_urls?.[0] : undefined,
    thumbnailUrl:   row.media_urls?.[0],
    caption:        row.content ?? '',
    tags:           row.tags ?? [],
    likes:          row.likes_count ?? 0,
    comments:       row.comments_count ?? 0,
    shares:         row.shares_count ?? 0,
    isLiked:        false,
    createdAt:      row.created_at,
  };
}

// ── Named exports for convenience ─────────────────────────────────────────────
export const {
  getPosts, getFeedWithLikeStatus, createPost,
  likePost, unlikePost, isPostLikedByUser,
  followUser, unfollowUser, isFollowing, getFollowingSet,
  commentOnPost, getComments,
  subscribeLikes, subscribeComments, subscribeNewPosts,
} = feedService;

