import React, { useMemo, useState } from 'react';
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
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  BookOpenIcon,
} from 'react-native-heroicons/outline';
import { Course } from '@/data/mockCourses';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';

interface PrerequisiteNode {
  course: Course;
  prerequisites: PrerequisiteNode[];
  level: number;
  status: 'completed' | 'in-progress' | 'available' | 'locked';
  children?: Course[];
}

interface PrerequisiteChainVisualizationProps {
  visible: boolean;
  onClose: () => void;
  targetCourse: Course;
  allCourses: Course[];
}

// Mock prerequisite relationships - in a real app this would come from course data
const prerequisiteRelationships: { [key: string]: string[] } = {
  'CSCI 121': ['CSCI 60'],
  'CSCI 60': ['MATH 60'],
  'MATH 131': ['MATH 60'],
  'PHIL 077': [],
  'ECON 102': ['ECON 50'],
  'PSYC 109': ['PSYC 51'],
  'CHEM 117': ['CHEM 51', 'PHYS 51', 'MATH 60'],
  'MATH 60': [],
  'ECON 50': [],
  'PSYC 51': [],
  'CHEM 51': [],
  'PHYS 51': ['MATH 60'],
};

// Mock completed courses - would come from user's academic record
const mockCompletedCourses = ['MATH 60', 'CSCI 60', 'ECON 50', 'PSYC 51'];

export default function PrerequisiteChainVisualization({
  visible,
  onClose,
  targetCourse,
  allCourses,
}: PrerequisiteChainVisualizationProps) {
  const { activePlan } = useScheduleVariants();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const findCourseByCode = (courseCode: string): Course | undefined => {
    return allCourses.find(course => course.courseCode === courseCode);
  };

  const getCourseStatus = (courseCode: string): 'completed' | 'in-progress' | 'available' | 'locked' => {
    if (mockCompletedCourses.includes(courseCode)) return 'completed';
    if (activePlan?.courses.some(c => c.courseCode === courseCode)) return 'in-progress';
    
    // Check if prerequisites are met
    const prereqs = prerequisiteRelationships[courseCode] || [];
    const prereqsMet = prereqs.every(prereq => 
      mockCompletedCourses.includes(prereq) || 
      activePlan?.courses.some(c => c.courseCode === prereq)
    );
    
    return prereqsMet ? 'available' : 'locked';
  };

  const buildPrerequisiteTree = (courseCode: string, level: number = 0): PrerequisiteNode | null => {
    const course = findCourseByCode(courseCode);
    if (!course) return null;

    const prereqs = prerequisiteRelationships[courseCode] || [];
    const prerequisiteNodes = prereqs
      .map(prereq => buildPrerequisiteTree(prereq, level + 1))
      .filter((node): node is PrerequisiteNode => node !== null);

    return {
      course,
      prerequisites: prerequisiteNodes,
      level,
      status: getCourseStatus(courseCode),
    };
  };

  const findDependentCourses = (courseCode: string): Course[] => {
    const dependents: Course[] = [];
    
    Object.entries(prerequisiteRelationships).forEach(([course, prereqs]) => {
      if (prereqs.includes(courseCode)) {
        const dependentCourse = findCourseByCode(course);
        if (dependentCourse) {
          dependents.push(dependentCourse);
        }
      }
    });
    
    return dependents;
  };

  const prerequisiteTree = useMemo(() => {
    return buildPrerequisiteTree(targetCourse.courseCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCourse, allCourses]);

  const dependentCourses = useMemo(() => {
    return findDependentCourses(targetCourse.courseCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetCourse.courseCode]);

  const toggleNodeExpansion = (courseCode: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(courseCode)) {
      newExpanded.delete(courseCode);
    } else {
      newExpanded.add(courseCode);
    }
    setExpandedNodes(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return SwipeColors.success;
      case 'in-progress': return SwipeColors.accentBlue;
      case 'available': return SwipeColors.textPrimary;
      case 'locked': return SwipeColors.textTertiary;
      default: return SwipeColors.textTertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return CheckCircleIcon;
      case 'in-progress': return ClockIcon;
      case 'available': return BookOpenIcon;
      case 'locked': return ExclamationTriangleIcon;
      default: return BookOpenIcon;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in-progress': return 'In Progress';
      case 'available': return 'Available';
      case 'locked': return 'Prerequisites Required';
      default: return 'Unknown';
    }
  };

  const PrerequisiteNodeComponent = ({ 
    node, 
    isLast = false, 
    showConnector = true 
  }: { 
    node: PrerequisiteNode; 
    isLast?: boolean;
    showConnector?: boolean;
  }) => {
    const StatusIcon = getStatusIcon(node.status);
    const statusColor = getStatusColor(node.status);
    const hasPrereqs = node.prerequisites.length > 0;
    const isExpanded = expandedNodes.has(node.course.courseCode);

    return (
      <View style={styles.nodeContainer}>
        {showConnector && (
          <View style={styles.connectorContainer}>
            <View style={[styles.connector, !isLast && styles.connectorExtended]} />
            <ArrowRightIcon size={12} color={SwipeColors.textTertiary} />
          </View>
        )}
        
        <TouchableOpacity 
          style={[styles.courseNode, { borderColor: statusColor }]}
          onPress={() => hasPrereqs && toggleNodeExpansion(node.course.courseCode)}
        >
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.nodeGradient}
          >
            <View style={styles.nodeHeader}>
              <View style={styles.nodeInfo}>
                <Text style={[styles.nodeCode, { color: statusColor }]}>
                  {node.course.courseCode}
                </Text>
                <Text style={styles.nodeTitle} numberOfLines={2}>
                  {node.course.title}
                </Text>
              </View>
              
              <View style={styles.nodeActions}>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                  <StatusIcon size={12} color={statusColor} />
                </View>
                {hasPrereqs && (
                  <TouchableOpacity 
                    style={styles.expandButton}
                    onPress={() => toggleNodeExpansion(node.course.courseCode)}
                  >
                    {isExpanded ? (
                      <ChevronDownIcon size={14} color={SwipeColors.textTertiary} />
                    ) : (
                      <ChevronRightIcon size={14} color={SwipeColors.textTertiary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            <Text style={styles.statusText}>
              {getStatusLabel(node.status)}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {hasPrereqs && isExpanded && (
          <View style={styles.prerequisitesContainer}>
            {node.prerequisites.map((prereqNode, index) => (
              <PrerequisiteNodeComponent
                key={prereqNode.course.id}
                node={prereqNode}
                isLast={index === node.prerequisites.length - 1}
                showConnector={true}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const PathwayStats = () => {
    if (!prerequisiteTree) return null;

    const getAllNodes = (node: PrerequisiteNode): PrerequisiteNode[] => {
      return [node, ...node.prerequisites.flatMap(getAllNodes)];
    };

    const allNodes = getAllNodes(prerequisiteTree);
    const stats = {
      total: allNodes.length,
      completed: allNodes.filter(n => n.status === 'completed').length,
      inProgress: allNodes.filter(n => n.status === 'in-progress').length,
      available: allNodes.filter(n => n.status === 'available').length,
      locked: allNodes.filter(n => n.status === 'locked').length,
    };

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Pathway Progress</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${SwipeColors.success}20` }]}>
              <CheckCircleIcon size={16} color={SwipeColors.success} />
            </View>
            <Text style={styles.statValue}>{stats.completed}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${SwipeColors.accentBlue}20` }]}>
              <ClockIcon size={16} color={SwipeColors.accentBlue} />
            </View>
            <Text style={styles.statValue}>{stats.inProgress}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${SwipeColors.textPrimary}20` }]}>
              <BookOpenIcon size={16} color={SwipeColors.textPrimary} />
            </View>
            <Text style={styles.statValue}>{stats.available}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: `${SwipeColors.textTertiary}20` }]}>
              <ExclamationTriangleIcon size={16} color={SwipeColors.textTertiary} />
            </View>
            <Text style={styles.statValue}>{stats.locked}</Text>
            <Text style={styles.statLabel}>Locked</Text>
          </View>
        </View>
      </View>
    );
  };

  const DependentCourses = () => {
    if (dependentCourses.length === 0) return null;

    return (
      <View style={styles.dependentsSection}>
        <Text style={styles.sectionTitle}>Unlocks These Courses</Text>
        <Text style={styles.sectionSubtitle}>
          Completing {targetCourse.courseCode} will make these courses available
        </Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dependentsList}>
          {dependentCourses.map((course) => {
            const status = getCourseStatus(course.courseCode);
            const StatusIcon = getStatusIcon(status);
            const statusColor = getStatusColor(status);
            
            return (
              <LinearGradient
                key={course.id}
                colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
                style={styles.dependentCard}
              >
                <View style={[styles.depStatusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
                  <StatusIcon size={12} color={statusColor} />
                </View>
                
                <Text style={styles.depCourseCode}>{course.courseCode}</Text>
                <Text style={styles.depCourseTitle} numberOfLines={2}>{course.title}</Text>
                
                <Text style={[styles.depStatus, { color: statusColor }]}>
                  {getStatusLabel(status)}
                </Text>
              </LinearGradient>
            );
          })}
        </ScrollView>
      </View>
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
            <Text style={styles.headerTitle}>Course Pathway</Text>
            <Text style={styles.headerSubtitle}>{targetCourse.courseCode}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <PathwayStats />
          
          <View style={styles.treeSection}>
            <Text style={styles.sectionTitle}>Prerequisite Chain</Text>
            <Text style={styles.sectionSubtitle}>
              Follow this pathway to reach {targetCourse.courseCode}
            </Text>
            
            {prerequisiteTree ? (
              <View style={styles.treeContainer}>
                <PrerequisiteNodeComponent 
                  node={prerequisiteTree} 
                  showConnector={false}
                />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No prerequisites found</Text>
              </View>
            )}
          </View>

          <DependentCourses />
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
  statsContainer: {
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: SwipeColors.textTertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  treeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
    lineHeight: 16,
    marginBottom: 16,
  },
  treeContainer: {
    paddingLeft: 10,
  },
  nodeContainer: {
    marginBottom: 8,
  },
  connectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    marginBottom: 4,
  },
  connector: {
    width: 16,
    height: 1,
    backgroundColor: SwipeColors.textTertiary,
    marginRight: 4,
  },
  connectorExtended: {
    height: 24,
    width: 1,
    marginRight: 15,
  },
  courseNode: {
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    marginLeft: 20,
  },
  nodeGradient: {
    padding: 12,
  },
  nodeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nodeInfo: {
    flex: 1,
  },
  nodeCode: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  nodeTitle: {
    fontSize: 11,
    color: SwipeColors.textSecondary,
    lineHeight: 14,
  },
  nodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  expandButton: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    color: SwipeColors.textTertiary,
    fontWeight: '500',
  },
  prerequisitesContainer: {
    marginLeft: 20,
    paddingLeft: 16,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  dependentsSection: {
    marginBottom: 24,
  },
  dependentsList: {
    paddingLeft: 2,
  },
  dependentCard: {
    width: 120,
    height: 120,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    marginRight: 12,
    position: 'relative',
  },
  depStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  depCourseCode: {
    fontSize: 12,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  depCourseTitle: {
    fontSize: 9,
    color: SwipeColors.textSecondary,
    lineHeight: 12,
    flex: 1,
  },
  depStatus: {
    fontSize: 8,
    fontWeight: '500',
    marginTop: 'auto',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
  },
});