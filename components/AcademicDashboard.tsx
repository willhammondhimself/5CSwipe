import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AcademicCapIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XMarkIcon,
  TrophyIcon,
  FireIcon
} from 'react-native-heroicons/outline';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SwipeColors } from '@/contexts/constants/Colors';
import { AcademicTracker, RequirementAnalysis } from '@/utils/academicTracker';
import { AcademicProfile } from '@/data/academicData';
import { Course } from '@/data/mockCourses';

const { width: screenWidth } = Dimensions.get('window');

interface AcademicDashboardProps {
  isVisible: boolean;
  onClose: () => void;
  profile: AcademicProfile;
  completedCourses?: any[];
  inProgressCourses?: Course[];
  availableCourses?: Course[];
}

export default function AcademicDashboard({
  isVisible,
  onClose,
  profile,
  completedCourses = [],
  inProgressCourses = [],
  availableCourses = [],
}: AcademicDashboardProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'requirements' | 'plan'>('overview');
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

  // Initialize academic tracker
  const academicTracker = useMemo(() => {
    return new AcademicTracker(profile, completedCourses, inProgressCourses);
  }, [profile, completedCourses, inProgressCourses]);

  const requirementAnalyses = useMemo(() => {
    return academicTracker.analyzeRequirements(availableCourses);
  }, [academicTracker, availableCourses]);

  const graduationAnalysis = useMemo(() => {
    return academicTracker.analyzeGraduation();
  }, [academicTracker]);

  const animatedModalStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isVisible) return null;

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Graduation Status Card */}
      <LinearGradient
        colors={graduationAnalysis.onTrack ? 
          ['rgba(52, 199, 89, 0.15)', 'rgba(52, 199, 89, 0.05)'] :
          ['rgba(255, 59, 48, 0.15)', 'rgba(255, 59, 48, 0.05)']
        }
        style={styles.overviewCard}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            {graduationAnalysis.onTrack ? (
              <TrophyIcon width={24} height={24} color={SwipeColors.success} />
            ) : (
              <ExclamationTriangleIcon width={24} height={24} color={SwipeColors.danger} />
            )}
            <Text style={styles.cardTitle}>
              {graduationAnalysis.onTrack ? 'On Track to Graduate!' : 'Graduation at Risk'}
            </Text>
          </View>
          <Text style={styles.graduationDate}>
            Estimated: {graduationAnalysis.estimatedGraduation}
          </Text>
        </View>
        
        {graduationAnalysis.creditsNeeded > 0 && (
          <View style={styles.creditsRemaining}>
            <Text style={styles.creditsText}>
              {graduationAnalysis.creditsNeeded} credits remaining
            </Text>
            <Text style={styles.creditsSubtext}>
              ~{graduationAnalysis.averageCreditsPerSemester.toFixed(1)} credits per semester
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <AcademicCapIcon width={20} height={20} color={SwipeColors.accentBlue} />
          <Text style={styles.statValue}>{profile.major?.name || 'Undeclared'}</Text>
          <Text style={styles.statLabel}>Major</Text>
        </View>
        
        <View style={styles.statCard}>
          <ChartBarIcon width={20} height={20} color={SwipeColors.success} />
          <Text style={styles.statValue}>
            {Math.round((requirementAnalyses.reduce((sum, req) => sum + req.completedCredits, 0) / 
                        requirementAnalyses.reduce((sum, req) => sum + req.requiredCredits, 0)) * 100) || 0}%
          </Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        
        <View style={styles.statCard}>
          <CalendarDaysIcon width={20} height={20} color={SwipeColors.textSecondary} />
          <Text style={styles.statValue}>{graduationAnalysis.semestersRemaining}</Text>
          <Text style={styles.statLabel}>Semesters Left</Text>
        </View>
      </View>

      {/* Warnings & Recommendations */}
      {graduationAnalysis.warnings.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <ExclamationTriangleIcon width={20} height={20} color={SwipeColors.danger} />
            <Text style={styles.sectionTitle}>Warnings</Text>
          </View>
          {graduationAnalysis.warnings.map((warning, index) => (
            <View key={index} style={[styles.alertItem, styles.warningAlert]}>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </View>
      )}

      {graduationAnalysis.recommendations.length > 0 && (
        <View style={styles.alertsSection}>
          <View style={styles.sectionHeader}>
            <FireIcon width={20} height={20} color={SwipeColors.accentBlue} />
            <Text style={styles.sectionTitle}>Recommendations</Text>
          </View>
          {graduationAnalysis.recommendations.map((rec, index) => (
            <View key={index} style={[styles.alertItem, styles.recommendationAlert]}>
              <Text style={styles.recommendationText}>{rec}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Critical Requirements */}
      {graduationAnalysis.criticalRequirements.length > 0 && (
        <View style={styles.criticalSection}>
          <View style={styles.sectionHeader}>
            <ExclamationTriangleIcon width={20} height={20} color={SwipeColors.danger} />
            <Text style={styles.sectionTitle}>Critical Requirements</Text>
          </View>
          {graduationAnalysis.criticalRequirements.map((req) => (
            <RequirementProgressCard key={req.requirementId} requirement={req} compact />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderRequirements = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {requirementAnalyses.map((requirement) => (
        <RequirementProgressCard 
          key={requirement.requirementId} 
          requirement={requirement} 
        />
      ))}
    </ScrollView>
  );

  const renderPlan = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.planningSection}>
        <Text style={styles.sectionTitle}>Academic Planning (Coming Soon)</Text>
        <Text style={styles.planningText}>
          Multi-semester course planning with prerequisite tracking and schedule optimization will be available in the next update.
        </Text>
      </View>
    </ScrollView>
  );

  return (
    <Modal visible={isVisible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
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
                    <Text style={styles.modalTitle}>Academic Dashboard</Text>
                    <Text style={styles.modalSubtitle}>Track your degree progress</Text>
                  </View>
                  <TouchableOpacity onPress={onClose}>
                    <XMarkIcon width={24} height={24} color={SwipeColors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Tab Navigation */}
                <View style={styles.tabNavigation}>
                  {[
                    { key: 'overview', label: 'Overview' },
                    { key: 'requirements', label: 'Requirements' },
                    { key: 'plan', label: 'Planning' },
                  ].map((tab) => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.tabButton,
                        selectedTab === tab.key && styles.activeTabButton,
                      ]}
                      onPress={() => setSelectedTab(tab.key as any)}
                    >
                      <Text style={[
                        styles.tabButtonText,
                        selectedTab === tab.key && styles.activeTabButtonText,
                      ]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Tab Content */}
                <View style={styles.tabContentContainer}>
                  {selectedTab === 'overview' && renderOverview()}
                  {selectedTab === 'requirements' && renderRequirements()}
                  {selectedTab === 'plan' && renderPlan()}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </BlurView>
      </TouchableOpacity>
    </Modal>
  );
}

// Requirement Progress Card Component
const RequirementProgressCard = ({ requirement, compact = false }: { 
  requirement: RequirementAnalysis; 
  compact?: boolean;
}) => {
  const getStatusColor = () => {
    switch (requirement.status) {
      case 'completed': return SwipeColors.success;
      case 'in_progress': return SwipeColors.accentBlue;
      case 'over_fulfilled': return SwipeColors.success;
      default: return SwipeColors.textTertiary;
    }
  };

  const getStatusIcon = () => {
    switch (requirement.status) {
      case 'completed': 
        return <CheckCircleIcon width={16} height={16} color={SwipeColors.success} />;
      case 'in_progress': 
        return <ClockIcon width={16} height={16} color={SwipeColors.accentBlue} />;
      default: 
        return <ExclamationTriangleIcon width={16} height={16} color={SwipeColors.textTertiary} />;
    }
  };

  return (
    <LinearGradient
      colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
      style={[styles.requirementCard, compact && styles.compactCard]}
    >
      <View style={styles.requirementHeader}>
        <View style={styles.requirementTitleRow}>
          {getStatusIcon()}
          <Text style={styles.requirementName}>{requirement.name}</Text>
        </View>
        <Text style={styles.requirementCredits}>
          {requirement.completedCredits}/{requirement.requiredCredits} credits
        </Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { 
                width: `${Math.min(requirement.progress * 100, 100)}%`,
                backgroundColor: getStatusColor()
              }
            ]}
          />
        </View>
        <Text style={styles.progressPercentage}>
          {Math.round(requirement.progress * 100)}%
        </Text>
      </View>

      {!compact && (
        <View style={styles.requirementDetails}>
          {requirement.inProgressCredits > 0 && (
            <Text style={styles.detailText}>
              {requirement.inProgressCredits} credits in progress
            </Text>
          )}
          {requirement.remainingCredits > 0 && (
            <Text style={styles.detailText}>
              {requirement.remainingCredits} credits remaining
            </Text>
          )}
          {requirement.estimatedCompletion && (
            <Text style={styles.detailText}>
              Est. completion: {requirement.estimatedCompletion}
            </Text>
          )}
        </View>
      )}
    </LinearGradient>
  );
};

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
    width: screenWidth * 0.95,
    maxHeight: '90%',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: SwipeColors.accentBlue,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  activeTabButtonText: {
    color: '#FFFFFF',
  },
  tabContentContainer: {
    height: 400,
  },
  tabContent: {
    flex: 1,
  },
  overviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  graduationDate: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  creditsRemaining: {
    marginTop: 8,
  },
  creditsText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  creditsSubtext: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginVertical: 8,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
  },
  alertsSection: {
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
  },
  alertItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  warningAlert: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  recommendationAlert: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: 'rgba(0, 122, 255, 0.3)',
  },
  warningText: {
    fontSize: 14,
    color: SwipeColors.danger,
    fontWeight: '500',
  },
  recommendationText: {
    fontSize: 14,
    color: SwipeColors.accentBlue,
    fontWeight: '500',
  },
  criticalSection: {
    marginBottom: 20,
  },
  requirementCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  compactCard: {
    padding: 12,
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requirementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  requirementName: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    flex: 1,
  },
  requirementCredits: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    minWidth: 35,
    textAlign: 'right',
  },
  requirementDetails: {
    marginTop: 8,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  planningSection: {
    padding: 20,
    alignItems: 'center',
  },
  planningText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 12,
  },
});