import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { usePremium } from '@/contexts/PremiumContext';
import * as Clipboard from 'expo-clipboard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CourseDetailModalProps {
  isVisible: boolean;
  onClose: () => void;
  course: Course | null;
}

export default function CourseDetailModal({
  isVisible,
  onClose,
  course,
}: CourseDetailModalProps) {
  const { isCourseLiked, addLikedCourse, removeLikedCourse, isCourseSuperLiked } = useLikedCourses();
  const { generatePerm, canGeneratePerm } = usePremium();
  const [isGeneratingPerm, setIsGeneratingPerm] = useState(false);
  
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  React.useEffect(() => {
    if (isVisible) {
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.9, { duration: 200 });
    }
  }, [isVisible, opacity, scale]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!course) return null;

  const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
  const isFull = spotsLeft <= 0;
  const isLiked = isCourseLiked(course.id);
  const isSuperLiked = isCourseSuperLiked(course.id);
  const schoolColor = SwipeColors.schools[course.school];

  const handleLikeToggle = () => {
    if (isLiked) {
      removeLikedCourse(course.id);
    } else {
      addLikedCourse(course);
    }
  };

  const handleGeneratePerm = async () => {
    if (!canGeneratePerm) {
      Alert.alert(
        'PERM Limit Reached',
        'You\'ve reached your PERM request limit. Upgrade to premium for more requests.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGeneratingPerm(true);
    try {
      const permText = await generatePerm(course);
      await Clipboard.setStringAsync(permText);
      
      Alert.alert(
        'PERM Generated! ✨',
        'Your personalized PERM request has been copied to the clipboard. You can now paste it into an email to the professor.',
        [{ text: 'Great!' }]
      );
    } catch {
      Alert.alert(
        'Error',
        'Failed to generate PERM request. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGeneratingPerm(false);
    }
  };

  const InfoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.infoSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );

  const InfoRow = ({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={SwipeColors.textTertiary} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const RatingBar = ({ rating, maxRating = 5 }: { rating: number; maxRating?: number }) => {
    const percentage = (rating / maxRating) * 100;
    const color = rating >= 4 ? SwipeColors.success : rating >= 3 ? '#FFA500' : SwipeColors.danger;
    
    return (
      <View style={styles.ratingContainer}>
        <View style={styles.ratingBar}>
          <View style={[styles.ratingFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
        <Text style={[styles.ratingText, { color }]}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <BlurView intensity={25} style={styles.blurOverlay}>
          <Animated.View style={[styles.modalContainer, animatedModalStyle]}>
            <TouchableOpacity activeOpacity={1}>
              <LinearGradient
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={styles.modalContent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Header */}
                <View style={styles.modalHeader}>
                  <View style={styles.headerTop}>
                    <View style={[styles.schoolBadge, { backgroundColor: schoolColor }]}>
                      <Text style={styles.schoolText}>{course.school}</Text>
                    </View>
                    <TouchableOpacity onPress={onClose}>
                      <Ionicons name="close" size={24} color={SwipeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.courseHeader}>
                    <Text style={styles.courseCode}>{course.courseCode}</Text>
                    <Text style={styles.courseTitle}>{course.title}</Text>
                  </View>

                  {/* Status Indicators */}
                  <View style={styles.statusRow}>
                    {isSuperLiked && (
                      <View style={styles.statusBadge}>
                        <Ionicons name="star" size={12} color={SwipeColors.superLike} />
                        <Text style={styles.statusText}>Super Liked</Text>
                      </View>
                    )}
                    <View style={[styles.statusBadge, isFull && styles.fullBadge]}>
                      <Ionicons 
                        name={isFull ? "warning" : "people"} 
                        size={12} 
                        color={isFull ? SwipeColors.danger : SwipeColors.success} 
                      />
                      <Text style={[styles.statusText, isFull && styles.fullText]}>
                        {isFull ? 'FULL' : `${spotsLeft} spots left`}
                      </Text>
                    </View>
                  </View>
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                  {/* Basic Info */}
                  <InfoSection title="Course Details">
                    <InfoRow icon="person-outline" label="Professor" value={course.professor} />
                    <InfoRow 
                      icon="time-outline" 
                      label="Schedule" 
                      value={course.meetingDays && course.startTime && course.endTime 
                        ? `${course.meetingDays.join('')} ${course.startTime}-${course.endTime}`
                        : course.meetingTime
                      } 
                    />
                    <InfoRow 
                      icon="location-outline" 
                      label="Location" 
                      value={course.buildingCode && course.roomNumber 
                        ? `${course.buildingCode} ${course.roomNumber}`
                        : course.location
                      } 
                    />
                    <InfoRow icon="school-outline" label="Credits" value={`${course.credits} credits`} />
                    <InfoRow icon="library-outline" label="Department" value={course.department} />
                    <InfoRow icon="trending-up-outline" label="Level" value={course.courseLevel} />
                    <InfoRow icon="desktop-outline" label="Format" value={course.instructionMethod} />
                  </InfoSection>

                  {/* Professor Ratings */}
                  {course.professorRating && (
                    <InfoSection title="Professor Ratings">
                      <View style={styles.ratingsGrid}>
                        <View style={styles.ratingItem}>
                          <Text style={styles.ratingLabel}>Overall Quality</Text>
                          <RatingBar rating={course.professorRating.overall} />
                        </View>
                        <View style={styles.ratingItem}>
                          <Text style={styles.ratingLabel}>Difficulty</Text>
                          <RatingBar rating={course.professorRating.difficulty} />
                        </View>
                      </View>
                      <Text style={styles.reviewCount}>
                        Based on {course.professorRating.reviews} student reviews
                      </Text>
                    </InfoSection>
                  )}

                  {/* Enrollment Info */}
                  <InfoSection title="Enrollment">
                    <View style={styles.enrollmentGrid}>
                      <View style={styles.enrollmentItem}>
                        <Text style={styles.enrollmentNumber}>{course.enrollmentCurrent}</Text>
                        <Text style={styles.enrollmentLabel}>Enrolled</Text>
                      </View>
                      <View style={styles.enrollmentItem}>
                        <Text style={styles.enrollmentNumber}>{course.enrollmentCap}</Text>
                        <Text style={styles.enrollmentLabel}>Capacity</Text>
                      </View>
                      {course.waitlistCurrent !== undefined && (
                        <View style={styles.enrollmentItem}>
                          <Text style={styles.enrollmentNumber}>{course.waitlistCurrent}</Text>
                          <Text style={styles.enrollmentLabel}>PERMs</Text>
                        </View>
                      )}
                    </View>
                  </InfoSection>

                  {/* Requirements */}
                  {course.distributionReqs && course.distributionReqs.length > 0 && (
                    <InfoSection title="Distribution Requirements">
                      <View style={styles.requirementsContainer}>
                        {course.distributionReqs.map((req, index) => (
                          <View key={index} style={styles.requirementTag}>
                            <Text style={styles.requirementText}>{req}</Text>
                          </View>
                        ))}
                      </View>
                    </InfoSection>
                  )}

                  {/* Prerequisites */}
                  {course.prerequisites && (
                    <InfoSection title="Prerequisites">
                      <Text style={styles.prerequisiteText}>{course.prerequisites}</Text>
                    </InfoSection>
                  )}

                  {/* Description */}
                  <InfoSection title="Course Description">
                    <Text style={styles.descriptionText}>{course.description}</Text>
                  </InfoSection>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.likeButton, isLiked && styles.likedButton]}
                    onPress={handleLikeToggle}
                  >
                    <Ionicons
                      name={isLiked ? "heart" : "heart-outline"}
                      size={20}
                      color={isLiked ? "#FFFFFF" : SwipeColors.textPrimary}
                    />
                    <Text style={[styles.actionText, isLiked && styles.likedText]}>
                      {isLiked ? "Liked" : "Like Course"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.permButton, isGeneratingPerm && styles.disabledButton]}
                    onPress={handleGeneratePerm}
                    disabled={isGeneratingPerm}
                  >
                    <Ionicons 
                      name={isGeneratingPerm ? "hourglass-outline" : "document-text-outline"} 
                      size={20} 
                      color={SwipeColors.accentBlue} 
                    />
                    <Text style={styles.permText}>
                      {isGeneratingPerm ? "Generating..." : "Generate PERM"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth * 0.92,
    maxHeight: screenHeight * 0.85,
  },
  modalContent: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 24,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  schoolBadge: {
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
    marginBottom: 16,
  },
  courseCode: {
    fontSize: 24,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    gap: 4,
  },
  fullBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: SwipeColors.success,
  },
  fullText: {
    color: SwipeColors.danger,
  },
  scrollContent: {
    maxHeight: screenHeight * 0.5,
    paddingHorizontal: 24,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
  },
  sectionContent: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    minWidth: 70,
  },
  infoValue: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  ratingsGrid: {
    gap: 12,
  },
  ratingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingBar: {
    width: 80,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 30,
  },
  reviewCount: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  enrollmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  enrollmentItem: {
    alignItems: 'center',
  },
  enrollmentNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  enrollmentLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    marginTop: 2,
  },
  requirementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  requirementTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  requirementText: {
    fontSize: 12,
    color: SwipeColors.accentBlue,
    fontWeight: '500',
  },
  prerequisiteText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    lineHeight: 20,
  },
  descriptionText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  likeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  likedButton: {
    backgroundColor: SwipeColors.like,
    borderColor: SwipeColors.like,
  },
  permButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  likedText: {
    color: '#FFFFFF',
  },
  permText: {
    fontSize: 15,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
});