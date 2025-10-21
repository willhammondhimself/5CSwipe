import React, { useState, useMemo, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  StatusBar,
  Dimensions,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CalendarDaysIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  ListBulletIcon,
  Squares2X2Icon,
  AcademicCapIcon,
} from 'react-native-heroicons/outline';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';
import ConflictResolver from './ConflictResolver';
import PrerequisiteChainVisualization from './PrerequisiteChainVisualization';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CourseBrowserModalProps {
  visible: boolean;
  onClose: () => void;
  availableCourses: Course[];
  selectedDay?: string;
  selectedTime?: string;
  onCourseAdd?: (course: Course) => void;
}

type ViewMode = 'list' | 'grid';
type FilterMode = 'all' | 'available' | 'fits-time';

export default function CourseBrowserModal({
  visible,
  onClose,
  availableCourses,
  selectedDay,
  selectedTime,
  onCourseAdd,
}: CourseBrowserModalProps) {
  const {
    activePlan,
    addCourseToPlan,
    removeCourseFromPlan,
  } = useScheduleVariants();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filterMode, setFilterMode] = useState<FilterMode>('fits-time');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState<string[]>(['CMC', 'HMC', 'Pitzer', 'Pomona', 'Scripps']);
  const [showFullCourses, setShowFullCourses] = useState(false);

  // Conflict resolution state
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [courseToAdd, setCourseToAdd] = useState<Course | null>(null);
  const [detectedConflicts, setDetectedConflicts] = useState<any[]>([]);
  
  // Prerequisite visualization state
  const [showPrerequisites, setShowPrerequisites] = useState(false);
  const [selectedCourseForPrereqs, setSelectedCourseForPrereqs] = useState<Course | null>(null);

  // Reset search when modal opens
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
      setFilterMode(selectedDay && selectedTime ? 'fits-time' : 'all');
    }
  }, [visible, selectedDay, selectedTime]);

  // Filter courses based on time slot, search, and other criteria
  const filteredCourses = useMemo(() => {
    let filtered = [...availableCourses];

    // Apply school filters
    filtered = filtered.filter(course => selectedSchools.includes(course.school));

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(course =>
        course.courseCode.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query) ||
        course.professor.toLowerCase().includes(query) ||
        course.department.toLowerCase().includes(query)
      );
    }

    // Apply filter mode
    switch (filterMode) {
      case 'available':
        filtered = filtered.filter(course => course.enrollmentCurrent < course.enrollmentCap);
        break;
      case 'fits-time':
        if (selectedDay && selectedTime) {
          // Filter courses that fit in the selected time slot
          filtered = filtered.filter(course => {
            if (!course.meetingDays || !course.startTime || !course.endTime) return false;
            
            // Check if course meets on the selected day
            const dayMapping: { [key: string]: string } = {
              'Monday': 'M',
              'Tuesday': 'T', 
              'Wednesday': 'W',
              'Thursday': 'Th',
              'Friday': 'F'
            };
            
            const dayCode = dayMapping[selectedDay];
            if (!course.meetingDays.includes(dayCode as any)) return false;

            // Check if course time fits reasonably within selected slot
            // For now, we'll be flexible and show courses that start within 2 hours of selected time
            const selectedHour = parseInt(selectedTime.split(':')[0]);
            const courseStartHour = parseInt(course.startTime.split(':')[0]);
            
            return Math.abs(courseStartHour - selectedHour) <= 2;
          });
        }
        break;
      case 'all':
      default:
        // Show all courses (already filtered by search and school)
        break;
    }

    // Apply availability filter
    if (!showFullCourses) {
      filtered = filtered.filter(course => course.enrollmentCurrent < course.enrollmentCap);
    }

    // Sort by availability, then enrollment space
    return filtered.sort((a, b) => {
      const aAvailable = a.enrollmentCurrent < a.enrollmentCap;
      const bAvailable = b.enrollmentCurrent < b.enrollmentCap;
      
      if (aAvailable && !bAvailable) return -1;
      if (!aAvailable && bAvailable) return 1;
      
      // If both same availability, sort by space remaining
      const aSpace = a.enrollmentCap - a.enrollmentCurrent;
      const bSpace = b.enrollmentCap - b.enrollmentCurrent;
      return bSpace - aSpace;
    });
  }, [availableCourses, searchQuery, filterMode, selectedSchools, showFullCourses, selectedDay, selectedTime]);

  const detectConflicts = (course: Course) => {
    if (!activePlan) return [];

    const currentCourses = activePlan.courses;
    const conflictInfo: any[] = [];

    currentCourses.forEach(existingCourse => {
      // Time conflict detection
      if (existingCourse.meetingDays && course.meetingDays) {
        const sharedDays = existingCourse.meetingDays.some(day => 
          course.meetingDays!.includes(day)
        );
        
        if (sharedDays && existingCourse.startTime && existingCourse.endTime && 
            course.startTime && course.endTime) {
          const existingStart = existingCourse.startTime;
          const existingEnd = existingCourse.endTime;
          const courseStart = course.startTime;
          const courseEnd = course.endTime;

          const hasTimeOverlap = !(existingEnd <= courseStart || existingStart >= courseEnd);
          
          if (hasTimeOverlap) {
            conflictInfo.push({
              course,
              conflictingCourse: existingCourse,
              conflictType: 'time',
              conflictDetails: `Both courses meet on ${sharedDays} during overlapping times`,
            });
          }
        }
      }

      // Prerequisite conflict (basic check)
      if (course.prerequisites && course.prerequisites.includes(existingCourse.courseCode)) {
        conflictInfo.push({
          course,
          conflictingCourse: existingCourse,
          conflictType: 'prerequisite',
          conflictDetails: `${course.courseCode} requires ${existingCourse.courseCode} as a prerequisite`,
        });
      }
    });

    return conflictInfo;
  };

  const handleAddCourse = async (course: Course) => {
    if (!activePlan) return;

    // Check for conflicts
    const conflicts = detectConflicts(course);

    if (conflicts.length > 0) {
      // Show conflict resolver
      setCourseToAdd(course);
      setDetectedConflicts(conflicts);
      setShowConflictResolver(true);
      return;
    }

    // No conflicts, add directly
    await addCourseToPlan(activePlan.id, course);
    onCourseAdd?.(course);
  };

  const handleForceAddCourse = async () => {
    if (!activePlan || !courseToAdd) return;
    
    await addCourseToPlan(activePlan.id, courseToAdd);
    onCourseAdd?.(courseToAdd);
    
    // Clean up state
    setCourseToAdd(null);
    setDetectedConflicts([]);
  };

  const handleRemoveConflictingCourse = async (conflictingCourse: Course) => {
    if (!activePlan) return;
    
    await removeCourseFromPlan(activePlan.id, conflictingCourse.id);
  };

  const renderCourseItem = ({ item: course }: { item: Course }) => {
    const schoolColor = SwipeColors.schools[course.school];
    const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
    const isFull = spotsLeft <= 0;
    const isAlreadyAdded = activePlan?.courses.some(c => c.id === course.id) || false;

    if (viewMode === 'grid') {
      return (
        <View style={styles.gridItem}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.gridCourseCard}
          >
            <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
              <Text style={styles.schoolText}>{course.school}</Text>
            </View>

            <Text style={styles.gridCourseCode}>{course.courseCode}</Text>
            <Text style={styles.gridCourseTitle} numberOfLines={2}>{course.title}</Text>
            
            <View style={styles.gridDetailsContainer}>
              <View style={styles.gridDetailRow}>
                <ClockIcon size={12} color={SwipeColors.textTertiary} />
                <Text style={styles.gridDetailText}>{course.meetingTime}</Text>
              </View>
            </View>

            <View style={styles.gridBottomRow}>
              <Text style={[styles.spotsText, isFull && styles.fullText]}>
                {isFull ? 'FULL' : `${spotsLeft} spots`}
              </Text>
              
              <TouchableOpacity
                style={[styles.addButton, isAlreadyAdded && styles.addButtonAdded]}
                onPress={() => !isAlreadyAdded && handleAddCourse(course)}
                disabled={isAlreadyAdded}
              >
                {isAlreadyAdded ? (
                  <CheckCircleIcon size={16} color={SwipeColors.success} />
                ) : (
                  <PlusIcon size={16} color={SwipeColors.accentBlue} />
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <TouchableOpacity style={styles.courseItem}>
        <LinearGradient
          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
          style={styles.courseCard}
        >
          <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
            <Text style={styles.schoolText}>{course.school}</Text>
          </View>

          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
            <Text style={styles.professor}>{course.professor}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <ClockIcon size={12} color={SwipeColors.textTertiary} />
              <Text style={styles.detailText}>{course.meetingTime}</Text>
            </View>
            <View style={styles.detailRow}>
              <CalendarDaysIcon size={12} color={SwipeColors.textTertiary} />
              <Text style={styles.detailText}>{course.location}</Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.statusContainer}>
              <Text style={[styles.spotsText, isFull && styles.fullText]}>
                {isFull ? 'FULL' : `${spotsLeft} spots`}
              </Text>
              <Text style={styles.creditsText}>{course.credits} credits</Text>
            </View>

            <View style={styles.courseActions}>
              <TouchableOpacity
                style={styles.prereqButton}
                onPress={() => {
                  setSelectedCourseForPrereqs(course);
                  setShowPrerequisites(true);
                }}
              >
                <AcademicCapIcon size={14} color={SwipeColors.textTertiary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.addButton, isAlreadyAdded && styles.addButtonAdded]}
                onPress={() => !isAlreadyAdded && handleAddCourse(course)}
                disabled={isAlreadyAdded}
              >
                {isAlreadyAdded ? (
                  <>
                    <CheckCircleIcon size={16} color={SwipeColors.success} />
                    <Text style={styles.addedText}>Added</Text>
                  </>
                ) : (
                  <>
                    <PlusIcon size={16} color={SwipeColors.accentBlue} />
                    <Text style={styles.addText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const FilterButton = ({ 
    mode, 
    label, 
    count 
  }: { 
    mode: FilterMode; 
    label: string; 
    count?: number; 
  }) => (
    <TouchableOpacity
      style={[styles.filterButton, filterMode === mode && styles.filterButtonActive]}
      onPress={() => setFilterMode(mode)}
    >
      <Text style={[
        styles.filterButtonText,
        filterMode === mode && styles.filterButtonTextActive
      ]}>
        {label}
        {count !== undefined && ` (${count})`}
      </Text>
    </TouchableOpacity>
  );


  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <MagnifyingGlassIcon size={60} color={SwipeColors.textTertiary} />
      <Text style={styles.emptyTitle}>No courses found</Text>
      <Text style={styles.emptySubtext}>
        {selectedDay && selectedTime
          ? `No courses found for ${selectedDay} at ${selectedTime}`
          : 'Try adjusting your search or filters'
        }
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Browse Courses</Text>
            {selectedDay && selectedTime && (
              <Text style={styles.headerSubtitle}>
                {selectedDay} at {selectedTime}
              </Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <AdjustmentsHorizontalIcon size={20} color={SwipeColors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.searchBar}
          >
            <MagnifyingGlassIcon size={20} color={SwipeColors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses, professors..."
              placeholderTextColor={SwipeColors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <XMarkIcon size={18} color={SwipeColors.textTertiary} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Filter Buttons */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <FilterButton mode="fits-time" label="Fits Time Slot" />
            <FilterButton mode="available" label="Available" />
            <FilterButton mode="all" label="All Courses" />
          </ScrollView>
          
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'list' && styles.viewButtonActive]}
              onPress={() => setViewMode('list')}
            >
              <ListBulletIcon size={16} color={
                viewMode === 'list' ? SwipeColors.textPrimary : SwipeColors.textTertiary
              } />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewButton, viewMode === 'grid' && styles.viewButtonActive]}
              onPress={() => setViewMode('grid')}
            >
              <Squares2X2Icon size={16} color={
                viewMode === 'grid' ? SwipeColors.textPrimary : SwipeColors.textTertiary
              } />
            </TouchableOpacity>
          </View>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsHeader}>
            {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
          </Text>
          
          <FlatList
            data={filteredCourses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={EmptyState}
            numColumns={viewMode === 'grid' ? 2 : 1}
            key={viewMode} // Force re-render when view mode changes
            contentContainerStyle={styles.listContent}
            columnWrapperStyle={viewMode === 'grid' ? styles.row : undefined}
          />
        </View>

        {/* Conflict Resolver Modal */}
        {courseToAdd && (
          <ConflictResolver
            visible={showConflictResolver}
            onClose={() => {
              setShowConflictResolver(false);
              setCourseToAdd(null);
              setDetectedConflicts([]);
            }}
            courseToAdd={courseToAdd}
            conflicts={detectedConflicts}
            onForceAdd={handleForceAddCourse}
            onRemoveConflicting={handleRemoveConflictingCourse}
            alternatives={filteredCourses
              .filter(c => c.id !== courseToAdd.id)
              .filter(c => detectConflicts(c).length === 0)
              .slice(0, 3)
            }
          />
        )}

        {/* Prerequisite Chain Visualization */}
        {selectedCourseForPrereqs && (
          <PrerequisiteChainVisualization
            visible={showPrerequisites}
            onClose={() => {
              setShowPrerequisites(false);
              setSelectedCourseForPrereqs(null);
            }}
            targetCourse={selectedCourseForPrereqs}
            allCourses={availableCourses}
          />
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    marginTop: 2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: SwipeColors.textPrimary,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 2,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  viewButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: SwipeColors.textTertiary,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  row: {
    justifyContent: 'space-between',
  },
  courseItem: {
    marginBottom: 12,
  },
  courseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
  },
  gridItem: {
    width: (screenWidth - 60) / 2,
    marginBottom: 12,
  },
  gridCourseCard: {
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
    height: 160,
  },
  schoolBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  courseInfo: {
    marginBottom: 8,
    paddingRight: 40,
  },
  courseCode: {
    fontSize: 15,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  professor: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
  },
  gridCourseCode: {
    fontSize: 13,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
    paddingRight: 30,
  },
  gridCourseTitle: {
    fontSize: 10,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 12,
    marginBottom: 6,
    flex: 1,
  },
  detailsContainer: {
    gap: 4,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    flex: 1,
  },
  gridDetailsContainer: {
    marginBottom: 8,
  },
  gridDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  gridDetailText: {
    fontSize: 9,
    color: SwipeColors.textSecondary,
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusContainer: {
    flex: 1,
  },
  spotsText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.success,
  },
  fullText: {
    color: SwipeColors.danger,
  },
  creditsText: {
    fontSize: 10,
    fontWeight: '500',
    color: SwipeColors.textTertiary,
    marginTop: 2,
  },
  gridBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
    gap: 4,
  },
  addButtonAdded: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.2)',
  },
  addText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  addedText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.success,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 200,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  courseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prereqButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});