/**
 * ProfileScreen.tsx
 *
 * Complete user profile screen:
 * - Real profile data from Supabase
 * - Edit profile (name, bio, avatar)
 * - Scan history stats
 * - Logout button
 * - Subscription tier badge
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle,
  TouchableOpacity, Image, ImageStyle, Alert, TextInput,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { useAuthStore } from '../../store/authStore';
import { supabaseService } from '../../services/api/supabaseService';
import { supabase } from '../../lib/supabase';

export const ProfileScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [profile,     setProfile]     = useState<any>(null);
  const [scanHistory, setScanHistory] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [editMode,    setEditMode]    = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editBio,  setEditBio]  = useState('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [profileData, scans] = await Promise.all([
        supabaseService.getProfile(user.id),
        supabaseService.getScanHistory(user.id),
      ]);
      setProfile(profileData);
      setScanHistory(scans);
      setEditName(profileData?.full_name ?? user.name ?? '');
      setEditBio(profileData?.bio ?? '');
    } catch (err) {
      console.warn('[ProfileScreen] loadData:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user?.name]);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) loadData();
    }, [loadData, loading])
  );

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await supabaseService.updateProfile(user.id, {
        fullName: editName.trim(),
        bio:      editBio.trim(),
      });
      setEditMode(false);
      await loadData();
    } catch (err: any) {
      Alert.alert('Save Failed', err.message ?? 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  const latestScan = scanHistory[0];
  const avgScore   = scanHistory.length
    ? Math.round(scanHistory.reduce((a, s) => a + (s.overallScore ?? 0), 0) / scanHistory.length)
    : null;

  const avatarUri = profile?.avatar_url
    ?? user?.avatar
    ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? 'User')}&background=4F46E5&color=fff&size=200`;

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <StatusBar style="light" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.PRIMARY} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Profile</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => editMode ? handleSaveProfile() : setEditMode(true)}
        >
          {saving
            ? <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            : <Text style={s.editBtnText}>{editMode ? 'Save' : 'Edit'}</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.PRIMARY} />}
        contentContainerStyle={s.scroll}
      >
        {/* Avatar + Name */}
        <LinearGradient colors={['#1e1b4b', '#0f0a1e']} style={s.heroCard}>
          <View style={s.avatarWrap}>
            <Image source={{ uri: avatarUri }} style={s.avatar as ImageStyle} />
            <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.avatarRing} />
          </View>

          {editMode ? (
            <TextInput
              style={s.nameInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={COLORS.TEXT_MUTED}
              autoFocus
            />
          ) : (
            <Text style={s.name}>{profile?.full_name ?? user?.name ?? 'User'}</Text>
          )}

          <Text style={s.email}>{user?.email ?? ''}</Text>

          {/* Subscription badge */}
          <View style={[s.tierBadge, user?.subscriptionTier === 'premium' && s.tierBadgePremium]}>
            <Text style={[s.tierText, user?.subscriptionTier === 'premium' && s.tierTextPremium]}>
              {user?.subscriptionTier === 'premium' ? '⭐ Premium' : '🆓 Free Plan'}
            </Text>
          </View>

          {/* Bio */}
          {editMode ? (
            <TextInput
              style={s.bioInput}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Write a short bio about yourself..."
              placeholderTextColor={COLORS.TEXT_MUTED}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={s.bio}>
              {profile?.bio?.trim() || 'No bio yet. Tap Edit to add one.'}
            </Text>
          )}
        </LinearGradient>

        {/* Stats row */}
        <View style={s.statsRow}>
          {[
            { label: 'Total Scans',   value: String(scanHistory.length), icon: '🔬' },
            { label: 'Avg Score',     value: avgScore ? `${avgScore}` : '--', icon: '📊' },
            { label: 'Latest BMI',    value: latestScan?.bmi ? latestScan.bmi.toFixed(1) : '--', icon: '⚖️' },
            { label: 'Body Fat',      value: latestScan?.bodyFatPercent ? `${latestScan.bodyFatPercent.toFixed(1)}%` : '--', icon: '🔥' },
          ].map((stat) => (
            <View key={stat.label} style={s.statCard}>
              <Text style={s.statIcon}>{stat.icon}</Text>
              <Text style={s.statValue}>{stat.value}</Text>
              <Text style={s.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Scan history */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>🔬 Scan History</Text>
          {scanHistory.length === 0 ? (
            <TouchableOpacity
              style={s.emptyScanCard}
              onPress={() => navigation.navigate('AIScan')}
            >
              <LinearGradient colors={['#1e1b4b', '#0f0a1e']} style={s.emptyScanInner}>
                <Text style={{ fontSize: 42 }}>🤖</Text>
                <Text style={s.emptyScanTitle}>No Scans Yet</Text>
                <Text style={s.emptyScanSub}>Do your first AI Body Scan to track progress over time</Text>
                <View style={s.scanCTA}>
                  <Text style={s.scanCTAText}>Start AI Scan →</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            scanHistory.slice(0, 5).map((scan, i) => (
              <View key={scan.id ?? i} style={s.scanCard}>
                <View style={s.scanCardLeft}>
                  <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.scanScoreBadge}>
                    <Text style={s.scanScoreText}>{scan.overallScore ?? '--'}</Text>
                  </LinearGradient>
                  <View>
                    <Text style={s.scanDate}>
                      {new Date(scan.scanDate ?? scan.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </Text>
                    <Text style={s.scanSub}>
                      BMI {scan.bmi?.toFixed(1) ?? '--'} · Fat {scan.bodyFatPercent?.toFixed(1) ?? '--'}%
                    </Text>
                  </View>
                </View>
                <View style={s.scanCardRight}>
                  {scan.bodyShape && (
                    <View style={s.bodyTypeBadge}>
                      <Text style={s.bodyTypeText}>{scan.bodyShape}</Text>
                    </View>
                  )}
                  {scan.weightKg && (
                    <Text style={s.scanWeight}>{scan.weightKg} kg</Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Account section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>⚙️ Account</Text>

          {[
            { icon: '🔔', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
            { icon: '🔒', label: 'Active Sessions', onPress: () => navigation.navigate('Settings') },
            { icon: '💳', label: 'Subscription', onPress: () => Alert.alert('Upgrade', 'Premium plans launching soon!') },
          ].map((item) => (
            <TouchableOpacity key={item.label} style={s.accountRow} onPress={item.onPress} activeOpacity={0.8}>
              <Text style={s.accountRowIcon}>{item.icon}</Text>
              <Text style={s.accountRowLabel}>{item.label}</Text>
              <Text style={s.accountRowArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={s.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.TAB_HEIGHT + 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.MD } as ViewStyle,
  backBtn:          { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon:         { color: COLORS.TEXT_PRIMARY, fontSize: 18, fontWeight: '700' } as TextStyle,
  headerTitle:      { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  editBtn:          { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, backgroundColor: `${COLORS.PRIMARY}22`, borderWidth: 1, borderColor: `${COLORS.PRIMARY}44` } as ViewStyle,
  editBtnText:      { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '800' } as TextStyle,
  scroll:           { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.SM } as ViewStyle,

  // Hero
  heroCard:         { borderRadius: 24, padding: SPACING.XL, alignItems: 'center', gap: SPACING.SM, marginBottom: SPACING.LG, borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)' } as ViewStyle,
  avatarWrap:       { position: 'relative', marginBottom: SPACING.SM } as ViewStyle,
  avatar:           { width: 90, height: 90, borderRadius: 45 } as ImageStyle,
  avatarRing:       { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 48, opacity: 0.6 } as ViewStyle,
  name:             { color: COLORS.TEXT_PRIMARY, fontSize: 24, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  email:            { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  bio:              { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, textAlign: 'center', lineHeight: 20 } as TextStyle,
  tierBadge:        { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' } as ViewStyle,
  tierBadgePremium: { backgroundColor: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.4)' } as ViewStyle,
  tierText:         { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  tierTextPremium:  { color: '#EAB308' } as TextStyle,
  nameInput:        { color: COLORS.TEXT_PRIMARY, fontSize: 22, fontFamily: FONT_FAMILY.HEADING, fontWeight: '800', borderBottomWidth: 1, borderBottomColor: COLORS.PRIMARY, paddingVertical: 4, textAlign: 'center', width: '80%' } as TextStyle,
  bioInput:         { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, borderWidth: 1, borderColor: COLORS.CARD_BORDER, borderRadius: 12, padding: SPACING.MD, width: '100%', textAlign: 'center', minHeight: 80, backgroundColor: COLORS.SURFACE_2 } as TextStyle,

  // Stats
  statsRow:         { flexDirection: 'row', gap: SPACING.SM, marginBottom: SPACING.LG } as ViewStyle,
  statCard:         { flex: 1, backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, alignItems: 'center', gap: 4 } as ViewStyle,
  statIcon:         { fontSize: 20 } as TextStyle,
  statValue:        { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  statLabel:        { color: COLORS.TEXT_MUTED, fontSize: 9, fontFamily: FONT_FAMILY.SECONDARY_MEDIUM, textAlign: 'center' } as TextStyle,

  // Sections
  section:          { marginBottom: SPACING.XL } as ViewStyle,
  sectionTitle:     { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', marginBottom: SPACING.MD } as TextStyle,

  // Scan history
  emptyScanCard:    { borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(79,70,229,0.3)' } as ViewStyle,
  emptyScanInner:   { padding: SPACING.XL, alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  emptyScanTitle:   { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  emptyScanSub:     { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, textAlign: 'center', fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  scanCTA:          { backgroundColor: COLORS.PRIMARY, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 10, marginTop: SPACING.SM } as ViewStyle,
  scanCTAText:      { color: COLORS.WHITE, fontWeight: '800', fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,

  scanCard:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, marginBottom: SPACING.SM } as ViewStyle,
  scanCardLeft:     { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  scanScoreBadge:   { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  scanScoreText:    { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' } as TextStyle,
  scanDate:         { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  scanSub:          { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO, marginTop: 2 } as TextStyle,
  scanCardRight:    { alignItems: 'flex-end', gap: 4 } as ViewStyle,
  bodyTypeBadge:    { backgroundColor: `${COLORS.SECONDARY}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: `${COLORS.SECONDARY}44` } as ViewStyle,
  bodyTypeText:     { color: COLORS.SECONDARY, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' } as TextStyle,
  scanWeight:       { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.MONO } as TextStyle,

  // Account
  accountRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD, backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, marginBottom: SPACING.SM } as ViewStyle,
  accountRowIcon:   { fontSize: 22, width: 32, textAlign: 'center' } as TextStyle,
  accountRowLabel:  { flex: 1, color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700', fontFamily: FONT_FAMILY.BODY_SEMI } as TextStyle,
  accountRowArrow:  { color: COLORS.TEXT_MUTED, fontSize: 22, fontWeight: '300' } as TextStyle,

  // Logout
  logoutBtn:        { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', padding: SPACING.LG, alignItems: 'center', marginBottom: SPACING.LG } as ViewStyle,
  logoutText:       { color: COLORS.ERROR, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '800' } as TextStyle,
});

export default ProfileScreen;
