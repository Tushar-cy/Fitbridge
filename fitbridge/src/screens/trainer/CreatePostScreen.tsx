import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, ViewStyle, TextStyle,
  Image, ImageStyle, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import {
  pickImage, pickVideo, uploadToCloudinary, CLOUDINARY_FOLDERS,
} from '../../services/api/cloudinaryService';
import { feedService } from '../../services/api/feedService';
import { useAuthStore } from '../../store/authStore';

type PostType = 'Post' | 'Reel' | 'Story';

const TYPE_CONFIGS = {
  Post: { icon: '🖼️', desc: 'Share a photo with your community', aspectRatio: '4:5', allowedFormats: 'JPG, PNG up to 10MB', color: COLORS.PRIMARY },
  Reel: { icon: '🎬', desc: 'Short video up to 60 seconds', aspectRatio: '9:16', allowedFormats: 'MP4, MOV up to 100MB', color: COLORS.SECONDARY },
  Story: { icon: '⚡', desc: 'Disappears in 24 hours', aspectRatio: '9:16', allowedFormats: 'JPG, PNG, MP4 up to 15MB', color: COLORS.ACCENT_GREEN },
};

const HASHTAG_SUGGESTIONS = ['#FitBridge', '#FitnessMotivation', '#WorkoutTips', '#TrainHard', '#HealthyLife', '#GymLife'];

export const CreatePostScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const userId = useAuthStore((s) => s.user?.id);
  const [type, setType]     = useState<PostType>('Post');
  const [caption, setCaption] = useState('');
  const [tags, setTags]     = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Media state
  const [mediaUri, setMediaUri]     = useState<string | null>(null);   // local preview
  const [mediaUrl, setMediaUrl]     = useState<string | null>(null);   // Cloudinary CDN URL
  const [uploading, setUploading]   = useState(false);
  const [uploadPct, setUploadPct]   = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'failed'>('idle');
  const [retryUri, setRetryUri]     = useState<string | null>(null);

  const config = TYPE_CONFIGS[type];
  const charLeft = 2200 - caption.length;
  const isVideo  = type === 'Reel';

  // ── Pick + upload media (with retry) ───────────────────────────────────────────
  const doUpload = useCallback(async (uri: string, attempt = 1): Promise<string | null> => {
    const MAX_ATTEMPTS = 3;
    setUploading(true);
    setUploadPct(0);
    setUploadStatus('uploading');
    try {
      const result = await uploadToCloudinary(uri, {
        folder: CLOUDINARY_FOLDERS.FEED_POSTS,
        resourceType: isVideo ? 'video' : 'image',
        onProgress: (pct) => setUploadPct(pct),
      });
      setUploadStatus('done');
      setUploading(false);
      return result.secureUrl;
    } catch (err: any) {
      if (attempt < MAX_ATTEMPTS) {
        setUploadStatus('uploading'); // Reset before retry
        await new Promise((r) => setTimeout(r, 1000 * attempt)); // Exponential backoff
        return doUpload(uri, attempt + 1);
      }
      setUploadStatus('failed');
      setUploading(false);
      return null;
    }
  }, [isVideo]);

  const handlePickMedia = useCallback(async () => {
    if (uploading) return;
    const picked = isVideo ? await pickVideo() : await pickImage({ quality: 0.85 });
    if (!picked) return;

    setMediaUri(picked.uri);
    setMediaUrl(null);
    setRetryUri(picked.uri);

    const url = await doUpload(picked.uri);
    if (url) {
      setMediaUrl(url);
    } else {
      // Keep mediaUri for preview, user can retry
      Alert.alert('Upload Failed', 'Could not upload after 3 attempts. Tap Retry to try again.');
    }
  }, [isVideo, uploading, doUpload]);

  const handleRetry = useCallback(async () => {
    if (!retryUri || uploading) return;
    const url = await doUpload(retryUri);
    if (url) setMediaUrl(url);
    else Alert.alert('Upload Failed', 'Still could not upload. Please check your connection.');
  }, [retryUri, uploading, doUpload]);


  // ── Publish ─────────────────────────────────────────────────────────────────────
  const handlePost = async () => {
    if (!mediaUrl) {
      Alert.alert('No media', 'Please select and upload a photo or video first.');
      return;
    }
    if (!caption.trim()) {
      Alert.alert('Caption required', 'Add a caption before posting.');
      return;
    }
    if (!userId) {
      Alert.alert('Not signed in', 'Please log in to post.');
      return;
    }
    setLoading(true);
    try {
      const mediaType = isVideo ? 'video' : 'image';
      // Extract hashtags from caption
      const tagMatches = caption.match(/#\w+/g) ?? [];
      const tagList = [...tags, ...tagMatches.map((t) => t.replace('#', ''))].slice(0, 20);

      // feedService.createPost logs every step and throws a clear error on failure
      await feedService.createPost(userId, caption.trim(), [mediaUrl], mediaType, tagList);

      Alert.alert('Posted! 🎉', 'Your post is now live on FitFeed.', [
        { text: 'View Feed', onPress: () => navigation.navigate('FitFeed') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      // Show the EXACT error — no silent failures
      console.error('[CreatePost] handlePost error:', err.message);
      Alert.alert('Post Failed ❌', err.message ?? 'Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const addTag = (tag: string) => {
    if (!caption.includes(tag)) setCaption((c) => c + (c ? ' ' : '') + tag);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.closeBtn} onPress={() => navigation.goBack()}>
          <Text style={s.closeIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={s.title}>Create {type}</Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[s.postHeaderBtn, { backgroundColor: config.color }]}
          disabled={loading}
        >
          <Text style={s.postHeaderBtnText}>{loading ? '...' : 'Post'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Type toggle */}
        <View style={s.typeRow}>
          {(['Post', 'Reel', 'Story'] as PostType[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[s.typeBtn, type === t && { borderColor: TYPE_CONFIGS[t].color, backgroundColor: `${TYPE_CONFIGS[t].color}18` }]}
            >
              <Text style={s.typeEmoji}>{TYPE_CONFIGS[t].icon}</Text>
              <Text style={[s.typeLabel, type === t && { color: TYPE_CONFIGS[t].color }]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upload area */}
        <TouchableOpacity activeOpacity={0.85} style={s.uploadArea} onPress={handlePickMedia}>
          <LinearGradient
            colors={[`${config.color}12`, `${config.color}06`]}
            style={s.uploadGradient}
          >
            {/* Preview or placeholder */}
            {mediaUri ? (
              <Image source={{ uri: mediaUri }} style={s.preview as ImageStyle} />
            ) : (
              <>
                <View style={[s.uploadIconCircle, { backgroundColor: `${config.color}22`, borderColor: `${config.color}44` }]}>
                  <Text style={s.uploadIconEmoji}>{config.icon}</Text>
                </View>
                <Text style={s.uploadTitle}>Tap to select {type === 'Post' ? 'photo' : 'video'}</Text>
                <Text style={s.uploadFormat}>{config.allowedFormats}</Text>
              </>
            )}
            <View style={s.aspectBadge}>
              <Text style={[s.aspectText, { color: config.color }]}>{config.aspectRatio}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Upload status overlay */}
        {(uploading || uploadStatus === 'done' || uploadStatus === 'failed') && (
          <View style={s.progressBox}>
            <View style={s.progressHeader}>
              <Text style={s.progressLabel}>
                {uploadStatus === 'uploading' ? (isVideo ? `Uploading video… ${uploadPct}%` : `Uploading… ${uploadPct}%`) : uploadStatus === 'done' ? '✅ Upload complete!' : '❌ Upload failed'}
              </Text>
              {uploadStatus === 'failed' && (
                <TouchableOpacity onPress={handleRetry} style={s.retryBtn}>
                  <Text style={s.retryText}>↺ Retry</Text>
                </TouchableOpacity>
              )}
            </View>
            {uploadStatus === 'uploading' && (
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${uploadPct}%` as any, backgroundColor: config.color }]} />
              </View>
            )}
          </View>
        )}

        {/* Caption */}
        <View style={s.captionSection}>
          <View style={s.captionLabelRow}>
            <Text style={s.captionLabel}>Caption</Text>
            <Text style={[s.charCount, charLeft < 200 && { color: COLORS.WARNING }]}>
              {charLeft} remaining
            </Text>
          </View>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Write a caption, add hashtags (#) and mentions (@)..."
            placeholderTextColor={COLORS.TEXT_MUTED}
            multiline
            maxLength={2200}
            style={s.captionInput}
            textAlignVertical="top"
          />
        </View>

        {/* Hashtag suggestions */}
        <View style={s.hashtagSection}>
          <Text style={s.hashtagLabel}>Suggested Hashtags</Text>
          <View style={s.hashtagRow}>
            {HASHTAG_SUGGESTIONS.map((tag) => (
              <TouchableOpacity key={tag} onPress={() => addTag(tag)} style={s.hashtagChip}>
                <Text style={s.hashtagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Extra options */}
        {['Add Location', 'Tag Trainees', 'Cross-post to Story'].map((option) => (
          <TouchableOpacity key={option} style={s.optionRow}>
            <Text style={s.optionText}>{option}</Text>
            <Text style={s.optionArrow}>→</Text>
          </TouchableOpacity>
        ))}

        {/* Moderation notice */}
        <View style={s.moderationBox}>
          <Text style={s.moderationIcon}>🛡️</Text>
          <Text style={s.moderationText}>
            All content is reviewed for FitBridge community guidelines. Posts with inappropriate content will not be published.
          </Text>
        </View>

        {/* Full CTA */}
        <Button
          title={`Publish ${type} to FitFeed →`}
          onPress={handlePost}
          loading={loading}
          fullWidth
          size="lg"
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: COLORS.CARD_BORDER } as ViewStyle,
  closeBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  closeIcon: { color: COLORS.TEXT_SECONDARY, fontSize: 16, fontWeight: '700' } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  postHeaderBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 } as ViewStyle,
  postHeaderBtnText: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.LG, gap: SPACING.LG, paddingBottom: 40 } as ViewStyle,
  typeRow: { flexDirection: 'row', gap: SPACING.SM } as ViewStyle,
  typeBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 5, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2 } as ViewStyle,
  typeEmoji: { fontSize: 24 } as TextStyle,
  typeLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  uploadArea: { borderRadius: 20, overflow: 'hidden' } as ViewStyle,
  uploadGradient: { borderRadius: 20, borderWidth: 2, borderColor: COLORS.CARD_BORDER, borderStyle: 'dashed' as any, height: 220, alignItems: 'center', justifyContent: 'center', gap: SPACING.SM } as ViewStyle,
  uploadIconCircle: { width: 72, height: 72, borderRadius: 36, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  uploadIconEmoji: { fontSize: 34 } as TextStyle,
  uploadTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  uploadFormat: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  aspectBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: COLORS.SURFACE_3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 } as ViewStyle,
  aspectText: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  // Media preview
  preview: { width: '100%', height: 220, borderRadius: 20 } as ImageStyle,
  // Progress
  progressBox:   { backgroundColor: COLORS.SURFACE_2, borderRadius: 12, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  progressHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  progressLabel: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', flex: 1 } as TextStyle,
  progressTrack: { height: 6, backgroundColor: COLORS.SURFACE_3, borderRadius: 3, overflow: 'hidden' } as ViewStyle,
  progressFill:  { height: '100%', borderRadius: 3 } as ViewStyle,
  retryBtn:      { backgroundColor: `${COLORS.WARNING}22`, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: `${COLORS.WARNING}44` } as ViewStyle,
  retryText:     { color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  captionSection: { gap: SPACING.SM } as ViewStyle,
  captionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  captionLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  charCount: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  captionInput: { backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, color: COLORS.TEXT_PRIMARY, padding: SPACING.MD, minHeight: 130, fontSize: TYPOGRAPHY.FONT_SIZE.MD, lineHeight: 22 } as TextStyle,
  hashtagSection: { gap: SPACING.SM } as ViewStyle,
  hashtagLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  hashtagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  hashtagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: `${COLORS.PRIMARY}18`, borderWidth: 1, borderColor: `${COLORS.PRIMARY}35` } as ViewStyle,
  hashtagText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.MD, borderBottomWidth: 1, borderBottomColor: COLORS.CARD_BORDER } as ViewStyle,
  optionText: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '600' } as TextStyle,
  optionArrow: { color: COLORS.TEXT_MUTED, fontSize: 16 } as TextStyle,
  moderationBox: { flexDirection: 'row', gap: SPACING.SM, backgroundColor: `${COLORS.WARNING}15`, borderRadius: 12, borderWidth: 1, borderColor: `${COLORS.WARNING}30`, padding: SPACING.MD, alignItems: 'flex-start' } as ViewStyle,
  moderationIcon: { fontSize: 18 } as TextStyle,
  moderationText: { flex: 1, color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.XS, lineHeight: 18 } as TextStyle,
});

export default CreatePostScreen;
