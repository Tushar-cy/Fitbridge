import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../theme/colors';
import SPACING from '../../../theme/spacing';
import TYPOGRAPHY from '../../../theme/typography';

interface BiometricData {
  bmi: number;
  bodyFat: number;
  muscleMass: number;
  posture: string;
  fitnessScore: number;
}

interface BiometricResultProps {
  data: BiometricData;
}

const MetricBar: React.FC<{ label: string; value: number; max: number; unit: string; color: string[] }> = ({
  label, value, max, unit, color,
}) => (
  <View style={metricStyles.container}>
    <View style={metricStyles.labelRow}>
      <Text style={metricStyles.label}>{label}</Text>
      <Text style={metricStyles.value}>{value}{unit}</Text>
    </View>
    <View style={metricStyles.track}>
      <LinearGradient
        colors={color as [string, string]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[metricStyles.fill, { width: `${(value / max) * 100}%` }]}
      />
    </View>
  </View>
);

const metricStyles = StyleSheet.create({
  container: { gap: 6 } as ViewStyle,
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' } as ViewStyle,
  label: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM } as TextStyle,
  value: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.SM, fontWeight: '700' } as TextStyle,
  track: { height: 6, backgroundColor: COLORS.CARD_BORDER, borderRadius: 3, overflow: 'hidden' } as ViewStyle,
  fill: { height: '100%', borderRadius: 3 } as ViewStyle,
});

export const BiometricResult: React.FC<BiometricResultProps> = ({ data }) => {
  return (
    <View style={styles.container}>
      {/* Score circle */}
      <View style={styles.scoreCircle}>
        <LinearGradient colors={COLORS.GRADIENT_PRIMARY} style={styles.scoreGradient}>
          <Text style={styles.score}>{data.fitnessScore}</Text>
          <Text style={styles.scoreLabel}>Fitness Score</Text>
        </LinearGradient>
      </View>

      <View style={styles.metrics}>
        <MetricBar label="BMI" value={data.bmi} max={40} unit="" color={['#22C55E', '#86EFAC']} />
        <MetricBar label="Body Fat" value={data.bodyFat} max={50} unit="%" color={COLORS.GRADIENT_SECONDARY as unknown as string[]} />
        <MetricBar label="Muscle Mass" value={data.muscleMass} max={60} unit="%" color={COLORS.GRADIENT_PRIMARY as unknown as string[]} />
      </View>

      <View style={styles.postureRow}>
        <Text style={styles.postureLabel}>Posture Analysis</Text>
        <Text style={styles.postureValue}>{data.posture}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: SPACING.LG,
    padding: SPACING.LG,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  scoreCircle: {
    alignSelf: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
  } as ViewStyle,
  scoreGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  score: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.XXXL,
    fontWeight: '900',
  } as TextStyle,
  scoreLabel: {
    color: `${COLORS.WHITE}BB`,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
  } as TextStyle,
  metrics: { gap: SPACING.MD } as ViewStyle,
  postureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.CARD_BORDER,
  } as ViewStyle,
  postureLabel: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  } as TextStyle,
  postureValue: {
    color: COLORS.SUCCESS,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '700',
  } as TextStyle,
});

export default BiometricResult;
