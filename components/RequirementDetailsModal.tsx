import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  XMarkIcon,
  AcademicCapIcon,
  BookOpenIcon,
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  BuildingLibraryIcon,
  UserIcon,
  MapPinIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { DegreeRequirement } from '@/data/academicData';
import { Course, mockCourses } from '@/data/mockCourses';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';

interface RequirementDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  requirement: DegreeRequirement | null;
  onCoursePress?: (course: Course) => void;
}

const CategoryIcons = {
  major: AcademicCapIcon,
  general_education: BookOpenIcon,
  minor: SparklesIcon,
  elective: ClockIcon,
};

const CategoryColors = {
  major: SwipeColors.accentBlue,
  general_education: SwipeColors.success,
  minor: SwipeColors.warning,
  elective: SwipeColors.textSecondary,
};

export default function RequirementDetailsModal({
  visible,
  onClose,
  requirement,
  onCoursePress,
}: RequirementDetailsModalProps) {
  const { likedCourses } = useLikedCourses();

  if (!requirement) return null;

  const IconComponent = CategoryIcons[requirement.category];
  const categoryColor = CategoryColors[requirement.category];
  const progress = requirement.requiredCredits > 0 
    ? Math.min(requirement.completedCredits / requirement.requiredCredits, 1)
    : 0;

  // Get courses that satisfy this requirement
  const satisfyingCourses = mockCourses.filter(course => 
    requirement.courses.includes(course.courseCode)
  );

  // Get completed courses (courses that are liked and part of this requirement)
  const completedCourses = satisfyingCourses.filter(course =>
    likedCourses.some(likedCourse => likedCourse.id === course.id)
  );

  // Get remaining courses needed
  const remainingCourses = satisfyingCourses.filter(course =>
    !completedCourses.some(completedCourse => completedCourse.id === course.id)
  );

  const creditsNeeded = Math.max(0, requirement.requiredCredits - requirement.completedCredits);

  const CourseCard = ({ course, isCompleted }: { course: Course; isCompleted: boolean }) => (
    <TouchableOpacity
      style={[
        styles.courseCard,
        isCompleted && styles.courseCardCompleted
      ]}
      onPress={() => onCoursePress?.(course)}
      activeOpacity={0.7}
    >
      <LinearGradient
        colors={[
          isCompleted ? 'rgba(76, 175, 80, 0.1)' : SwipeColors.cardGradientStart,
          isCompleted ? 'rgba(76, 175, 80, 0.05)' : SwipeColors.cardGradientEnd,
        ]}
        style={styles.courseCardGradient}
      >
        <View style={styles.courseHeader}>
          <View style={styles.courseInfo}>
            <View style={styles.courseCodeRow}>
              <Text style={[
                styles.courseCode,
                isCompleted && { color: SwipeColors.success }
              ]}>
                {course.courseCode}
              </Text>
              {isCompleted && (
                <View style={styles.completedIndicator}>
                  <CheckCircleIcon size={16} color={SwipeColors.success} />
                </View>
              )}
            </View>
            <Text style={styles.courseTitle} numberOfLines={2}>
              {course.title}
            </Text>
          </View>
          <View style={[
            styles.schoolBadge,
            { backgroundColor: SwipeColors.schools[course.school] }
          ]}>
            <Text style={styles.schoolText}>{course.school}</Text>
          </View>
        </View>

        <View style={styles.courseDetails}>
          <View style={styles.detailRow}>
            <UserIcon size={14} color={SwipeColors.textTertiary} />
            <Text style={styles.detailText}>{course.professor}</Text>
          </View>
          
          {course.meetingTime && (
            <View style={styles.detailRow}>
              <ClockIcon size={14} color={SwipeColors.textTertiary} />
              <Text style={styles.detailText}>{course.meetingTime}</Text>
            </View>
          )}
          
          {course.location && (
            <View style={styles.detailRow}>
              <MapPinIcon size={14} color={SwipeColors.textTertiary} />
              <Text style={styles.detailText}>{course.location}</Text>
            </View>
          )}
          
          <View style={styles.detailRow}>
            <BuildingLibraryIcon size={14} color={SwipeColors.textTertiary} />
            <Text style={styles.detailText}>
              {course.credits} credit{course.credits !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {course.professorRating && (
          <View style={styles.ratingSection}>
            <Text style={styles.ratingText}>
              ★ {course.professorRating.overall.toFixed(1)} 
              <Text style={styles.ratingDetail}>
                {' '}• {course.professorRating.difficulty.toFixed(1)} difficulty
              </Text>
            </Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
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
              <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
                <IconComponent size={24} color={categoryColor} />
              </View>
              <View style={styles.titleText}>
                <Text style={styles.modalTitle}>{requirement.name}</Text>
                <Text style={styles.modalSubtitle}>{requirement.description}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress Overview */}
        <View style={styles.progressOverview}>
          <LinearGradient
            colors={[categoryColor, `${categoryColor}CC`]}
            style={styles.progressCard}
          >
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>Progress</Text>
              <Text style={styles.progressPercentage}>{Math.round(progress * 100)}%</Text>
            </View>
            
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{requirement.completedCredits}</Text>
                <Text style={styles.statLabel}>completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{creditsNeeded}</Text>
                <Text style={styles.statLabel}>remaining</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{requirement.requiredCredits}</Text>
                <Text style={styles.statLabel}>required</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Completed Courses */}
          {completedCourses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Completed Courses</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{completedCourses.length}</Text>
                </View>
              </View>
              
              <View style={styles.coursesList}>
                {completedCourses.map((course) => (
                  <CourseCard key={course.id} course={course} isCompleted={true} />
                ))}
              </View>
            </View>
          )}

          {/* Remaining Courses */}
          {remainingCourses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Courses</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{remainingCourses.length}</Text>
                </View>
              </View>
              
              <View style={styles.coursesList}>
                {remainingCourses.map((course) => (
                  <CourseCard key={course.id} course={course} isCompleted={false} />
                ))}
              </View>
            </View>
          )}

          {/* Empty State */}
          {satisfyingCourses.length === 0 && (
            <View style={styles.emptyState}>
              <IconComponent size={64} color={SwipeColors.textTertiary} />
              <Text style={styles.emptyTitle}>No Specific Courses</Text>
              <Text style={styles.emptyText}>
                This requirement can be satisfied by any courses in the {requirement.category} category.
                Complete {creditsNeeded} more credits to fulfill this requirement.
              </Text>
            </View>
          )}

          <View style={styles.bottomPadding} />
        </ScrollView>
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
    flexDirection: 'column',
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-end',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  titleText: {
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
    lineHeight: 20,
  },
  progressOverview: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  sectionBadge: {
    backgroundColor: SwipeColors.accentBlue,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  coursesList: {
    gap: 12,
  },
  courseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  courseCardCompleted: {
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  courseCardGradient: {
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginRight: 8,
  },
  completedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
  schoolBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  courseDetails: {
    gap: 6,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    flex: 1,
  },
  ratingSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  ratingText: {
    fontSize: 12,
    color: SwipeColors.warning,
    fontWeight: '600',
  },
  ratingDetail: {
    color: SwipeColors.textTertiary,
    fontWeight: '400',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
});