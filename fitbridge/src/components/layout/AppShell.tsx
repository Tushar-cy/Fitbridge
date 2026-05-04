import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../../theme/colors';

interface AppShellProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const AppShell: React.FC<AppShellProps> = ({ children, style }) => {
  return (
    <SafeAreaView style={[styles.shell, style]}>
      <StatusBar style="light" backgroundColor={COLORS.DARK_BG} />
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: COLORS.DARK_BG,
  } as ViewStyle,
  content: {
    flex: 1,
  } as ViewStyle,
});

export default AppShell;
