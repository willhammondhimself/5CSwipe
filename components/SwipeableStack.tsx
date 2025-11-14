import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import SwipeableCard from './SwipeableCard';
import PermModal from './PermModal';
import CourseDetailModal from './CourseDetailModal';
import UndoButton from './UndoButton';
import LiquidButton from './LiquidButton';
import CourseCardSkeleton from './CourseCardSkeleton';
import EmptySwipeState from './EmptySwipeState';
import { Course } from '../data/mockCourses';
import { SwipeColors } from '../contexts/constants/Colors';
import { generatePermRequest } from '../utils/permGenerator';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { recommendationEngine, RecommendationScore } from '../utils/recommendationEngine';
import { useShakeDetection } from '@/hooks/useShakeDetection';
import { HapticPatterns } from '@/utils/hapticPatterns';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;
const SWIPE_OUT_DURATION = 250;

interface SwipeableStackProps {
  courses: Course[];
  onSwipeRight?: (course: Course) => void;
  onSwipeLeft?: (course: Course) => void;
  onSuperLike?: (course: Course) => void;
  enableRecommendations?: boolean;
  loading?: boolean;
  skippedCourses?: Course[];
  onResetFilters?: () => void;
}

export default function SwipeableStack({
  courses,
  onSwipeRight,
  onSwipeLeft,
  onSuperLike,
  enableRecommendations = true,
  loading = false,
  skippedCourses = [],
  onResetFilters,
}: SwipeableStackProps) {
  const { likedCourses } = useLikedCourses();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [showPermModal, setShowPermModal] = useState(false);
  const [permCourseCode, setPermCourseCode] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lastSwipedCourse, setLastSwipedCourse] = useState<Course | null>(null);
  const [showUndoButton, setShowUndoButton] = useState(false);
  const [undoAction, setUndoAction] = useState<'left' | 'right' | 'up' | null>(null);
  const isAnimating = useRef(false);

  // Fisher-Yates shuffle algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Smart course ordering with recommendations
  const orderedCourses = useMemo(() => {
    if (!enableRecommendations || courses.length === 0) {
      return shuffleArray(courses);
    }

    const recs = recommendationEngine.getRecommendations(courses, likedCourses);
    setRecommendations(recs);

    // Shuffle courses first
    const shuffled = shuffleArray(courses);

    // Sort shuffled courses by recommendation score, keeping high-confidence recommendations at the top
    const coursesWithScores = shuffled.map(course => {
      const rec = recs.find(r => r.courseId === course.id);
      return {
        course,
        score: rec?.score || 0,
        confidence: rec?.confidence || 'low'
      };
    });

    return coursesWithScores
      .sort((a, b) => {
        // Prioritize high confidence recommendations
        if (a.confidence === 'high' && b.confidence !== 'high') return -1;
        if (b.confidence === 'high' && a.confidence !== 'high') return 1;
        
        // Then sort by score
        return b.score - a.score;
      })
      .map(item => item.course);
  }, [courses, likedCourses, enableRecommendations]);

  // Update recommended courses list when dependencies change
  useEffect(() => {
    setRecommendedCourses(orderedCourses);
  }, [orderedCourses]);
  
  // Use Animated.ValueXY for position tracking
  const position = useRef(new Animated.ValueXY()).current;
  const [likeOpacity] = useState(new Animated.Value(0));
  const [nopeOpacity] = useState(new Animated.Value(0));
  const [superLikeOpacity] = useState(new Animated.Value(0));

  const currentCourse = orderedCourses[currentIndex];
  const nextCourse = orderedCourses[currentIndex + 1];
  const thirdCourse = orderedCourses[currentIndex + 2];
  
  // Get recommendation info for current course
  const currentRecommendation = useMemo(() => {
    if (!currentCourse) return null;
    return recommendations.find(r => r.courseId === currentCourse.id);
  }, [currentCourse, recommendations]);

  const handleCardTap = () => {
    if (currentCourse) {
      setSelectedCourse(currentCourse);
      setShowDetailModal(true);
    }
  };

  const handleUndo = useCallback(() => {
    if (lastSwipedCourse && undoAction) {
      // Restore the course to the stack
      setCurrentIndex(prev => Math.max(0, prev - 1));

      // Reset animations
      position.setValue({ x: 0, y: 0 });
      likeOpacity.setValue(0);
      nopeOpacity.setValue(0);
      superLikeOpacity.setValue(0);

      // Clear undo state
      setLastSwipedCourse(null);
      setUndoAction(null);
      setShowUndoButton(false);

      // Haptic feedback
      HapticPatterns.undo();
    }
  }, [lastSwipedCourse, undoAction, position, likeOpacity, nopeOpacity, superLikeOpacity]);

  // Shake to undo functionality
  useShakeDetection({
    threshold: 2.5,
    timeout: 1000,
    onShake: handleUndo,
  });

  // Create rotation interpolation
  const rotate = position.x.interpolate({
    inputRange: [-screenWidth / 2, 0, screenWidth / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const rotateAndTranslate = {
    transform: [
      { translateX: position.x },
      { translateY: position.y },
      { rotate: rotate },
    ],
  };

  const handleSwipeComplete = useCallback(
    async (direction: 'left' | 'right' | 'up') => {
      if (!currentCourse) return;
      
      // Record swipe in recommendation engine
      if (enableRecommendations) {
        const action = direction === 'left' ? 'nope' : 
                      direction === 'right' ? 'like' : 'superlike';
        recommendationEngine.recordSwipe(currentCourse, action);
      }
      
      if (direction === 'right') {
        HapticPatterns.swipeRight();
        const permRequest = generatePermRequest(currentCourse);

        await Clipboard.setStringAsync(permRequest);
        setPermCourseCode(currentCourse.courseCode);
        setShowPermModal(true);

        if (onSwipeRight) {
          onSwipeRight(currentCourse);
        }
      } else if (direction === 'left') {
        HapticPatterns.swipeLeft();
        if (onSwipeLeft) {
          onSwipeLeft(currentCourse);
        }
      } else if (direction === 'up') {
        HapticPatterns.superLike();
        if (onSuperLike) {
          onSuperLike(currentCourse);
        }
      }
      
      // Store for undo functionality
      setLastSwipedCourse(currentCourse);
      setUndoAction(direction);
      setShowUndoButton(true);

      // Move to next card
      setCurrentIndex((prev) => prev + 1);

      // Reset position
      position.setValue({ x: 0, y: 0 });
      likeOpacity.setValue(0);
      nopeOpacity.setValue(0);
      superLikeOpacity.setValue(0);

      // Allow new swipes
      isAnimating.current = false;
    },
    [currentCourse, onSwipeRight, onSwipeLeft, onSuperLike, position, likeOpacity, nopeOpacity, superLikeOpacity, enableRecommendations]
  );

  // Create PanResponder for gesture handling
  // Use useMemo to recreate when dependencies change to avoid stale closures
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isAnimating.current,
        onMoveShouldSetPanResponder: () => !isAnimating.current,

        onPanResponderMove: (_, gestureState) => {
          if (isAnimating.current) return;
          position.setValue({ x: gestureState.dx, y: gestureState.dy });

          // Calculate velocity magnitude for enhanced feedback
          const { vx, vy } = gestureState;
          const velocity = Math.sqrt(vx * vx + vy * vy);

          // Update opacity indicators with velocity-based intensity
          const velocityMultiplier = velocity > 1 ? 1.3 : 1;

          if (gestureState.dx > 0) {
            likeOpacity.setValue(Math.min(1, (gestureState.dx / SWIPE_THRESHOLD) * velocityMultiplier));
            nopeOpacity.setValue(0);
          } else if (gestureState.dx < 0) {
            nopeOpacity.setValue(Math.min(1, (Math.abs(gestureState.dx) / SWIPE_THRESHOLD) * velocityMultiplier));
            likeOpacity.setValue(0);
          }

          if (gestureState.dy < -50 && Math.abs(gestureState.dx) < 50) {
            superLikeOpacity.setValue(Math.abs(gestureState.dy) / SWIPE_THRESHOLD);
          } else {
            superLikeOpacity.setValue(0);
          }
        },

        onPanResponderRelease: (_, gestureState) => {
          if (isAnimating.current) return;

          // Calculate velocity for dynamic thresholds and animation speed
          const { vx, vy } = gestureState;
          const velocity = Math.abs(vx);
          const verticalVelocity = Math.abs(vy);

          // Adjust threshold based on velocity - fast swipes need less distance
          const dynamicThreshold = velocity > 1 ? SWIPE_THRESHOLD * 0.7 : SWIPE_THRESHOLD;
          const dynamicVerticalThreshold = verticalVelocity > 1 ? SWIPE_THRESHOLD * 0.7 : SWIPE_THRESHOLD;

          // Adjust animation duration based on velocity - faster swipes = quicker animation
          const animationDuration = velocity > 1 ? 150 : SWIPE_OUT_DURATION;

          const shouldSwipeRight = gestureState.dx > dynamicThreshold;
          const shouldSwipeLeft = gestureState.dx < -dynamicThreshold;
          const shouldSuperLike = gestureState.dy < -dynamicVerticalThreshold && Math.abs(gestureState.dx) < SWIPE_THRESHOLD;

          if (shouldSwipeRight) {
            isAnimating.current = true;
            Animated.timing(position, {
              toValue: { x: screenWidth * 1.5, y: gestureState.dy + 50 },
              duration: animationDuration,
              useNativeDriver: false,
            }).start(() => handleSwipeComplete('right'));
          } else if (shouldSwipeLeft) {
            isAnimating.current = true;
            Animated.timing(position, {
              toValue: { x: -screenWidth * 1.5, y: gestureState.dy + 50 },
              duration: animationDuration,
              useNativeDriver: false,
            }).start(() => handleSwipeComplete('left'));
          } else if (shouldSuperLike) {
            isAnimating.current = true;
            Animated.timing(position, {
              toValue: { x: 0, y: -screenHeight },
              duration: animationDuration,
              useNativeDriver: false,
            }).start(() => handleSwipeComplete('up'));
          } else {
            // Spring back to center
            Animated.spring(position, {
              toValue: { x: 0, y: 0 },
              friction: 4,
              useNativeDriver: false,
            }).start();

            Animated.timing(likeOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start();

            Animated.timing(nopeOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start();

            Animated.timing(superLikeOpacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: false,
            }).start();
          }
        },
      }),
    [position, likeOpacity, nopeOpacity, superLikeOpacity, handleSwipeComplete]
  );

  const handleButtonPress = (action: 'left' | 'right' | 'up') => {
    if (isAnimating.current) return; // Block if already animating
    isAnimating.current = true; // Set flag before animation

    if (action === 'left') {
      HapticPatterns.buttonPress();
      Animated.timing(position, {
        toValue: { x: -screenWidth * 1.5, y: 50 },
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: false,
      }).start(() => handleSwipeComplete('left'));
    } else if (action === 'right') {
      HapticPatterns.buttonPress();
      Animated.timing(position, {
        toValue: { x: screenWidth * 1.5, y: 50 },
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: false,
      }).start(() => handleSwipeComplete('right'));
    } else if (action === 'up') {
      HapticPatterns.buttonPress();
      Animated.timing(position, {
        toValue: { x: 0, y: -screenHeight },
        duration: SWIPE_OUT_DURATION,
        useNativeDriver: false,
      }).start(() => handleSwipeComplete('up'));
    }
  };

  // Show loading skeletons
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.cardContainer}>
          <View style={styles.cardWrapper}>
            <CourseCardSkeleton />
          </View>
          <View style={[styles.cardWrapper, styles.secondCard]}>
            <CourseCardSkeleton />
          </View>
          <View style={[styles.cardWrapper, styles.thirdCard]}>
            <CourseCardSkeleton />
          </View>
        </View>
      </View>
    );
  }

  // Show empty state with confetti
  if (currentIndex >= orderedCourses.length) {
    return (
      <EmptySwipeState
        onResetFilters={onResetFilters}
        onReviewSkipped={() => {
          // Reset to show skipped courses
          setCurrentIndex(0);
        }}
        skippedCount={skippedCourses.length}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cardContainer}>
        {/* Third card (background) */}
        {thirdCourse && (
          <View style={[styles.cardWrapper, styles.thirdCard]}>
            <SwipeableCard course={thirdCourse} />
          </View>
        )}
        
        {/* Second card (middle) */}
        {nextCourse && (
          <View style={[styles.cardWrapper, styles.secondCard]}>
            <SwipeableCard course={nextCourse} />
          </View>
        )}
        
        {/* First card (top - interactive) */}
        {currentCourse && (
          <Animated.View
            style={[styles.cardWrapper, rotateAndTranslate]}
            {...panResponder.panHandlers}
          >
            <SwipeableCard 
              course={currentCourse} 
              isFirst 
              onTap={handleCardTap} 
              likedCourses={likedCourses}
            />
            
            {/* Recommendation Badge */}
            {currentRecommendation && currentRecommendation.confidence === 'high' && (
              <View style={styles.recommendationBadge}>
                <Text style={styles.recommendationText}>✨ Recommended</Text>
                {currentRecommendation.reasons[0] && (
                  <Text style={styles.recommendationReason}>{currentRecommendation.reasons[0]}</Text>
                )}
              </View>
            )}
            
            {/* Like indicator */}
            <Animated.View style={[styles.indicator, styles.likeIndicator, { opacity: likeOpacity }]}>
              <Text style={styles.likeText}>LIKE</Text>
            </Animated.View>
            
            {/* Nope indicator */}
            <Animated.View style={[styles.indicator, styles.nopeIndicator, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeText}>NOPE</Text>
            </Animated.View>
            
            {/* Super Like indicator */}
            <Animated.View style={[styles.indicator, styles.superLikeIndicator, { opacity: superLikeOpacity }]}>
              <Text style={styles.superLikeText}>SUPER LIKE</Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>
      
      {/* Custom PERM Modal */}
      <PermModal
        visible={showPermModal}
        onClose={() => setShowPermModal(false)}
        courseCode={permCourseCode}
      />
      
      {/* Course Detail Modal */}
      <CourseDetailModal
        isVisible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        course={selectedCourse}
      />
      
      {/* Undo Button */}
      <UndoButton
        visible={showUndoButton}
        onUndo={handleUndo}
        courseCode={lastSwipedCourse?.courseCode || ''}
      />
      
      {/* Action buttons */}
      <View style={[styles.buttonsContainer, { paddingBottom: insets.bottom + 78 + 10}]}>
        <LiquidButton
          type="nope"
          size="large"
          onPress={() => handleButtonPress('left')}
          disabled={!currentCourse}
        />

        <LiquidButton
          type="superlike"
          size="medium"
          onPress={() => handleButtonPress('up')}
          disabled={!currentCourse}
        />

        <LiquidButton
          type="like"
          size="large"
          onPress={() => handleButtonPress('right')}
          disabled={!currentCourse}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondCard: {
    transform: [{ scale: 0.97 }, { translateY: -8 }],
    opacity: 0.9,
  },
  thirdCard: {
    transform: [{ scale: 0.94 }, { translateY: -16 }],
    opacity: 0.6,
  },
  indicator: {
    position: 'absolute',
    top: 50,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 3,
  },
  likeIndicator: {
    right: 20,
    borderColor: SwipeColors.like,
    transform: [{ rotate: '20deg' }],
  },
  nopeIndicator: {
    left: 20,
    borderColor: SwipeColors.nope,
    transform: [{ rotate: '-20deg' }],
  },
  superLikeIndicator: {
    alignSelf: 'center',
    left: '35%',
    borderColor: SwipeColors.superLike,
  },
  likeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: SwipeColors.like,
  },
  nopeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: SwipeColors.nope,
  },
  superLikeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: SwipeColors.superLike,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 28,
    marginTop: 8,
    position: 'absolute',
    bottom: -5, // Position above tab bar
    left: 0,
    right: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: SwipeColors.textPrimary,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
  },
  recommendationBadge: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: 'rgba(255, 215, 0, 0.6)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: screenWidth * 0.6,
  },
  recommendationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 2,
  },
  recommendationReason: {
    fontSize: 9,
    color: '#FFD700',
    textAlign: 'center',
    opacity: 0.8,
  },
});