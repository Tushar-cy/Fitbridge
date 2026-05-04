import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ViewStyle, TextStyle,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { authService } from '../../services/api/authService';
import { Alert } from 'react-native';
import { SPECIALISATIONS } from '../../utils/constants';

type Props = NativeStackScreenProps<any, 'Signup'>;

const FITNESS_GOALS = ['Lose Weight', 'Build Muscle', 'Improve Endurance', 'Stay Flexible', 'Reduce Stress', 'Train for Events'];

export const SignupScreen: React.FC<Props> = ({ navigation, route }) => {
  const role = route.params?.role ?? 'trainee';
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  
  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields (Name, Email, Password).');
      return;
    }
    setLoading(true);
    try {
      await authService.signup({
        email,
        password,
        name,
        role: role as any,
      });
      Alert.alert('Success', 'Account created! If email confirmation is required, please check your inbox.');
    } catch (err: any) {
      Alert.alert('Signup Failed', err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpec = (spec: string) =>
    setSelectedSpecs((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Back */}
          <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={s.header}>
            <View style={s.rolePill}>
              <Text style={s.rolePillText}>Signing up as {role.charAt(0).toUpperCase() + role.slice(1)}</Text>
            </View>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join 50,000+ fitness enthusiasts on FitBridge</Text>
          </View>

          {/* Common fields */}
          <View style={s.form}>
            <Input label="Full Name" placeholder="Arjun Mehta" value={name} onChangeText={setName} />
            <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
            <Input label="Password" placeholder="Min. 8 characters" isPassword value={password} onChangeText={setPassword} />
            <Input label="Phone Number" placeholder="+91 98765 43210" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          </View>

          {/* Role-specific fields */}
          {role === 'trainee' && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>📍 Date of Birth</Text>
              <Input placeholder="DD / MM / YYYY" keyboardType="numeric" />
              <Text style={[s.sectionLabel, { marginTop: SPACING.MD }]}>🎯 Fitness Goal</Text>
              <View style={s.chipGrid}>
                {FITNESS_GOALS.map((goal) => (
                  <TouchableOpacity
                    key={goal}
                    onPress={() => setSelectedGoal(goal)}
                    style={[s.goalChip, selectedGoal === goal && s.goalChipActive]}
                  >
                    <Text style={[s.goalChipText, selectedGoal === goal && s.goalChipTextActive]}>
                      {goal}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {role === 'trainer' && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>🏋️ Specialisations (select all that apply)</Text>
              <View style={s.chipGrid}>
                {SPECIALISATIONS.map((spec) => (
                  <TouchableOpacity
                    key={spec}
                    onPress={() => toggleSpec(spec)}
                    style={[s.goalChip, selectedSpecs.includes(spec) && s.goalChipActive]}
                  >
                    <Text style={[s.goalChipText, selectedSpecs.includes(spec) && s.goalChipTextActive]}>
                      {spec}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[s.sectionLabel, { marginTop: SPACING.MD }]}>📅 Years of Experience</Text>
              <Input placeholder="e.g. 5" keyboardType="numeric" />
              <Text style={[s.sectionLabel, { marginTop: SPACING.MD }]}>🎓 Certifications</Text>
              <TouchableOpacity style={s.uploadBox}>
                <Text style={s.uploadIcon}>📄</Text>
                <Text style={s.uploadText}>Tap to upload certification documents</Text>
                <Text style={s.uploadSub}>PDF, JPG, PNG — max 10MB</Text>
              </TouchableOpacity>
            </View>
          )}

          {role === 'org' && (
            <View style={s.section}>
              <Input label="Organisation Name" placeholder="FitCorp India Ltd." />
              <Input label="Contact Person" placeholder="HR Manager's name" />
              <Input label="Team Size" placeholder="e.g. 100" keyboardType="numeric" />
              <Text style={[s.sectionLabel, { marginTop: SPACING.MD }]}>Organisation Type</Text>
              <View style={s.chipGrid}>
                {['Corporate', 'Gym Chain', 'Hospital', 'School/College', 'Sports Club'].map((t) => (
                  <TouchableOpacity key={t} style={s.goalChip}>
                    <Text style={s.goalChipText}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Terms */}
          <Text style={s.terms}>
            By creating an account you agree to our{' '}
            <Text style={s.link}>Terms of Service</Text> and{' '}
            <Text style={s.link}>Privacy Policy</Text>.
          </Text>

          <Button title="Create Account" onPress={handleSignup} loading={loading} fullWidth size="lg" />

          <View style={s.loginRow}>
            <Text style={s.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login', { role })}>
              <Text style={s.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingBottom: 40, gap: SPACING.LG } as ViewStyle,
  back: { marginTop: SPACING.MD, width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  header: { gap: 6 } as ViewStyle,
  rolePill: { alignSelf: 'flex-start', backgroundColor: `${COLORS.PRIMARY}22`, borderRadius: 20, borderWidth: 1, borderColor: `${COLORS.PRIMARY}40`, paddingHorizontal: 12, paddingVertical: 4 } as ViewStyle,
  rolePillText: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '700' } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD } as TextStyle,
  form: { gap: SPACING.MD } as ViewStyle,
  section: { gap: SPACING.SM } as ViewStyle,
  sectionLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', marginBottom: 4 } as TextStyle,
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  goalChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2 } as ViewStyle,
  goalChipActive: { borderColor: COLORS.PRIMARY, backgroundColor: `${COLORS.PRIMARY}20` } as ViewStyle,
  goalChipText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  goalChipTextActive: { color: COLORS.PRIMARY } as TextStyle,
  uploadBox: { borderRadius: 14, borderWidth: 2, borderColor: COLORS.CARD_BORDER, borderStyle: 'dashed', height: 100, alignItems: 'center', justifyContent: 'center', gap: 4 } as ViewStyle,
  uploadIcon: { fontSize: 28 } as TextStyle,
  uploadText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  uploadSub: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  terms: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, textAlign: 'center', lineHeight: 20 } as TextStyle,
  link: { color: COLORS.PRIMARY, fontWeight: '600' } as TextStyle,
  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' } as ViewStyle,
  loginText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD } as TextStyle,
  loginLink: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
});

export default SignupScreen;
