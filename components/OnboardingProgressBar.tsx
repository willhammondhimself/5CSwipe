/**
 * OnboardingProgressBar.tsx
 * ==========================
 * Reusable progress indicator for multi-step onboarding
 *
 * Features:
 * - Animated progress bar
 * - Step indicator dots
 * - Smooth transitions
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { SwipeColors } from '@/contexts/constants/Colors';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
}

export default function OnboardingProgressBar({
  currentStep,
  totalSteps,
  stepTitles,
}: OnboardingProgressBarProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      {/* Step Indicator */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepText}>
          Step {currentStep} of {totalSteps}
        </Text>
        {stepTitles && stepTitles[currentStep - 1] && (
          <Text style={styles.stepTitle}>{stepTitles[currentStep - 1]}</Text>
        )}
      </View>

      {/* Dots Indicator */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index + 1 <= currentStep ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: SwipeColors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: SwipeColors.primary,
    borderRadius: 3,
  },
  stepContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginTop: 4,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: SwipeColors.primary,
  },
  dotInactive: {
    backgroundColor: SwipeColors.border,
  },
});
