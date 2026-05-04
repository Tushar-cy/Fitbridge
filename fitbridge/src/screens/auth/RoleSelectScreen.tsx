import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types/user.types';

type Props = NativeStackScreenProps<any, 'RoleSelect'>;

const roles = [
  {
    id: 'trainee' as UserRole,
    emoji: '💪',
    title: 'Trainee',
    description: 'Find top trainers, book sessions, scan your body with AI, and crush your goals.',
    gradient: COLORS.GRADIENT_PRIMARY,
    glow: COLORS.PRIMARY,
    badge: 'Most Popular',
  },
  {
    id: 'trainer' as UserRole,
    emoji: '🏅',
    title: 'Trainer',
    description: 'Grow your clientele with smart scheduling, earnings analytics, and FitFeed content.',
    gradient: COLORS.GRADIENT_SECONDARY,
    glow: COLORS.SECONDARY,
    badge: null,
  },
  {
    id: 'org' as UserRole,
    emoji: '🏢',
    title: 'Organisation',
    description: 'Book group sessions, manage employee wellness and track team fitness at scale.',
    gradient: COLORS.GRADIENT_GREEN,
    glow: COLORS.ACCENT_GREEN,
    badge: 'Enterprise',
  },
  {
    id: 'trainee' as UserRole, // Brand Partner maps to trainee for now
    emoji: '🤝',
    title: 'Brand Partner',
    description: 'Collaborate with top fitness creators and get your products in front of the right audience.',
    gradient: [COLORS.ACCENT_PINK, '#FF8C5A'] as const,
    glow: COLORS.ACCENT_PINK,
    badge: 'New',
  },
];

export const RoleSelectScreen: React.FC<Props> = ({ navigation }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const setRole = useAuthStore((s) => s.setRole);

  const handleContinue = () => {
    if (selected === null) return;
    const role = roles[selected].id;
    setRole(role);
    navigation.navigate('Login', { role });
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar style="light" />
      <LinearGradient colors={COLORS.GRADIENT_DARK} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.eyebrow}>Welcome to FitBridge</Text>
          <Text style={s.title}>I am a...</Text>
          <Text style={s.subtitle}>Choose your role to personalise your experience</Text>
        </View>

        <View style={s.cards}>
          {roles.map((role, idx) => {
            const isActive = selected === idx;
            return (
              <TouchableOpacity
                key={`${role.id}-${idx}`}
                onPress={() => setSelected(idx)}
                activeOpacity={0.88}
                style={[s.roleCard, isActive && { borderColor: role.glow, borderWidth: 2 }]}
              >
                {isActive && (
                  <LinearGradient
                    colors={[`${role.glow}15`, 'transparent']}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}

                <View style={s.cardLeft}>
                  <LinearGradient
                    colors={role.gradient as [string, string]}
                    style={s.emojiWrap}
                  >
                    <Text style={s.emoji}>{role.emoji}</Text>
                  </LinearGradient>
                </View>

                <View style={s.cardText}>
                  <View style={s.titleRow}>
                    <Text style={s.roleTitle}>{role.title}</Text>
                    {role.badge && (
                      <View style={[s.roleBadge, { backgroundColor: `${role.glow}25`, borderColor: `${role.glow}50` }]}>
                        <Text style={[s.roleBadgeText, { color: role.glow }]}>{role.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.roleDesc}>{role.description}</Text>
                </View>

                {isActive && (
                  <View style={[s.checkCircle, { backgroundColor: role.glow }]}>
                    <Text style={s.check}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.footer}>
          <Button
            title="Continue →"
            onPress={handleContinue}
            disabled={selected === null}
            fullWidth
            size="lg"
          />
          <TouchableOpacity onPress={() => navigation.navigate('Login', { role: 'trainee' })}>
            <Text style={s.loginLink}>Already have an account? <Text style={s.loginLinkBold}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: 40 } as ViewStyle,
  header: { paddingTop: SPACING.XL, paddingBottom: SPACING.XXL, gap: 6 } as ViewStyle,
  eyebrow: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.HERO, fontWeight: '900', letterSpacing: -1 } as TextStyle,
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, lineHeight: 22 } as TextStyle,
  cards: { gap: SPACING.MD } as ViewStyle,
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.CARD_BG,
    borderRadius: TYPOGRAPHY.RADIUS.XL,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    padding: SPACING.LG,
    gap: SPACING.MD,
    overflow: 'hidden',
    position: 'relative',
  } as ViewStyle,
  cardLeft: {} as ViewStyle,
  emojiWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  emoji: { fontSize: 28 } as TextStyle,
  cardText: { flex: 1, gap: 4 } as ViewStyle,
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 } as ViewStyle,
  roleTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  roleBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 2 } as ViewStyle,
  roleBadgeText: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  roleDesc: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, lineHeight: 18 } as TextStyle,
  checkCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 } as ViewStyle,
  check: { color: COLORS.WHITE, fontWeight: '900', fontSize: 13 } as TextStyle,
  footer: { paddingTop: SPACING.XXXL, gap: SPACING.LG } as ViewStyle,
  loginLink: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, textAlign: 'center' } as TextStyle,
  loginLinkBold: { color: COLORS.PRIMARY, fontWeight: '700' } as TextStyle,
});

export default RoleSelectScreen;
