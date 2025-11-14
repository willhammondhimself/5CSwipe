import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LightBulbIcon,
  ChevronRightIcon,
  AcademicCapIcon,
  BookOpenIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';
import { PrerequisiteValidationResult } from '@/utils/prerequisiteValidator';

interface PrerequisiteWarningProps {
  course: Course;
  validation: PrerequisiteValidationResult;
  onPrerequisitePress?: (prerequisite: string) => void;
  onSuggestionsPress?: () => void;
  style?: any;
  compact?: boolean;
}

export default function PrerequisiteWarning({
  course,
  validation,
  onPrerequisitePress,
  onSuggestionsPress,
  style,
  compact = false,
}: PrerequisiteWarningProps) {
  if (validation.isValid && validation.warnings.length === 0 && validation.recommendations.length === 0) {
    return null; // No warnings or issues to display
  }

  const hasErrors = !validation.isValid;
  const hasWarnings = validation.warnings.length > 0;
  const hasRecommendations = validation.recommendations.length > 0;

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        {hasErrors && (
          <View style={styles.compactError}>
            <ExclamationTriangleIcon size={14} color={SwipeColors.danger} />
            <Text style={styles.compactText} numberOfLines={1}>
              Missing prerequisites
            </Text>
          </View>
        )}
        {hasWarnings && !hasErrors && (
          <View style={styles.compactWarning}>
            <InformationCircleIcon size={14} color={SwipeColors.warning} />
            <Text style={styles.compactText} numberOfLines={1}>
              Prerequisites recommended
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Missing Prerequisites (Errors) */}
      {hasErrors && (
        <LinearGradient
          colors={['rgba(255, 59, 48, 0.1)', 'rgba(255, 59, 48, 0.05)']}
          style={styles.errorCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}>
              <ExclamationTriangleIcon size={20} color={SwipeColors.danger} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.errorTitle}>Missing Prerequisites</Text>
              <Text style={styles.errorSubtitle}>
                Required before enrolling in {course.courseCode}
              </Text>
            </View>
          </View>

          <View style={styles.prerequisiteList}>
            {validation.missingPrerequisites.map((prereq, index) => (
              <TouchableOpacity
                key={index}
                style={styles.prerequisiteItem}
                onPress={() => onPrerequisitePress?.(prereq)}
                activeOpacity={0.7}
              >
                <View style={styles.prerequisiteInfo}>
                  <AcademicCapIcon size={16} color={SwipeColors.danger} />
                  <Text style={styles.prerequisiteText}>{prereq}</Text>
                </View>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>

          {onSuggestionsPress && (
            <TouchableOpacity
              style={styles.suggestionsButton}
              onPress={onSuggestionsPress}
              activeOpacity={0.7}
            >
              <LightBulbIcon size={16} color={SwipeColors.danger} />
              <Text style={styles.suggestionsText}>Find prerequisite courses</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <LinearGradient
          colors={['rgba(255, 193, 7, 0.1)', 'rgba(255, 193, 7, 0.05)']}
          style={styles.warningCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}>
              <InformationCircleIcon size={20} color={SwipeColors.warning} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.warningTitle}>Course Advisories</Text>
              <Text style={styles.warningSubtitle}>
                Consider these suggestions for {course.courseCode}
              </Text>
            </View>
          </View>

          <View style={styles.warningList}>
            {validation.warnings.map((warning, index) => (
              <View key={index} style={styles.warningItem}>
                <InformationCircleIcon size={14} color={SwipeColors.warning} />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      )}

      {/* Recommendations */}
      {hasRecommendations && !hasErrors && (
        <LinearGradient
          colors={['rgba(0, 122, 255, 0.1)', 'rgba(0, 122, 255, 0.05)']}
          style={styles.recommendationCard}
        >
          <View style={styles.cardHeader}>
            <View style={styles.headerIcon}>
              <LightBulbIcon size={20} color={SwipeColors.accentBlue} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.recommendationTitle}>Recommended Prerequisites</Text>
              <Text style={styles.recommendationSubtitle}>
                These courses will enhance your {course.courseCode} experience
              </Text>
            </View>
          </View>

          <View style={styles.recommendationList}>
            {validation.recommendations.map((recommendation, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recommendationItem}
                onPress={() => onPrerequisitePress?.(recommendation)}
                activeOpacity={0.7}
              >
                <View style={styles.recommendationInfo}>
                  <BookOpenIcon size={16} color={SwipeColors.accentBlue} />
                  <Text style={styles.recommendationText}>{recommendation}</Text>
                </View>
                <ChevronRightIcon size={16} color={SwipeColors.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  compactContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactText: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    fontWeight: '500',
  },
  errorCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  warningCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  recommendationCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.danger,
    marginBottom: 2,
  },
  errorSubtitle: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    lineHeight: 16,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.warning,
    marginBottom: 2,
  },
  warningSubtitle: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    lineHeight: 16,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
    marginBottom: 2,
  },
  recommendationSubtitle: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    lineHeight: 16,
  },
  prerequisiteList: {
    gap: 8,
    marginBottom: 12,
  },
  prerequisiteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.1)',
  },
  prerequisiteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  prerequisiteText: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
  },
  warningList: {
    gap: 8,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  warningText: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    lineHeight: 16,
    flex: 1,
  },
  recommendationList: {
    gap: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
  },
  recommendationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recommendationText: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textPrimary,
  },
  suggestionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  suggestionsText: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.danger,
  },
});