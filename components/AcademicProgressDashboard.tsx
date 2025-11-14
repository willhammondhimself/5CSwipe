import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';

interface DegreeRequirement {
  id: string;
  category: string;
  name: string;
  requiredCredits: number;
  completedCredits: number;
  courses: {
    completed: Course[];
    inProgress: Course[];
    planned: Course[];
  };
  description?: string;
  deadline?: string;
  priority: 'high' | 'medium' | 'low';
}

interface AcademicProgressDashboardProps {
  visible: boolean;
  onClose: () => void;
  major?: string;
}

const mockDegreeRequirements: DegreeRequirement[] = [
  {
    id: 'core-cs',
    category: 'Major Requirements',
    name: 'Computer Science Core',
    requiredCredits: 32,
    completedCredits: 24,
    courses: {
      completed: [],
      inProgress: [],
      planned: [],
    },
    description: 'Foundational CS courses including algorithms, data structures, and systems',
    priority: 'high',
  },
  {
    id: 'math-req',
    category: 'Major Requirements',
    name: 'Mathematics Requirements',
    requiredCredits: 16,
    completedCredits: 12,
    courses: {
      completed: [],
      inProgress: [],
      planned: [],
    },
    description: 'Calculus, discrete math, and statistics',
    priority: 'high',
  },
  {
    id: 'stem-dist',
    category: 'Distribution Requirements',
    name: 'STEM Distribution',
    requiredCredits: 12,
    completedCredits: 8,
    courses: {
      completed: [],
      inProgress: [],
      planned: [],
    },
    description: 'Natural sciences and additional mathematics',
    priority: 'medium',
  },
  {
    id: 'humanities',
    category: 'Distribution Requirements',
    name: 'Humanities & Social Sciences',
    requiredCredits: 24,
    completedCredits: 16,
    courses: {
      completed: [],
      inProgress: [],
      planned: [],
    },
    description: 'Liberal arts breadth requirements',
    priority: 'medium',
  },
  {
    id: 'writing',
    category: 'General Requirements',
    name: 'Writing Requirements',
    requiredCredits: 8,
    completedCredits: 4,
    courses: {
      completed: [],
      inProgress: [],
      planned: [],
    },
    description: 'Academic and professional writing courses',
    deadline: 'Before Senior Year',
    priority: 'high',
  },
  {
    id: 'pe-wellness',
    category: 'General Requirements',
    name: 'PE & Wellness',
    requiredCredits: 4,
    completedCredits: 2,
    courses: {
      completed: [],
      inProgress: [],
      planned: [],
    },
    description: 'Physical education and wellness courses',
    priority: 'low',
  },
];

export default function AcademicProgressDashboard({
  visible,
  onClose,
  major = 'Computer Science',
}: AcademicProgressDashboardProps) {
  const { activePlan } = useScheduleVariants();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Calculate overall progress
  const progressStats = useMemo(() => {
    const totalRequired = mockDegreeRequirements.reduce((sum, req) => sum + req.requiredCredits, 0);
    const totalCompleted = mockDegreeRequirements.reduce((sum, req) => sum + req.completedCredits, 0);
    const totalInProgress = activePlan?.courses.reduce((sum, course) => sum + course.credits, 0) || 0;
    
    const completionPercentage = (totalCompleted / totalRequired) * 100;
    const remainingCredits = totalRequired - totalCompleted;
    
    const categories = Array.from(new Set(mockDegreeRequirements.map(req => req.category)));
    
    return {
      totalRequired,
      totalCompleted,
      totalInProgress,
      completionPercentage,
      remainingCredits,
      categories,
    };
  }, [activePlan]);

  const filteredRequirements = useMemo(() => {
    if (selectedCategory === 'all') return mockDegreeRequirements;
    return mockDegreeRequirements.filter(req => req.category === selectedCategory);
  }, [selectedCategory]);

  const getRequirementStatus = (req: DegreeRequirement) => {
    const percentage = (req.completedCredits / req.requiredCredits) * 100;
    if (percentage >= 100) return 'completed';
    if (percentage >= 75) return 'on-track';
    if (percentage >= 50) return 'behind';
    return 'at-risk';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return SwipeColors.success;
      case 'on-track': return SwipeColors.accentBlue;
      case 'behind': return SwipeColors.warning;
      case 'at-risk': return SwipeColors.danger;
      default: return SwipeColors.textTertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircleIcon;
      case 'on-track': return ChartBarIcon;
      case 'behind': return ClockIcon;
      case 'at-risk': return ExclamationTriangleIcon;
      default: return BookOpenIcon;
    }
  };

  const ProgressHeader = () => (
    <View style={styles.progressHeader}>
      <View style={styles.progressStats}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{Math.round(progressStats.completionPercentage)}%</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{progressStats.totalCompleted}</Text>
          <Text style={styles.statLabel}>Credits Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{progressStats.remainingCredits}</Text>
          <Text style={styles.statLabel}>Remaining</Text>
        </View>
      </View>

      <LinearGradient
        colors={['rgba(0, 122, 255, 0.1)', 'rgba(0, 122, 255, 0.05)']}
        style={styles.progressBarContainer}
      >
        <LinearGradient
          colors={[SwipeColors.accentBlue, 'rgba(0, 122, 255, 0.8)']}
          style={[
            styles.progressBarFill,
            { width: `${Math.min(progressStats.completionPercentage, 100)}%` }
          ]}
        />
      </LinearGradient>
    </View>
  );

  const CategoryFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
      <TouchableOpacity
        style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}
        onPress={() => setSelectedCategory('all')}
      >
        <Text style={[
          styles.categoryButtonText,
          selectedCategory === 'all' && styles.categoryButtonTextActive
        ]}>
          All Requirements
        </Text>
      </TouchableOpacity>
      {progressStats.categories.map((category) => (
        <TouchableOpacity
          key={category}
          style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={[
            styles.categoryButtonText,
            selectedCategory === category && styles.categoryButtonTextActive
          ]}>
            {category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const RequirementCard = ({ requirement }: { requirement: DegreeRequirement }) => {
    const status = getRequirementStatus(requirement);
    const StatusIcon = getStatusIcon(status);
    const statusColor = getStatusColor(status);
    const percentage = Math.min((requirement.completedCredits / requirement.requiredCredits) * 100, 100);
    const remaining = Math.max(requirement.requiredCredits - requirement.completedCredits, 0);

    return (
      <LinearGradient
        colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
        style={styles.requirementCard}
      >
        <View style={styles.requirementHeader}>
          <View style={styles.requirementTitleContainer}>
            <Text style={styles.requirementName}>{requirement.name}</Text>
            <Text style={styles.requirementDescription}>{requirement.description}</Text>
            {requirement.deadline && (
              <View style={styles.deadlineContainer}>
                <CalendarDaysIcon size={12} color={SwipeColors.warning} />
                <Text style={styles.deadlineText}>{requirement.deadline}</Text>
              </View>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
              <StatusIcon size={14} color={statusColor} />
            </View>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>
              {requirement.completedCredits} of {requirement.requiredCredits} credits
            </Text>
            <Text style={[styles.progressPercent, { color: statusColor }]}>
              {Math.round(percentage)}%
            </Text>
          </View>
          
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${percentage}%`,
                  backgroundColor: statusColor,
                }
              ]}
            />
          </View>

          {remaining > 0 && (
            <Text style={styles.remainingText}>
              {remaining} credits remaining
            </Text>
          )}
        </View>

        {requirement.priority === 'high' && remaining > 0 && (
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityText}>High Priority</Text>
          </View>
        )}
      </LinearGradient>
    );
  };

  const GraduationProjection = () => {
    // Simple projection based on current rate
    const creditsPerSemester = activePlan?.courses.reduce((sum, course) => sum + course.credits, 0) || 15;
    const remainingSemesters = Math.ceil(progressStats.remainingCredits / creditsPerSemester);
    const currentYear = new Date().getFullYear();
    const projectedGradYear = currentYear + Math.ceil(remainingSemesters / 2);

    return (
      <LinearGradient
        colors={['rgba(52, 199, 89, 0.1)', 'rgba(52, 199, 89, 0.05)']}
        style={styles.projectionCard}
      >
        <View style={styles.projectionHeader}>
          <AcademicCapIcon size={20} color={SwipeColors.success} />
          <Text style={styles.projectionTitle}>Graduation Projection</Text>
        </View>
        <Text style={styles.projectionYear}>{projectedGradYear}</Text>
        <Text style={styles.projectionDetails}>
          Based on {creditsPerSemester} credits per semester
        </Text>
        <Text style={styles.projectionNote}>
          {remainingSemesters} semesters remaining
        </Text>
      </LinearGradient>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <XMarkIcon size={24} color={SwipeColors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Academic Progress</Text>
            <Text style={styles.headerSubtitle}>{major} Major</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <ProgressHeader />
          <CategoryFilter />
          
          <View style={styles.requirementsSection}>
            {filteredRequirements.map((requirement) => (
              <RequirementCard key={requirement.id} requirement={requirement} />
            ))}
          </View>

          <GraduationProjection />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 55,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressHeader: {
    marginBottom: 24,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryFilter: {
    marginBottom: 20,
  },
  categoryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryButtonActive: {
    backgroundColor: SwipeColors.accentBlue,
    borderColor: SwipeColors.accentBlue,
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: SwipeColors.textSecondary,
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  requirementsSection: {
    gap: 16,
    marginBottom: 24,
  },
  requirementCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    position: 'relative',
  },
  requirementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requirementTitleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  requirementName: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  requirementDescription: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    lineHeight: 16,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  deadlineText: {
    fontSize: 11,
    color: SwipeColors.warning,
    fontWeight: '500',
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  progressSection: {
    gap: 8,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  remainingText: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    fontStyle: 'italic',
  },
  priorityBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255, 149, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 149, 0, 0.4)',
  },
  priorityText: {
    fontSize: 8,
    fontWeight: '600',
    color: SwipeColors.warning,
    letterSpacing: 0.3,
  },
  projectionCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.2)',
    alignItems: 'center',
    marginBottom: 20,
  },
  projectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  projectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  projectionYear: {
    fontSize: 32,
    fontWeight: '700',
    color: SwipeColors.success,
    marginBottom: 4,
  },
  projectionDetails: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
  },
  projectionNote: {
    fontSize: 11,
    color: SwipeColors.textTertiary,
    marginTop: 4,
  },
});