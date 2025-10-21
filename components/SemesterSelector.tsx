import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface SemesterSelectorProps {
  selectedSemester: string;
  onSemesterChange: (semester: string) => void;
  availableSemesters?: string[];
}

const DEFAULT_SEMESTERS = [
  'Fall 2024',
  'Spring 2025',
  'Summer 2025',
  'Fall 2025',
];

export default function SemesterSelector({
  selectedSemester,
  onSemesterChange,
  availableSemesters = DEFAULT_SEMESTERS,
}: SemesterSelectorProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const openModal = () => {
    setIsModalVisible(true);
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const closeModal = () => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 }, () => {
      runOnJS(setIsModalVisible)(false);
    });
  };

  const handleSemesterSelect = (semester: string) => {
    onSemesterChange(semester);
    closeModal();
  };

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <>
      <TouchableOpacity style={styles.selector} onPress={openModal} activeOpacity={0.8}>
        <LinearGradient
          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
          style={styles.selectorGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.selectorLabel}>Semester</Text>
          <View style={styles.selectorContent}>
            <Text style={styles.selectedText}>{selectedSemester}</Text>
            <Ionicons name="chevron-down" size={16} color={SwipeColors.textSecondary} />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <BlurView intensity={20} style={styles.blurOverlay}>
            <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
              <TouchableOpacity activeOpacity={1}>
                <LinearGradient
                  colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                  style={styles.modalContent}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Semester</Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Ionicons name="close" size={24} color={SwipeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.semesterList} showsVerticalScrollIndicator={false}>
                    {availableSemesters.map((semester) => (
                      <TouchableOpacity
                        key={semester}
                        style={[
                          styles.semesterOption,
                          selectedSemester === semester && styles.selectedOption,
                        ]}
                        onPress={() => handleSemesterSelect(semester)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.semesterText,
                            selectedSemester === semester && styles.selectedText,
                          ]}
                        >
                          {semester}
                        </Text>
                        {selectedSemester === semester && (
                          <Ionicons name="checkmark" size={20} color={SwipeColors.accentBlue} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </BlurView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  selectorGradient: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selectorLabel: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    marginBottom: 4,
    fontWeight: '500',
  },
  selectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.85,
    maxHeight: screenHeight * 0.6,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  semesterList: {
    maxHeight: 300,
  },
  semesterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  semesterText: {
    fontSize: 16,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
  },
});