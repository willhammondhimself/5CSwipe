import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  AcademicCapIcon,
  BookOpenIcon,
  ClockIcon,
  LightBulbIcon,
  ChartBarSquareIcon,
  ArrowRightIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course, mockCourses } from '@/data/mockCourses';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { usePrerequisiteValidation } from '@/hooks/usePrerequisiteValidation';
import PrerequisiteWarning from './PrerequisiteWarning';

interface PrerequisiteValidationViewProps {
  visible: boolean;
  onClose: () => void;
  onCoursePress?: (course: Course) => void;
}

export default function PrerequisiteValidationView({
  visible,
  onClose,
  onCoursePress,
}: PrerequisiteValidationViewProps) {
  const { likedCourses } = useLikedCourses();
  const {
    validateCourses,
    validateLikedCoursesSequence,
    getRecommendedNextCourses,
    suggestPrerequisites,
    validationStats,
    completedCourses,
  } = usePrerequisiteValidation(mockCourses);

  const [selectedTab, setSelectedTab] = useState<'validation' | 'sequence' | 'recommendations'>('validation');

  const validatedCourses = validateCourses(likedCourses);
  const sequenceValidation = validateLikedCoursesSequence();
  const recommendedCourses = getRecommendedNextCourses();

  const handlePrerequisitePress = (prerequisiteCode: string) => {
    // Find and suggest prerequisite courses
    const suggestions = suggestPrerequisites([prerequisiteCode]);
    if (suggestions.length > 0) {
      Alert.alert(
        'Prerequisite Options',
        `Found ${suggestions.length} course${suggestions.length > 1 ? 's' : ''} that can fulfill this requirement:`,
        [
          { text: 'Cancel', style: 'cancel' },
          ...suggestions.slice(0, 2).map(course => ({
            text: course.courseCode,
            onPress: () => onCoursePress?.(course),
          })),
        ]
      );
    }
  };

  const ValidationTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Stats Overview */}
      <View style={styles.statsSection}>
        <Text style={styles.sectionTitle}>Validation Overview</Text>
        <LinearGradient
          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
          style={styles.statsCard}
        >
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <CheckCircleIcon size={24} color={SwipeColors.success} />
              <Text style={styles.statValue}>{validationStats.validCourses}</Text>
              <Text style={styles.statLabel}>Valid Courses</Text>
            </View>
            <View style={styles.statItem}>
              <ExclamationTriangleIcon size={24} color={SwipeColors.danger} />
              <Text style={styles.statValue}>{validationStats.coursesWithMissingPrereqs}</Text>
              <Text style={styles.statLabel}>Missing Prerequisites</Text>
            </View>
            <View style={styles.statItem}>
              <LightBulbIcon size={24} color={SwipeColors.warning} />
              <Text style={styles.statValue}>{validationStats.coursesWithWarnings}</Text>
              <Text style={styles.statLabel}>With Warnings</Text>
            </View>
            <View style={styles.statItem}>
              <AcademicCapIcon size={24} color={SwipeColors.accentBlue} />
              <Text style={styles.statValue}>{validationStats.completedPrerequisites}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Individual Course Validation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Course Validation</Text>
        {validatedCourses.length > 0 ? (
          <View style={styles.coursesList}>
            {validatedCourses.map(({ course, validation, priority }) => (
              <LinearGradient
                key={course.id}
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={[
                  styles.courseCard,
                  priority === 'low' && styles.courseCardError,
                  priority === 'medium' && styles.courseCardWarning,
                ]}
              >
                <View style={styles.courseHeader}>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseCode}>{course.courseCode}</Text>
                    <Text style={styles.courseTitle} numberOfLines={1}>
                      {course.title}
                    </Text>
                  </View>
                  <View style={[
                    styles.priorityBadge,
                    priority === 'high' && styles.priorityHigh,
                    priority === 'medium' && styles.priorityMedium,
                    priority === 'low' && styles.priorityLow,
                  ]}>
                    {priority === 'high' && <CheckCircleIcon size={16} color={SwipeColors.success} />}
                    {priority === 'medium' && <LightBulbIcon size={16} color={SwipeColors.warning} />}
                    {priority === 'low' && <ExclamationTriangleIcon size={16} color={SwipeColors.danger} />}
                  </View>
                </View>

                <PrerequisiteWarning
                  course={course}
                  validation={validation}
                  onPrerequisitePress={handlePrerequisitePress}
                  compact={true}
                />
              </LinearGradient>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <AcademicCapIcon size={48} color={SwipeColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Courses to Validate</Text>
            <Text style={styles.emptyText}>
              Add some courses to your schedule to see prerequisite validation
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const SequenceTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Sequence Validation Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Course Sequence Analysis</Text>
        <LinearGradient
          colors={[
            sequenceValidation.isValid ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 59, 48, 0.1)',
            sequenceValidation.isValid ? 'rgba(76, 175, 80, 0.05)' : 'rgba(255, 59, 48, 0.05)',
          ]}
          style={[
            styles.sequenceCard,
            sequenceValidation.isValid ? styles.sequenceValid : styles.sequenceInvalid,
          ]}
        >
          <View style={styles.sequenceHeader}>
            <View style={styles.sequenceIcon}>
              {sequenceValidation.isValid ? (
                <CheckCircleIcon size={28} color={SwipeColors.success} />
              ) : (
                <ExclamationTriangleIcon size={28} color={SwipeColors.danger} />
              )}
            </View>
            <View style={styles.sequenceInfo}>
              <Text style={[
                styles.sequenceTitle,
                { color: sequenceValidation.isValid ? SwipeColors.success : SwipeColors.danger }
              ]}>
                {sequenceValidation.isValid ? 'Valid Course Sequence' : 'Sequence Issues Found'}
              </Text>
              <Text style={styles.sequenceSubtitle}>
                {sequenceValidation.isValid
                  ? 'Your courses can be taken in the planned order'
                  : `${sequenceValidation.conflicts.length} course${sequenceValidation.conflicts.length > 1 ? 's have' : ' has'} prerequisite conflicts`
                }
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Sequence Conflicts */}
        {sequenceValidation.conflicts.length > 0 && (
          <View style={styles.conflictsList}>
            <Text style={styles.conflictsTitle}>Prerequisites Conflicts</Text>
            {sequenceValidation.conflicts.map(({ course, missingPrerequisites }, index) => (
              <LinearGradient
                key={course.id}
                colors={['rgba(255, 59, 48, 0.1)', 'rgba(255, 59, 48, 0.05)']}
                style={styles.conflictCard}
              >
                <View style={styles.conflictHeader}>
                  <ExclamationTriangleIcon size={20} color={SwipeColors.danger} />
                  <Text style={styles.conflictCourse}>{course.courseCode}</Text>
                </View>
                <Text style={styles.conflictDescription}>
                  Requires: {missingPrerequisites.join(', ')}
                </Text>
                <TouchableOpacity
                  style={styles.conflictAction}
                  onPress={() => handlePrerequisitePress(missingPrerequisites[0])}
                >
                  <Text style={styles.conflictActionText}>Find Prerequisites</Text>
                  <ArrowRightIcon size={14} color={SwipeColors.danger} />
                </TouchableOpacity>
              </LinearGradient>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );

  const RecommendationsTab = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Completed Courses */}
      {completedCourses.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Completed Prerequisites</Text>
          <View style={styles.completedList}>
            {completedCourses.map((course) => (
              <LinearGradient
                key={course.id}
                colors={['rgba(76, 175, 80, 0.1)', 'rgba(76, 175, 80, 0.05)']}
                style={styles.completedCard}
              >
                <CheckCircleIcon size={20} color={SwipeColors.success} />
                <View style={styles.completedInfo}>
                  <Text style={styles.completedCode}>{course.courseCode}</Text>
                  <Text style={styles.completedTitle} numberOfLines={1}>
                    {course.title}
                  </Text>
                </View>
              </LinearGradient>
            ))}
          </View>
        </View>
      )}

      {/* Recommended Next Courses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recommended Next Courses</Text>
        {recommendedCourses.length > 0 ? (
          <View style={styles.recommendationsList}>
            {recommendedCourses.map((course) => (
              <TouchableOpacity
                key={course.id}
                style={styles.recommendationCard}
                onPress={() => onCoursePress?.(course)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                  style={styles.recommendationGradient}
                >
                  <View style={styles.recommendationHeader}>
                    <View style={styles.recommendationInfo}>
                      <Text style={styles.recommendationCode}>{course.courseCode}</Text>
                      <Text style={styles.recommendationTitle} numberOfLines={2}>
                        {course.title}
                      </Text>
                      <Text style={styles.recommendationDepartment}>
                        {course.department} • {course.credits} credits
                      </Text>
                    </View>
                    <View style={styles.recommendationIcon}>
                      <BookOpenIcon size={24} color={SwipeColors.accentBlue} />
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <BookOpenIcon size={48} color={SwipeColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Recommendations</Text>
            <Text style={styles.emptyText}>
              Select a major to get personalized course recommendations
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XMarkIcon size={24} color={SwipeColors.textPrimary} />
            </TouchableOpacity>
            
            <View style={styles.titleSection}>
              <Text style={styles.modalTitle}>Prerequisites</Text>
              <Text style={styles.modalSubtitle}>
                Validate your course selections
              </Text>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'validation' && styles.tabActive]}
              onPress={() => setSelectedTab('validation')}
            >
              <Text style={[
                styles.tabText,
                selectedTab === 'validation' && styles.tabTextActive
              ]}>
                Validation
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'sequence' && styles.tabActive]}
              onPress={() => setSelectedTab('sequence')}
            >
              <Text style={[
                styles.tabText,
                selectedTab === 'sequence' && styles.tabTextActive
              ]}>
                Sequence
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'recommendations' && styles.tabActive]}
              onPress={() => setSelectedTab('recommendations')}
            >
              <Text style={[
                styles.tabText,
                selectedTab === 'recommendations' && styles.tabTextActive
              ]}>
                Recommendations
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {selectedTab === 'validation' && <ValidationTab />}
          {selectedTab === 'sequence' && <SequenceTab />}
          {selectedTab === 'recommendations' && <RecommendationsTab />}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 55,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: SwipeColors.accentBlue,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: SwipeColors.textTertiary,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  statsSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 16,
  },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  courseCardError: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  courseCardWarning: {
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  courseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  courseInfo: {
    flex: 1,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  priorityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priorityHigh: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  priorityMedium: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
  },
  priorityLow: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  sequenceCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  sequenceValid: {
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  sequenceInvalid: {
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  sequenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sequenceIcon: {
    marginRight: 16,
  },
  sequenceInfo: {
    flex: 1,
  },
  sequenceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sequenceSubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    lineHeight: 20,
  },
  conflictsList: {
    marginTop: 20,
    gap: 12,
  },
  conflictsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 8,
  },
  conflictCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  conflictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  conflictCourse: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.danger,
  },
  conflictDescription: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    marginBottom: 12,
  },
  conflictAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  conflictActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.danger,
  },
  completedList: {
    gap: 8,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    gap: 12,
  },
  completedInfo: {
    flex: 1,
  },
  completedCode: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.success,
    marginBottom: 2,
  },
  completedTitle: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
  },
  recommendationsList: {
    gap: 12,
  },
  recommendationCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  recommendationGradient: {
    padding: 16,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  recommendationInfo: {
    flex: 1,
    marginRight: 12,
  },
  recommendationCode: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  recommendationTitle: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  recommendationDepartment: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  recommendationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});