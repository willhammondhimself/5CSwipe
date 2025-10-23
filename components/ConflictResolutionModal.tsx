/**
 * ConflictResolutionModal.tsx
 * ============================
 * Smart conflict resolution for overlapping courses
 *
 * Features:
 * - Side-by-side conflict display
 * - Alternative section suggestions
 * - One-click course swap
 * - Smooth animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  XMarkIcon,
  ClockIcon,
  CalendarDaysIcon,
  UserIcon,
  MapPinIcon,
  BuildingLibraryIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';
import { parseMeetingTime, type Weekday } from '@/utils/hyperschedule';

const { width: screenWidth } = Dimensions.get('window');

export interface ConflictInfo {
  course1: Course;
  course2: Course;
  overlappingDays: Weekday[];
  overlapDuration: number; // minutes
}

interface ConflictResolutionModalProps {
  visible: boolean;
  conflict: ConflictInfo | null;
  alternatives: Course[];
  loadingAlternatives: boolean;
  onClose: () => void;
  onKeepCourse: (course: Course, removeOther: Course) => void;
  onSwapCourse: (oldCourse: Course, newCourse: Course) => void;
  onViewAlternatives: (course: Course) => void;
}

export default function ConflictResolutionModal({
  visible,
  conflict,
  alternatives,
  loadingAlternatives,
  onClose,
  onKeepCourse,
  onSwapCourse,
  onViewAlternatives,
}: ConflictResolutionModalProps) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showingAlternativesFor, setShowingAlternativesFor] = useState<Course | null>(null);

  useEffect(() => {
    if (!visible) {
      setSelectedCourse(null);
      setShowingAlternativesFor(null);
    }
  }, [visible]);

  if (!conflict) return null;

  const { course1, course2, overlappingDays, overlapDuration } = conflict;

  const renderCourseCard = (course: Course, isConflicting: boolean = true) => (
    <LinearGradient
      colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
      style={[styles.courseCard, isConflicting && styles.conflictingCard]}
    >
      {/* School Badge */}
      <View style={[styles.schoolBadge, { backgroundColor: SwipeColors.schools[course.school] }]}>
        <Text style={styles.schoolText}>{course.school}</Text>
      </View>

      {/* Course Header */}
      <View style={styles.courseHeader}>
        <Text style={styles.courseCode}>{course.courseCode}</Text>
        <Text style={styles.courseTitle} numberOfLines={2}>
          {course.title}
        </Text>
      </View>

      {/* Course Details */}
      <View style={styles.courseDetails}>
        <View style={styles.detailRow}>
          <UserIcon size={14} color={SwipeColors.textTertiary} />
          <Text style={styles.detailText}>{course.professor}</Text>
        </View>
        <View style={styles.detailRow}>
          <ClockIcon size={14} color={SwipeColors.textTertiary} />
          <Text style={styles.detailText}>{course.meetingTime}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPinIcon size={14} color={SwipeColors.textTertiary} />
          <Text style={styles.detailText}>{course.location}</Text>
        </View>
        <View style={styles.detailRow}>
          <BuildingLibraryIcon size={14} color={SwipeColors.textTertiary} />
          <Text style={styles.detailText}>{course.credits} credits</Text>
        </View>
      </View>
    </LinearGradient>
  );

  const renderAlternative = (alternative: Course) => (
    <TouchableOpacity
      key={alternative.id}
      style={styles.alternativeCard}
      onPress={() => {
        if (showingAlternativesFor) {
          onSwapCourse(showingAlternativesFor, alternative);
        }
      }}
    >
      <View style={styles.alternativeHeader}>
        <Text style={styles.alternativeCode}>{alternative.courseCode}</Text>
        <View style={styles.swapBadge}>
          <ArrowsRightLeftIcon size={12} color="#FFFFFF" />
          <Text style={styles.swapText}>Swap</Text>
        </View>
      </View>

      <View style={styles.alternativeDetails}>
        <View style={styles.detailRow}>
          <ClockIcon size={12} color={SwipeColors.textTertiary} />
          <Text style={styles.alternativeText}>{alternative.meetingTime}</Text>
        </View>
        <View style={styles.detailRow}>
          <UserIcon size={12} color={SwipeColors.textTertiary} />
          <Text style={styles.alternativeText}>{alternative.professor}</Text>
        </View>
        <View style={styles.detailRow}>
          <MapPinIcon size={12} color={SwipeColors.textTertiary} />
          <Text style={styles.alternativeText}>{alternative.location}</Text>
        </View>
      </View>

      {/* Availability */}
      {alternative.spots && alternative.enrolled !== undefined && (
        <View style={styles.availabilityRow}>
          <Text style={styles.availabilityText}>
            {alternative.spots - alternative.enrolled} spots left
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <ExclamationTriangleIcon size={24} color={SwipeColors.error} />
              <Text style={styles.title}>Schedule Conflict</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <XMarkIcon size={24} color={SwipeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Conflict Info */}
          <View style={styles.conflictInfo}>
            <View style={styles.infoRow}>
              <CalendarDaysIcon size={16} color={SwipeColors.textTertiary} />
              <Text style={styles.infoText}>
                Overlaps on: {overlappingDays.join(', ')}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <ClockIcon size={16} color={SwipeColors.textTertiary} />
              <Text style={styles.infoText}>
                Duration: {overlapDuration} minutes
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Conflicting Courses */}
            {!showingAlternativesFor && (
              <>
                <Text style={styles.sectionTitle}>Conflicting Courses</Text>

                <View style={styles.coursesContainer}>
                  {renderCourseCard(course1)}
                  {renderCourseCard(course2)}
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsContainer}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onKeepCourse(course1, course2)}
                  >
                    <Text style={styles.actionButtonText}>Keep {course1.courseCode}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onKeepCourse(course2, course1)}
                  >
                    <Text style={styles.actionButtonText}>Keep {course2.courseCode}</Text>
                  </TouchableOpacity>
                </View>

                {/* Alternative Actions */}
                <View style={styles.alternativeActions}>
                  <TouchableOpacity
                    style={styles.viewAlternativesButton}
                    onPress={() => {
                      setShowingAlternativesFor(course1);
                      onViewAlternatives(course1);
                    }}
                  >
                    <Text style={styles.viewAlternativesText}>
                      View alternatives for {course1.courseCode}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.viewAlternativesButton}
                    onPress={() => {
                      setShowingAlternativesFor(course2);
                      onViewAlternatives(course2);
                    }}
                  >
                    <Text style={styles.viewAlternativesText}>
                      View alternatives for {course2.courseCode}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Alternatives View */}
            {showingAlternativesFor && (
              <>
                <View style={styles.alternativesHeader}>
                  <TouchableOpacity
                    onPress={() => setShowingAlternativesFor(null)}
                    style={styles.backButton}
                  >
                    <Text style={styles.backButtonText}>← Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.sectionTitle}>
                    Alternatives for {showingAlternativesFor.courseCode}
                  </Text>
                </View>

                {loadingAlternatives ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={SwipeColors.primary} />
                    <Text style={styles.loadingText}>Finding alternatives...</Text>
                  </View>
                ) : alternatives.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      No alternative sections found for this course
                    </Text>
                  </View>
                ) : (
                  <View style={styles.alternativesList}>
                    {alternatives.map(renderAlternative)}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: SwipeColors.cardBackground,
    borderRadius: 24,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conflictInfo: {
    padding: 16,
    backgroundColor: 'rgba(255, 69, 58, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
  },
  coursesContainer: {
    gap: 12,
    marginBottom: 20,
  },
  courseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
  },
  conflictingCard: {
    borderColor: SwipeColors.error,
    borderWidth: 2,
  },
  schoolBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  courseHeader: {
    marginBottom: 12,
    paddingRight: 60,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
  courseDetails: {
    gap: 6,
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
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: SwipeColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alternativeActions: {
    gap: 8,
  },
  viewAlternativesButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewAlternativesText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
    textAlign: 'center',
  },
  alternativesHeader: {
    marginBottom: 16,
  },
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
  },
  alternativesList: {
    gap: 12,
  },
  alternativeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  alternativeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alternativeCode: {
    fontSize: 14,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  swapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SwipeColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  swapText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alternativeDetails: {
    gap: 4,
    marginBottom: 8,
  },
  alternativeText: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    flex: 1,
  },
  availabilityRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  availabilityText: {
    fontSize: 11,
    color: SwipeColors.success,
    fontWeight: '600',
  },
});
