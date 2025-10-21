import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  SignalIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationCircleIcon,
  XMarkIcon,
  UserGroupIcon,
  StarIcon,
} from 'react-native-heroicons/outline';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useEnrollmentStatus, useProfessorRating, useCoursePopularity } from '@/hooks/useRealTimeData';

const { width: screenWidth } = Dimensions.get('window');

interface RealTimeStatusIndicatorProps {
  courseId: string;
  compact?: boolean;
  showDetailModal?: boolean;
}

export default function RealTimeStatusIndicator({
  courseId,
  compact = false,
  showDetailModal = true,
}: RealTimeStatusIndicatorProps) {
  const [showModal, setShowModal] = useState(false);
  const { enrollmentStatus, isLoading: enrollmentLoading } = useEnrollmentStatus(courseId);
  const { rating, isLoading: ratingLoading } = useProfessorRating(courseId);
  const { popularity } = useCoursePopularity(courseId);

  // Animation values
  const pulseOpacity = useSharedValue(1);
  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  React.useEffect(() => {
    // Pulse animation for live indicators
    if (enrollmentStatus && !enrollmentLoading) {
      pulseOpacity.value = withRepeat(
        withTiming(0.5, { duration: 1500 }),
        -1,
        true
      );
    }
  }, [enrollmentStatus, enrollmentLoading, pulseOpacity]);

  React.useEffect(() => {
    if (showModal) {
      modalOpacity.value = withTiming(1, { duration: 300 });
      modalScale.value = withSpring(1, { damping: 20, stiffness: 300 });
    } else {
      modalOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [showModal]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    opacity: modalOpacity.value,
    transform: [{ scale: modalScale.value }],
  }));

  if (enrollmentLoading || !enrollmentStatus) {
    return compact ? null : (
      <View style={styles.loadingContainer}>
        <ClockIcon width={12} height={12} color={SwipeColors.textTertiary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const getStatusColor = () => {
    if (enrollmentStatus.isFull) return SwipeColors.danger;
    if (enrollmentStatus.percentFull >= 90) return '#FFA500';
    return SwipeColors.success;
  };

  const getStatusIcon = () => {
    if (enrollmentStatus.isFull) {
      return <ExclamationCircleIcon width={12} height={12} color={SwipeColors.danger} />;
    }
    
    if (enrollmentStatus.trend === 'rising') {
      return <ArrowTrendingUpIcon width={12} height={12} color='#FFA500' />;
    } else if (enrollmentStatus.trend === 'falling') {
      return <ArrowTrendingDownIcon width={12} height={12} color={SwipeColors.success} />;
    }
    
    return <SignalIcon width={12} height={12} color={getStatusColor()} />;
  };

  const getStatusText = () => {
    if (enrollmentStatus.isFull) {
      return enrollmentStatus.waitlist.hasWaitlist 
        ? `PERMs: ${enrollmentStatus.waitlist.current}`
        : 'FULL';
    }
    return `${enrollmentStatus.available} spots`;
  };

  const handlePress = () => {
    if (showDetailModal) {
      setShowModal(true);
    }
  };

  if (compact) {
    return (
      <TouchableOpacity onPress={handlePress} style={styles.compactContainer}>
        <Animated.View style={[styles.liveIndicator, pulseStyle]}>
          {getStatusIcon()}
        </Animated.View>
        <Text style={[styles.compactText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.statusContainer}>
        <View style={styles.statusHeader}>
          <Animated.View style={[styles.liveIndicator, pulseStyle]}>
            {getStatusIcon()}
          </Animated.View>
          <Text style={styles.liveText}>LIVE</Text>
        </View>
        
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        
        {enrollmentStatus.trend !== 'stable' && (
          <Text style={styles.trendText}>
            {enrollmentStatus.trend === 'rising' ? 'Filling up' : 'Spots opening'}
          </Text>
        )}
      </TouchableOpacity>

      {/* Detail Modal */}
      {showModal && (
        <Modal
          visible={showModal}
          transparent
          animationType="none"
          onRequestClose={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowModal(false)}
          >
            <BlurView intensity={25} style={styles.blurOverlay}>
              <Animated.View style={[styles.modalContainer, modalStyle]}>
                <TouchableOpacity activeOpacity={1}>
                  <LinearGradient
                    colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                    style={styles.modalContent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.modalHeader}>
                      <View>
                        <Text style={styles.modalTitle}>Live Course Data</Text>
                        <Text style={styles.modalSubtitle}>Real-time enrollment & ratings</Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowModal(false)}>
                        <XMarkIcon width={24} height={24} color={SwipeColors.textSecondary} />
                      </TouchableOpacity>
                    </View>

                    {/* Enrollment Details */}
                    <View style={styles.dataSection}>
                      <View style={styles.sectionHeader}>
                        <UserGroupIcon width={20} height={20} color={SwipeColors.accentBlue} />
                        <Text style={styles.sectionTitle}>Enrollment Status</Text>
                        <Animated.View style={[styles.liveBadge, pulseStyle]}>
                          <Text style={styles.liveBadgeText}>LIVE</Text>
                        </Animated.View>
                      </View>
                      
                      <View style={styles.enrollmentGrid}>
                        <View style={styles.enrollmentItem}>
                          <Text style={styles.enrollmentValue}>
                            {enrollmentStatus.current}/{enrollmentStatus.capacity}
                          </Text>
                          <Text style={styles.enrollmentLabel}>Enrolled</Text>
                        </View>
                        
                        <View style={styles.enrollmentItem}>
                          <Text style={[styles.enrollmentValue, { color: getStatusColor() }]}>
                            {enrollmentStatus.available}
                          </Text>
                          <Text style={styles.enrollmentLabel}>Available</Text>
                        </View>
                        
                        <View style={styles.enrollmentItem}>
                          <Text style={styles.enrollmentValue}>
                            {Math.round(enrollmentStatus.percentFull)}%
                          </Text>
                          <Text style={styles.enrollmentLabel}>Full</Text>
                        </View>
                      </View>

                      {enrollmentStatus.waitlist.hasWaitlist && (
                        <View style={styles.permsSection}>
                          <Text style={styles.permsText}>
                            PERMs: {enrollmentStatus.waitlist.current}/{enrollmentStatus.waitlist.capacity}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Professor Rating */}
                    {rating && !ratingLoading && (
                      <View style={styles.dataSection}>
                        <View style={styles.sectionHeader}>
                          <StarIcon width={20} height={20} color='#FFD700' />
                          <Text style={styles.sectionTitle}>Professor Rating</Text>
                        </View>
                        
                        <View style={styles.ratingGrid}>
                          <View style={styles.ratingItem}>
                            <Text style={styles.ratingValue}>
                              {rating.overall.toFixed(1)}⭐
                            </Text>
                            <Text style={styles.ratingLabel}>Overall</Text>
                          </View>
                          
                          <View style={styles.ratingItem}>
                            <Text style={styles.ratingValue}>
                              {rating.difficulty.toFixed(1)}
                            </Text>
                            <Text style={styles.ratingLabel}>Difficulty</Text>
                          </View>
                          
                          <View style={styles.ratingItem}>
                            <Text style={styles.ratingValue}>
                              {rating.reviews}
                            </Text>
                            <Text style={styles.ratingLabel}>Reviews</Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Popularity Metrics */}
                    {popularity && (
                      <View style={styles.dataSection}>
                        <View style={styles.sectionHeader}>
                          <ArrowTrendingUpIcon width={20} height={20} color={SwipeColors.success} />
                          <Text style={styles.sectionTitle}>Popularity</Text>
                        </View>
                        
                        <View style={styles.popularityGrid}>
                          <View style={styles.popularityItem}>
                            <Text style={styles.popularityValue}>
                              {popularity.likesLast24h}
                            </Text>
                            <Text style={styles.popularityLabel}>Likes (24h)</Text>
                          </View>
                          
                          <View style={styles.popularityItem}>
                            <Text style={styles.popularityValue}>
                              #{popularity.searchRank}
                            </Text>
                            <Text style={styles.popularityLabel}>Search Rank</Text>
                          </View>
                        </View>
                        
                        {popularity.isTrending && (
                          <View style={styles.trendingBadge}>
                            <Text style={styles.trendingText}>🔥 Trending Course</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </BlurView>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingText: {
    fontSize: 10,
    color: SwipeColors.textTertiary,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusContainer: {
    alignItems: 'center',
    gap: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SwipeColors.success,
  },
  liveText: {
    fontSize: 8,
    fontWeight: '700',
    color: SwipeColors.success,
    letterSpacing: 0.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trendText: {
    fontSize: 9,
    color: SwipeColors.textTertiary,
  },
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
    maxHeight: '70%',
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
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
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  dataSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    flex: 1,
  },
  liveBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 8,
    fontWeight: '700',
    color: SwipeColors.success,
  },
  enrollmentGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  enrollmentItem: {
    alignItems: 'center',
    flex: 1,
  },
  enrollmentValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  enrollmentLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  permsSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
  },
  permsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA500',
  },
  ratingGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingItem: {
    alignItems: 'center',
    flex: 1,
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  ratingLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  popularityGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  popularityItem: {
    alignItems: 'center',
  },
  popularityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  popularityLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  trendingBadge: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  trendingText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.danger,
  },
});