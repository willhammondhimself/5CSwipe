import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CalendarDaysIcon,
  BuildingLibraryIcon,
  AcademicCapIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  RectangleStackIcon,
  ShareIcon
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { useCreditSystem } from '@/contexts/CreditSystemContext';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';
import { Course, mockCourses } from '@/data/mockCourses';
import { useCourses } from '@/hooks/useCourses';
import HyperscheduleCalendar from '@/components/HyperscheduleCalendar';
import CourseSearchBar from '@/components/CourseSearchBar';
import PlanManager from '@/components/PlanManager';
import AcademicProgressDashboard from '@/components/AcademicProgressDashboard';
import ShareScheduleModal from '@/components/ShareScheduleModal';

export default function ScheduleScreen() {
  const { likedCourses, addLikedCourse } = useLikedCourses();
  const { creditSystem } = useCreditSystem();
  const { activePlan, isLoading, updatePlanCourses, loadPlans } = useScheduleVariants();
  const [showPlanManager, setShowPlanManager] = useState(false);
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [refreshing, setRefreshing] = useState(false);

  // Use real Supabase data
  const { courses: realCourses, refreshCourses } = useCourses({ semester: 'FA 2025' });

  // Use active plan courses if available, otherwise fall back to liked courses
  const currentCourses = activePlan?.courses || likedCourses;

  const totalCredits = creditSystem === 'hmc'
    ? currentCourses.reduce((sum, course) => sum + Math.round(course.credits / 3) || 1, 0)
    : currentCourses.reduce((sum, course) => sum + course.credits, 0);

  const handlePlanActivate = () => {
    // Plan has been activated, close the modal and refresh the view
    setShowPlanManager(false);
  };

  const handleScheduleChange = async (updatedCourses: Course[]) => {
    if (activePlan) {
      // Update the active plan's courses
      await updatePlanCourses(activePlan.id, updatedCourses);
      console.log('Updated active plan with courses:', updatedCourses);
    } else {
      // Update liked courses context - add any new courses
      const existingCourseIds = likedCourses.map(course => course.id);
      updatedCourses.forEach(course => {
        if (!existingCourseIds.includes(course.id)) {
          addLikedCourse(course);
        }
      });
      console.log('Added new courses to liked courses:', updatedCourses);
    }
  };

  const handleCourseAdd = (course: Course) => {
    // Check for duplicates
    const isDuplicate = currentCourses.some(existingCourse => existingCourse.id === course.id);

    if (isDuplicate) {
      console.warn('Course already exists in schedule:', course.courseCode);
      return;
    }

    const updatedCourses = [...currentCourses, course];
    handleScheduleChange(updatedCourses);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshCourses(),
        loadPlans(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <CalendarDaysIcon size={80} color={SwipeColors.textTertiary} />
      <Text style={styles.emptyTitle}>No Schedule Yet</Text>
      <Text style={styles.emptySubtext}>
        Like some courses on the Swipe tab to build your schedule
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Schedule</Text>
            <Text style={styles.headerSubtitle}>
              Plan your perfect semester
            </Text>
          </View>
          
          {currentCourses.length > 0 && (
            <View style={styles.headerActions}>
              {/* Plans Button */}
              <TouchableOpacity 
                style={styles.plansButton}
                onPress={() => setShowPlanManager(true)}
              >
                <RectangleStackIcon size={16} color={SwipeColors.accentBlue} />
                <Text style={styles.plansButtonText}>
                  {activePlan ? activePlan.name : 'Plans'}
                </Text>
              </TouchableOpacity>
              
              {/* View Toggle */}
              <View style={styles.viewToggle}>
                <TouchableOpacity
                  style={[styles.toggleButton, viewMode === 'calendar' && styles.toggleButtonActive]}
                  onPress={() => setViewMode('calendar')}
                >
                  <CalendarDaysIcon 
                    size={16} 
                    color={viewMode === 'calendar' ? SwipeColors.textPrimary : SwipeColors.textTertiary} 
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                  onPress={() => setViewMode('list')}
                >
                  <BuildingLibraryIcon 
                    size={16} 
                    color={viewMode === 'list' ? SwipeColors.textPrimary : SwipeColors.textTertiary} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Progress Button */}
              <TouchableOpacity
                style={styles.progressButton}
                onPress={() => setShowProgressDashboard(true)}
              >
                <AcademicCapIcon size={16} color={SwipeColors.success} />
                <Text style={styles.progressButtonText}>Progress</Text>
              </TouchableOpacity>

              {/* Share Button */}
              {activePlan && (
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => setShowShareModal(true)}
                >
                  <ShareIcon size={16} color={SwipeColors.primary} />
                  <Text style={styles.shareButtonText}>Share</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {currentCourses.length === 0 ? (
        <EmptyState />
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={SwipeColors.primary}
              colors={[SwipeColors.primary]}
            />
          }
        >
          {/* Course Search - HyperSchedule Style */}
          <View style={styles.searchSection}>
            <CourseSearchBar
              courses={realCourses}
              onCourseAdd={handleCourseAdd}
              addedCourses={currentCourses}
              placeholder="Search courses, instructors, departments..."
            />
          </View>

          {/* Schedule View */}
          <View style={styles.scheduleSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {viewMode === 'calendar' ? 'Weekly Schedule' : 'Course List'}
              </Text>
            </View>

            {viewMode === 'calendar' ? (
              <HyperscheduleCalendar
                courses={currentCourses}
                onCoursePress={(course) => {
                  // Handle course press - could show detail modal
                  console.log('Course pressed:', course.courseCode);
                }}
              />
            ) : (
              <View style={styles.listView}>
                {currentCourses.map((course, index) => (
                  <LinearGradient
                    key={course.id}
                    colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                    style={[styles.courseCard, index > 0 && styles.courseCardSpacing]}
                  >
                    {/* School Badge */}
                    <View style={[styles.schoolBadge, { backgroundColor: SwipeColors.schools[course.school] }]}>
                      <Text style={styles.schoolText}>{course.school}</Text>
                    </View>

                    {/* Course Info */}
                    <View style={styles.courseHeader}>
                      <Text style={styles.courseCode}>{course.courseCode}</Text>
                      <Text style={styles.courseTitle}>{course.title}</Text>
                    </View>

                    {/* Details */}
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
                        <Text style={styles.detailText}>{course.credits} credit{course.credits > 1 ? 's' : ''}</Text>
                      </View>
                    </View>
                  </LinearGradient>
                ))}
              </View>
            )}
          </View>

        </ScrollView>
      )}


      {/* Plan Manager Modal */}
      <PlanManager
        visible={showPlanManager}
        onClose={() => setShowPlanManager(false)}
        currentCourses={likedCourses}
        onPlanActivate={handlePlanActivate}
      />

      {/* Academic Progress Dashboard */}
      <AcademicProgressDashboard
        visible={showProgressDashboard}
        onClose={() => setShowProgressDashboard(false)}
        major="Computer Science"
      />

      {/* Share Schedule Modal */}
      {activePlan && (
        <ShareScheduleModal
          visible={showShareModal}
          planId={activePlan.id}
          planName={activePlan.name}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  plansButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    gap: 4,
  },
  plansButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  toggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    gap: 4,
  },
  progressButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.success,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 105, 180, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 105, 180, 0.2)',
    gap: 4,
  },
  shareButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.primary,
  },
  content: {
    flex: 1,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  scheduleSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.3,
    flex: 1,
    marginRight: 12,
  },
  listView: {
    gap: 0,
  },
  courseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
  },
  courseCardSpacing: {
    marginTop: 12,
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
    paddingRight: 50,
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 16,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
});