/**
 * alternativeSectionService.ts
 * =============================
 * Service for finding alternative course sections when conflicts occur
 *
 * Features:
 * - Find same course, different sections
 * - Find similar courses (same dept/level)
 * - Filter by availability and schedule fit
 */

import { Course } from '@/data/mockCourses';
import { parseMeetingTime, blocksOverlap, courseToBlocks, type CourseBlock } from '@/utils/hyperschedule';

export interface AlternativeOptions {
  excludeFullCourses?: boolean;
  maxResults?: number;
  sameProfessorOnly?: boolean;
}

class AlternativeSectionService {
  /**
   * Find alternative sections for the same course
   * Returns courses with same code but different meeting times
   */
  findAlternativeSections(
    conflictingCourse: Course,
    allCourses: Course[],
    currentSchedule: Course[],
    options: AlternativeOptions = {}
  ): Course[] {
    const {
      excludeFullCourses = true,
      maxResults = 10,
      sameProfessorOnly = false,
    } = options;

    // Extract course code without section (e.g., "CSCI 151" from "CSCI 151-01")
    const baseCourseCode = this.extractBaseCourseCode(conflictingCourse.courseCode);

    const alternatives = allCourses.filter(course => {
      // Must be same base course
      if (this.extractBaseCourseCode(course.courseCode) !== baseCourseCode) {
        return false;
      }

      // Must be different section
      if (course.id === conflictingCourse.id) {
        return false;
      }

      // Filter by professor if requested
      if (sameProfessorOnly && course.professor !== conflictingCourse.professor) {
        return false;
      }

      // Exclude full courses if requested
      if (excludeFullCourses && this.isFull(course)) {
        return false;
      }

      // Must not conflict with other courses in schedule
      if (this.conflictsWithSchedule(course, currentSchedule)) {
        return false;
      }

      // Must not already be in schedule
      if (currentSchedule.some(c => c.id === course.id)) {
        return false;
      }

      return true;
    });

    // Sort by preference (same professor first, then by available spots)
    return alternatives
      .sort((a, b) => {
        // Same professor scores higher
        const aSameProf = a.professor === conflictingCourse.professor ? 1 : 0;
        const bSameProf = b.professor === conflictingCourse.professor ? 1 : 0;
        if (aSameProf !== bSameProf) {
          return bSameProf - aSameProf;
        }

        // More available spots is better
        const aSpots = a.spots && a.enrolled !== undefined ? a.spots - a.enrolled : 0;
        const bSpots = b.spots && b.enrolled !== undefined ? b.spots - b.enrolled : 0;
        return bSpots - aSpots;
      })
      .slice(0, maxResults);
  }

  /**
   * Find similar courses (same department and level)
   * Useful when no alternative sections exist
   */
  findSimilarCourses(
    conflictingCourse: Course,
    allCourses: Course[],
    currentSchedule: Course[],
    options: AlternativeOptions = {}
  ): Course[] {
    const {
      excludeFullCourses = true,
      maxResults = 10,
    } = options;

    const department = this.extractDepartment(conflictingCourse.courseCode);
    const level = this.extractLevel(conflictingCourse.courseCode);

    const similar = allCourses.filter(course => {
      // Must be same department
      if (this.extractDepartment(course.courseCode) !== department) {
        return false;
      }

      // Must be same level (e.g., 100-level, 200-level)
      if (this.extractLevel(course.courseCode) !== level) {
        return false;
      }

      // Must not be the same course
      if (this.extractBaseCourseCode(course.courseCode) === this.extractBaseCourseCode(conflictingCourse.courseCode)) {
        return false;
      }

      // Same credit hours preferred
      if (course.credits !== conflictingCourse.credits) {
        return false;
      }

      // Exclude full courses if requested
      if (excludeFullCourses && this.isFull(course)) {
        return false;
      }

      // Must not conflict with schedule
      if (this.conflictsWithSchedule(course, currentSchedule)) {
        return false;
      }

      // Must not already be in schedule
      if (currentSchedule.some(c => c.id === course.id)) {
        return false;
      }

      return true;
    });

    // Sort by similarity score
    return similar
      .sort((a, b) => {
        const aScore = this.calculateSimilarityScore(a, conflictingCourse);
        const bScore = this.calculateSimilarityScore(b, conflictingCourse);
        return bScore - aScore;
      })
      .slice(0, maxResults);
  }

  /**
   * Check if a course is full
   */
  private isFull(course: Course): boolean {
    if (!course.spots || course.enrolled === undefined) {
      return false;
    }
    return course.enrolled >= course.spots;
  }

  /**
   * Check if a course conflicts with any courses in the schedule
   */
  private conflictsWithSchedule(course: Course, schedule: Course[]): boolean {
    const newBlocks = courseToBlocks(course);

    for (const existingCourse of schedule) {
      const existingBlocks = courseToBlocks(existingCourse);

      for (const newBlock of newBlocks) {
        for (const existingBlock of existingBlocks) {
          if (blocksOverlap(newBlock, existingBlock)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Extract base course code (without section number)
   * Example: "CSCI 151-01" -> "CSCI 151"
   */
  private extractBaseCourseCode(courseCode: string): string {
    return courseCode.replace(/-\d+$/, '');
  }

  /**
   * Extract department from course code
   * Example: "CSCI 151-01" -> "CSCI"
   */
  private extractDepartment(courseCode: string): string {
    const match = courseCode.match(/^([A-Z]+)/);
    return match ? match[1] : '';
  }

  /**
   * Extract level from course code (first digit of course number)
   * Example: "CSCI 151-01" -> "1" (100-level)
   */
  private extractLevel(courseCode: string): string {
    const match = courseCode.match(/\s+(\d)/);
    return match ? match[1] : '';
  }

  /**
   * Calculate similarity score between two courses
   * Higher score = more similar
   */
  private calculateSimilarityScore(course: Course, reference: Course): number {
    let score = 0;

    // Same department (already filtered)
    score += 10;

    // Same level (already filtered)
    score += 10;

    // Same credits (already filtered)
    score += 10;

    // Similar course number (closer is better)
    const courseNum = parseInt(course.courseCode.match(/\d+/)?.[0] || '0');
    const refNum = parseInt(reference.courseCode.match(/\d+/)?.[0] || '0');
    const numDiff = Math.abs(courseNum - refNum);
    score += Math.max(0, 20 - numDiff); // Up to 20 points

    // Similar time slot (prefer same time of day)
    if (this.hasSimilarTimeSlot(course, reference)) {
      score += 15;
    }

    // Same days of week
    const courseDays = this.extractDays(course.meetingTime);
    const refDays = this.extractDays(reference.meetingTime);
    const dayOverlap = courseDays.filter(d => refDays.includes(d)).length;
    score += dayOverlap * 5; // Up to 25 points (5 days)

    // More available spots is better
    if (course.spots && course.enrolled !== undefined) {
      const available = course.spots - course.enrolled;
      score += Math.min(available, 10); // Up to 10 points
    }

    return score;
  }

  /**
   * Check if two courses have similar time slots (same time of day)
   */
  private hasSimilarTimeSlot(course1: Course, course2: Course): boolean {
    const parsed1 = parseMeetingTime(course1.meetingTime);
    const parsed2 = parseMeetingTime(course2.meetingTime);

    if (!parsed1 || !parsed2) return false;

    // Convert to hours
    const hour1 = parsed1.startTime / 3600;
    const hour2 = parsed2.startTime / 3600;

    // Within 2 hours is considered similar
    return Math.abs(hour1 - hour2) <= 2;
  }

  /**
   * Extract days from meeting time string
   */
  private extractDays(meetingTime: string): string[] {
    const parsed = parseMeetingTime(meetingTime);
    return parsed ? parsed.days : [];
  }
}

export const alternativeSectionService = new AlternativeSectionService();
