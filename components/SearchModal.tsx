import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
  courses: Course[];
  onSelectCourse: (course: Course) => void;
}

export default function SearchModal({
  visible,
  onClose,
  courses,
  onSelectCourse,
}: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // Show all courses if no search query
    if (!query) {
      return courses.slice(0, 50);
    }

    // Filter courses based on search query
    const results = courses.filter(course =>
      course.courseCode.toLowerCase().includes(query) ||
      course.title.toLowerCase().includes(query) ||
      course.professor.toLowerCase().includes(query) ||
      course.school.toLowerCase().includes(query) ||
      (course.department && course.department.toLowerCase().includes(query))
    ).slice(0, 50); // Limit results for performance

    console.log(`🔍 Search for "${query}": found ${results.length} results out of ${courses.length} courses`);
    if (results.length === 0 && query === 'physics') {
      // Debug: Check if ANY course has physics in department
      const allDepts = courses.map(c => c.department).filter(Boolean);
      const uniqueDepts = [...new Set(allDepts)].sort();
      console.log('📚 All unique departments:', uniqueDepts);
      console.log('📚 Sample courses:', courses.slice(0, 3).map(c => ({code: c.courseCode, dept: c.department, title: c.title})));
    }

    return results;
  }, [searchQuery, courses]);

  const handleSelectCourse = (course: Course) => {
    onSelectCourse(course);
    onClose();
    setSearchQuery('');
  };

  const handleClose = () => {
    onClose();
    setSearchQuery('');
  };

  const renderCourseItem = ({ item }: { item: Course }) => {
    const schoolColor = SwipeColors.schools[item.school];
    const spotsLeft = item.enrollmentCap - item.enrollmentCurrent;
    const isFull = spotsLeft <= 0;

    return (
      <TouchableOpacity
        style={styles.courseItem}
        onPress={() => handleSelectCourse(item)}
      >
        <LinearGradient
          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
          style={styles.courseCard}
        >
          {/* School Badge */}
          <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
            <Text style={styles.schoolText}>{item.school}</Text>
          </View>

          {/* Course Info */}
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{item.courseCode}</Text>
            <Text style={styles.courseTitle} numberOfLines={2}>{item.title}</Text>
          </View>

          {/* Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={12} color={SwipeColors.textTertiary} />
              <Text style={styles.detailText}>{item.professor}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={12} color={SwipeColors.textTertiary} />
              <Text style={styles.detailText}>{item.meetingTime}</Text>
            </View>
          </View>

          {/* Bottom Row */}
          <View style={styles.bottomRow}>
            <Text style={[styles.spotsText, isFull && styles.fullText]}>
              {isFull ? 'FULL' : `${spotsLeft} spots`}
            </Text>
            <Text style={styles.creditsText}>{item.credits} credits</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      {searchQuery.trim() ? (
        <>
          <Ionicons name="search-outline" size={60} color={SwipeColors.textTertiary} />
          <Text style={styles.emptyTitle}>No courses found</Text>
          <Text style={styles.emptySubtext}>
            Try searching for course codes, titles, or professors
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="search-outline" size={60} color={SwipeColors.textTertiary} />
          <Text style={styles.emptyTitle}>Search Courses</Text>
          <Text style={styles.emptySubtext}>
            Search by course code, title, or professor name
          </Text>
        </>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="arrow-back" size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Courses</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.searchBar}
          >
            <Ionicons name="search" size={20} color={SwipeColors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search courses, professors..."
              placeholderTextColor={SwipeColors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus={true}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={18} color={SwipeColors.textTertiary} />
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Results */}
        <View style={styles.resultsContainer}>
          {searchQuery.trim() && filteredCourses.length > 0 && (
            <Text style={styles.resultsHeader}>
              {filteredCourses.length} result{filteredCourses.length > 1 ? 's' : ''}
            </Text>
          )}
          
          <FlatList
            data={filteredCourses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={EmptyState}
            contentContainerStyle={styles.listContent}
          />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  placeholder: {
    width: 44,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  clearButton: {
    padding: 4,
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
  courseItem: {
    marginBottom: 12,
  },
  courseCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
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
    letterSpacing: 0.5,
  },
  courseInfo: {
    marginBottom: 8,
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
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 11,
    fontWeight: '500',
    color: SwipeColors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 300,
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
});