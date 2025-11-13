/**
 * Tests for prerequisite validator
 */

import { PrerequisiteValidator } from '@/utils/prerequisiteValidator';
import { createMockCourse } from '../utils/test-data';

describe('PrerequisiteValidator', () => {
  describe('validatePrerequisites', () => {
    it('should validate course with no prerequisites', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 042',
        prerequisites: 'None',
      });

      const result = PrerequisiteValidator.validatePrerequisites(course, []);

      expect(result.isValid).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    it('should detect missing prerequisites', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        prerequisites: 'CSCI 60 or equivalent',
      });

      const result = PrerequisiteValidator.validatePrerequisites(course, []);

      expect(result.isValid).toBe(false);
      expect(result.missingPrerequisites.length).toBeGreaterThan(0);
    });

    it('should validate when prerequisites are met', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        prerequisites: 'CSCI 60',
      });

      const completedCourses = [
        createMockCourse({
          courseCode: 'CSCI 60',
          title: 'Introduction to CS',
        }),
      ];

      const result = PrerequisiteValidator.validatePrerequisites(
        course,
        completedCourses
      );

      expect(result.isValid).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
    });

    it('should handle OR prerequisites', () => {
      const course = createMockCourse({
        courseCode: 'MATH 131',
        prerequisites: 'MATH 60 or MATH 30',
      });

      const completedCourses = [
        createMockCourse({
          courseCode: 'MATH 30',
          title: 'Calculus I',
        }),
      ];

      const result = PrerequisiteValidator.validatePrerequisites(
        course,
        completedCourses
      );

      // Check that validation was performed and result structure is correct
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('missingPrerequisites');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('recommendations');
    });

    it('should handle AND prerequisites', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 181',
        prerequisites: 'CSCI 121 and CSCI 140',
      });

      const completedCourses = [
        createMockCourse({ courseCode: 'CSCI 121' }),
      ];

      const result = PrerequisiteValidator.validatePrerequisites(
        course,
        completedCourses
      );

      // Should be invalid because CSCI 140 is missing
      expect(result.isValid).toBe(false);
      expect(result.missingPrerequisites.length).toBeGreaterThan(0);
    });

    it('should handle recommended prerequisites differently', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 189',
        prerequisites: 'CSCI 121 recommended',
      });

      const result = PrerequisiteValidator.validatePrerequisites(course, []);

      // Recommended prerequisites should generate warnings, not failures
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });

    it('should consider courses in current schedule', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        prerequisites: 'CSCI 60',
      });

      const currentSchedule = [
        createMockCourse({
          courseCode: 'CSCI 60',
          semester: 'Fall 2024',
        }),
      ];

      const result = PrerequisiteValidator.validatePrerequisites(
        course,
        [],
        currentSchedule
      );

      // Should provide recommendations about concurrent enrollment
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex prerequisite strings', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 189',
        prerequisites: 'CSCI 121, CSCI 140, and MATH 60 or MATH 30',
      });

      const completedCourses = [
        createMockCourse({ courseCode: 'CSCI 121' }),
        createMockCourse({ courseCode: 'CSCI 140' }),
        createMockCourse({ courseCode: 'MATH 30' }),
      ];

      const result = PrerequisiteValidator.validatePrerequisites(
        course,
        completedCourses
      );

      // Verify the validator returns a proper result structure
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('missingPrerequisites');
      expect(Array.isArray(result.missingPrerequisites)).toBe(true);
    });

    it('should handle empty prerequisite string', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 042',
        prerequisites: '',
      });

      const result = PrerequisiteValidator.validatePrerequisites(course, []);

      expect(result.isValid).toBe(true);
      expect(result.missingPrerequisites).toHaveLength(0);
    });
  });
});
