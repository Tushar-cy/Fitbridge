import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Session } from '../../../types/session.types';
import { COLORS } from '../../../theme/colors';
import SPACING from '../../../theme/spacing';
import TYPOGRAPHY from '../../../theme/typography';
import { formatDate, formatTime } from '../../../utils/formatDate';
import { Badge } from '../../ui/Badge';

interface BookingCardProps {
  session: Session;
  onPress?: (session: Session) => void;
  onJoin?: (session: Session) => void;
}

const statusVariant = {
  upcoming: 'primary',
  live: 'success',
  completed: 'ghost',
  cancelled: 'error',
} as const;

export const BookingCard: React.FC<BookingCardProps> = ({
  session,
  onPress,
  onJoin,
}) => {
  const isLive = session.status === 'live';

  return (
    <TouchableOpacity
      onPress={() => onPress?.(session)}
      activeOpacity={0.85}
    >
      {isLive ? (
        <LinearGradient
          colors={['#22C55E22', '#13131A']}
          style={styles.card}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <CardContent session={session} onJoin={onJoin} />
        </LinearGradient>
      ) : (
        <View style={styles.card}>
          <CardContent session={session} onJoin={onJoin} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const CardContent: React.FC<{ session: Session; onJoin?: (s: Session) => void }> = ({
  session,
  onJoin,
}) => (
  <View style={styles.inner}>
    {session.trainer?.photo && (
      <Image
        source={{ uri: session.trainer.photo }}
        style={styles.trainerPhoto as ImageStyle}
      />
    )}
    <View style={styles.info}>
      <View style={styles.topRow}>
        <Text style={styles.trainerName} numberOfLines={1}>
          {session.trainer?.name ?? 'Trainer'}
        </Text>
        <Badge
          label={session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          variant={statusVariant[session.status]}
          size="sm"
        />
      </View>
      <Text style={styles.spec}>{session.trainer?.specialisation[0]}</Text>
      <View style={styles.meta}>
        <Text style={styles.metaText}>📅 {formatDate(session.date)}</Text>
        <Text style={styles.metaText}>🕐 {formatTime(session.time)}</Text>
        <Text style={styles.metaText}>
          {session.type === 'virtual' ? '📹 Virtual' : '🏋️ In-Person'}
        </Text>
      </View>
    </View>
    {session.status === 'live' && onJoin && (
      <TouchableOpacity
        style={styles.joinBtn}
        onPress={() => onJoin(session)}
      >
        <Text style={styles.joinText}>Join</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.CARD_BORDER,
    marginBottom: SPACING.MD,
    overflow: 'hidden',
  } as ViewStyle,
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.MD,
    gap: SPACING.MD,
  } as ViewStyle,
  trainerPhoto: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  info: { flex: 1, gap: 4 } as ViewStyle,
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.SM,
  } as ViewStyle,
  trainerName: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.MD,
    fontWeight: '700',
    flex: 1,
  } as TextStyle,
  spec: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  } as TextStyle,
  meta: { gap: 2 } as ViewStyle,
  metaText: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.XS,
  } as TextStyle,
  joinBtn: {
    backgroundColor: COLORS.SUCCESS,
    paddingHorizontal: SPACING.MD,
    paddingVertical: SPACING.SM,
    borderRadius: 10,
  } as ViewStyle,
  joinText: {
    color: COLORS.WHITE,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
  } as TextStyle,
});

export default BookingCard;
