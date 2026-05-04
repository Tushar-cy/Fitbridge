import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Button } from '../../components/ui/Button';

export const BookingConfirmationScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation, route }) => {
  const { bookingId, trainerId, trainerName, sessionDate, amount } = route.params || {};

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={s.container}>
        <LinearGradient colors={[`${COLORS.SECONDARY}22`, 'transparent']} style={s.banner}>
          <Text style={s.successIcon}>✅</Text>
          <Text style={s.title}>Booking Confirmed!</Text>
          <Text style={s.subtitle}>Your session has been successfully booked.</Text>
        </LinearGradient>

        <View style={s.card}>
          <LinearGradient colors={[`${COLORS.PRIMARY}12`, 'transparent']} style={StyleSheet.absoluteFill} />
          <View style={s.row}><Text style={s.rowLabel}>Booking ID</Text><Text style={[s.rowVal, {fontFamily: FONT_FAMILY.MONO}]}>{bookingId}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Trainer</Text><Text style={s.rowVal}>{trainerName}</Text></View>
          <View style={s.row}><Text style={s.rowLabel}>Date</Text><Text style={s.rowVal}>{sessionDate}</Text></View>
          <View style={[s.row, { borderBottomWidth: 0 }]}><Text style={s.rowLabel}>Amount Paid</Text><Text style={[s.rowVal, {color: COLORS.SECONDARY}]}>₹{amount?.toLocaleString()}</Text></View>
        </View>

        <View style={s.actions}>
          <TouchableOpacity
            style={s.calendarBtn}
            onPress={() => Alert.alert('Add to Calendar', 'Calendar integration coming in Phase 4.')}
            activeOpacity={0.82}
          >
            <Text style={s.calendarBtnText}>📅 Add to Calendar</Text>
          </TouchableOpacity>
          <Button
            title="💬 Chat with Trainer"
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => {
              navigation.navigate('ChatThread', {
                threadId: `booking_${trainerId}`,
                participantName: trainerName,
              });
            }}
          />
          <Button
            title="Back to Home"
            variant="outline"
            size="md"
            fullWidth
            onPress={() => navigation.navigate('Dashboard')}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG },
  container: { flex: 1, padding: SPACING.LG, justifyContent: 'center', gap: SPACING.XL },
  banner: { alignItems: 'center', paddingVertical: SPACING.XL, borderRadius: 20 },
  successIcon: { fontSize: 64, marginBottom: 12 },
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900' },
  subtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, marginTop: 8 },
  card: { backgroundColor: COLORS.SURFACE_1, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.LG, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER },
  rowLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, flex: 1 },
  rowVal: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600', flex: 1.5, textAlign: 'right' },
  actions: { gap: SPACING.MD, marginTop: 20 },
  calendarBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.SURFACE_2 },
  calendarBtnText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' },
});

export default BookingConfirmationScreen;
