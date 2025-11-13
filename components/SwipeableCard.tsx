import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { 
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  StarIcon,
  ExclamationCircleIcon,
  AcademicCapIcon,
  SignalIcon,
  CalendarDaysIcon,
  BellIcon
} from 'react-native-heroicons/outline';
import { BellIcon as BellSolidIcon } from 'react-native-heroicons/solid';
import { Course , mockCourses } from '../data/mockCourses';
import { SwipeColors } from '../contexts/constants/Colors';
import { findScheduleConflicts } from '@/utils/scheduleUtils';
import { useCreditSystem } from '@/contexts/CreditSystemContext';
import { usePrerequisiteValidation } from '@/hooks/usePrerequisiteValidation';
import { useNotifications } from '@/hooks/useNotifications';
import { useCardPreferences, type CardViewMode } from '@/contexts/CardPreferencesContext';
import CourseQuickActions from './CourseQuickActions';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.85;
const CARD_HEIGHT = screenHeight * 0.57;

// Helper function for difficulty color coding
const getDifficultyColor = (difficulty: number) => {
  if (difficulty <= 2.5) return SwipeColors.success;
  if (difficulty <= 3.5) return SwipeColors.accentBlue;
  return SwipeColors.danger;
};

interface SwipeableCardProps {
  course: Course;
  isFirst?: boolean;
  onTap?: () => void;
  likedCourses?: Course[];
  onSwipeRight?: (course: Course) => void;
  onSwipeLeft?: (course: Course) => void;
  onSuperLike?: (course: Course) => void;
}

export default function SwipeableCard({
  course,
  isFirst = false,
  onTap,
  likedCourses = [],
  onSwipeRight,
  onSwipeLeft,
  onSuperLike,
}: SwipeableCardProps) {
  const { preferences } = useCardPreferences();
  const { viewMode, cardScale } = preferences;
  const { creditSystem } = useCreditSystem();
  const { validateCourse } = usePrerequisiteValidation(mockCourses);
  const {
    isSubscribedToCourse,
    toggleCourseSubscription,
    quickSubscribeToCourse,
    hasPermission,
    isInitialized,
  } = useNotifications();

  // Double-tap detection
  const lastTap = useRef<number>(0);
  const tapTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long-press detection for quick actions menu
  const [showQuickActions, setShowQuickActions] = useState(false);
  const longPressTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStartTime = useRef<number>(0);
  const LONG_PRESS_DURATION = 500; // 500ms for long press

  const schoolColor = SwipeColors.schools[course.school];
  const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
  const isFull = spotsLeft <= 0;
  const enrollmentPercentage = (course.enrollmentCurrent / course.enrollmentCap) * 100;

  const conflicts = findScheduleConflicts(course, likedCourses);
  const hasConflict = conflicts.length > 0;

  // Validate prerequisites
  const prerequisiteValidation = validateCourse(course);
  const hasPrereqIssues = !prerequisiteValidation.validation.isValid;
  const hasPrereqWarnings = prerequisiteValidation.validation.warnings.length > 0;

  const displayCredits = creditSystem === 'hmc' ? Math.round(course.credits / 3) || 1 : course.credits;
  const creditsLabel = creditSystem === 'hmc' ? 'HMC credits' : 'credits';

  // Apply card scale from preferences
  const scaledCardWidth = CARD_WIDTH * cardScale;
  const scaledCardHeight = CARD_HEIGHT * cardScale;

  // Determine which content to show based on view mode
  const showFullInfo = viewMode === 'detailed';
  const showMinimalInfo = viewMode === 'compact';

  // Notification subscription status
  const hasAnySubscription = isSubscribedToCourse(course.id, 'spot_available') ||
                            isSubscribedToCourse(course.id, 'waitlist_movement') ||
                            isSubscribedToCourse(course.id, 'course_added');

  const handleNotificationToggle = async (event: any) => {
    event.stopPropagation();
    if (!hasPermission || !isInitialized) {
      return;
    }

    if (hasAnySubscription) {
      // Unsubscribe from all types
      await toggleCourseSubscription(course, 'spot_available');
      await toggleCourseSubscription(course, 'waitlist_movement');
      await toggleCourseSubscription(course, 'course_added');
    } else {
      // Quick subscribe to relevant notifications
      await quickSubscribeToCourse(course);
    }
  };

  // Long-press handlers
  const handlePressIn = () => {
    pressStartTime.current = Date.now();
    longPressTimeout.current = setTimeout(() => {
      // Long press detected
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowQuickActions(true);
    }, LONG_PRESS_DURATION);
  };

  const handlePressOut = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  // Double-tap handler
  const handlePress = () => {
    // Don't process tap if it was a long press
    const pressDuration = Date.now() - pressStartTime.current;
    if (pressDuration >= LONG_PRESS_DURATION) {
      return;
    }

    if (!onTap) return;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap detected - open details immediately
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTap();
    } else {
      // Single tap - delay to check for double tap
      tapTimeout.current = setTimeout(() => {
        // Could add single-tap behavior here if needed
        tapTimeout.current = null;
      }, DOUBLE_TAP_DELAY);
    }

    lastTap.current = now;
  };
  
  return (
    <>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!onTap}
      >
        <LinearGradient
        colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
        style={[
          styles.card,
          isFirst && styles.firstCard,
          hasConflict && styles.conflictCard,
          { width: scaledCardWidth, height: scaledCardHeight },
          showMinimalInfo && styles.compactCard,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
      {/* Conflict Warning */}
      {hasConflict && (
        <View style={styles.conflictBadge}>
          <ExclamationTriangleIcon width={14} height={14} color={SwipeColors.danger} />
          <Text style={styles.conflictText}>TIME CONFLICT</Text>
        </View>
      )}

      {/* Prerequisite Warning */}
      {hasPrereqIssues && (
        <View style={[styles.conflictBadge, styles.prereqBadge]}>
          <AcademicCapIcon width={14} height={14} color={SwipeColors.warning} />
          <Text style={[styles.conflictText, styles.prereqText]}>PREREQUISITES</Text>
        </View>
      )}

      {/* Prerequisite Advisory */}
      {!hasPrereqIssues && hasPrereqWarnings && (
        <View style={[styles.conflictBadge, styles.advisoryBadge]}>
          <ExclamationCircleIcon width={14} height={14} color={SwipeColors.accentBlue} />
          <Text style={[styles.conflictText, styles.advisoryText]}>ADVISORY</Text>
        </View>
      )}
      
      {/* School Badge with glow effect */}
      <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
        <Text style={styles.schoolText}>{course.school}</Text>
      </View>

      {/* Notification Bell Button */}
      {hasPermission && isInitialized && (
        <TouchableOpacity
          style={[styles.notificationButton, hasAnySubscription && styles.notificationButtonActive]}
          onPress={handleNotificationToggle}
          activeOpacity={0.7}
        >
          {hasAnySubscription ? (
            <BellSolidIcon width={16} height={16} color={SwipeColors.accentBlue} />
          ) : (
            <BellIcon width={16} height={16} color={SwipeColors.textTertiary} />
          )}
        </TouchableOpacity>
      )}
      
      {/* Enhanced Course Header */}
      <View style={[styles.header, hasConflict && styles.headerWithConflict]}>
        <View style={styles.headerContent}>
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{course.title}</Text>
          <View style={styles.courseCodeRow}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            {course.crossListings && course.crossListings.length > 0 && (
              <View style={styles.crossListBadge}>
                <Text style={styles.crossListText}>+{course.crossListings.length}</Text>
              </View>
            )}
            {enrollmentPercentage >= 95 && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>HOT</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {/* Enhanced Course Information Section */}
      <View style={styles.infoSection}>
        {/* Professor Row with Enhanced Rating */}
        <View style={styles.infoRow}>
          <UserIcon width={16} height={16} color={SwipeColors.textTertiary} />
          <Text style={styles.infoText}>{course.professor}</Text>
          {course.professorRating && (
            <View style={styles.ratingContainer}>
              <StarIcon width={14} height={14} color={SwipeColors.accentBlue} />
              <Text style={styles.ratingText}>{course.professorRating.overall.toFixed(1)}</Text>
              <Text style={styles.ratingReviews}>({course.professorRating.reviews})</Text>
              <View style={[styles.difficultyIndicator, { backgroundColor: getDifficultyColor(course.professorRating.difficulty) }]}>
                <Text style={styles.difficultyText}>{course.professorRating.difficulty.toFixed(1)}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Meeting Time with Days Highlighting */}
        <View style={styles.infoRow}>
          <ClockIcon width={16} height={16} color={SwipeColors.textTertiary} />
          <Text style={styles.infoText}>{course.meetingTime}</Text>
          {course.meetingDays && (
            <View style={styles.daysContainer}>
              {['M', 'T', 'W', 'Th', 'F'].map(day => (
                <View 
                  key={day} 
                  style={[
                    styles.dayIndicator, 
                    course.meetingDays.includes(day as any) && styles.activeDayIndicator
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    course.meetingDays.includes(day as any) && styles.activeDayText
                  ]}>{day}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        
        {/* Location with Building Info */}
        <View style={styles.infoRow}>
          <MapPinIcon width={16} height={16} color={SwipeColors.textTertiary} />
          <Text style={styles.infoText}>{course.location}</Text>
          {course.instructionMethod !== 'In-Person' && (
            <View style={styles.methodBadge}>
              <Text style={styles.methodText}>{course.instructionMethod}</Text>
            </View>
          )}
        </View>
        
        {/* Course Level & Grade Type */}
        <View style={styles.infoRow}>
          <AcademicCapIcon width={16} height={16} color={SwipeColors.textTertiary} />
          <Text style={styles.infoText}>{course.courseLevel}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{course.gradeType}</Text>
          </View>
        </View>
      </View>
      
      {/* Divider */}
      <View style={styles.divider} />
      
      {/* Description */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.description} numberOfLines={3}>
          {course.description}
        </Text>
      </View>
      
      {/* Distribution Requirements - hide in compact mode */}
      {!showMinimalInfo && course.distributionReqs && course.distributionReqs.length > 0 && (
        <View style={styles.reqsContainer}>
          {course.distributionReqs.slice(0, 3).map((req, index) => (
            <View key={index} style={styles.reqBadge}>
              <Text style={styles.reqText}>{req}</Text>
            </View>
          ))}
        </View>
      )}
      
      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Credits Badge */}
        <View style={styles.creditsBadge}>
          <Text style={styles.creditsText}>{displayCredits}</Text>
          <Text style={styles.creditsLabel}>{creditsLabel}</Text>
        </View>
        
        {/* Enhanced Enrollment Status */}
        <View style={styles.enrollmentSection}>
          <View style={styles.enrollmentInfo}>
            <View style={styles.enrollmentHeader}>
              <Text style={[styles.spotsText, isFull && styles.fullText]}>
                {isFull ? 'FULL' : `${spotsLeft} spots`}
              </Text>
              {enrollmentPercentage >= 90 && !isFull && (
                <View style={styles.fillingFastBadge}>
                  <SignalIcon width={10} height={10} color={SwipeColors.danger} />
                  <Text style={styles.fillingFastText}>Filling Fast</Text>
                </View>
              )}
            </View>
            <Text style={styles.enrollmentNumbers}>
              {course.enrollmentCurrent}/{course.enrollmentCap} enrolled
            </Text>
          </View>
          <View style={styles.enrollmentBarContainer}>
            <View style={styles.enrollmentBar}>
              <View 
                style={[
                  styles.enrollmentFill,
                  { width: `${Math.min(enrollmentPercentage, 100)}%` },
                  isFull && styles.fullFill,
                  enrollmentPercentage >= 90 && !isFull && styles.almostFullFill
                ]}
              />
            </View>
          </View>
        </View>
      </View>
      
      {/* Enhanced Bottom Info - show more details in detailed mode */}
      {(course.prerequisites || course.majorRequirements || course.waitlistCap) && (
        <View style={styles.prerequisitesContainer}>
          {course.prerequisites && (
            <View style={styles.prereqRow}>
              <ExclamationCircleIcon width={12} height={12} color={SwipeColors.textTertiary} />
              <Text style={styles.prerequisites}>Prereq: {course.prerequisites}</Text>
            </View>
          )}
          {showFullInfo && course.majorRequirements && course.majorRequirements.length > 0 && (
            <View style={styles.prereqRow}>
              <AcademicCapIcon width={12} height={12} color={SwipeColors.success} />
              <Text style={styles.majorReq}>Counts for: {course.majorRequirements.slice(0, 2).join(', ')}</Text>
            </View>
          )}
          {course.waitlistCap && course.waitlistCurrent !== undefined && (
            <View style={styles.prereqRow}>
              <CalendarDaysIcon width={12} height={12} color={SwipeColors.accentBlue} />
              <Text style={styles.permsInfo}>PERMs: {course.waitlistCurrent}/{course.waitlistCap}</Text>
            </View>
          )}
        </View>
      )}
      </LinearGradient>
    </TouchableOpacity>

    {/* Quick Actions Menu */}
    <CourseQuickActions
      visible={showQuickActions}
      course={course}
      onClose={() => setShowQuickActions(false)}
      onLike={() => onSwipeRight?.(course)}
      onSkip={() => onSwipeLeft?.(course)}
      onSuperLike={() => onSuperLike?.(course)}
      onViewDetails={onTap}
    />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: SwipeColors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  firstCard: {
    shadowOpacity: 0.4,
    elevation: 20,
  },
  compactCard: {
    padding: 16,
  },
  schoolBadge: {
    position: 'absolute',
    top: 10,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 16,
    paddingRight: 70,
    paddingLeft: 0, // Space for conflict badge when present
    paddingTop: 20, // Reduced from 30 to give more space for title
    minHeight: 60, // Ensure minimum height for title display
    justifyContent: 'flex-start',
  },
  headerContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  headerWithConflict: {
    paddingTop: 25, // Extra space when conflict badge is present
  },
  courseCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseCode: {
    fontSize: 20, // Increased from 18
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    lineHeight: 26,
  },
  title: {
    fontSize: 32, // Increased from 26 for better readability
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.5,
    lineHeight: 38,
    flexShrink: 0,
  },
  infoSection: {
    marginTop: 8,
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 16, // Increased from 14
    color: SwipeColors.textSecondary,
    marginLeft: 10,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  ratingReviews: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    marginLeft: 2,
  },
  divider: {
    height: 1,
    backgroundColor: SwipeColors.highlightBorder,
    marginVertical: 12,
  },
  descriptionContainer: {
    marginBottom: 12,
  },
  description: {
    fontSize: 16, // Increased from 14
    color: SwipeColors.textSecondary,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  reqsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  reqBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  reqText: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    marginBottom: 16,
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
  },
  creditsBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    minWidth: 60,
  },
  creditsText: {
    fontSize: 22, // Increased from 18
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  creditsLabel: {
    fontSize: 11, // Increased from 10
    color: SwipeColors.textTertiary,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  enrollmentSection: {
    flex: 1,
    marginLeft: 12,
  },
  enrollmentInfo: {
    marginBottom: 6,
  },
  enrollmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 8,
  },
  spotsText: {
    fontSize: 15, // Increased from 13
    fontWeight: '600',
    color: SwipeColors.success,
    marginBottom: 2,
  },
  fullText: {
    color: SwipeColors.danger,
  },
  enrollmentNumbers: {
    fontSize: 13, // Increased from 12
    color: SwipeColors.textTertiary,
  },
  enrollmentBarContainer: {
    flex: 1,
  },
  enrollmentBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  enrollmentFill: {
    height: '100%',
    backgroundColor: SwipeColors.success,
    borderRadius: 4,
  },
  fullFill: {
    backgroundColor: SwipeColors.danger,
  },
  almostFullFill: {
    backgroundColor: '#FFA500',
  },
  fillingFastBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  fillingFastText: {
    fontSize: 9,
    fontWeight: '700',
    color: SwipeColors.danger,
  },
  conflictCard: {
    borderColor: 'rgba(255, 59, 48, 0.4)',
    borderWidth: 2,
  },
  conflictBadge: {
    position: 'absolute',
    top: 10,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    gap: 3,
  },
  conflictText: {
    fontSize: 9,
    fontWeight: '700',
    color: SwipeColors.danger,
    letterSpacing: 0.3,
  },
  prerequisitesContainer: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  prereqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  prerequisites: {
    fontSize: 13, // Increased from 11
    color: SwipeColors.textTertiary,
    fontStyle: 'italic',
    flex: 1,
  },
  majorReq: {
    fontSize: 13, // Increased from 11
    color: SwipeColors.success,
    fontWeight: '500',
    flex: 1,
  },
  permsInfo: {
    fontSize: 13, // Increased from 11
    color: SwipeColors.accentBlue,
    fontWeight: '500',
    flex: 1,
  },
  difficultyIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 6,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  daysContainer: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 2,
  },
  dayIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeDayIndicator: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  dayText: {
    fontSize: 9,
    fontWeight: '600',
    color: SwipeColors.textTertiary,
  },
  activeDayText: {
    color: '#FFFFFF',
  },
  methodBadge: {
    backgroundColor: 'rgba(255, 165, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  methodText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFA500',
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  crossListBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  crossListText: {
    fontSize: 10,
    fontWeight: '700',
    color: SwipeColors.accentBlue,
  },
  popularBadge: {
    backgroundColor: 'rgba(255, 69, 58, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.4)',
  },
  popularText: {
    fontSize: 9,
    fontWeight: '800',
    color: SwipeColors.danger,
    letterSpacing: 0.5,
  },
  prereqBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderColor: 'rgba(255, 193, 7, 0.3)',
    top: 40, // Position below conflict badge
  },
  prereqText: {
    color: SwipeColors.warning,
  },
  advisoryBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.15)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
    top: 40, // Position below conflict badge
  },
  advisoryText: {
    color: SwipeColors.accentBlue,
  },
  notificationButton: {
    position: 'absolute',
    top: 10,
    right: 90, // Position to left of school badge
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  notificationButtonActive: {
    backgroundColor: SwipeColors.accentBlue + '20',
    borderColor: SwipeColors.accentBlue + '40',
  },
});