/**
 * Extended tests for schedule utility functions
 */

import {
  hasLocationConflict,
  hasScheduleConflict,
  findScheduleConflicts,
  findTimeConflicts,
  formatConflictMessage,
  getConflictDetails,
} from '@/utils/scheduleUtils';
import { createMockCourse, createCourseWithTime } from '../utils/test-data';

describe('scheduleUtils - extended', () => {
  describe('hasLocationConflict', () => {
    it('should detect same building and room', () => {
      const course1 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
      });
      const course2 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
      });

      expect(hasLocationConflict(course1, course2)).toBe(true);
    });

    it('should not conflict with different rooms', () => {
      const course1 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
      });
      const course2 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '2460',
      });

      expect(hasLocationConflict(course1, course2)).toBe(false);
    });

    it('should not conflict with different buildings', () => {
      const course1 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
      });
      const course2 = createMockCourse({
        buildingCode: 'Parsons',
        roomNumber: '1480',
      });

      expect(hasLocationConflict(course1, course2)).toBe(false);
    });

    it('should return false if location data is missing', () => {
      const course1 = createMockCourse({
        buildingCode: undefined,
        roomNumber: undefined,
      });
      const course2 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
      });

      expect(hasLocationConflict(course1, course2)).toBe(false);
    });
  });

  describe('hasScheduleConflict', () => {
    it('should detect time conflict as schedule conflict', () => {
      const course1 = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const course2 = createCourseWithTime(['M', 'W', 'F'], '10:30', '11:20');

      expect(hasScheduleConflict(course1, course2)).toBe(true);
    });

    it('should not conflict if no time or location issues', () => {
      const course1 = createCourseWithTime(['M', 'W'], '10:00', '10:50');
      const course2 = createCourseWithTime(['T', 'Th'], '14:00', '15:15');

      expect(hasScheduleConflict(course1, course2)).toBe(false);
    });
  });

  describe('findScheduleConflicts', () => {
    it('should find all conflicting courses', () => {
      const newCourse = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const likedCourses = [
        createCourseWithTime(['M', 'W', 'F'], '10:30', '11:20'), // Conflicts
        createCourseWithTime(['T', 'Th'], '10:00', '11:15'), // No conflict
        createCourseWithTime(['M'], '10:15', '11:00'), // Conflicts
      ];

      const conflicts = findScheduleConflicts(newCourse, likedCourses);
      expect(conflicts).toHaveLength(2);
      expect(conflicts[0].meetingDays).toEqual(['M', 'W', 'F']);
      expect(conflicts[1].meetingDays).toEqual(['M']);
    });

    it('should return empty array if no conflicts', () => {
      const newCourse = createCourseWithTime(['M', 'W'], '10:00', '10:50');
      const likedCourses = [
        createCourseWithTime(['T', 'Th'], '10:00', '11:15'),
        createCourseWithTime(['F'], '14:00', '16:00'),
      ];

      const conflicts = findScheduleConflicts(newCourse, likedCourses);
      expect(conflicts).toHaveLength(0);
    });

    it('should handle empty liked courses array', () => {
      const newCourse = createCourseWithTime(['M'], '10:00', '11:00');
      const conflicts = findScheduleConflicts(newCourse, []);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('findTimeConflicts', () => {
    it('should find only time conflicts', () => {
      const newCourse = createCourseWithTime(['M', 'W'], '10:00', '11:00');
      const likedCourses = [
        createCourseWithTime(['M', 'W'], '10:30', '11:30'), // Time conflict
        createCourseWithTime(['T', 'Th'], '10:00', '11:00'), // No conflict
      ];

      const conflicts = findTimeConflicts(newCourse, likedCourses);
      expect(conflicts).toHaveLength(1);
    });
  });

  describe('formatConflictMessage', () => {
    it('should format time conflict message', () => {
      const course1 = createCourseWithTime(['M'], '10:00', '11:00');
      course1.courseCode = 'CSCI 121';
      course1.buildingCode = 'Building1';
      course1.roomNumber = '101';

      const course2 = createCourseWithTime(['M'], '10:30', '11:30');
      course2.courseCode = 'MATH 101';
      course2.buildingCode = 'Building2'; // Different building
      course2.roomNumber = '202';

      const message = formatConflictMessage(course1, course2);
      expect(message).toContain('Time conflict');
      expect(message).toContain('CSCI 121');
      expect(message).toContain('MATH 101');
      expect(message).toContain('Monday');
    });

    it('should format location conflict message', () => {
      const course1 = createMockCourse({
        courseCode: 'CSCI 121',
        buildingCode: 'Shanahan',
        roomNumber: '1480',
        meetingDays: ['M', 'W'],
        startTime: '10:00',
        endTime: '11:00',
      });

      const course2 = createMockCourse({
        courseCode: 'PHYS 101',
        buildingCode: 'Shanahan',
        roomNumber: '1480',
        meetingDays: ['T', 'Th'],
        startTime: '10:00',
        endTime: '11:00',
      });

      const message = formatConflictMessage(course1, course2);
      expect(message).toContain('Location conflict');
      expect(message).toContain('Shanahan 1480');
    });

    it('should format combined conflict message', () => {
      const course1 = createMockCourse({
        courseCode: 'CSCI 121',
        buildingCode: 'Shanahan',
        roomNumber: '1480',
        meetingDays: ['M'],
        startTime: '10:00',
        endTime: '11:00',
      });

      const course2 = createMockCourse({
        courseCode: 'MATH 101',
        buildingCode: 'Shanahan',
        roomNumber: '1480',
        meetingDays: ['M'],
        startTime: '10:30',
        endTime: '11:30',
      });

      const message = formatConflictMessage(course1, course2);
      expect(message).toContain('Time & location conflict');
      expect(message).toContain('Shanahan 1480');
    });
  });

  describe('getConflictDetails', () => {
    it('should return time conflict details', () => {
      const course1 = createCourseWithTime(['M'], '10:00', '11:00');
      course1.buildingCode = 'Building1';
      course1.roomNumber = '101';

      const course2 = createCourseWithTime(['M'], '10:30', '11:30');
      course2.buildingCode = 'Building2'; // Different location
      course2.roomNumber = '202';

      const details = getConflictDetails(course1, course2);
      expect(details.hasTimeConflict).toBe(true);
      expect(details.hasLocationConflict).toBe(false);
      expect(details.conflictType).toBe('time');
      expect(details.message).toContain('Time conflict');
    });

    it('should return no conflict details', () => {
      const course1 = createCourseWithTime(['M'], '10:00', '11:00');
      course1.buildingCode = 'Building1';
      course1.roomNumber = '101';

      const course2 = createCourseWithTime(['T'], '10:00', '11:00');
      course2.buildingCode = 'Building2'; // Different location and different day
      course2.roomNumber = '202';

      const details = getConflictDetails(course1, course2);
      expect(details.hasTimeConflict).toBe(false);
      expect(details.hasLocationConflict).toBe(false);
      expect(details.conflictType).toBe('none');
    });

    it('should return both conflict type', () => {
      const course1 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
        meetingDays: ['M'],
        startTime: '10:00',
        endTime: '11:00',
      });

      const course2 = createMockCourse({
        buildingCode: 'Shanahan',
        roomNumber: '1480',
        meetingDays: ['M'],
        startTime: '10:30',
        endTime: '11:30',
      });

      const details = getConflictDetails(course1, course2);
      expect(details.hasTimeConflict).toBe(true);
      expect(details.hasLocationConflict).toBe(true);
      expect(details.conflictType).toBe('both');
    });
  });
});
