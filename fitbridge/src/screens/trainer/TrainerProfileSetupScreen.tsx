import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle,
  TouchableOpacity, Image, ImageStyle, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SPECIALISATIONS } from '../../utils/constants';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  pickImage,
  uploadToCloudinary,
  CLOUDINARY_FOLDERS,
  type CloudinaryUploadResult,
} from '../../services/api/cloudinaryService';

const steps = ['Basic Info', 'Specialisations', 'Pricing', 'Documents'];

interface CertEntry {
  label: string;
  url: string | null;
  uploading: boolean;
  pct: number;
}

const INITIAL_CERTS: CertEntry[] = [
  { label: 'Identity Proof',       url: null, uploading: false, pct: 0 },
  { label: 'Fitness Certification', url: null, uploading: false, pct: 0 },
];

export const TrainerProfileSetupScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const user = useAuthStore((s) => s.user);
  const [activeStep, setActiveStep] = useState(0);
  const [certs, setCerts]           = useState<CertEntry[]>(INITIAL_CERTS);

  // ── Upload one cert ────────────────────────────────────────────────────────
  const handleUploadCert = useCallback(async (index: number) => {
    const picked = await pickImage({ quality: 0.9 });
    if (!picked) return;

    setCerts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], uploading: true, pct: 0 };
      return next;
    });

    try {
      const result = await uploadToCloudinary(picked.uri, {
        folder: CLOUDINARY_FOLDERS.CERTIFICATIONS,
        resourceType: 'image',
        onProgress: (pct) =>
          setCerts((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], pct };
            return next;
          }),
      });

      setCerts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], url: result.secureUrl, uploading: false, pct: 0 };
        return next;
      });
    } catch (err: any) {
      Alert.alert('Upload failed', err.message ?? 'Please try again.');
      setCerts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], uploading: false, pct: 0 };
        return next;
      });
    }
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (user?.id) {
      const certUrls = certs.filter((c) => c.url).map((c) => c.url as string);
      await supabase
        .from('trainers')
        .update({ certifications_urls: certUrls })
        .eq('user_id', user.id);
    }
    navigation.goBack();
  }, [certs, user, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Setup Profile</Text>
        <Text style={styles.step}>{activeStep + 1} / {steps.length}</Text>
      </View>

      {/* Progress */}
      <View style={styles.progress}>
        <View style={[styles.progressFill, { width: `${((activeStep + 1) / steps.length) * 100}%` as any }]} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stepTitle}>{steps[activeStep]}</Text>

        {activeStep === 0 && (
          <View style={styles.form}>
            <Input label="Full Name" placeholder="Arjun Mehta" />
            <Input label="Bio" placeholder="Tell clients about yourself..." />
            <Input label="Location" placeholder="Mumbai, Maharashtra" />
            <Input label="Years of Experience" placeholder="8" keyboardType="numeric" />
          </View>
        )}

        {activeStep === 1 && (
          <View style={styles.tagsGrid}>
            {SPECIALISATIONS.map((s) => (
              <Badge key={s} label={s} variant="ghost" />
            ))}
          </View>
        )}

        {activeStep === 2 && (
          <View style={styles.form}>
            <Input label="Price per Session (₹)" placeholder="1800" keyboardType="numeric" />
            <Input label="Session Duration (mins)" placeholder="60" keyboardType="numeric" />
          </View>
        )}

        {activeStep === 3 && (
          <View style={styles.docArea}>
            <Text style={styles.docText}>
              Upload your certifications and ID for verification.
              Accepted formats: JPG, PNG, PDF (shown as image).
            </Text>

            {certs.map((cert, i) => (
              <View key={cert.label} style={styles.certRow}>
                <View style={styles.certInfo}>
                  <Text style={styles.certLabel}>{cert.label}</Text>
                  {cert.url ? (
                    <View style={styles.certPreviewRow}>
                      <Image source={{ uri: cert.url }} style={styles.certThumb as ImageStyle} />
                      <Text style={styles.certDone}>✅ Uploaded</Text>
                    </View>
                  ) : (
                    <Text style={styles.certPending}>Not uploaded</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.certBtn, cert.uploading && styles.certBtnDisabled]}
                  onPress={() => handleUploadCert(i)}
                  disabled={cert.uploading}
                  activeOpacity={0.8}
                >
                  {cert.uploading ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Text style={styles.certBtnText}>
                      {cert.url ? '↻ Replace' : '⬆ Upload'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Per-cert progress bar */}
                {cert.uploading && (
                  <View style={styles.certProgress}>
                    <View style={[styles.certProgressFill, { width: `${cert.pct}%` as any }]} />
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.navRow}>
          {activeStep > 0 && (
            <Button title="← Back" variant="outline" onPress={() => setActiveStep(s => s - 1)} size="md" style={styles.halfBtn} />
          )}
          <Button
            title={activeStep === steps.length - 1 ? 'Submit ✓' : 'Next →'}
            onPress={() => activeStep < steps.length - 1 ? setActiveStep(s => s + 1) : handleSubmit()}
            size="md"
            style={styles.halfBtn}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.LG, paddingTop: SPACING.MD } as ViewStyle,
  title:        { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900' } as TextStyle,
  step:         { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD } as TextStyle,
  progress:     { height: 4, backgroundColor: COLORS.CARD_BORDER, marginHorizontal: SPACING.LG, borderRadius: 2, marginTop: SPACING.SM, overflow: 'hidden' } as ViewStyle,
  progressFill: { height: '100%', backgroundColor: COLORS.PRIMARY, borderRadius: 2 } as ViewStyle,
  content:      { padding: SPACING.LG, gap: SPACING.LG, paddingBottom: SPACING.HUGE } as ViewStyle,
  stepTitle:    { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontWeight: '800' } as TextStyle,
  form:         { gap: SPACING.MD } as ViewStyle,
  tagsGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,

  // Documents step
  docArea:       { gap: SPACING.LG } as ViewStyle,
  docText:       { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, lineHeight: 22 } as TextStyle,
  certRow:       { backgroundColor: COLORS.SURFACE_2, borderRadius: 14, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  certInfo:      { gap: 4 } as ViewStyle,
  certLabel:     { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  certPending:   { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  certPreviewRow:{ flexDirection: 'row', alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  certThumb:     { width: 44, height: 44, borderRadius: 8, backgroundColor: COLORS.SURFACE_3 } as ImageStyle,
  certDone:      { color: COLORS.SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  certBtn:       { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.PRIMARY } as ViewStyle,
  certBtnDisabled: { opacity: 0.6 } as ViewStyle,
  certBtnText:   { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  certProgress:  { height: 4, backgroundColor: COLORS.SURFACE_3, borderRadius: 2, overflow: 'hidden', marginTop: 2 } as ViewStyle,
  certProgressFill: { height: '100%', backgroundColor: COLORS.PRIMARY, borderRadius: 2 } as ViewStyle,

  navRow:  { flexDirection: 'row', gap: SPACING.MD, marginTop: SPACING.MD } as ViewStyle,
  halfBtn: { flex: 1 } as ViewStyle,
});

export default TrainerProfileSetupScreen;
