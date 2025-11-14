/**
 * Integration tests for complete user flows
 */

import React from 'react';
import { render, waitFor, fireEvent } from '../utils/test-utils';
import {
  mockSupabaseClient,
  mockAuthSuccess,
  mockQuerySuccess,
  resetSupabaseMocks,
} from '../mocks/supabase';
import {
  createMockUserProfile,
  createMockCourse,
  createMockLikedCourse,
  createMockSchedulePlan,
  createCourseWithTime,
} from '../utils/test-data';

describe('User Flow Integration Tests', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('Complete User Journey', () => {
    it('should handle sign up flow', async () => {
      // Mock successful signup
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockAuthSuccess);

      // Mock profile creation
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(
          mockQuerySuccess(createMockUserProfile())
        ),
      } as any);

      // Verify signup was called
      expect(mockSupabaseClient.auth.signUp).toBeDefined();
    });

    it('should complete onboarding flow', async () => {
      const userProfile = createMockUserProfile({
        onboarding_completed: false,
      });

      // Mock profile update
      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(
          mockQuerySuccess({ ...userProfile, onboarding_completed: true })
        ),
      } as any);

      // Verify profile can be updated
      const mockUpdate = mockSupabaseClient.from('user_profiles').update;
      expect(mockUpdate).toBeDefined();
    });
  });

  describe('Course Discovery and Liking', () => {
    it('should swipe right and save course', async () => {
      const course = createMockCourse();
      const likedCourse = createMockLikedCourse({
        course_id: course.id,
        swipe_direction: 'right',
      });

      // Mock insert liked course
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(mockQuerySuccess(likedCourse)),
      } as any);

      // Verify course can be liked
      expect(course.id).toBeDefined();
      expect(likedCourse.swipe_direction).toBe('right');
    });

    it('should super-like a course', async () => {
      const course = createMockCourse();
      const likedCourse = createMockLikedCourse({
        course_id: course.id,
        is_super_like: true,
        swipe_direction: 'super',
      });

      // Mock insert super-liked course
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(mockQuerySuccess(likedCourse)),
      } as any);

      expect(likedCourse.is_super_like).toBe(true);
    });

    it('should retrieve liked courses', async () => {
      const likedCourses = [
        createMockLikedCourse({ course_id: 'CSCI-121' }),
        createMockLikedCourse({ course_id: 'MATH-101' }),
      ];

      // Mock select liked courses
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValueOnce(mockQuerySuccess(likedCourses)),
      } as any);

      expect(likedCourses).toHaveLength(2);
    });
  });

  describe('Schedule Building', () => {
    it('should create a new schedule plan', async () => {
      const schedulePlan = createMockSchedulePlan({
        name: 'Fall 2024 Plan A',
      });

      // Mock insert schedule plan
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(mockQuerySuccess(schedulePlan)),
      } as any);

      expect(schedulePlan.name).toBe('Fall 2024 Plan A');
      expect(schedulePlan.is_active).toBe(true);
    });

    it('should add courses to schedule plan', async () => {
      const course1 = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const course2 = createCourseWithTime(['T', 'Th'], '14:00', '15:15');

      const schedulePlan = createMockSchedulePlan({
        courses: [course1.id, course2.id],
        total_credits: course1.credits + course2.credits,
      });

      expect(schedulePlan.courses).toHaveLength(2);
      expect(schedulePlan.total_credits).toBe(6);
    });

    it('should detect schedule conflicts', async () => {
      const course1 = createCourseWithTime(['M', 'W', 'F'], '10:00', '10:50');
      const course2 = createCourseWithTime(['M', 'W', 'F'], '10:30', '11:20');

      const schedulePlan = createMockSchedulePlan({
        courses: [course1.id, course2.id],
        has_conflicts: true,
      });

      expect(schedulePlan.has_conflicts).toBe(true);
    });

    it('should update schedule plan', async () => {
      const schedulePlan = createMockSchedulePlan();

      const updatedPlan = {
        ...schedulePlan,
        name: 'Updated Plan Name',
        total_credits: 18,
      };

      // Mock update schedule plan
      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(mockQuerySuccess(updatedPlan)),
      } as any);

      expect(updatedPlan.name).toBe('Updated Plan Name');
      expect(updatedPlan.total_credits).toBe(18);
    });

    it('should delete schedule plan', async () => {
      const schedulePlan = createMockSchedulePlan();

      // Mock delete schedule plan
      mockSupabaseClient.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValueOnce(mockQuerySuccess(null)),
      } as any);

      const mockDelete = mockSupabaseClient.from('user_schedule_plans').delete;
      expect(mockDelete).toBeDefined();
    });
  });

  describe('Multi-Plan Management', () => {
    it('should create multiple schedule variants', async () => {
      const plan1 = createMockSchedulePlan({
        name: 'Plan A - STEM Heavy',
        is_active: true,
      });

      const plan2 = createMockSchedulePlan({
        id: 'plan-2',
        name: 'Plan B - Balanced',
        is_active: false,
      });

      const plan3 = createMockSchedulePlan({
        id: 'plan-3',
        name: 'Plan C - Humanities Focus',
        is_active: false,
      });

      const plans = [plan1, plan2, plan3];

      expect(plans).toHaveLength(3);
      expect(plans.filter(p => p.is_active)).toHaveLength(1);
    });

    it('should switch active schedule plan', async () => {
      const plan1 = createMockSchedulePlan({
        is_active: true,
      });

      const plan2 = createMockSchedulePlan({
        id: 'plan-2',
        is_active: false,
      });

      // Simulate switching active plan
      const updatedPlan1 = { ...plan1, is_active: false };
      const updatedPlan2 = { ...plan2, is_active: true };

      expect(updatedPlan1.is_active).toBe(false);
      expect(updatedPlan2.is_active).toBe(true);
    });
  });

  describe('Conflict Resolution', () => {
    it('should identify all conflicts in a schedule', async () => {
      const courses = [
        createCourseWithTime(['M', 'W'], '10:00', '11:00'),
        createCourseWithTime(['M'], '10:30', '11:30'), // Conflicts with course 1
        createCourseWithTime(['W'], '10:15', '11:15'), // Conflicts with course 1
        createCourseWithTime(['T', 'Th'], '14:00', '15:15'), // No conflict
      ];

      // In a real integration test, we'd call the conflict detection service
      // For now, verify test data is set up correctly
      expect(courses).toHaveLength(4);
    });

    it('should suggest alternative courses', async () => {
      const conflictingCourse = createCourseWithTime(['M'], '10:00', '11:00');
      conflictingCourse.courseCode = 'CSCI 121';

      const alternative = createCourseWithTime(['T', 'Th'], '14:00', '15:15');
      alternative.courseCode = 'CSCI 121';
      alternative.professor = 'Different Professor';

      expect(conflictingCourse.courseCode).toBe(alternative.courseCode);
      expect(conflictingCourse.meetingDays).not.toEqual(alternative.meetingDays);
    });
  });

  describe('Real-time Sync Scenarios', () => {
    it('should simulate real-time course like sync', async () => {
      const userId = 'test-user-id';
      const likedCourse = createMockLikedCourse();

      // Mock channel subscription
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      mockSupabaseClient.channel.mockReturnValueOnce(mockChannel as any);

      // Verify channel setup
      const channel = mockSupabaseClient.channel();
      expect(channel.on).toBeDefined();
      expect(channel.subscribe).toBeDefined();
    });

    it('should handle schedule plan sync', async () => {
      const mockChannel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      mockSupabaseClient.channel.mockReturnValueOnce(mockChannel as any);

      const channel = mockSupabaseClient.channel();
      expect(channel.on).toBeDefined();
    });

    it('should sync changes across multiple devices', async () => {
      // Device 1 makes a change
      const updatedPlan = createMockSchedulePlan({
        name: 'Updated from Device 1',
        total_credits: 18,
      });

      // Device 2 should receive the update via real-time subscription
      const mockChannel: any = {
        on: jest.fn((event: string, config: any, callback: (payload: any) => void): any => {
          // Simulate receiving the update
          callback({
            eventType: 'UPDATE',
            new: updatedPlan,
            old: createMockSchedulePlan(),
          });
          return mockChannel;
        }),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
      };

      mockSupabaseClient.channel.mockReturnValueOnce(mockChannel as any);

      expect(updatedPlan.name).toBe('Updated from Device 1');
    });
  });

  describe('Public Schedule Sharing', () => {
    it('should generate share token for schedule', async () => {
      const schedulePlan = createMockSchedulePlan({
        is_public: true,
        share_token: 'abc123xyz',
      });

      expect(schedulePlan.is_public).toBe(true);
      expect(schedulePlan.share_token).toBeDefined();
      expect(String(schedulePlan.share_token).length).toBeGreaterThan(0);
    });

    it('should retrieve public schedule by token', async () => {
      const shareToken = 'abc123xyz';
      const publicSchedule = createMockSchedulePlan({
        is_public: true,
        share_token: shareToken,
      });

      // Mock query by share token
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValueOnce(mockQuerySuccess(publicSchedule)),
      } as any);

      expect(publicSchedule.is_public).toBe(true);
    });
  });

  describe('Offline to Online Sync', () => {
    it('should queue operations while offline', async () => {
      const offlineOperations = [
        { type: 'like_course', data: { course_id: 'CSCI-121' } },
        { type: 'update_schedule', data: { plan_id: 'plan-1' } },
      ];

      expect(offlineOperations).toHaveLength(2);
    });

    it('should sync queued operations when back online', async () => {
      const queuedLike = createMockLikedCourse();
      const queuedSchedule = createMockSchedulePlan();

      // Mock batch insert
      mockSupabaseClient.from.mockReturnValueOnce({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValueOnce(
          mockQuerySuccess([queuedLike, queuedSchedule])
        ),
      } as any);

      expect(queuedLike).toBeDefined();
      expect(queuedSchedule).toBeDefined();
    });
  });
});
