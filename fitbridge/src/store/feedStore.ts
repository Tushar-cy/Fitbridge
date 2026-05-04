import { create } from 'zustand';
import { Post } from '../types/feed.types';

interface FeedState {
  posts: Post[];
  likedPostIds: Set<string>;
  setPosts: (posts: Post[]) => void;
  addPosts: (posts: Post[]) => void;
  toggleLike: (postId: string) => void;
  incrementShares: (postId: string) => void;
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  likedPostIds: new Set(),

  setPosts: (posts) => set({ posts }),

  addPosts: (newPosts) =>
    set((state) => ({ posts: [...state.posts, ...newPosts] })),

  toggleLike: (postId) =>
    set((state) => {
      const likedPostIds = new Set(state.likedPostIds);
      const posts = state.posts.map((p) => {
        if (p.id !== postId) return p;
        const isLiked = likedPostIds.has(postId);
        if (isLiked) {
          likedPostIds.delete(postId);
          return { ...p, likes: p.likes - 1, isLiked: false };
        } else {
          likedPostIds.add(postId);
          return { ...p, likes: p.likes + 1, isLiked: true };
        }
      });
      return { posts, likedPostIds };
    }),

  incrementShares: (postId) =>
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId ? { ...p, shares: p.shares + 1 } : p,
      ),
    })),
}));
