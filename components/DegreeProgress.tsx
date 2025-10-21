import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AcademicCapIcon, CheckCircleIcon, ClockIcon } from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { DegreeRequirement } from '@/data/academicData';

interface DegreeProgressProps {
  requirements: DegreeRequirement[];
  totalCredits: number;
  gpa: number;
}

export default function DegreeProgress({
  requirements,
  totalCredits,
  gpa
}: DegreeProgressProps) {
  const overallProgress = requirements.reduce((sum, req) => sum + req.completedCredits, 0) /
                         requirements.reduce((sum, req) => sum + req.requiredCredits, 0);

  const ProgressBar = ({ progress, color = SwipeColors.accentBlue }: { progress: number; color?: string }) => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(progress * 100, 100)}%`,
              backgroundColor: color
            }
          ]}
        />
      </View>
      <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
    </View>
  );

  const RequirementCard = ({ requirement }: { requirement: DegreeRequirement }) => {
    const progress = requirement.completedCredits / requirement.requiredCredits;

    return (
      <LinearGradient
        colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
        style={styles.requirementCard}
      >
        <View style={styles.requirementHeader}>
          <View style={styles.requirementInfo}>
            <Text style={styles.requirementName}>{requirement.name}</Text>
            <Text style={styles.requirementCategory}>
              {requirement.category.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={styles.requirementStatus}>
            {progress >= 1 ? (
              <CheckCircleIcon size={20} color={SwipeColors.success} />
            ) : (
              <ClockIcon size={20} color={SwipeColors.warning} />
            )}
          </View>
        </View>

        <Text style={styles.requirementDescription}>{requirement.description}</Text>

        <View style={styles.requirementProgress}>
          <View style={styles.creditsInfo}>
            <Text style={styles.creditsText}>
              {requirement.completedCredits}/{requirement.requiredCredits} credits
            </Text>
          </View>
          <ProgressBar progress={progress} />
        </View>
      </LinearGradient>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Overall Progress Summary */}
      <LinearGradient
        colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
        style={styles.summaryCard}
      >
        <View style={styles.summaryHeader}>
          <AcademicCapIcon size={24} color={SwipeColors.accentBlue} />
          <Text style={styles.summaryTitle}>Degree Progress</Text>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalCredits}</Text>
            <Text style={styles.statLabel}>Total Credits</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{gpa.toFixed(2)}</Text>
            <Text style={styles.statLabel}>GPA</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{Math.round(overallProgress * 100)}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
        </View>

        <View style={styles.overallProgress}>
          <Text style={styles.overallProgressLabel}>Overall Progress</Text>
          <ProgressBar progress={overallProgress} />
        </View>
      </LinearGradient>

      {/* Requirements Breakdown */}
      <View style={styles.requirementsSection}>
        <Text style={styles.sectionTitle}>Requirements</Text>
        {requirements.map((requirement) => (
          <RequirementCard key={requirement.id} requirement={requirement} />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.accentBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
  },
  overallProgress: {
    marginTop: 8,
  },
  overallProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginBottom: 8,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    minWidth: 35,
  },
  requirementsSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  requirementCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requirementInfo: {
    flex: 1,
  },
  requirementName: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  requirementCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: SwipeColors.textTertiary,
    letterSpacing: 0.5,
  },
  requirementStatus: {
    marginLeft: 12,
  },
  requirementDescription: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  requirementProgress: {
    gap: 8,
  },
  creditsInfo: {
    alignItems: 'flex-end',
  },
  creditsText: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    marginBottom: 4,
  },
});
