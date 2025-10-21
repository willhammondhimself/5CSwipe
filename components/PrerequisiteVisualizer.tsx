import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AcademicCapIcon, ArrowRightIcon, ExclamationTriangleIcon } from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';

interface PrerequisiteNode {
  course: Course;
  level: number;
  prerequisites: string[];
  dependents: string[];
}

interface PrerequisiteVisualizerProps {
  courses: Course[];
  selectedCourse?: Course;
}

export default function PrerequisiteVisualizer({
  courses,
  selectedCourse
}: PrerequisiteVisualizerProps) {
  const prerequisiteGraph = useMemo(() => {
    const graph: { [courseCode: string]: PrerequisiteNode } = {};
    const courseMap: { [courseCode: string]: Course } = {};

    // Create course map for quick lookup
    courses.forEach(course => {
      courseMap[course.courseCode] = course;
    });

    // Build prerequisite graph
    courses.forEach(course => {
      if (!graph[course.courseCode]) {
        graph[course.courseCode] = {
          course,
          level: 0,
          prerequisites: [],
          dependents: [],
        };
      }

      // Parse prerequisites
      if (course.prerequisites) {
        const prereqs = course.prerequisites.split(',').map(p => p.trim());
        graph[course.courseCode].prerequisites = prereqs;

        // Add this course as a dependent for each prerequisite
        prereqs.forEach(prereqCode => {
          if (!graph[prereqCode]) {
            // Create a placeholder node for courses not in current schedule
            graph[prereqCode] = {
              course: {
                id: `placeholder-${prereqCode}`,
                courseCode: prereqCode,
                title: 'Not in Current Schedule',
                professor: 'N/A',
                school: '5C' as any,
                department: 'N/A',
                meetingTime: 'N/A',
                location: 'N/A',
                credits: 0,
                description: 'This prerequisite course is not currently in your schedule',
                enrollmentCap: 0,
                enrollmentCurrent: 0,
                semester: 'Spring 2025' as any,
                meetingDays: [],
                startTime: '00:00',
                endTime: '00:00',
                lastUpdated: new Date().toISOString(),
                courseLevel: 'Introductory' as any,
                instructionMethod: 'In-Person' as any,
                gradeType: 'Letter' as any,
              },
              level: 0,
              prerequisites: [],
              dependents: [],
            };
          }
          graph[prereqCode].dependents.push(course.courseCode);
        });
      }
    });

    // Calculate levels (breadth-first search from selected course or all courses)
    const calculateLevels = (startCourse?: Course) => {
      const visited = new Set<string>();
      const queue: { courseCode: string; level: number }[] = [];

      if (startCourse) {
        queue.push({ courseCode: startCourse.courseCode, level: 0 });
      } else {
        // Start from courses with no prerequisites
        Object.keys(graph).forEach(courseCode => {
          if (graph[courseCode].prerequisites.length === 0) {
            queue.push({ courseCode, level: 0 });
          }
        });
      }

      while (queue.length > 0) {
        const { courseCode, level } = queue.shift()!;
        if (visited.has(courseCode)) continue;

        visited.add(courseCode);
        graph[courseCode].level = level;

        // Add dependents to queue
        graph[courseCode].dependents.forEach(dependentCode => {
          if (!visited.has(dependentCode)) {
            queue.push({ courseCode: dependentCode, level: level + 1 });
          }
        });
      }
    };

    if (selectedCourse) {
      calculateLevels(selectedCourse);
    } else {
      calculateLevels();
    }

    return graph;
  }, [courses, selectedCourse]);

  const maxLevel = Math.max(...Object.values(prerequisiteGraph).map(node => node.level));
  const levels = Array.from({ length: maxLevel + 1 }, (_, i) => i);

  const CourseNode = ({ node }: { node: PrerequisiteNode }) => (
    <LinearGradient
      colors={
        node.course.id.startsWith('placeholder')
          ? [SwipeColors.danger, `${SwipeColors.danger}CC`]
          : [SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]
      }
      style={[
        styles.courseNode,
        selectedCourse?.courseCode === node.course.courseCode && styles.selectedNode
      ]}
    >
      <View style={styles.nodeHeader}>
        <Text style={styles.courseCode}>{node.course.courseCode}</Text>
        {node.course.id.startsWith('placeholder') && (
          <ExclamationTriangleIcon size={16} color={SwipeColors.danger} />
        )}
      </View>
      <Text style={styles.courseTitle} numberOfLines={2}>
        {node.course.title}
      </Text>
      <Text style={styles.courseDetails}>
        {node.course.credits > 0 ? `${node.course.credits} credits` : 'Not scheduled'}
      </Text>
    </LinearGradient>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <AcademicCapIcon size={24} color={SwipeColors.accentBlue} />
        <Text style={styles.title}>
          {selectedCourse ? `Prerequisites for ${selectedCourse.courseCode}` : 'Course Dependencies'}
        </Text>
      </View>

      <Text style={styles.subtitle}>
        {selectedCourse
          ? 'Visual map of prerequisite relationships'
          : 'Overview of course dependencies in your schedule'
        }
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.flowContainer}
      >
        <View style={styles.flow}>
          {levels.map(level => (
            <View key={level} style={styles.level}>
              <Text style={styles.levelLabel}>
                Level {level + 1}
              </Text>
              <View style={styles.levelCourses}>
                {Object.values(prerequisiteGraph)
                  .filter(node => node.level === level)
                  .map(node => (
                    <View key={node.course.courseCode} style={styles.nodeContainer}>
                      <CourseNode node={node} />
                      {node.dependents.length > 0 && (
                        <View style={styles.arrow}>
                          <ArrowRightIcon size={16} color={SwipeColors.textTertiary} />
                        </View>
                      )}
                    </View>
                  ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: SwipeColors.accentBlue }]} />
          <Text style={styles.legendText}>In Schedule</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: SwipeColors.danger }]} />
          <Text style={styles.legendText}>Missing Prerequisite</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    marginBottom: 24,
    lineHeight: 20,
  },
  flowContainer: {
    marginBottom: 24,
  },
  flow: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  level: {
    alignItems: 'center',
    marginRight: 20,
    minWidth: 200,
  },
  levelLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: SwipeColors.textTertiary,
    marginBottom: 12,
    textAlign: 'center',
  },
  levelCourses: {
    alignItems: 'center',
  },
  nodeContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  courseNode: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 160,
    maxWidth: 200,
  },
  selectedNode: {
    borderColor: SwipeColors.accentBlue,
    borderWidth: 2,
  },
  nodeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  courseTitle: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    marginBottom: 4,
    lineHeight: 16,
  },
  courseDetails: {
    fontSize: 10,
    color: SwipeColors.textTertiary,
  },
  arrow: {
    marginTop: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
  },
});
