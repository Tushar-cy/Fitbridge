import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle,
  TouchableOpacity, Image, ImageStyle, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { pickImage, uploadToCloudinary, CLOUDINARY_FOLDERS } from '../../services/api/cloudinaryService';

const GOAL_OPTIONS = ['Weight Loss','Muscle Gain','Endurance','Flexibility','Sports Performance','General Fitness','Stress Relief'];
const DEFAULT_AVATAR = 'https://picsum.photos/seed/default_avatar/200/200';

export const ProfileSetupScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const [displayName, setDisplayName] = useState(user?.name ?? '');
  const [avatarUri, setAvatarUri]     = useState<string>(user?.avatar ?? DEFAULT_AVATAR);
  const [goals, setGoals]             = useState<string[]>([]);
  const [uploading, setUploading]     = useState(false);
  const [uploadPct, setUploadPct]     = useState(0);
  const [saving, setSaving]           = useState(false);

  const handlePickAvatar = useCallback(async () => {
    const picked = await pickImage({ aspect: [1, 1], quality: 0.8 });
    if (!picked) return;
    setAvatarUri(picked.uri);          // optimistic
    setUploading(true);
    setUploadPct(0);
    try {
      const result = await uploadToCloudinary(picked.uri, {
        folder: CLOUDINARY_FOLDERS.AVATARS,
        resourceType: 'image',
        onProgress: (pct) => setUploadPct(pct),
      });
      if (user?.id) {
        await supabase.from('profiles').update({ avatar_url: result.secureUrl }).eq('id', user.id);
      }
      setAvatarUri(result.secureUrl);
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Please try again.');
      setAvatarUri(user?.avatar ?? DEFAULT_AVATAR);
    } finally { setUploading(false); setUploadPct(0); }
  }, [user]);

  const toggleGoal = (g: string) =>
    setGoals((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const handleSave = useCallback(async () => {
    if (!displayName.trim()) { Alert.alert('Missing name', 'Please enter your display name.'); return; }
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles')
        .update({ full_name: displayName.trim(), updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      navigation.replace('TraineeRoot');
    } catch (err: any) {
      Alert.alert('Save failed', err.message ?? 'Please try again.');
    } finally { setSaving(false); }
  }, [displayName, user, navigation]);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.heading}>Set Up Your Profile</Text>
        <Text style={s.sub}>This is how trainers and the community will see you.</Text>

        {/* Avatar */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} activeOpacity={0.85} style={s.avatarWrap}>
            <Image source={{ uri: avatarUri }} style={s.avatar as ImageStyle} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.55)']} style={s.avatarOverlay}>
              <Text style={s.avatarOverlayText}>{uploading ? `${uploadPct}%` : '📷 Change'}</Text>
            </LinearGradient>
          </TouchableOpacity>
          {uploading && (
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${uploadPct}%` as any }]} />
            </View>
          )}
          <Text style={s.avatarHint}>Tap to change photo</Text>
        </View>

        <Input label="Display Name" placeholder="e.g. Riya Sharma" value={displayName} onChangeText={setDisplayName} />

        <View style={s.goalsSection}>
          <Text style={s.goalsLabel}>Fitness Goals</Text>
          <View style={s.goalsGrid}>
            {GOAL_OPTIONS.map((g) => {
              const active = goals.includes(g);
              return (
                <TouchableOpacity key={g} onPress={() => toggleGoal(g)}
                  style={[s.goalChip, active && s.goalChipActive]} activeOpacity={0.75}>
                  <Text style={[s.goalChipText, active && s.goalChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button title="Save & Continue →" onPress={handleSave} loading={saving} fullWidth size="lg" />
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll:             { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.XL, gap: SPACING.LG, paddingBottom: 40 } as ViewStyle,
  heading:            { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  sub:                { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, lineHeight: 22 } as TextStyle,
  avatarSection:      { alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  avatarWrap:         { width: 110, height: 110, borderRadius: 55, overflow: 'hidden', borderWidth: 3, borderColor: COLORS.PRIMARY } as ViewStyle,
  avatar:             { width: 110, height: 110 } as ImageStyle,
  avatarOverlay:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 36, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 5 } as ViewStyle,
  avatarOverlayText:  { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  avatarHint:         { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  progressTrack:      { width: 110, height: 4, backgroundColor: COLORS.SURFACE_3, borderRadius: 2, overflow: 'hidden' } as ViewStyle,
  progressFill:       { height: '100%', backgroundColor: COLORS.PRIMARY, borderRadius: 2 } as ViewStyle,
  goalsSection:       { gap: SPACING.SM } as ViewStyle,
  goalsLabel:         { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  goalsGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  goalChip:           { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2 } as ViewStyle,
  goalChipActive:     { borderColor: COLORS.PRIMARY, backgroundColor: `${COLORS.PRIMARY}22` } as ViewStyle,
  goalChipText:       { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  goalChipTextActive: { color: COLORS.PRIMARY, fontWeight: '700' } as TextStyle,
});

export default ProfileSetupScreen;
