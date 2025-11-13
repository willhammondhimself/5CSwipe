/**
 * Tests for schedule utility functions
 */

import { parseTimeSlots, hasTimeConflict } from '@/utils/scheduleUtils';
import { createMockCourse, createCourseWithTime, createConflictingCourse } from '../utils/test-data';

describe('scheduleUtils', () => {
  describe('parseTimeSlots', () => {
    it('should parse MWF course times', () => {
      const course = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const slots = parseTimeSlots(course);

      expect(slots).toHaveLength(3);
      expect(slots[0]).toEqual({
        day: 'Monday',
        startTime: 10 * 60, // 600 minutes
        endTime: 10 * 60 + 50, // 650 minutes
      });
      expect(slots[1].day).toBe('Wednesday');
      expect(slots[2].day).toBe('Friday');
    });

    it('should parse TTh course times', () => {
      const course = createCourseWithTime(['T', 'Th'], '14:00', '15:15');
      const slots = parseTimeSlots(course);

      expect(slots).toHaveLength(2);
      expect(slots[0].day).toBe('Tuesday');
      expect(slots[1].day).toBe('Thursday');
    });

    it('should handle single day courses', () => {
      const course = createCourseWithTime(['W'], '13:00', '16:00');
      const slots = parseTimeSlots(course);

      expect(slots).toHaveLength(1);
      expect(slots[0]).toEqual({
        day: 'Wednesday',
        startTime: 13 * 60,
        endTime: 16 * 60,
      });
    });
  });

  describe('hasTimeConflict', () => {
    it('should detect time conflict on same day', () => {
      const course1 = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const course2 = createCourseWithTime(['M', 'W', 'F'], '10:30', '11:20');

      expect(hasTimeConflict(course1, course2)).toBe(true);
    });

    it('should not conflict if on different days', () => {
      const course1 = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const course2 = createCourseWithTime(['T', 'Th'], '10:00', '10:50');

      expect(hasTimeConflict(course1, course2)).toBe(false);
    });

    it('should not conflict if times are adjacent', () => {
      const course1 = createCourseWithTime(['M', 'W'], '10:00', '10:50');
      const course2 = createCourseWithTime(['M', 'W'], '11:00', '11:50');

      expect(hasTimeConflict(course1, course2)).toBe(false);
    });

    it('should detect exact time overlap', () => {
      const course1 = createCourseWithTime(['M'], '10:00', '11:00');
      const course2 = createCourseWithTime(['M'], '10:00', '11:00');

      expect(hasTimeConflict(course1, course2)).toBe(true);
    });

    it('should detect partial overlap at start', () => {
      const course1 = createCourseWithTime(['T'], '09:00', '10:30');
      const course2 = createCourseWithTime(['T'], '10:00', '11:00');

      expect(hasTimeConflict(course1, course2)).toBe(true);
    });

    it('should detect partial overlap at end', () => {
      const course1 = createCourseWithTime(['W'], '10:00', '11:00');
      const course2 = createCourseWithTime(['W'], '09:00', '10:30');

      expect(hasTimeConflict(course1, course2)).toBe(true);
    });

    it('should detect one course completely inside another', () => {
      const course1 = createCourseWithTime(['F'], '09:00', '12:00');
      const course2 = createCourseWithTime(['F'], '10:00', '11:00');

      expect(hasTimeConflict(course1, course2)).toBe(true);
    });
  });
});
