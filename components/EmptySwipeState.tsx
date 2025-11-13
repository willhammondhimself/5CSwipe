/**
 * EmptySwipeState.tsx
 * Celebratory empty state when user has reviewed all courses
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Ionicons } from '@expo/vector-icons';
import { SwipeColors } from '@/contexts/constants/Colors';
import * as Haptics from 'expo-haptics';

interface EmptySwipeStateProps {
  onResetFilters?: () => void;
  onReviewSkipped?: () => void;
  skippedCount?: number;
}

export default function EmptySwipeState({
  onResetFilters,
  onReviewSkipped,
  skippedCount = 0,
}: EmptySwipeStateProps) {
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    // Trigger confetti and haptics on mount
    if (confettiRef.current) {
      confettiRef.current.start();
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={styles.container}>
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        autoStart={false}
        fadeOut={true}
        fallSpeed={3000}
      />

      <View style={styles.iconContainer}>
        <Ionicons name="checkmark-circle" size={100} color={SwipeColors.success} />
      </View>

      <Text style={styles.title}>You&apos;ve Reviewed All Courses!</Text>
      <Text style={styles.subtitle}>
        Great job exploring your options for this semester
      </Text>

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="heart" size={24} color={SwipeColors.likeColor} />
          <Text style={styles.statText}>Courses Liked</Text>
        </View>
        {skippedCount > 0 && (
          <View style={styles.statBox}>
            <Ionicons name="arrow-undo" size={24} color={SwipeColors.textSecondary} />
            <Text style={styles.statText}>{skippedCount} Skipped</Text>
          </View>
        )}
      </View>

      <View style={styles.actionContainer}>
        {onResetFilters && (
          <TouchableOpacity style={styles.primaryButton} onPress={onResetFilters}>
            <Ionicons name="funnel-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Adjust Filters</Text>
          </TouchableOpacity>
        )}

        {skippedCount > 0 && onReviewSkipped && (
          <TouchableOpacity style={styles.secondaryButton} onPress={onReviewSkipped}>
            <Ionicons name="refresh-outline" size={20} color={SwipeColors.primary} />
            <Text style={styles.secondaryButtonText}>Review Skipped</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={styles.tipContainer}>
        <Ionicons name="bulb-outline" size={16} color={SwipeColors.accentYellow} />
        <Text style={styles.tipText}>
          Tip: Check your schedule tab to build your perfect timetable!
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  actionContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SwipeColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SwipeColors.primary,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.primary,
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: SwipeColors.accentYellow,
    flex: 1,
  },
});
