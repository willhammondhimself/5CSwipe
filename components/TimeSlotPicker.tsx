import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SwipeColors } from '@/contexts/constants/Colors';
import { TimeSlot } from '@/contexts/FilterContext';

const { width: screenWidth } = Dimensions.get('window');

interface TimeSlotPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedTimeSlot: TimeSlot;
  onSelectTimeSlot: (timeSlot: TimeSlot) => void;
}

const timeSlots: { value: TimeSlot; label: string; description: string; icon: string }[] = [
  { value: 'any', label: 'Any Time', description: 'No time preference', icon: 'time-outline' },
  { value: 'morning', label: 'Morning', description: '8:00 AM - 12:00 PM', icon: 'sunny-outline' },
  { value: 'afternoon', label: 'Afternoon', description: '12:00 PM - 5:00 PM', icon: 'partly-sunny-outline' },
  { value: 'evening', label: 'Evening', description: '5:00 PM - 9:00 PM', icon: 'moon-outline' },
];

export default function TimeSlotPicker({
  visible,
  onClose,
  selectedTimeSlot,
  onSelectTimeSlot,
}: TimeSlotPickerProps) {
  const handleSelect = (timeSlot: TimeSlot) => {
    onSelectTimeSlot(timeSlot);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Preferred Time Slots</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={SwipeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Time Slot Options */}
            <View style={styles.optionsContainer}>
              {timeSlots.map((slot) => {
                const isSelected = selectedTimeSlot === slot.value;
                return (
                  <TouchableOpacity
                    key={slot.value}
                    style={[styles.option, isSelected && styles.selectedOption]}
                    onPress={() => handleSelect(slot.value)}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.optionLeft}>
                        <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
                          <Ionicons 
                            name={slot.icon as any} 
                            size={20} 
                            color={isSelected ? SwipeColors.accentBlue : SwipeColors.textSecondary} 
                          />
                        </View>
                        <View style={styles.textContainer}>
                          <Text style={[styles.optionLabel, isSelected && styles.selectedLabel]}>
                            {slot.label}
                          </Text>
                          <Text style={styles.optionDescription}>{slot.description}</Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={20} color={SwipeColors.accentBlue} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    width: screenWidth,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  option: {
    marginVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  selectedOption: {
    borderColor: SwipeColors.accentBlue,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedIconContainer: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
  },
  textContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  selectedLabel: {
    color: SwipeColors.accentBlue,
  },
  optionDescription: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
  },
});