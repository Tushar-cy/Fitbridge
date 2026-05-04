export type PostType = 'image' | 'reel';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  likes: number;
  createdAt: string;
}

export interface Post {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorRole?: string;
  authorVerified: boolean;
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  caption: string;
  tags: string[];
  likes: number;
  comments: number;        // count — NOT Comment[] — matches DB column comments_count
  shares: number;
  isLiked: boolean;
  createdAt: string;
}
