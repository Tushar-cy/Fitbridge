import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ViewStyle, TextStyle,
  KeyboardAvoidingView, Platform, Image, ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { authService } from '../../services/api/authService';
import { Alert } from 'react-native';

type Props = NativeStackScreenProps<any, 'Login'>;

const SOCIAL_PROVIDERS = [
  { label: 'Continue with Google', emoji: '🌐', color: '#EA4335' },
  { label: 'Continue with Apple', emoji: '🍎', color: '#FFFFFF' },
];

export const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const role = route.params?.role ?? 'trainee';

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await authService.signIn(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Hero */}
          <View style={s.hero}>
            <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={s.logoMini}>
              <Text style={s.bolt}>⚡</Text>
            </LinearGradient>
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Sign in to your FitBridge account</Text>
          </View>

          {/* Social login */}
          <View style={s.socialGroup}>
            {SOCIAL_PROVIDERS.map((p) => (
              <TouchableOpacity key={p.label} style={s.socialBtn} activeOpacity={0.8}>
                <Text style={s.socialEmoji}>{p.emoji}</Text>
                <Text style={s.socialLabel}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Divider */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>or sign in with email</Text>
            <View style={s.dividerLine} />
          </View>

          {/* Form */}
          <View style={s.form}>
            <Input
              label="Email address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
            />
            <TouchableOpacity style={s.forgotRow} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* CTA */}
          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            fullWidth
            size="lg"
          />

          <View style={s.signupRow}>
            <Text style={s.signupText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Signup', { role })}>
              <Text style={s.signupLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>


        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: 40, gap: SPACING.XL } as ViewStyle,
  back: { marginTop: SPACING.MD, width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  hero: { alignItems: 'center', gap: 10, paddingTop: SPACING.MD } as ViewStyle,
  logoMini: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: COLORS.PRIMARY, shadowOpacity: 0.6, shadowRadius: 24, elevation: 16 } as ViewStyle,
  bolt: { fontSize: 38 } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700', letterSpacing: -0.5 } as TextStyle,
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  socialGroup: { gap: SPACING.SM } as ViewStyle,
  socialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2 } as ViewStyle,
  socialEmoji: { fontSize: 18 } as TextStyle,
  socialLabel: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '600' } as TextStyle,
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.MD } as ViewStyle,
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.CARD_BORDER } as ViewStyle,
  dividerText: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY, fontWeight: '500' } as TextStyle,
  form: { gap: SPACING.MD } as ViewStyle,
  forgotRow: { alignSelf: 'flex-end' } as ViewStyle,
  forgotText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '600' } as TextStyle,
  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' } as ViewStyle,
  signupText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  signupLink: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
});

export default LoginScreen;
