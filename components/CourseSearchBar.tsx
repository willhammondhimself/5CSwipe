import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckCircleIcon,
  PlusIcon,
} from 'react-native-heroicons/outline';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';

interface CourseSearchBarProps {
  courses: Course[];
  onCourseAdd?: (course: Course) => void;
  addedCourses?: Course[];
  placeholder?: string;
}

export default function CourseSearchBar({
  courses,
  onCourseAdd,
  addedCourses = [],
  placeholder = 'Search courses, instructors, departments...'
}: CourseSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Filter courses based on search query
  const filteredCourses = courses.filter(course => {
    if (!searchQuery.trim()) return false;
    
    const query = searchQuery.toLowerCase();
    return (
      course.courseCode.toLowerCase().includes(query) ||
      course.title.toLowerCase().includes(query) ||
      course.professor.toLowerCase().includes(query) ||
      course.department.toLowerCase().includes(query) ||
      course.location.toLowerCase().includes(query)
    );
  }).slice(0, 8); // Limit to 8 results

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setShowResults(text.trim().length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };

  const isAlreadyAdded = (course: Course) => {
    return addedCourses.some(c => c.id === course.id);
  };

  const getStatusLabel = (course: Course) => {
    const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
    if (spotsLeft <= 0) return 'CLOSED';
    if (spotsLeft <= 5) return 'REOPENED';
    return 'OPEN';
  };

  const getStatusColor = (course: Course) => {
    const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
    if (spotsLeft <= 0) return SwipeColors.danger;
    if (spotsLeft <= 5) return SwipeColors.warning;
    return SwipeColors.success;
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <LinearGradient
        colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
        style={styles.searchBar}
      >
        <MagnifyingGlassIcon size={18} color={SwipeColors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={SwipeColors.textTertiary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <XMarkIcon size={16} color={SwipeColors.textTertiary} />
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Search Results */}
      {showResults && filteredCourses.length > 0 && (
        <View style={styles.resultsContainer}>
          <ScrollView 
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {filteredCourses.map((course) => {
              const schoolColor = SwipeColors.schools[course.school];
              const statusColor = getStatusColor(course);
              const statusLabel = getStatusLabel(course);
              const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
              const alreadyAdded = isAlreadyAdded(course);

              return (
                <LinearGradient
                  key={course.id}
                  colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                  style={styles.resultItem}
                >
                  {/* School Badge */}
                  <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
                    <Text style={styles.schoolText}>{course.school}</Text>
                  </View>

                  {/* Status Badge */}
                  <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                  </View>

                  {/* Course Info */}
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseCode}>{course.courseCode}</Text>
                    <Text style={styles.courseTitle} numberOfLines={2}>{course.title}</Text>
                    <Text style={styles.courseInstructor}>{course.professor}</Text>
                  </View>

                  {/* Course Details */}
                  <View style={styles.courseDetails}>
                    <Text style={styles.detailText}>{course.meetingTime}</Text>
                    <Text style={styles.detailText}>{course.location}</Text>
                    <Text style={[styles.enrollmentText, spotsLeft <= 5 && styles.enrollmentWarning]}>
                      {course.enrollmentCurrent}/{course.enrollmentCap} seats filled
                    </Text>
                  </View>

                  {/* Add Button */}
                  <TouchableOpacity
                    style={[styles.addButton, alreadyAdded && styles.addButtonAdded]}
                    onPress={() => !alreadyAdded && onCourseAdd?.(course)}
                    disabled={alreadyAdded}
                  >
                    {alreadyAdded ? (
                      <CheckCircleIcon size={16} color={SwipeColors.success} />
                    ) : (
                      <PlusIcon size={16} color={SwipeColors.accentBlue} />
                    )}
                  </TouchableOpacity>
                </LinearGradient>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* No Results */}
      {showResults && filteredCourses.length === 0 && searchQuery.trim() && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No courses found for &quot;{searchQuery}&quot;</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 2000,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: SwipeColors.textPrimary,
    fontWeight: '400',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    maxHeight: 600,
    marginTop: 4,
    zIndex: 1000,
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  schoolBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 60,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 8,
    fontWeight: '600',
  },
  courseInfo: {
    flex: 1,
    paddingRight: 100,
  },
  courseCode: {
    fontSize: 13,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  courseTitle: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    lineHeight: 14,
    marginBottom: 2,
  },
  courseInstructor: {
    fontSize: 10,
    color: SwipeColors.textTertiary,
  },
  courseDetails: {
    width: 120,
    paddingRight: 40,
  },
  detailText: {
    fontSize: 9,
    color: SwipeColors.textTertiary,
    marginBottom: 1,
  },
  enrollmentText: {
    fontSize: 9,
    color: SwipeColors.textTertiary,
    fontWeight: '500',
  },
  enrollmentWarning: {
    color: SwipeColors.warning,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonAdded: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  noResults: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    padding: 16,
    marginTop: 4,
    alignItems: 'center',
    zIndex: 1000,
  },
  noResultsText: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
});