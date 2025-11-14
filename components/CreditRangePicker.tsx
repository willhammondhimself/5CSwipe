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

const { width: screenWidth } = Dimensions.get('window');

interface CreditRangePickerProps {
  visible: boolean;
  onClose: () => void;
  creditRange: [number, number];
  onSelectRange: (range: [number, number]) => void;
}



export default function CreditRangePicker({
  visible,
  onClose,
  creditRange,
  onSelectRange,
}: CreditRangePickerProps) {
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
              <Text style={styles.title}>Credit Range</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={SwipeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Range Controls */}
            <View style={styles.rangeSection}>
              <View style={styles.rangeGroup}>
                <View style={styles.rangeHeader}>
                  <Text style={styles.rangeLabel}>Minimum Credits</Text>
                  <Text style={styles.rangeValue}>{creditRange[0]}</Text>
                </View>
                <View style={styles.buttonRow}>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <TouchableOpacity
                      key={`min-${num}`}
                      style={[
                        styles.rangeButton,
                        creditRange[0] === num && styles.selectedRangeButton
                      ]}
                      onPress={() => {
                        const newRange: [number, number] = [num, Math.max(num, creditRange[1])];
                        onSelectRange(newRange);
                      }}
                    >
                      <Text style={[
                        styles.rangeButtonText,
                        creditRange[0] === num && styles.selectedRangeButtonText
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.rangeGroup}>
                <View style={styles.rangeHeader}>
                  <Text style={styles.rangeLabel}>Maximum Credits</Text>
                  <Text style={styles.rangeValue}>{creditRange[1]}</Text>
                </View>
                <View style={styles.buttonRow}>
                  {[1, 2, 3, 4, 5, 6].map((num) => (
                    <TouchableOpacity
                      key={`max-${num}`}
                      style={[
                        styles.rangeButton,
                        creditRange[1] === num && styles.selectedRangeButton
                      ]}
                      onPress={() => {
                        const newRange: [number, number] = [Math.min(creditRange[0], num), num];
                        onSelectRange(newRange);
                      }}
                    >
                      <Text style={[
                        styles.rangeButtonText,
                        creditRange[1] === num && styles.selectedRangeButtonText
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Current Selection Display */}
              <View style={styles.selectionDisplay}>
                <Ionicons name="library-outline" size={20} color={SwipeColors.accentBlue} />
                <Text style={styles.selectionText}>
                  Selected: {creditRange[0]} - {creditRange[1]} credits
                </Text>
              </View>
            </View>

            {/* Done Button */}
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
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
  rangeSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  rangeGroup: {
    marginBottom: 24,
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  rangeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.accentBlue,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rangeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedRangeButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: SwipeColors.accentBlue,
  },
  rangeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  selectedRangeButtonText: {
    color: SwipeColors.accentBlue,
  },
  selectionDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 8,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  doneButton: {
    marginHorizontal: 24,
    marginTop: 24,
    marginBottom: 16,
    backgroundColor: SwipeColors.accentBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: SwipeColors.accentBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});