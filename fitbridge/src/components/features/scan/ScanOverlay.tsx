import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../../theme/colors';
import TYPOGRAPHY from '../../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');

interface ScanOverlayProps {
  scanning: boolean;
  progress?: number; // 0-100
}

export const ScanOverlay: React.FC<ScanOverlayProps> = ({
  scanning,
  progress = 0,
}) => {
  const scanLine = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanning) {
      const scanAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLine, { toValue: H * 0.6, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanLine, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ]),
      );
      const pulseAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ]),
      );
      scanAnim.start();
      pulseAnim.start();
      return () => { scanAnim.stop(); pulseAnim.stop(); };
    }
  }, [scanning, scanLine, pulse]);

  return (
    <View style={styles.overlay}>
      {/* Corner markers */}
      {['tl', 'tr', 'bl', 'br'].map((pos) => (
        <View key={pos} style={[styles.corner, styles[pos as keyof typeof styles] as ViewStyle]} />
      ))}

      {/* Scan line */}
      {scanning && (
        <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanLine }] }]}>
          <LinearGradient
            colors={['transparent', COLORS.PRIMARY, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.scanLineGradient}
          />
        </Animated.View>
      )}

      {/* Status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {scanning ? `Scanning... ${progress}%` : 'Position yourself in frame'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.PRIMARY,
    borderWidth: 3,
  } as ViewStyle,
  tl: { top: '15%', left: '10%', borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: '15%', right: '10%', borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: '15%', left: '10%', borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: '15%', right: '10%', borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    height: 2,
  } as ViewStyle,
  scanLineGradient: {
    height: 2,
    width: '100%',
  } as ViewStyle,
  statusBar: {
    position: 'absolute',
    bottom: '20%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  } as ViewStyle,
  statusText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
  } as TextStyle,
});

export default ScanOverlay;
