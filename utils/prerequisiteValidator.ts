import { Course } from '@/data/mockCourses';

export interface PrerequisiteValidationResult {
  isValid: boolean;
  missingPrerequisites: string[];
  warnings: string[];
  recommendations: string[];
}

export interface PrerequisiteNode {
  courseCode: string;
  operator: 'AND' | 'OR' | 'NONE';
  alternatives: string[];
  isOptional: boolean;
}

export class PrerequisiteValidator {
  private static parsePrerequisites(prerequisitesString: string): PrerequisiteNode[] {
    if (!prerequisitesString) return [];

    const nodes: PrerequisiteNode[] = [];
    
    // Clean and normalize the string
    const cleaned = prerequisitesString
      .replace(/\s+/g, ' ')
      .replace(/[()]/g, '')
      .trim();

    // Split by common delimiters
    const parts = cleaned.split(/(?:,|;|\band\b|\bor\b)/i);
    
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Check if it's an alternative (contains "or")
      const alternatives = trimmed.split(/\bor\b/i).map(alt => alt.trim());
      
      if (alternatives.length > 1) {
        // Multiple alternatives (OR condition)
        const mainCourse = this.extractCourseCode(alternatives[0]);
        const altCourses = alternatives.slice(1).map(alt => this.extractCourseCode(alt)).filter(Boolean);
        
        if (mainCourse) {
          nodes.push({
            courseCode: mainCourse,
            operator: 'OR',
            alternatives: altCourses,
            isOptional: trimmed.toLowerCase().includes('recommended') || trimmed.toLowerCase().includes('suggested')
          });
        }
      } else {
        // Single requirement
        const courseCode = this.extractCourseCode(trimmed);
        if (courseCode) {
          nodes.push({
            courseCode,
            operator: 'AND',
            alternatives: [],
            isOptional: trimmed.toLowerCase().includes('recommended') || trimmed.toLowerCase().includes('suggested')
          });
        }
      }
    }

    return nodes;
  }

  private static extractCourseCode(text: string): string {
    // Match patterns like "CSCI 121", "MATH 19", "ECON 50"
    const match = text.match(/([A-Z]{2,5})\s*(\d{1,3}[A-Z]*)/i);
    return match ? `${match[1].toUpperCase()} ${match[2]}` : '';
  }

  public static validatePrerequisites(
    course: Course,
    completedCourses: Course[],
    currentSchedule: Course[] = []
  ): PrerequisiteValidationResult {
    const result: PrerequisiteValidationResult = {
      isValid: true,
      missingPrerequisites: [],
      warnings: [],
      recommendations: []
    };

    if (!course.prerequisites) {
      return result; // No prerequisites, always valid
    }

    const prerequisiteNodes = this.parsePrerequisites(course.prerequisites);
    const allCompletedCodes = new Set([
      ...completedCourses.map(c => c.courseCode),
      ...currentSchedule.map(c => c.courseCode)
    ]);

    for (const node of prerequisiteNodes) {
      const hasMainPrereq = allCompletedCodes.has(node.courseCode);
      const hasAlternative = node.alternatives.some(alt => allCompletedCodes.has(alt));
      
      if (node.operator === 'OR') {
        // Need main course OR one of the alternatives
        if (!hasMainPrereq && !hasAlternative) {
          if (node.isOptional) {
            result.recommendations.push(
              `Recommended: ${node.courseCode}${
                node.alternatives.length > 0 
                  ? ` or ${node.alternatives.join(' or ')}` 
                  : ''
              }`
            );
          } else {
            result.isValid = false;
            result.missingPrerequisites.push(
              `${node.courseCode}${
                node.alternatives.length > 0 
                  ? ` or ${node.alternatives.join(' or ')}` 
                  : ''
              }`
            );
          }
        }
      } else {
        // Need the specific course (AND condition)
        if (!hasMainPrereq) {
          if (node.isOptional) {
            result.recommendations.push(`Recommended: ${node.courseCode}`);
          } else {
            result.isValid = false;
            result.missingPrerequisites.push(node.courseCode);
          }
        }
      }
    }

    // Add warnings for challenging courses without prerequisites
    if (course.courseLevel === 'Advanced' || course.courseLevel === 'Graduate') {
      if (completedCourses.length === 0) {
        result.warnings.push(
          `This is an ${course.courseLevel.toLowerCase()} course. Consider taking introductory courses first.`
        );
      }
    }

    // Check for course level progression
    const currentLevel = this.getCourseLevel(course.courseCode);
    if (currentLevel > 100) {
      const hasIntroductory = completedCourses.some(c => 
        c.department === course.department && this.getCourseLevel(c.courseCode) < 100
      );
      
      if (!hasIntroductory && result.isValid) {
        result.warnings.push(
          `Consider taking an introductory ${course.department} course before this intermediate/advanced course.`
        );
      }
    }

    return result;
  }

  private static getCourseLevel(courseCode: string): number {
    const match = courseCode.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  public static getPrerequisiteChain(
    targetCourse: Course,
    allCourses: Course[]
  ): Course[] {
    const chain: Course[] = [];
    const visited = new Set<string>();
    
    const buildChain = (course: Course) => {
      if (visited.has(course.courseCode) || !course.prerequisites) {
        return;
      }
      
      visited.add(course.courseCode);
      const nodes = this.parsePrerequisites(course.prerequisites);
      
      for (const node of nodes) {
        const prereqCourse = allCourses.find(c => c.courseCode === node.courseCode);
        if (prereqCourse) {
          buildChain(prereqCourse);
          if (!chain.some(c => c.courseCode === prereqCourse.courseCode)) {
            chain.push(prereqCourse);
          }
        }
        
        // Check alternatives
        for (const altCode of node.alternatives) {
          const altCourse = allCourses.find(c => c.courseCode === altCode);
          if (altCourse && !chain.some(c => c.courseCode === altCourse.courseCode)) {
            buildChain(altCourse);
            chain.push(altCourse);
          }
        }
      }
    };
    
    buildChain(targetCourse);
    return chain;
  }

  public static suggestPrerequisiteCourses(
    missingPrerequisites: string[],
    allCourses: Course[]
  ): Course[] {
    const suggestions: Course[] = [];
    
    for (const prereqCode of missingPrerequisites) {
      // Handle OR conditions (e.g., "MATH 19 or MATH 20")
      const alternatives = prereqCode.split(' or ').map(alt => alt.trim());
      
      for (const altCode of alternatives) {
        const course = allCourses.find(c => c.courseCode === altCode);
        if (course && !suggestions.some(s => s.courseCode === course.courseCode)) {
          suggestions.push(course);
        }
      }
    }
    
    return suggestions.sort((a, b) => {
      // Sort by course level (lower level courses first)
      const levelA = this.getCourseLevel(a.courseCode);
      const levelB = this.getCourseLevel(b.courseCode);
      return levelA - levelB;
    });
  }

  public static checkSequenceValidity(courses: Course[]): {
    isValid: boolean;
    conflicts: Array<{
      course: Course;
      missingPrerequisites: string[];
    }>;
  } {
    const result = {
      isValid: true,
      conflicts: [] as Array<{ course: Course; missingPrerequisites: string[] }>
    };

    // Sort courses by level to check prerequisites in order
    const sortedCourses = [...courses].sort((a, b) => 
      this.getCourseLevel(a.courseCode) - this.getCourseLevel(b.courseCode)
    );

    for (let i = 0; i < sortedCourses.length; i++) {
      const course = sortedCourses[i];
      const previousCourses = sortedCourses.slice(0, i);
      
      const validation = this.validatePrerequisites(course, previousCourses);
      
      if (!validation.isValid) {
        result.isValid = false;
        result.conflicts.push({
          course,
          missingPrerequisites: validation.missingPrerequisites
        });
      }
    }

    return result;
  }

  public static generateCoursePlan(
    targetCourses: Course[],
    completedCourses: Course[],
    allCourses: Course[]
  ): {
    orderedCourses: Course[][];
    totalSemesters: number;
    warnings: string[];
  } {
    const plan: Course[][] = [];
    const warnings: string[] = [];
    const remaining = new Set(targetCourses.map(c => c.courseCode));
    const completed = new Set(completedCourses.map(c => c.courseCode));
    
    let semesterIndex = 0;
    const maxSemesters = 8; // Safety limit
    
    while (remaining.size > 0 && semesterIndex < maxSemesters) {
      const semesterCourses: Course[] = [];
      const coursesToRemove: string[] = [];
      
      for (const courseCode of remaining) {
        const course = targetCourses.find(c => c.courseCode === courseCode);
        if (!course) continue;
        
        const validation = this.validatePrerequisites(
          course,
          [...completedCourses, ...plan.flat()],
          semesterCourses
        );
        
        if (validation.isValid && semesterCourses.length < 4) { // Max 4 courses per semester
          semesterCourses.push(course);
          coursesToRemove.push(courseCode);
        }
      }
      
      if (semesterCourses.length === 0) {
        // No courses can be taken, likely due to circular dependencies or missing prerequisites
        warnings.push(
          `Unable to schedule remaining courses: ${Array.from(remaining).join(', ')}`
        );
        break;
      }
      
      plan.push(semesterCourses);
      coursesToRemove.forEach(code => remaining.delete(code));
      semesterIndex++;
    }
    
    if (remaining.size > 0) {
      warnings.push(`${remaining.size} courses could not be scheduled due to prerequisite constraints`);
    }
    
    return {
      orderedCourses: plan,
      totalSemesters: plan.length,
      warnings
    };
  }
}

export default PrerequisiteValidator;