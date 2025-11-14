import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  TextInput,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useFilters, CourseLevel, InstructionMethod } from '@/contexts/FilterContext';
import { Course } from '@/data/mockCourses';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AdvancedFiltersProps {
  courses: Course[];
  isVisible: boolean;
  onClose: () => void;
}

export default function AdvancedFilters({
  courses,
  isVisible,
  onClose,
}: AdvancedFiltersProps) {
  const {
    filters,
    updateDepartmentFilter,
    updateDistributionReqFilter,
    updateCourseLevelFilter,
    updateInstructionMethodFilter,
    updateSearchQuery,
    getAvailableDepartments,
    getAvailableDistributionReqs,
    resetFilters,
  } = useFilters();

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [isVisible, opacity, scale]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const FilterSection = ({ 
    title, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    sectionKey: string; 
    children: React.ReactNode;
  }) => {
    const isExpanded = expandedSections.has(sectionKey);
    
    return (
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(sectionKey)}
        >
          <Text style={styles.sectionTitle}>{title}</Text>
          <Ionicons
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={SwipeColors.textSecondary}
          />
        </TouchableOpacity>
        {isExpanded && <View style={styles.sectionContent}>{children}</View>}
      </View>
    );
  };

  const CheckboxOption = ({
    label,
    checked,
    onToggle,
  }: {
    label: string;
    checked: boolean;
    onToggle: () => void;
  }) => (
    <TouchableOpacity style={styles.checkboxOption} onPress={onToggle}>
      <View style={[styles.checkbox, checked && styles.checkedBox]}>
        {checked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
      </View>
      <Text style={[styles.optionLabel, checked && styles.checkedLabel]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView intensity={25} style={styles.blurOverlay}>
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={styles.modalContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Advanced Filters</Text>
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      style={styles.resetButton}
                      onPress={resetFilters}
                    >
                      <Text style={styles.resetText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose}>
                      <Ionicons name="close" size={24} color={SwipeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <ScrollView style={styles.filtersContainer} showsVerticalScrollIndicator={false}>
                  {/* Search Query */}
                  <View style={styles.searchSection}>
                    <Text style={styles.sectionTitle}>Search Courses</Text>
                    <View style={styles.searchContainer}>
                      <Ionicons name="search" size={16} color={SwipeColors.textTertiary} />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Search by course, professor, or description"
                        placeholderTextColor={SwipeColors.textTertiary}
                        value={filters.searchQuery}
                        onChangeText={updateSearchQuery}
                      />
                    </View>
                  </View>

                  {/* Departments */}
                  <FilterSection title="Departments" sectionKey="departments">
                    {getAvailableDepartments(courses).map((department) => (
                      <CheckboxOption
                        key={department}
                        label={department}
                        checked={filters.departments.includes(department)}
                        onToggle={() => updateDepartmentFilter(
                          department,
                          !filters.departments.includes(department)
                        )}
                      />
                    ))}
                  </FilterSection>

                  {/* Distribution Requirements */}
                  <FilterSection title="Distribution Requirements" sectionKey="distribution">
                    {getAvailableDistributionReqs(courses).map((req) => (
                      <CheckboxOption
                        key={req}
                        label={req}
                        checked={filters.distributionReqs.includes(req)}
                        onToggle={() => updateDistributionReqFilter(
                          req,
                          !filters.distributionReqs.includes(req)
                        )}
                      />
                    ))}
                  </FilterSection>

                  {/* Course Levels */}
                  <FilterSection title="Course Level" sectionKey="levels">
                    {(['Introductory', 'Intermediate', 'Advanced', 'Graduate'] as CourseLevel[]).map((level) => (
                      <CheckboxOption
                        key={level}
                        label={level}
                        checked={filters.courseLevels.includes(level)}
                        onToggle={() => updateCourseLevelFilter(
                          level,
                          !filters.courseLevels.includes(level)
                        )}
                      />
                    ))}
                  </FilterSection>

                  {/* Instruction Methods */}
                  <FilterSection title="Instruction Method" sectionKey="instruction">
                    {(['In-Person', 'Online', 'Hybrid'] as InstructionMethod[]).map((method) => (
                      <CheckboxOption
                        key={method}
                        label={method}
                        checked={filters.instructionMethods.includes(method)}
                        onToggle={() => updateInstructionMethodFilter(
                          method,
                          !filters.instructionMethods.includes(method)
                        )}
                      />
                    ))}
                  </FilterSection>
                </ScrollView>

                <TouchableOpacity style={styles.applyButton} onPress={onClose}>
                  <LinearGradient
                    colors={[SwipeColors.accentBlue, '#0066CC']}
                    style={styles.applyGradient}
                  >
                    <Text style={styles.applyText}>Apply Filters</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
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
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  resetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
  },
  filtersContainer: {
    maxHeight: screenHeight * 0.5,
  },
  searchSection: {
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: SwipeColors.textPrimary,
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  sectionContent: {
    paddingTop: 12,
  },
  checkboxOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SwipeColors.highlightBorder,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  optionLabel: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  checkedLabel: {
    color: SwipeColors.textPrimary,
    fontWeight: '500',
  },
  applyButton: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  applyGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});