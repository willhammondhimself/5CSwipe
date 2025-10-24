import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, StatusBar, TouchableOpacity, Dimensions, Platform, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SwipeableStack from '@/components/SwipeableStack';
import SearchModal from '@/components/SearchModal';
import PermGenerationModal from '@/components/PermGenerationModal';
import AcademicProgressDashboard from '@/components/AcademicProgressDashboard';
import DesktopCalendarView from '@/components/DesktopCalendarView';
import { Course } from '@/data/mockCourses';
import { useCourses } from '@/hooks/useCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { useFilters } from '@/contexts/FilterContext';
import { usePremium } from '@/contexts/PremiumContext';

export default function HomeScreen() {
  const [skippedCourses, setSkippedCourses] = useState<Course[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedCourseForPerm, setSelectedCourseForPerm] = useState<Course | null>(null);
  const [showProgressDashboard, setShowProgressDashboard] = useState(false);
  const [viewMode, setViewMode] = useState<'swipe' | 'calendar'>('swipe');
  const [refreshing, setRefreshing] = useState(false);
  const { likedCourses, superLikedCourses, addLikedCourse, addSuperLikedCourse } = useLikedCourses();
  const { filters, getFilteredCourses, resetFilters } = useFilters();
  const { setPremiumStatus } = usePremium();

  const windowWidth = Dimensions.get('window').width;
  const isDesktop = Platform.OS === 'web' && windowWidth >= 1024;

  // 🔥 REAL DATA: Use live course data from Python API + Supabase
  const courseFilters = useMemo(() => ({
    semester: 'FA 2025'
  }), []);

  const { courses: realCourses, loading, error, dataSource, refreshCourses } = useCourses(courseFilters);

  const filteredCourses = getFilteredCourses(realCourses);

  // Debug logging - FORCE RELOAD
  console.log('📊 Courses flow:', {
    realCourses: realCourses.length,
    filteredCourses: filteredCourses.length,
    dataSource,
    loading,
    error
  });
  console.log('🆕 Force reload trigger - checking useEffect in useCourses - v2');

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.schools.length < 6) count++;
    if (filters.timeSlot !== 'any') count++;
    if (filters.creditRange[0] !== 1 || filters.creditRange[1] !== 6) count++;
    if (!filters.showFullCourses) count++;
    return count;
  };

  const activeFilters = getActiveFilterCount();

  const handleSearchSelect = (course: Course) => {
    // This would ideally navigate to that specific course in the stack
    // For now, we'll just close the modal
    console.log('Selected course from search:', course.courseCode);
  };

  const handleSwipeRight = (course: Course) => {
    addLikedCourse(course);
    console.log('Liked:', course.courseCode);
  };

  const handleSwipeLeft = (course: Course) => {
    setSkippedCourses((prev) => [...prev, course]);
    console.log('Skipped:', course.courseCode);
  };

  const handleSuperLike = (course: Course) => {
    addSuperLikedCourse(course);
    setSelectedCourseForPerm(course);
    setShowPermModal(true);
    console.log('Super Liked:', course.courseCode);
  };

  const handleUpgradeToPremium = () => {
    // For demo purposes, just set premium status to true
    // In production, this would integrate with payment processing
    setPremiumStatus(true);
    setShowPermModal(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshCourses();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Desktop: Calendar view or mobile swipe */}
      {isDesktop && viewMode === 'calendar' ? (
        <DesktopCalendarView />
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View>
                <Text style={styles.headerTitle}>CourseSwipe</Text>
                <Text style={styles.headerSubtitle}>
                  {loading ? '🔄 Loading courses...' :
                   error ? '⚠️ Using cached data' :
                   dataSource === 'python-api' ? '🔥 Live course data' :
                   dataSource === 'supabase' ? '🗄️ Database' :
                   '📋 Sample data'}
                </Text>
              </View>
              <View style={styles.headerActions}>
                {isDesktop && (
                  <TouchableOpacity
                    style={styles.viewToggleButton}
                    onPress={() => setViewMode(viewMode === 'swipe' ? 'calendar' : 'swipe')}
                  >
                    <Ionicons
                      name={viewMode === 'swipe' ? 'calendar' : 'swap-horizontal'}
                      size={20}
                      color={SwipeColors.textSecondary}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.searchButton} onPress={() => setShowSearchModal(true)}>
                  <Ionicons name="search" size={24} color={SwipeColors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.progressButton}
                  onPress={() => setShowProgressDashboard(true)}
                >
                  <Ionicons name="school" size={20} color={SwipeColors.textSecondary} />
                </TouchableOpacity>
                {activeFilters > 0 && (
                  <TouchableOpacity style={styles.filterBadge} onPress={resetFilters}>
                    <Ionicons name="funnel" size={16} color={SwipeColors.accentBlue} />
                    <Text style={styles.filterCount}>{activeFilters}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Swipeable Cards */}
          <ScrollView
            style={styles.stackContainer}
            contentContainerStyle={styles.stackContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={SwipeColors.primary}
                colors={[SwipeColors.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <SwipeableStack
              courses={filteredCourses}
              onSwipeRight={handleSwipeRight}
              onSwipeLeft={handleSwipeLeft}
              onSuperLike={handleSuperLike}
            />
          </ScrollView>
        </>
      )}


      {/* Search Modal */}
      <SearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        courses={realCourses}
        onSelectCourse={handleSearchSelect}
      />

      {/* PERM Generation Modal */}
      <PermGenerationModal
        visible={showPermModal}
        onClose={() => {
          setShowPermModal(false);
          setSelectedCourseForPerm(null);
        }}
        course={selectedCourseForPerm}
        onUpgradeToPremium={handleUpgradeToPremium}
      />

      {/* Academic Progress Dashboard */}
      <AcademicProgressDashboard
        visible={showProgressDashboard}
        onClose={() => setShowProgressDashboard(false)}
        major="Computer Science"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  courseCount: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    gap: 4,
  },
  filterCount: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  progressButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  viewToggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerSubtitle: {
    fontSize: 16,
    color: SwipeColors.textTertiary,
    marginTop: 0,
    letterSpacing: 0.2,
    marginBottom: 20,
  },
  stackContainer: {
    flex: 1,
  },
  stackContent: {
    flexGrow: 1,
  },
});
