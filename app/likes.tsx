import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  UserIcon, 
  ClockIcon, 
  MapPinIcon, 
  DocumentDuplicateIcon, 
  HeartIcon, 
  ArrowLeftIcon,
  XMarkIcon 
} from 'react-native-heroicons/outline';
import { StarIcon as StarSolidIcon } from 'react-native-heroicons/solid';
import * as Clipboard from 'expo-clipboard';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import { generatePermRequest } from '@/utils/permGenerator';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { router } from 'expo-router';

export default function LikesScreen() {
  const { likedCourses, removeLikedCourse, isCourseSuperLiked } = useLikedCourses();

  const handleCopyPerm = useCallback(async (course: Course) => {
    const permRequest = generatePermRequest(course);
    await Clipboard.setStringAsync(permRequest);
    Alert.alert(
      'Copied!',
      'PERM request copied to clipboard',
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }, []);

  const handleRemoveCourse = useCallback((courseId: string) => {
    Alert.alert(
      'Remove Course',
      'Are you sure you want to remove this course from your likes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeLikedCourse(courseId);
          },
        },
      ],
    );
  }, [removeLikedCourse]);

  const renderCourseItem = ({ item }: { item: Course }) => {
    const schoolColor = SwipeColors.schools[item.school];
    const spotsLeft = item.enrollmentCap - item.enrollmentCurrent;
    const isFull = spotsLeft <= 0;
    const isSuperLiked = isCourseSuperLiked(item.id);

    return (
      <TouchableOpacity activeOpacity={0.95}>
        <LinearGradient
          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
          style={[styles.courseCard, isSuperLiked && styles.superLikedCard]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Super Like Indicator */}
          {isSuperLiked && (
            <View style={styles.superLikeBadge}>
              <StarSolidIcon size={16} color={SwipeColors.superLike} />
            </View>
          )}
          
          {/* School Badge */}
          <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
            <Text style={styles.schoolText}>{item.school}</Text>
          </View>

          {/* Course Info */}
          <View style={styles.courseHeader}>
            <Text style={styles.courseCode}>{item.courseCode}</Text>
            <Text style={styles.courseTitle}>{item.title}</Text>
          </View>

          {/* Professor & Time */}
          <View style={styles.infoRow}>
            <UserIcon size={14} color={SwipeColors.textTertiary} />
            <Text style={styles.infoText}>{item.professor}</Text>
          </View>
          <View style={styles.infoRow}>
            <ClockIcon size={14} color={SwipeColors.textTertiary} />
            <Text style={styles.infoText}>{item.meetingTime}</Text>
          </View>
          <View style={styles.infoRow}>
            <MapPinIcon size={14} color={SwipeColors.textTertiary} />
            <Text style={styles.infoText}>{item.location}</Text>
          </View>

          {/* Enrollment Status */}
          <View style={styles.enrollmentRow}>
            <Text style={[styles.spotsText, isFull && styles.fullText]}>
              {isFull ? 'FULL' : `${spotsLeft} spots left`}
            </Text>
            <View style={styles.creditsChip}>
              <Text style={styles.creditsText}>{item.credits} credits</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.permButton]}
              onPress={() => handleCopyPerm(item)}
            >
              <DocumentDuplicateIcon size={18} color={SwipeColors.accentBlue} />
              <Text style={styles.permButtonText}>Copy PERM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, styles.removeButton]}
              onPress={() => handleRemoveCourse(item.id)}
            >
              <XMarkIcon size={18} color={SwipeColors.danger} />
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <HeartIcon size={80} color={SwipeColors.textTertiary} />
      <Text style={styles.emptyTitle}>No Classes Yet</Text>
      <Text style={styles.emptySubtext}>
        Like courses to add them to your class schedule and they&apos;ll appear here
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeftIcon size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Classes</Text>
            <Text style={styles.headerSubtitle}>
              {likedCourses.length} {likedCourses.length === 1 ? 'course' : 'courses'} in your schedule
            </Text>
          </View>
        </View>
      </View>

      {/* Course List */}
      <FlatList
        data={likedCourses}
        renderItem={renderCourseItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={EmptyState}
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
    paddingTop: 55,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTextContainer: {
    flex: 1,
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
  listContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  courseCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: SwipeColors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  superLikedCard: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderWidth: 2,
  },
  superLikeBadge: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  schoolBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  schoolText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  courseHeader: {
    marginBottom: 12,
    paddingRight: 60,
  },
  courseCode: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
  enrollmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  spotsText: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.success,
  },
  fullText: {
    color: SwipeColors.danger,
  },
  creditsChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  creditsText: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  permButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  permButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  removeButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.danger,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 22,
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