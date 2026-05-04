import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle, TextStyle, ImageStyle, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trainer } from '../../../types/user.types';
import COLORS from '../../../theme/colors';
import SPACING from '../../../theme/spacing';
import TYPOGRAPHY, { FONT_FAMILY } from '../../../theme/typography';
import { Badge } from '../../ui/Badge';

const { width: W } = Dimensions.get('window');

interface TrainerCardProps {
  trainer: Trainer;
  onPress: (trainer: Trainer) => void;
  onBook?: (trainer: Trainer) => void;
  variant?: 'portrait' | 'landscape';
}

const StarRating: React.FC<{ rating: number; count: number }> = ({ rating, count }) => (
  <View style={starStyles.row}>
    <Text style={starStyles.star}>★</Text>
    <Text style={starStyles.rating}>{rating.toFixed(1)}</Text>
    <Text style={starStyles.count}>({count})</Text>
  </View>
);

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 } as ViewStyle,
  star: { color: COLORS.WARNING, fontSize: 10 } as TextStyle,
  rating: { color: COLORS.WHITE, fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontWeight: '800', fontFamily: FONT_FAMILY.SECONDARY_MEDIUM } as TextStyle,
  count: { color: 'rgba(255,255,255,0.7)', fontSize: TYPOGRAPHY.FONT_SIZE.XS, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
});

export const TrainerCard: React.FC<TrainerCardProps> = ({
  trainer,
  onPress,
  onBook,
  variant = 'portrait',
}) => {
  if (variant === 'landscape') {
    return (
      <TouchableOpacity
        onPress={() => onPress(trainer)}
        activeOpacity={0.9}
        style={landStyles.card}
      >
        <Image source={{ uri: trainer.photo }} style={landStyles.photo as ImageStyle} />
        <View style={landStyles.info}>
          <View style={landStyles.nameRow}>
            <Text style={landStyles.name} numberOfLines={1}>{trainer.name}</Text>
            {trainer.verified && <Text style={landStyles.verifiedBadge}>✓</Text>}
          </View>
          <Text style={landStyles.spec} numberOfLines={1}>{trainer.specialisation.join(' · ')}</Text>
          <StarRating rating={trainer.rating} count={trainer.reviewCount} />
          <View style={landStyles.bottom}>
            <View>
              <Text style={landStyles.priceMeta}>Per session</Text>
              <Text style={landStyles.price}>₹{trainer.pricePerSession.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => onBook ? onBook(trainer) : onPress(trainer)}
            >
              <LinearGradient
                colors={COLORS.GRADIENT_PRIMARY}
                style={landStyles.bookBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={landStyles.bookBtnText}>Book</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Portrait (full-bleed) variant — used in explore grid
  return (
    <TouchableOpacity
      onPress={() => onPress(trainer)}
      activeOpacity={0.92}
      style={portStyles.card}
    >
      <Image source={{ uri: trainer.photo }} style={portStyles.photo as ImageStyle} />

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(10,10,15,0.5)', 'rgba(10,10,15,0.96)']}
        style={portStyles.gradient}
        locations={[0.3, 0.65, 1]}
      />

      {/* Verified badge */}
      {trainer.verified && (
        <View style={portStyles.verifiedPill}>
          <Text style={portStyles.verifiedText}>✓ Verified</Text>
        </View>
      )}

      {/* Bottom info */}
      <View style={portStyles.info}>
        <View style={portStyles.nameRow}>
          <Text style={portStyles.name} numberOfLines={1}>{trainer.name}</Text>
          <StarRating rating={trainer.rating} count={trainer.reviewCount} />
        </View>

        <View style={portStyles.specRow}>
          {trainer.specialisation.slice(0, 2).map((s) => (
            <Badge key={s} label={s} variant="primary" size="sm" />
          ))}
        </View>

        <View style={portStyles.bottomRow}>
          <View>
            <Text style={portStyles.priceMeta}>Per session</Text>
            <Text style={portStyles.price}>₹{trainer.pricePerSession.toLocaleString()}</Text>
          </View>
          <TouchableOpacity
            style={portStyles.bookBtn}
            onPress={() => onBook ? onBook(trainer) : onPress(trainer)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={COLORS.GRADIENT_PRIMARY}
              style={portStyles.bookGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={portStyles.bookText}>Book Now</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const portStyles = StyleSheet.create({
  card: {
    borderRadius: TYPOGRAPHY.RADIUS.XL,
    overflow: 'hidden',
    backgroundColor: COLORS.CARD_BG,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    marginBottom: SPACING.MD,
  } as ViewStyle,
  photo: { width: '100%', height: 260 } as ImageStyle,
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 220,
  } as ViewStyle,
  verifiedPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: `${COLORS.SUCCESS}CC`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  } as ViewStyle,
  verifiedText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '700',
  } as TextStyle,
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.LG,
    gap: 8,
  } as ViewStyle,
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as ViewStyle,
  name: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.LG,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  } as TextStyle,
  specRow: { flexDirection: 'row', gap: 6 } as ViewStyle,
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  } as ViewStyle,
  priceMeta: { color: COLORS.TEXT_SECONDARY, fontSize: TYPOGRAPHY.FONT_SIZE.XS } as TextStyle,
  price: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XL,
    fontWeight: '900',
  } as TextStyle,
  bookBtn: { borderRadius: 12, overflow: 'hidden' } as ViewStyle,
  bookGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  } as ViewStyle,
  bookText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '700',
  } as TextStyle,
});

const landStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE_2,
    borderRadius: TYPOGRAPHY.RADIUS.LG,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    marginBottom: SPACING.MD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  } as ViewStyle,
  photo: { width: 110, height: 135 } as ImageStyle,
  info: {
    flex: 1,
    padding: SPACING.MD,
    justifyContent: 'space-between',
  } as ViewStyle,
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 } as ViewStyle,
  name: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '800',
    fontFamily: FONT_FAMILY.HEADING,
    flex: 1,
  } as TextStyle,
  verifiedBadge: {
    color: COLORS.SUCCESS,
    fontSize: 14,
    fontWeight: '900',
  } as TextStyle,
  spec: {
    color: COLORS.PRIMARY_LIGHT,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: FONT_FAMILY.SECONDARY_MEDIUM,
  } as TextStyle,
  bottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 8,
  } as ViewStyle,
  priceMeta: { color: COLORS.TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: FONT_FAMILY.SECONDARY } as TextStyle,
  price: { color: COLORS.TEXT_PRIMARY, fontSize: TYPOGRAPHY.FONT_SIZE.LG, fontWeight: '900', fontFamily: FONT_FAMILY.HEADING } as TextStyle,
  bookBtn: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  } as ViewStyle,
  bookBtnText: {
    color: COLORS.WHITE,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,
});

export default TrainerCard;
