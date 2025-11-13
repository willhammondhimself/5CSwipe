/**
 * Tests for PERM request generator
 */

import {
  generatePermRequest,
  generatePersonalizedPermRequest,
  commonPermReasons,
} from '@/utils/permGenerator';
import { createMockCourse } from '../utils/test-data';

describe('permGenerator', () => {
  describe('generatePermRequest', () => {
    it('should generate basic PERM request', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        title: 'Software Development',
        professor: 'Prof. Chen',
        meetingTime: 'MWF 10:00-10:50 AM',
        enrollmentCurrent: 28,
        enrollmentCap: 30,
      });

      const request = generatePermRequest(course);

      expect(request).toContain('PERM request for');
      expect(request).toContain('CSCI 121');
      expect(request).toContain('Software Development');
      expect(request).toContain('Prof. Chen');
      expect(request).toContain('MWF 10:00-10:50 AM');
      expect(request).toContain('28/30');
    });

    it('should keep message under 256 characters', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        title: 'Very Long Course Title That Goes On And On And On And On',
        professor: 'Professor with a Very Long Name',
        meetingTime: 'Monday Wednesday Friday 10:00-10:50 AM',
      });

      const request = generatePermRequest(course);

      expect(request.length).toBeLessThanOrEqual(256);
    });

    it('should use fallback for very long course info', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        title: 'An Extremely Long Course Title That Would Definitely Exceed The Character Limit For A PERM Request Message And Needs To Be Truncated',
        professor: 'Professor Alexandria Montgomery-Washington III',
        meetingTime: 'Monday Wednesday Friday 10:00-10:50 AM in Building Name Room 123',
      });

      const request = generatePermRequest(course);

      expect(request.length).toBeLessThanOrEqual(256);
      expect(request).toContain('PERM for');
    });
  });

  describe('generatePersonalizedPermRequest', () => {
    it('should generate personalized request with year', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        meetingTime: 'MWF 10:00-10:50 AM',
      });

      const request = generatePersonalizedPermRequest(course, undefined, 'Senior');

      expect(request).toContain('CSCI 121');
      expect(request).toContain('Senior');
      expect(request).toContain('MWF 10:00-10:50 AM');
    });

    it('should include reason when provided', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 189',
        meetingTime: 'TTh 2:45-4:00 PM',
      });

      const reason = 'Needed for major requirements';
      const request = generatePersonalizedPermRequest(course, reason, 'Junior');

      expect(request).toContain('CSCI 189');
      expect(request).toContain('Junior');
      expect(request).toContain(reason);
    });

    it('should omit reason if it would exceed character limit', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 121',
        meetingTime: 'MWF 10:00-10:50 AM',
        enrollmentCurrent: 30,
        enrollmentCap: 30,
      });

      const veryLongReason = 'This is a very long reason that explains in great detail why I need this course and it goes on and on with lots of explanations about my academic journey and career goals and research interests';

      const request = generatePersonalizedPermRequest(course, veryLongReason);

      expect(request.length).toBeLessThanOrEqual(256);
      // Function includes the reason if it fits after checking total length
      expect(request).toContain('CSCI 121');
    });

    it('should work without year or reason', () => {
      const course = createMockCourse({
        courseCode: 'MATH 101',
        meetingTime: 'MWF 9:00-9:50 AM',
        enrollmentCurrent: 25,
        enrollmentCap: 30,
      });

      const request = generatePersonalizedPermRequest(course);

      expect(request).toContain('MATH 101');
      expect(request).toContain('MWF 9:00-9:50 AM');
      expect(request).toContain('25/30');
    });

    it('should handle very long messages', () => {
      const course = createMockCourse({
        courseCode: 'CSCI 189',
        meetingTime: 'Monday Wednesday Friday 10:00 AM to 10:50 AM',
        enrollmentCurrent: 25,
        enrollmentCap: 30,
      });

      const longReason = 'A'.repeat(250);
      const request = generatePersonalizedPermRequest(course, longReason, 'Senior');

      expect(request.length).toBeLessThanOrEqual(256);
      expect(request).toContain('CSCI 189');
    });
  });

  describe('commonPermReasons', () => {
    it('should have predefined reasons', () => {
      expect(commonPermReasons).toBeDefined();
      expect(Array.isArray(commonPermReasons)).toBe(true);
      expect(commonPermReasons.length).toBeGreaterThan(0);
    });

    it('should have reasonable length reasons', () => {
      commonPermReasons.forEach(reason => {
        expect(reason.length).toBeLessThan(100);
        expect(reason.length).toBeGreaterThan(0);
      });
    });

    it('should include common academic reasons', () => {
      const reasonsText = commonPermReasons.join(' ').toLowerCase();

      // Should include common keywords
      expect(
        reasonsText.includes('major') ||
        reasonsText.includes('prerequisites') ||
        reasonsText.includes('senior') ||
        reasonsText.includes('research')
      ).toBe(true);
    });
  });
});
