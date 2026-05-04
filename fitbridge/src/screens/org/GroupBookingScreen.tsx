import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../theme/colors';
import SPACING from '../../theme/spacing';
import TYPOGRAPHY from '../../theme/typography';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { TrainerCard } from '../../components/features/trainer/TrainerCard';
import { supabaseService } from '../../services/api/supabaseService';
import { Trainer } from '../../types/user.types';

export const GroupBookingScreen: React.FC<NativeStackScreenProps<any>> = ({ navigation }) => {
  const [seats, setSeats] = useState('10');
  const [selectedTrainer, setSelectedTrainer] = useState<string | null>(null);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    async function load() {
      const data = await supabaseService.getTrainers();
      setTrainers(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Group Booking</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Number of Participants" placeholder="10" value={seats} onChangeText={setSeats} keyboardType="numeric" />
        <Text style={styles.sectionLabel}>Select Trainer</Text>
        {loading ? (
          <Text style={{ color: COLORS.TEXT_MUTED }}>Loading trainers...</Text>
        ) : (
          trainers.slice(0, 4).map((t) => (
            <TrainerCard key={t.id} trainer={t} variant="landscape" onPress={(tr) => setSelectedTrainer(tr.id)} />
          ))
        )}
        <Button title="Book Group Session" onPress={() => navigation.goBack()} fullWidth size="lg" disabled={!selectedTrainer} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.DARK_BG } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.LG, paddingVertical: SPACING.MD } as ViewStyle,
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.CARD_BG, borderWidth: 1, borderColor: COLORS.CARD_BORDER, alignItems: 'center', justifyContent: 'center' } as ViewStyle,
  backArrow: { color: COLORS.TEXT_PRIMARY, fontSize: 18 } as TextStyle,
  title: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '800' } as TextStyle,
  content: { paddingHorizontal: SPACING.LG, gap: SPACING.MD, paddingBottom: SPACING.HUGE } as ViewStyle,
  sectionLabel: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 } as TextStyle,
});

export default GroupBookingScreen;
