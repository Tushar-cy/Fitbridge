import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import { TimeSlot } from '../../../types/session.types';
import { COLORS } from '../../../theme/colors';
import SPACING from '../../../theme/spacing';
import TYPOGRAPHY from '../../../theme/typography';
import { formatTime } from '../../../utils/formatDate';

interface SlotPickerProps {
  slots: TimeSlot[];
  selectedSlotId?: string;
  onSelect: (slot: TimeSlot) => void;
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  slots,
  selectedSlotId,
  onSelect,
}) => {
  return (
    <View>
      <Text style={styles.label}>Available Slots</Text>
      <View style={styles.grid}>
        {slots.map((slot) => {
          const isSelected = slot.id === selectedSlotId;
          const isUnavailable = !slot.available;
          return (
            <TouchableOpacity
              key={slot.id}
              onPress={() => slot.available && onSelect(slot)}
              disabled={isUnavailable}
              style={[
                styles.slot,
                isSelected && styles.selectedSlot,
                isUnavailable && styles.unavailableSlot,
              ]}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.slotText,
                  isSelected && styles.selectedText,
                  isUnavailable && styles.unavailableText,
                ]}
              >
                {formatTime(slot.time)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    color: COLORS.TEXT_SECONDARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
    marginBottom: SPACING.MD,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  } as TextStyle,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.SM,
  } as ViewStyle,
  slot: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.SM,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.CARD_BORDER,
    backgroundColor: COLORS.CARD_BG,
    minWidth: 90,
    alignItems: 'center',
  } as ViewStyle,
  selectedSlot: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: `${COLORS.PRIMARY}22`,
  } as ViewStyle,
  unavailableSlot: {
    opacity: 0.35,
  } as ViewStyle,
  slotText: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: TYPOGRAPHY.FONT_SIZE.SM,
    fontWeight: '600',
  } as TextStyle,
  selectedText: {
    color: COLORS.PRIMARY,
  } as TextStyle,
  unavailableText: {
    color: COLORS.TEXT_SECONDARY,
  } as TextStyle,
});

export default SlotPicker;
