import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ViewStyle, TextStyle,
  Image, ImageStyle, Modal, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import COLORS from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../theme/typography';
import { Button } from '../../components/ui/Button';
import { supabaseService } from '../../services/api/supabaseService';
import type { Trainer } from '../../types/user.types';
import { createOrder, verifyPayment } from '../../services/api/paymentService';
import RazorpayCheckout from 'react-native-razorpay';
import { useAuthStore } from '../../store/authStore';

const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return {
    id: d.toISOString().split('T')[0],
    dayShort: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    dateNum: d.getDate(),
    monthShort: d.toLocaleDateString('en-IN', { month: 'short' }),
    isToday: i === 0,
  };
});

const MORNING_SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00'];
const EVENING_SLOTS = ['17:00', '18:00', '19:00', '20:00', '21:00'];
const UNAVAILABLE = ['08:00', '17:00', '20:00'];

type SessionMode = 'Personal' | 'Group';
type SessionType = 'Online' | 'Offline';

export const BookingScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation, route }) => {
  const trainerId = route.params?.trainerId;
  const [trainer, setTrainer] = useState<Trainer | null>(null);
  const [fetchingTrainer, setFetchingTrainer] = useState(true);
  const [selectedDate, setSelectedDate] = useState(DAYS[0].id);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [mode, setMode] = useState<SessionMode>('Personal');
  const [sessionType, setSessionType] = useState<SessionType>('Online');
  const [loading, setLoading] = useState(false);

  const currentUser = useAuthStore((state) => state.user);

  React.useEffect(() => {
    async function loadTrainer() {
      if (!trainerId) return;
      try {
        const data = await supabaseService.getTrainerById(trainerId);
        if (data) setTrainer(data);
      } catch (err) {
        console.warn('Failed to load trainer:', err);
      } finally {
        setFetchingTrainer(false);
      }
    }
    loadTrainer();
  }, [trainerId]);

  const handleConfirm = async () => {
    if (!selectedSlot || !currentUser || !trainer) return;
    setLoading(true);
    try {
      // Step 1: Create order on backend
      const sessionRef = `SES_${Date.now()}`;
      const order = await createOrder(trainer.pricePerSession, 'INR', sessionRef);
      
      // Step 2: Open Razorpay checkout
      // Requires EAS Build — won't work in Expo Go
      const options = {
        description: `Session with ${trainer.name}`,
        image: trainer.photo ?? 'https://fitbridge.app/logo.png',
        currency: order.currency || 'INR',
        key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? 'rzp_test_...',
        amount: order.amount,
        order_id: order.id,
        name: 'FitBridge',
        prefill: {
          email: currentUser.email,
          contact: currentUser.phone ?? '',
          name: currentUser.name,
        },
        theme: { color: '#4F46E5' },
      };
      
      const paymentData = await RazorpayCheckout.open(options);
      
      // Step 3: Verify payment on backend
      const result = await verifyPayment(
        paymentData.razorpay_order_id,
        paymentData.razorpay_payment_id,
        paymentData.razorpay_signature
      );
      
      setLoading(false);
      navigation.navigate('BookingConfirmation', {
        bookingId: result.bookingId,
        trainerId: trainer.id,
        trainerName: trainer.name,
        sessionDate: selectedDate,
        amount: trainer.pricePerSession,
      });
      
    } catch (error: any) {
      setLoading(false);
      if (error.code !== 'PAYMENT_CANCELLED') {
        Alert.alert('Payment Failed', error.description ?? error.message ?? 'Please try again');
      }
    }
  };

  const renderSlotGroup = (label: string, slots: string[]) => (
    <View style={s.slotGroup}>
      <Text style={s.slotGroupLabel}>{label}</Text>
      <View style={s.slotGrid}>
        {slots.map((slot) => {
          const unavail = UNAVAILABLE.includes(slot);
          const active = selectedSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              onPress={() => !unavail && setSelectedSlot(slot)}
              disabled={unavail}
              style={[s.slot, active && s.activeSlot, unavail && s.unavailSlot]}
            >
              <Text style={[s.slotText, active && s.activeSlotText, unavail && s.unavailSlotText]}>
                {slot}
              </Text>
              {unavail && <Text style={s.takenLabel}>Taken</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style="light" />

      {/* ── Payment Loading Overlay ──────────────────────────────────────── */}
      {loading && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 999, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '700' }}>Processing Payment...</Text>
        </View>
      )}

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={() => navigation.goBack()}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Book Session</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {fetchingTrainer || !trainer ? (
           <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
             <Text style={{ color: COLORS.TEXT_MUTED }}>Loading trainer details...</Text>
           </View>
        ) : (
          <>
        {/* Trainer mini card */}
        <View style={s.trainerMini}>
          <Image source={{ uri: trainer.photo }} style={s.trainerPhoto as ImageStyle} />
          <View style={s.trainerInfo}>
            <Text style={s.trainerName}>{trainer.name}</Text>
            <Text style={s.trainerSpec}>{trainer.specialisation[0]}</Text>
            <Text style={s.trainerRating}>★ {trainer.rating} · {trainer.reviewCount} reviews</Text>
          </View>
        </View>

        {/* Session type toggle */}
        <Text style={s.fieldLabel}>Session Type</Text>
        <View style={s.toggleRow}>
          {(['Personal', 'Group'] as SessionMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[s.toggleBtn, mode === m && s.activeToggle]}
              onPress={() => setMode(m)}
            >
              <Text style={s.toggleIcon}>{m === 'Personal' ? '👤' : '👥'}</Text>
              <Text style={[s.toggleLabel, mode === m && s.activeToggleLabel]}>{m}</Text>
            </TouchableOpacity>
          ))}
          {(['Online', 'Offline'] as SessionType[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[s.toggleBtn, sessionType === t && s.activeToggle]}
              onPress={() => setSessionType(t)}
            >
              <Text style={s.toggleIcon}>{t === 'Online' ? '📹' : '🏋️'}</Text>
              <Text style={[s.toggleLabel, sessionType === t && s.activeToggleLabel]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date strip */}
        <Text style={s.fieldLabel}>Select Date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.dateScroll}>
          {DAYS.map((day) => (
            <TouchableOpacity
              key={day.id}
              onPress={() => { setSelectedDate(day.id); setSelectedSlot(null); }}
              style={[s.dateCard, selectedDate === day.id && s.activeDateCard]}
            >
              <Text style={[s.dateDayShort, selectedDate === day.id && s.activeDateText]}>{day.dayShort}</Text>
              <Text style={[s.dateNum, selectedDate === day.id && s.activeDateNum]}>{day.dateNum}</Text>
              <Text style={[s.dateMonth, selectedDate === day.id && s.activeDateText]}>{day.monthShort}</Text>
              {day.isToday && <View style={s.todayDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Slot groups */}
        <Text style={s.fieldLabel}>Available Slots</Text>
        {renderSlotGroup('Morning', MORNING_SLOTS)}
        {renderSlotGroup('Evening', EVENING_SLOTS)}

        {/* Price summary */}
        {selectedSlot && (
          <LinearGradient
            colors={[`${COLORS.PRIMARY}15`, `${COLORS.PRIMARY}05`]}
            style={s.summaryCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.summaryTitle}>Booking Summary</Text>
            {[
              ['Trainer', trainer.name],
              ['Date & Time', `${selectedDate} at ${selectedSlot}`],
              ['Mode', `${mode} — ${sessionType}`],
              ['Duration', '60 minutes'],
            ].map(([label, val]) => (
              <View key={label} style={s.summaryRow}>
                <Text style={s.summaryLabel}>{label}</Text>
                <Text style={s.summaryVal}>{val}</Text>
              </View>
            ))}
            <View style={[s.summaryRow, s.totalRow]}>
              <Text style={s.totalLabel}>Total</Text>
              <Text style={s.totalVal}>₹{trainer.pricePerSession.toLocaleString()}</Text>
            </View>
          </LinearGradient>
        )}

        <Button
          title={selectedSlot
            ? `Pay ₹${trainer.pricePerSession.toLocaleString()} →`
            : 'Select a Slot to Continue'}
          onPress={handleConfirm}
          loading={loading}
          disabled={!selectedSlot}
          fullWidth
          size="lg"
        />

        <View style={{ height: 40 }} />
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.SCREEN_H_PAD, paddingVertical: SPACING.LG } as ViewStyle,
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.SURFACE_2, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backIcon: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  scroll: { paddingHorizontal: SPACING.SCREEN_H_PAD, gap: SPACING.LG, paddingBottom: 40 } as ViewStyle,
  trainerMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.SURFACE_2, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.MD } as ViewStyle,
  trainerPhoto: { width: 60, height: 60, borderRadius: 14 } as ImageStyle,
  trainerInfo: { flex: 1, gap: 3 } as ViewStyle,
  trainerName: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  trainerSpec: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  trainerRating: { color: COLORS.WARNING, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '600' } as TextStyle,
  fieldLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 } as TextStyle,
  toggleRow: { flexDirection: 'row', gap: SPACING.SM } as ViewStyle,
  toggleBtn: { flex: 1, alignItems: 'center', paddingVertical: SPACING.MD, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2, gap: 4 } as ViewStyle,
  activeToggle: { borderColor: COLORS.PRIMARY, backgroundColor: `${COLORS.PRIMARY}18` } as ViewStyle,
  toggleIcon: { fontSize: 22 } as TextStyle,
  toggleLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  activeToggleLabel: { color: COLORS.PRIMARY } as TextStyle,
  dateScroll: {} as ViewStyle,
  dateCard: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2, marginRight: SPACING.SM, minWidth: 58, gap: 2 } as ViewStyle,
  activeDateCard: { borderColor: COLORS.PRIMARY, backgroundColor: `${COLORS.PRIMARY}22` } as ViewStyle,
  dateDayShort: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '600' } as TextStyle,
  dateNum: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XL, fontWeight: '900' } as TextStyle,
  activeDateNum: { color: COLORS.PRIMARY } as TextStyle,
  dateMonth: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  activeDateText: { color: COLORS.PRIMARY } as TextStyle,
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: COLORS.PRIMARY, marginTop: 2 } as ViewStyle,
  slotGroup: { gap: SPACING.SM } as ViewStyle,
  slotGroupLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.SM } as ViewStyle,
  slot: { paddingHorizontal: SPACING.LG, paddingVertical: SPACING.SM, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, backgroundColor: COLORS.SURFACE_2, alignItems: 'center', minWidth: 80 } as ViewStyle,
  activeSlot: { borderColor: COLORS.PRIMARY, backgroundColor: `${COLORS.PRIMARY}22` } as ViewStyle,
  unavailSlot: { opacity: 0.4 } as ViewStyle,
  slotText: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  activeSlotText: { color: COLORS.PRIMARY } as TextStyle,
  unavailSlotText: { color: COLORS.TEXT_MUTED } as TextStyle,
  takenLabel: { color: COLORS.ERROR, fontSize: 9, fontWeight: '700' } as TextStyle,
  summaryCard: { borderRadius: 16, padding: SPACING.LG, borderWidth: 1, borderColor: `${COLORS.PRIMARY}30`, gap: SPACING.SM } as ViewStyle,
  summaryTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '800', marginBottom: 4 } as TextStyle,
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  summaryLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  summaryVal: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '600' } as TextStyle,
  totalRow: { paddingTop: SPACING.SM, borderTopWidth: 1, borderTopColor: `${COLORS.PRIMARY}30` } as ViewStyle,
  totalLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontWeight: '700' } as TextStyle,
  totalVal: { color: COLORS.PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXL, fontWeight: '900' } as TextStyle,
  // Modal styles
  modalSafe: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  modalScroll: { padding: SPACING.LG, gap: SPACING.LG, paddingBottom: 60 } as ViewStyle,
  modalBanner: { alignItems: 'center', gap: 8, paddingVertical: SPACING.XL, borderRadius: 20, marginBottom: SPACING.SM } as ViewStyle,
  modalSuccessIcon: { fontSize: 56 } as TextStyle,
  modalTitle: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.XXXL, fontFamily: FONT_FAMILY.HEADING, fontWeight: '900', letterSpacing: -0.5 } as TextStyle,
  modalSubtitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY, textAlign: 'center', lineHeight: 22 } as TextStyle,
  modalCard: { backgroundColor: COLORS.SURFACE_1, borderRadius: 18, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.LG, gap: SPACING.SM, overflow: 'hidden' } as ViewStyle,
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.DIVIDER } as ViewStyle,
  modalRowLabel: { color: COLORS.TEXT_MUTED, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.SECONDARY, flex: 1 } as TextStyle,
  modalRowVal: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '600', flex: 1.6, textAlign: 'right' } as TextStyle,
  policyCard: { backgroundColor: COLORS.SURFACE_1, borderRadius: 16, borderWidth: 1, borderColor: COLORS.CARD_BORDER, padding: SPACING.MD, gap: SPACING.SM } as ViewStyle,
  policyTitle: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700', marginBottom: 4 } as TextStyle,
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.SM } as ViewStyle,
  policyDot: { width: 10, height: 10, borderRadius: 5 } as ViewStyle,
  policyWindow: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY } as TextStyle,
  policyLabel: { fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
  modalActions: { gap: SPACING.SM } as ViewStyle,
  calendarBtn: { borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.CARD_BORDER, paddingVertical: 14, alignItems: 'center', backgroundColor: COLORS.SURFACE_2 } as ViewStyle,
  calendarBtnText: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.MD, fontFamily: FONT_FAMILY.BODY_SEMI, fontWeight: '700' } as TextStyle,
});

export default BookingScreen;
