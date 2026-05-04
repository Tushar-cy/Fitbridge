import React from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const OrgDashboardScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Organisation Panel</Text>
          <Badge label="PRO Plan" variant="secondary" />
        </View>

        <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={styles.heroBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.orgName}>FitBridge Corp</Text>
          <Text style={styles.orgSub}>42 active employees · 8 trainers</Text>
        </LinearGradient>

        <View style={styles.statsGrid}>
          {[
            { label: 'Sessions This Month', value: '186', icon: '📅' },
            { label: 'Avg Attendance', value: '87%', icon: '✅' },
            { label: 'Total Spend', value: '₹3.2L', icon: '💰' },
            { label: 'Active Plans', value: '42', icon: '👥' },
          ].map((s) => (
            <Card key={s.label} style={styles.statCard} padding={SPACING.MD}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </Card>
          ))}
        </View>

        <Button title="Book Group Session →" variant="secondary" onPress={() => navigation.navigate('GroupBooking')} fullWidth size="lg" />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  content: { paddingHorizontal: SPACING.LG, gap: SPACING.LG, paddingTop: SPACING.MD, paddingBottom: SPACING.HUGE } as ViewStyle,
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' } as ViewStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900' } as TextStyle,
  heroBanner: { borderRadius: 20, padding: SPACING.XL, gap: SPACING.SM } as ViewStyle,
  orgName: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900' } as TextStyle,
  orgSub: { color: 'rgba(255,255,255,0.75)', fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.MD } as ViewStyle,
  statCard: { width: '47%', gap: 4 } as ViewStyle,
  statIcon: { fontSize: 24 } as TextStyle,
  statValue: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontWeight: '900' } as TextStyle,
  statLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
});

export default OrgDashboardScreen;
