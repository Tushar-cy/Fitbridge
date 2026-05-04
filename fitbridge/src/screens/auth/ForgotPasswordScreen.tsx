import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<any, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'fitbridge://auth/reset-password',
    });
    setLoading(false);
    
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Check your email for a password reset link');
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>

        <Text style={s.title}>Reset Password</Text>
        <Text style={s.subtitle}>Enter your email address and we'll send you a link to reset your password.</Text>

        <View style={s.form}>
          <Input
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Button
          title="Send Reset Link"
          onPress={handleForgotPassword}
          loading={loading}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  container: { paddingHorizontal: SPACING.SCREEN_H_PAD, paddingTop: SPACING.XL, gap: SPACING.XL } as ViewStyle,
  back: { width: 42, height: 42, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  form: { gap: SPACING.MD } as ViewStyle,
});

export default ForgotPasswordScreen;
