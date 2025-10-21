import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';

interface CourseSearchPanelProps {
  courses: Course[];
  selectedCourses: Course[];
  onCourseAdd: (course: Course) => void;
  onFilterChange?: (filters: SearchFilters) => void;
}

interface SearchFilters {
  searchText: string;
  selectedDepartments: string[];
  selectedTimeSlots: string[];
  selectedCredits: number[];
}

const TIME_SLOTS = ['Morning (8-12)', 'Afternoon (12-17)', 'Evening (17+)'];
const CREDIT_OPTIONS = [1, 2, 3, 4, 5, 6];

export default function CourseSearchPanel({
  courses,
  selectedCourses,
  onCourseAdd,
  onFilterChange
}: CourseSearchPanelProps) {
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [selectedCredits, setSelectedCredits] = useState<number[]>([]);

  // Get unique departments from courses
  const departments = useMemo(() => {
    const depts = Array.from(new Set(courses.map(course => course.department))).filter(Boolean);
    return depts.sort();
  }, [courses]);

  // Filter courses based on search and filters
  const filteredCourses = useMemo(() => {
    let filtered = courses.filter(course => {
      // Exclude already selected courses
      if (selectedCourses.some(selected => selected.id === course.id)) {
        return false;
      }

      // Text search - only filter if search text exists
      if (searchText.trim()) {
        const searchLower = searchText.toLowerCase();
        const searchableText = [
          course.title || '',
          course.courseCode || '',
          course.professor || '',
          course.department || '',
          course.description || ''
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchLower)) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartments.length > 0 && course.department) {
        if (!selectedDepartments.includes(course.department)) {
          return false;
        }
      }

      // Credits filter
      if (selectedCredits.length > 0 && course.credits) {
        if (!selectedCredits.includes(course.credits)) {
          return false;
        }
      }

      // Time slot filter
      if (selectedTimeSlots.length > 0 && course.meetingTime) {
        const timeMatch = course.meetingTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          const [, hour, , period] = timeMatch;
          let hour24 = parseInt(hour);
          if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
          if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;

          const timeSlotMatches = selectedTimeSlots.some(slot => {
            if (slot === 'Morning (8-12)' && hour24 >= 8 && hour24 < 12) return true;
            if (slot === 'Afternoon (12-17)' && hour24 >= 12 && hour24 < 17) return true;
            if (slot === 'Evening (17+)' && hour24 >= 17) return true;
            return false;
          });

          if (!timeSlotMatches) return false;
        }
      }

      return true;
    });

    return filtered.slice(0, 50); // Limit results for performance
  }, [courses, selectedCourses, searchText, selectedDepartments, selectedTimeSlots, selectedCredits]);

  const handleDepartmentToggle = (dept: string) => {
    const newDepts = selectedDepartments.includes(dept)
      ? selectedDepartments.filter(d => d !== dept)
      : [...selectedDepartments, dept];
    setSelectedDepartments(newDepts);
  };

  const handleTimeSlotToggle = (slot: string) => {
    const newSlots = selectedTimeSlots.includes(slot)
      ? selectedTimeSlots.filter(s => s !== slot)
      : [...selectedTimeSlots, slot];
    setSelectedTimeSlots(newSlots);
  };

  const handleCreditToggle = (credit: number) => {
    const newCredits = selectedCredits.includes(credit)
      ? selectedCredits.filter(c => c !== credit)
      : [...selectedCredits, credit];
    setSelectedCredits(newCredits);
  };

  const clearAllFilters = () => {
    setSearchText('');
    setSelectedDepartments([]);
    setSelectedTimeSlots([]);
    setSelectedCredits([]);
  };

  const renderCourseItem = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={styles.courseItem}
      onPress={() => onCourseAdd(item)}
    >
      <View style={styles.courseItemHeader}>
        <Text style={styles.courseCode}>{item.courseCode}</Text>
        <View style={styles.addButton}>
          <Ionicons name="add" size={16} color={SwipeColors.accentBlue} />
        </View>
      </View>
      <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.courseMetadata}>
        <Text style={styles.courseProfessor}>{item.professor}</Text>
        <Text style={styles.courseTime}>{item.meetingTime}</Text>
      </View>
      {item.credits && (
        <Text style={styles.courseCredits}>{item.credits} credits</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={SwipeColors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor={SwipeColors.textTertiary}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="options" size={20} color={SwipeColors.textSecondary} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Filters Panel */}
      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Departments</Text>
            <View style={styles.filterOptions}>
              {departments.slice(0, 8).map(dept => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.filterChip,
                    selectedDepartments.includes(dept) && styles.filterChipSelected
                  ]}
                  onPress={() => handleDepartmentToggle(dept)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedDepartments.includes(dept) && styles.filterChipTextSelected
                  ]}>
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Time Slots</Text>
            <View style={styles.filterOptions}>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity
                  key={slot}
                  style={[
                    styles.filterChip,
                    selectedTimeSlots.includes(slot) && styles.filterChipSelected
                  ]}
                  onPress={() => handleTimeSlotToggle(slot)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedTimeSlots.includes(slot) && styles.filterChipTextSelected
                  ]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Credits</Text>
            <View style={styles.filterOptions}>
              {CREDIT_OPTIONS.map(credit => (
                <TouchableOpacity
                  key={credit}
                  style={[
                    styles.filterChip,
                    selectedCredits.includes(credit) && styles.filterChipSelected
                  ]}
                  onPress={() => handleCreditToggle(credit)}
                >
                  <Text style={[
                    styles.filterChipText,
                    selectedCredits.includes(credit) && styles.filterChipTextSelected
                  ]}>
                    {credit}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Search Results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsHeader}>
          {filteredCourses.length} courses found
        </Text>
        <FlatList
          data={filteredCourses}
          renderItem={renderCourseItem}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    borderRadius: 12,
    margin: 20,
    padding: 16,
    maxHeight: 400,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: SwipeColors.textPrimary,
    fontSize: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterButtonText: {
    color: SwipeColors.textSecondary,
    fontSize: 14,
  },
  filtersPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterSectionTitle: {
    color: SwipeColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipSelected: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  filterChipText: {
    color: SwipeColors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearFiltersText: {
    color: SwipeColors.accentBlue,
    fontSize: 12,
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    color: SwipeColors.textTertiary,
    fontSize: 12,
    marginBottom: 8,
  },
  resultsList: {
    flex: 1,
  },
  courseItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  courseItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  courseCode: {
    color: SwipeColors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  addButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseTitle: {
    color: SwipeColors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    lineHeight: 18,
  },
  courseMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  courseProfessor: {
    color: SwipeColors.textTertiary,
    fontSize: 12,
    flex: 1,
  },
  courseTime: {
    color: SwipeColors.textTertiary,
    fontSize: 12,
    textAlign: 'right',
  },
  courseCredits: {
    color: SwipeColors.textTertiary,
    fontSize: 11,
    fontWeight: '500',
  },
});