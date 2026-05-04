import React, { useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<any, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert('Reset failed', error.message);
    } else {
      Alert.alert('Success', 'Password updated! Please sign in.');
      await supabase.auth.signOut();
      navigation.navigate('Login');
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.title}>New Password</Text>
        <Text style={s.subtitle}>Enter your new password below.</Text>

        <View style={s.form}>
          <Input
            label="New Password"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            isPassword
          />
        </View>

        <Button
          title="Update Password"
          onPress={handleResetPassword}
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
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '700' } as TextStyle,
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  form: { gap: SPACING.MD } as ViewStyle,
});

export default ResetPasswordScreen;
