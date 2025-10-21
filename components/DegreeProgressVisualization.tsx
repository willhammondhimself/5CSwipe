import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AcademicCapIcon,
  BookOpenIcon,
  SparklesIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarDaysIcon,
} from 'react-native-heroicons/outline';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { DegreeRequirement, AcademicProfile } from '@/data/academicData';

const { width: screenWidth } = Dimensions.get('window');

interface DegreeProgressVisualizationProps {
  profile: AcademicProfile;
  onRequirementPress?: (requirement: DegreeRequirement) => void;
}

interface ProgressBarProps {
  requirement: DegreeRequirement;
  index: number;
  onPress?: () => void;
}

const CategoryIcons = {
  major: AcademicCapIcon,
  general_education: BookOpenIcon,
  minor: SparklesIcon,
  elective: ClockIcon,
};

const CategoryColors = {
  major: SwipeColors.accentBlue,
  general_education: SwipeColors.success,
  minor: SwipeColors.warning,
  elective: SwipeColors.textSecondary,
};

const ProgressBar: React.FC<ProgressBarProps> = ({ requirement, index, onPress }) => {
  const progressValue = useSharedValue(0);
  const scaleValue = useSharedValue(0.95);
  
  const progress = requirement.requiredCredits > 0 
    ? Math.min(requirement.completedCredits / requirement.requiredCredits, 1)
    : 0;
    
  const isCompleted = progress >= 1;
  const categoryColor = CategoryColors[requirement.category];
  const IconComponent = CategoryIcons[requirement.category];

  React.useEffect(() => {
    progressValue.value = withDelay(
      index * 100,
      withSpring(progress, { damping: 15, stiffness: 100 })
    );
    scaleValue.value = withDelay(
      index * 100,
      withSpring(1, { damping: 20, stiffness: 300 })
    );
  }, [progress, index]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value * 100}%`,
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <Animated.View style={[animatedContainerStyle]}>
      <TouchableOpacity
        style={styles.requirementCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.requirementHeader}>
            <View style={styles.requirementTitleSection}>
              <View style={[styles.iconContainer, { backgroundColor: `${categoryColor}20` }]}>
                <IconComponent size={20} color={categoryColor} />
              </View>
              <View style={styles.requirementInfo}>
                <Text style={styles.requirementName}>{requirement.name}</Text>
                <Text style={styles.requirementDescription} numberOfLines={2}>
                  {requirement.description}
                </Text>
              </View>
            </View>
            {isCompleted && (
              <View style={styles.completedBadge}>
                <CheckCircleIcon size={16} color={SwipeColors.success} />
              </View>
            )}
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressInfo}>
              <Text style={styles.creditsText}>
                {requirement.completedCredits} / {requirement.requiredCredits} credits
              </Text>
              <Text style={[styles.percentageText, { color: categoryColor }]}>
                {Math.round(progress * 100)}%
              </Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBarBackground, { backgroundColor: `${categoryColor}15` }]} />
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: categoryColor },
                  animatedProgressStyle,
                ]}
              />
              {progress > 0 && progress < 1 && (
                <View style={[styles.progressIndicator, { left: `${Math.max(progress * 100 - 1, 0)}%` }]}>
                  <View style={[styles.progressDot, { backgroundColor: categoryColor }]} />
                </View>
              )}
            </View>

            {requirement.courses.length > 0 && (
              <View style={styles.coursesInfo}>
                <Text style={styles.coursesText}>
                  {requirement.courses.length} course{requirement.courses.length !== 1 ? 's' : ''} required
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DegreeProgressVisualization({
  profile,
  onRequirementPress,
}: DegreeProgressVisualizationProps) {
  const overallProgress = React.useMemo(() => {
    const totalRequired = profile.requirements.reduce((sum, req) => sum + req.requiredCredits, 0);
    const totalCompleted = profile.requirements.reduce((sum, req) => sum + req.completedCredits, 0);
    return totalRequired > 0 ? totalCompleted / totalRequired : 0;
  }, [profile.requirements]);

  const creditsToGraduation = React.useMemo(() => {
    return profile.requirements.reduce((sum, req) => sum + Math.max(0, req.requiredCredits - req.completedCredits), 0);
  }, [profile.requirements]);

  const estimatedSemesters = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const semestersLeft = (profile.graduationYear - currentYear) * 2;
    return Math.max(1, semestersLeft);
  }, [profile.graduationYear]);

  const completedRequirements = profile.requirements.filter(req => 
    req.requiredCredits > 0 && req.completedCredits >= req.requiredCredits
  ).length;

  return (
    <View style={styles.container}>
      {/* Overall Progress Header */}
      <LinearGradient
        colors={[SwipeColors.accentBlue, '#0056b3']}
        style={styles.overallProgressCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.overallProgressHeader}>
          <View style={styles.progressTitleSection}>
            <Text style={styles.overallProgressTitle}>Degree Progress</Text>
            <Text style={styles.overallProgressSubtitle}>
              {profile.major?.name || 'No Major Selected'}
              {profile.minor && ` • ${profile.minor.name} Minor`}
            </Text>
          </View>
          <View style={styles.percentageCircle}>
            <Text style={styles.percentageNumber}>{Math.round(overallProgress * 100)}</Text>
            <Text style={styles.percentageSymbol}>%</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{completedRequirements}</Text>
            <Text style={styles.statLabel}>completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{creditsToGraduation}</Text>
            <Text style={styles.statLabel}>credits left</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{estimatedSemesters}</Text>
            <Text style={styles.statLabel}>semesters</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Individual Requirements */}
      <View style={styles.requirementsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Requirements Progress</Text>
          <Text style={styles.sectionSubtitle}>
            {completedRequirements} of {profile.requirements.length} completed
          </Text>
        </View>

        {profile.requirements.length > 0 ? (
          <View style={styles.requirementsList}>
            {profile.requirements.map((requirement, index) => (
              <ProgressBar
                key={requirement.id}
                requirement={requirement}
                index={index}
                onPress={() => onRequirementPress?.(requirement)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <CalendarDaysIcon size={48} color={SwipeColors.textTertiary} />
            <Text style={styles.emptyStateTitle}>No Requirements Set</Text>
            <Text style={styles.emptyStateText}>
              Select a major in your profile to see degree requirements
            </Text>
          </View>
        )}
      </View>

      {profile.major && creditsToGraduation > 0 && (
        <View style={styles.actionCard}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.actionGradient}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIcon}>
                <SparklesIcon size={24} color={SwipeColors.warning} />
              </View>
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Keep Going!</Text>
                <Text style={styles.actionSubtitle}>
                  You need {creditsToGraduation} more credits to complete your degree
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  overallProgressCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  overallProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  progressTitleSection: {
    flex: 1,
  },
  overallProgressTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  overallProgressSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  percentageCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  percentageNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  percentageSymbol: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requirementsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
  },
  requirementsList: {
    gap: 12,
  },
  requirementCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  cardGradient: {
    padding: 16,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requirementTitleSection: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  requirementDescription: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    lineHeight: 16,
  },
  completedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  progressSection: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsText: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    fontWeight: '500',
  },
  percentageText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarContainer: {
    position: 'relative',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  progressIndicator: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  coursesInfo: {
    marginTop: 4,
  },
  coursesText: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  actionGradient: {
    padding: 16,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
});