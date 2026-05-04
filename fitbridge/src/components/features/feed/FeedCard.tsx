import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Dimensions,
} from 'react-native';
import { Post } from '../../../types/feed.types';
import { COLORS } from '../../../theme/colors';
import SPACING from '../../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../../theme/typography';
import { formatRelative } from '../../../utils/formatDate';
import { Avatar } from '../../ui/Avatar';
import { Badge } from '../../ui/Badge';

const { width: SCREEN_W } = Dimensions.get('window');

export type ModerationStatus = 'approved' | 'pending' | 'flagged';


interface FeedCardProps {
  post: Post;
  onLike: (id: string) => void;
  onComment?: (id: string) => void;
  onAuthorPress?: (authorId: string) => void;
  /** Moderation status from BERT pipeline — defaults to 'approved' */
  status?: ModerationStatus;
  /** Reason shown when status === 'flagged' */
  flagReason?: string;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  post,
  onLike,
  onComment,
  onAuthorPress,
  status = 'approved',
  flagReason,
}) => {
  // Flagged posts replace all content with a warning card
  if (status === 'flagged') {
    return (
      <View style={styles.flaggedCard}>
        <View style={styles.flaggedInner}>
          <Text style={styles.flaggedIcon}>🚩</Text>
          <Text style={styles.flaggedTitle}>Content Flagged</Text>
          <Text style={styles.flaggedReason}>
            {flagReason ?? 'This post has been flagged for review and is temporarily hidden.'}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.card}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => onAuthorPress?.(post.authorId)}
        activeOpacity={0.8}
      >
        <Avatar uri={post.authorAvatar} size={40} />
        <View style={styles.authorInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            {post.authorVerified && (
              <View style={styles.verifiedDot} />
            )}
          </View>
          {post.authorVerified && (
            <Text style={styles.aiVerified}>✅ AI Verified Trainer</Text>
          )}
          <Text style={styles.timestamp}>{formatRelative(post.createdAt)}</Text>
        </View>
        {post.type === 'reel' && <Badge label="Reel" variant="primary" size="sm" />}
      </TouchableOpacity>

      {/* Media — with optional pending overlay */}
      {post.imageUrl && (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: post.imageUrl }}
            style={[styles.media as ImageStyle, status === 'pending' && { opacity: 0.5 }]}
            resizeMode="cover"
          />
          {status === 'pending' && (
            <View style={styles.pendingOverlay}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>⏳ Under Review</Text>
              </View>
            </View>
          )}
        </View>
      )}
      {post.thumbnailUrl && !post.imageUrl && (
        <View style={{ position: 'relative' }}>
          <Image
            source={{ uri: post.thumbnailUrl }}
            style={[styles.media as ImageStyle, status === 'pending' && { opacity: 0.5 }]}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <Text style={styles.playIcon}>▶</Text>
          </View>
          {status === 'pending' && (
            <View style={styles.pendingOverlay}>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>⏳ Under Review</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onLike(post.id)}>
          <Text style={[styles.actionIcon, post.isLiked && styles.likedIcon]}>
            {post.isLiked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionCount}>{post.likes.toLocaleString()}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onComment?.(post.id)}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn}>
          <Text style={styles.actionIcon}>↗️</Text>
          <Text style={styles.actionCount}>{post.shares}</Text>
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.caption}>
        <Text style={styles.captionText} numberOfLines={3}>
          <Text style={styles.authorNameInline}>{post.authorName} </Text>
          {post.caption}
        </Text>
        {post.tags.length > 0 && (
          <Text style={styles.tags}>
            {post.tags.map((t) => `#${t}`).join(' ')}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.CARD_BG,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.CARD_BORDER,
    marginBottom: 2,
  } as ViewStyle,
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    gap: SPACING.SM,
  } as ViewStyle,
  authorInfo: { flex: 1, gap: 1 } as ViewStyle,
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as ViewStyle,
  authorName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '700',
  } as TextStyle,
  verifiedDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
  } as ViewStyle,
  // AI Verified sub-label
  aiVerified: {
    color: COLORS.TEXT_MUTED,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontFamily: FONT_FAMILY.SECONDARY,
    letterSpacing: 0.2,
  } as TextStyle,
  timestamp: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  } as TextStyle,
  media: { width: SCREEN_W, height: SCREEN_W * 1.1 },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  } as ViewStyle,
  playIcon: { fontSize: 48 } as TextStyle,
  // Pending overlay
  pendingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  } as ViewStyle,
  pendingBadge: {
    backgroundColor: `${COLORS.WARNING}EE`,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.WARNING,
  } as ViewStyle,
  pendingText: {
    color: '#000',
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY_SEMI,
    fontWeight: '800',
  } as TextStyle,
  // Flagged replacement card
  flaggedCard: {
    backgroundColor: COLORS.CARD_BG,
    borderBottomWidth: 1, borderBottomColor: COLORS.CARD_BORDER,
    marginBottom: 2,
  } as ViewStyle,
  flaggedInner: {
    margin: SPACING.MD,
    backgroundColor: `${COLORS.ERROR}12`,
    borderRadius: 16, borderWidth: 1, borderColor: `${COLORS.ERROR}40`,
    padding: SPACING.LG, alignItems: 'center', gap: 8,
  } as ViewStyle,
  flaggedIcon: { fontSize: 32 } as TextStyle,
  flaggedTitle: {
    color: COLORS.ERROR, fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700',
  } as TextStyle,
  flaggedReason: {
    color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 18,
  } as TextStyle,
  actions: {
    flexDirection: 'row',
    padding: SPACING.MD,
    gap: SPACING.LG,
  } as ViewStyle,
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.XS,
  } as ViewStyle,
  actionIcon: { fontSize: 22 } as TextStyle,
  likedIcon: {} as TextStyle,
  actionCount: {
    color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600',
  } as TextStyle,
  caption: {
    paddingHorizontal: SPACING.MD, paddingBottom: SPACING.MD, gap: 4,
  } as ViewStyle,
  captionText: {
    color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, lineHeight: 20,
  } as TextStyle,
  authorNameInline: { fontWeight: '700' } as TextStyle,
  tags: {
    color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '500',
  } as TextStyle,
});

export default FeedCard;
