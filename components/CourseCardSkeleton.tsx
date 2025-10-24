/**
 * CourseCardSkeleton.tsx
 * Loading skeleton with shimmer effect for course cards
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = screenWidth * 0.9;
const CARD_HEIGHT = screenHeight * 0.7;

export default function CourseCardSkeleton() {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3]);

    return {
      opacity,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* Header skeleton */}
        <View style={styles.header}>
          <View style={styles.schoolBadgeSkeleton} />
          <View style={styles.creditBadgeSkeleton} />
        </View>

        {/* Course code skeleton */}
        <View style={styles.courseCodeSkeleton} />

        {/* Title skeleton */}
        <View style={styles.titleSkeleton} />
        <View style={[styles.titleSkeleton, { width: '70%' }]} />

        {/* Info rows skeleton */}
        <View style={styles.infoRow}>
          <View style={styles.iconSkeleton} />
          <View style={styles.textSkeleton} />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconSkeleton} />
          <View style={styles.textSkeleton} />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.iconSkeleton} />
          <View style={styles.textSkeleton} />
        </View>

        {/* Description skeleton */}
        <View style={styles.descriptionArea}>
          <View style={styles.descriptionLine} />
          <View style={styles.descriptionLine} />
          <View style={[styles.descriptionLine, { width: '80%' }]} />
        </View>

        {/* Footer skeleton */}
        <View style={styles.footer}>
          <View style={styles.enrollmentSkeleton} />
          <View style={styles.statusBadgeSkeleton} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    alignSelf: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: SwipeColors.cardBackground,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  schoolBadgeSkeleton: {
    width: 80,
    height: 24,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 12,
  },
  creditBadgeSkeleton: {
    width: 60,
    height: 24,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 12,
  },
  courseCodeSkeleton: {
    width: 140,
    height: 32,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 8,
    marginBottom: 12,
  },
  titleSkeleton: {
    width: '90%',
    height: 24,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 6,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  iconSkeleton: {
    width: 20,
    height: 20,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 10,
    marginRight: 12,
  },
  textSkeleton: {
    width: 180,
    height: 16,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 4,
  },
  descriptionArea: {
    marginTop: 20,
    flex: 1,
  },
  descriptionLine: {
    width: '100%',
    height: 14,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 4,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  enrollmentSkeleton: {
    width: 100,
    height: 16,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 4,
  },
  statusBadgeSkeleton: {
    width: 80,
    height: 28,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 14,
  },
});
