import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  XMarkIcon,
  ChartBarIcon,
  HeartIcon,
  HandThumbDownIcon,
  AcademicCapIcon,
  ClockIcon,
  MapPinIcon,
  BuildingOfficeIcon
} from 'react-native-heroicons/outline';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { recommendationEngine } from '@/utils/recommendationEngine';

const { width: screenWidth } = Dimensions.get('window');

interface RecommendationInsightsProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function RecommendationInsights({
  isVisible,
  onClose,
}: RecommendationInsightsProps) {
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
  }, [isVisible]);

  const preferences = recommendationEngine.getUserPreferences();
  const stats = recommendationEngine.getSwipeStatistics();

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  const formatPercentage = (value: number) => `${Math.round(value * 100)}%`;

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
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Your Taste Profile</Text>
                    <Text style={styles.modalSubtitle}>
                      Based on {stats.total} course swipes
                    </Text>
                  </View>
                  <TouchableOpacity onPress={onClose}>
                    <XMarkIcon width={24} height={24} color={SwipeColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                  {/* Swipe Statistics */}
                  {stats.total > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <ChartBarIcon width={20} height={20} color={SwipeColors.accentBlue} />
                        <Text style={styles.sectionTitle}>Your Swiping Style</Text>
                      </View>
                      
                      <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <View style={[styles.statIcon, { backgroundColor: 'rgba(52, 199, 89, 0.15)' }]}>
                            <HeartIcon width={16} height={16} color={SwipeColors.success} />
                          </View>
                          <Text style={styles.statValue}>{stats.likes + stats.superlikes}</Text>
                          <Text style={styles.statLabel}>Liked</Text>
                        </View>
                        
                        <View style={styles.statItem}>
                          <View style={[styles.statIcon, { backgroundColor: 'rgba(255, 59, 48, 0.15)' }]}>
                            <HandThumbDownIcon width={16} height={16} color={SwipeColors.danger} />
                          </View>
                          <Text style={styles.statValue}>{stats.nopes}</Text>
                          <Text style={styles.statLabel}>Passed</Text>
                        </View>
                        
                        <View style={styles.statItem}>
                          <View style={[styles.statIcon, { backgroundColor: 'rgba(0, 122, 255, 0.15)' }]}>
                            <ChartBarIcon width={16} height={16} color={SwipeColors.accentBlue} />
                          </View>
                          <Text style={styles.statValue}>{formatPercentage(stats.likeRate)}</Text>
                          <Text style={styles.statLabel}>Like Rate</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Preferred Schools */}
                  {preferences.preferredSchools.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <BuildingOfficeIcon width={20} height={20} color={SwipeColors.success} />
                        <Text style={styles.sectionTitle}>Favorite Schools</Text>
                      </View>
                      <View style={styles.tagContainer}>
                        {preferences.preferredSchools.map((school, index) => (
                          <View key={index} style={[styles.tag, styles.schoolTag]}>
                            <Text style={styles.tagText}>{school}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Preferred Departments */}
                  {preferences.preferredDepartments.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <AcademicCapIcon width={20} height={20} color={SwipeColors.accentBlue} />
                        <Text style={styles.sectionTitle}>Academic Interests</Text>
                      </View>
                      <View style={styles.tagContainer}>
                        {preferences.preferredDepartments.map((dept, index) => (
                          <View key={index} style={[styles.tag, styles.deptTag]}>
                            <Text style={styles.tagText}>{dept}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Course Level Preferences */}
                  {preferences.preferredCourseLevel.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <AcademicCapIcon width={20} height={20} color={SwipeColors.textSecondary} />
                        <Text style={styles.sectionTitle}>Course Level</Text>
                      </View>
                      <View style={styles.tagContainer}>
                        {preferences.preferredCourseLevel.map((level, index) => (
                          <View key={index} style={[styles.tag, styles.levelTag]}>
                            <Text style={styles.tagText}>{level}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Meeting Days */}
                  {preferences.preferredMeetingDays.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <ClockIcon width={20} height={20} color='#FFA500' />
                        <Text style={styles.sectionTitle}>Preferred Days</Text>
                      </View>
                      <View style={styles.daysRow}>
                        {['M', 'T', 'W', 'Th', 'F'].map(day => (
                          <View 
                            key={day} 
                            style={[
                              styles.dayCircle, 
                              preferences.preferredMeetingDays.includes(day as any) && styles.preferredDay
                            ]}
                          >
                            <Text style={[
                              styles.dayText,
                              preferences.preferredMeetingDays.includes(day as any) && styles.preferredDayText
                            ]}>
                              {day}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Professor Rating Threshold */}
                  {preferences.preferredProfessorRatingMin > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Professor Rating Preference</Text>
                      </View>
                      <Text style={styles.ratingText}>
                        You prefer professors rated {preferences.preferredProfessorRatingMin.toFixed(1)}+ stars
                      </Text>
                    </View>
                  )}

                  {/* Enrollment Preferences */}
                  {preferences.maxEnrollmentPercentage < 100 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Class Size Preference</Text>
                      </View>
                      <Text style={styles.enrollmentText}>
                        You prefer courses that are less than {Math.round(preferences.maxEnrollmentPercentage)}% full
                      </Text>
                    </View>
                  )}

                  {/* Tips */}
                  <View style={styles.section}>
                    <View style={styles.tipsContainer}>
                      <Text style={styles.tipsTitle}>💡 Tips</Text>
                      <Text style={styles.tipsText}>
                        • Keep swiping to improve recommendations{'\n'}
                        • Courses are automatically sorted based on your preferences{'\n'}
                        • Super like courses you're really excited about
                      </Text>
                    </View>
                  </View>
                </ScrollView>
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
    width: screenWidth * 0.9,
    maxHeight: '85%',
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  contentContainer: {
    maxHeight: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  schoolTag: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  deptTag: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  levelTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: SwipeColors.highlightBorder,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferredDay: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  preferredDayText: {
    color: '#FFFFFF',
  },
  ratingText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    fontStyle: 'italic',
  },
  enrollmentText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    fontStyle: 'italic',
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
});