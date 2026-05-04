import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Post } from '../../../types/feed.types';
import { COLORS } from '../../../theme/colors';
import SPACING from '../../../theme/spacing';
import TYPOGRAPHY from '../../../theme/typography';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface ReelPlayerProps {
  reel: Post;
  isActive: boolean;
  onLike: (id: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

export const ReelPlayer: React.FC<ReelPlayerProps> = ({
  reel,
  isActive,
  onLike,
  onAuthorPress,
}) => {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: reel.thumbnailUrl ?? reel.imageUrl }}
        style={styles.thumbnail as ImageStyle}
        resizeMode="cover"
      />
      {/* Dark gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Play button */}
      <View style={styles.playCenter}>
        <View style={styles.playBtn}>
          <Text style={styles.playIcon}>{isActive ? '⏸' : '▶'}</Text>
        </View>
      </View>

      {/* Right actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionItem} onPress={() => onLike(reel.id)}>
          <Text style={styles.actionEmoji}>{reel.isLiked ? '❤️' : '🤍'}</Text>
          <Text style={styles.actionCount}>{(reel.likes / 1000).toFixed(1)}K</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionEmoji}>💬</Text>
          <Text style={styles.actionCount}>{reel.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionItem}>
          <Text style={styles.actionEmoji}>↗️</Text>
          <Text style={styles.actionCount}>{reel.shares}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={styles.bottomInfo}>
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => onAuthorPress?.(reel.authorId)}
        >
          <Image
            source={{ uri: reel.authorAvatar }}
            style={styles.avatar as ImageStyle}
          />
          <Text style={styles.authorName}>{reel.authorName}</Text>
          {reel.authorVerified && <View style={styles.verifiedDot} />}
        </TouchableOpacity>
        <Text style={styles.caption} numberOfLines={2}>{reel.caption}</Text>
        <Text style={styles.tags}>
          {reel.tags.map((t) => `#${t}`).join(' ')}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: COLORS.DARK_BG,
  } as ViewStyle,
  thumbnail: {
    width: SCREEN_W,
    height: SCREEN_H,
    position: 'absolute',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_H * 0.5,
  } as ViewStyle,
  playCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  playIcon: { fontSize: 28 } as TextStyle,
  rightActions: {
    position: 'absolute',
    right: SPACING.LG,
    bottom: 120,
    gap: SPACING.XL,
  } as ViewStyle,
  actionItem: { alignItems: 'center', gap: 4 } as ViewStyle,
  actionEmoji: { fontSize: 28 } as TextStyle,
  actionCount: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
  } as TextStyle,
  bottomInfo: {
    position: 'absolute',
    bottom: 80,
    left: SPACING.LG,
    right: 80,
    gap: 6,
  } as ViewStyle,
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.SM,
  } as ViewStyle,
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: COLORS.WHITE,
  },
  authorName: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '700',
  } as TextStyle,
  verifiedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.PRIMARY,
  } as ViewStyle,
  caption: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  } as TextStyle,
  tags: {
    color: `${COLORS.PRIMARY}CC`,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '500',
  } as TextStyle,
});

export default ReelPlayer;
