/**
 * Tests for ScheduleVariantsContext
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScheduleVariantsProvider, useScheduleVariants } from '@/contexts/ScheduleVariantsContext';
import * as scheduleVariantsService from '@/services/scheduleVariantsService';
import { Course } from '@/data/mockCourses';

// Mock dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/services/scheduleVariantsService');

import { useAuth } from '@/contexts/AuthContext';

const mockCourse1: Course = {
  id: 'course1',
  courseCode: 'CS121',
  title: 'Software Development',
  school: 'HMC',
  department: 'Computer Science',
  semester: 'Spring 2025',
  credits: 3,
  enrollmentCap: 30,
  enrollmentCurrent: 20,
  status: 'open',
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourse2: Course = {
  id: 'course2',
  courseCode: 'MATH60',
  title: 'Linear Algebra',
  school: 'HMC',
  department: 'Mathematics',
  semester: 'Spring 2025',
  credits: 3,
  enrollmentCap: 25,
  enrollmentCurrent: 15,
  status: 'open',
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockPlan1 = {
  id: 'plan1',
  name: 'My Schedule',
  description: 'Main schedule',
  courses: [],
  createdAt: new Date(),
  lastModified: new Date(),
  isActive: true,
  semester: 'Spring 2025',
  color: '#007AFF',
  totalCredits: 0,
  hasConflicts: false,
  isPublic: false,
  shareToken: null,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ScheduleVariantsProvider>{children}</ScheduleVariantsProvider>
);

describe('ScheduleVariantsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: null });
  });

  describe('initialization', () => {
    it('should start with empty plans', () => {
      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      expect(result.current.plans).toEqual([]);
      expect(result.current.activePlan).toBeNull();
    });

    it('should load from AsyncStorage when not logged in', async () => {
      const savedPlans = [mockPlan1];
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(savedPlans));

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].name).toBe('My Schedule');
    });

    it('should load from Supabase when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [mockPlan1],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [mockCourse1],
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].courses).toContainEqual(mockCourse1);
    });

    it('should subscribe to real-time updates when logged in', async () => {
      const unsubscribeMock = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [],
        error: null,
      });
      (scheduleVariantsService.subscribeSchedulePlans as jest.Mock).mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(scheduleVariantsService.subscribeSchedulePlans).toHaveBeenCalledWith(
          'user1',
          expect.any(Function)
        );
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('createPlan', () => {
    it('should create plan in offline mode', async () => {
      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let newPlanId: string = '';
      await act(async () => {
        newPlanId = await result.current.createPlan('Test Plan', 'Test description');
      });

      expect(newPlanId).toBeTruthy();
      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].name).toBe('Test Plan');
      expect(result.current.plans[0].description).toBe('Test description');
    });

    it('should create plan in Supabase when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [],
        error: null,
      });
      (scheduleVariantsService.createSchedulePlan as jest.Mock).mockResolvedValue({
        planId: 'new-plan-id',
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createPlan('Test Plan', 'Test description');
      });

      expect(scheduleVariantsService.createSchedulePlan).toHaveBeenCalledWith(
        'user1',
        'Test Plan',
        'Test description'
      );
    });

    it('should handle creation errors', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [],
        error: null,
      });
      (scheduleVariantsService.createSchedulePlan as jest.Mock).mockResolvedValue({
        planId: null,
        error: new Error('Creation failed'),
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let planId: string = '';
      await act(async () => {
        planId = await result.current.createPlan('Test Plan');
      });

      expect(planId).toBe('');
      expect(result.current.syncError).toBeTruthy();
    });
  });

  describe('duplicatePlan', () => {
    it('should duplicate plan with courses', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ ...mockPlan1, courses: [mockCourse1] }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.duplicatePlan('plan1');
      });

      expect(result.current.plans).toHaveLength(2);
      expect(result.current.plans[1].name).toBe('My Schedule Copy');
    });
  });

  describe('deletePlan', () => {
    it('should delete plan in offline mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([mockPlan1, { ...mockPlan1, id: 'plan2', isActive: false }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deletePlan('plan2');
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].id).toBe('plan1');
    });

    it('should activate another plan when deleting active plan', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([mockPlan1, { ...mockPlan1, id: 'plan2', isActive: false }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deletePlan('plan1');
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].isActive).toBe(true);
    });

    it('should delete plan in Supabase when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [mockPlan1],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [],
        error: null,
      });
      (scheduleVariantsService.deleteSchedulePlan as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deletePlan('plan1');
      });

      expect(scheduleVariantsService.deleteSchedulePlan).toHaveBeenCalledWith('user1', 'plan1');
    });
  });

  describe('renamePlan', () => {
    it('should rename plan in offline mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockPlan1]));

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.renamePlan('plan1', 'New Name', 'New description');
      });

      expect(result.current.plans[0].name).toBe('New Name');
      expect(result.current.plans[0].description).toBe('New description');
    });

    it('should rename plan in Supabase when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [mockPlan1],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [],
        error: null,
      });
      (scheduleVariantsService.updateSchedulePlan as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.renamePlan('plan1', 'New Name', 'New description');
      });

      expect(scheduleVariantsService.updateSchedulePlan).toHaveBeenCalledWith('user1', 'plan1', {
        name: 'New Name',
        description: 'New description',
      });
    });
  });

  describe('setActivePlan', () => {
    it('should set active plan in offline mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([mockPlan1, { ...mockPlan1, id: 'plan2', isActive: false }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setActivePlan('plan2');
      });

      expect(result.current.plans[0].isActive).toBe(false);
      expect(result.current.plans[1].isActive).toBe(true);
      expect(result.current.activePlan?.id).toBe('plan2');
    });
  });

  describe('addCourseToPlan', () => {
    it('should add course to plan in offline mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockPlan1]));

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCourseToPlan('plan1', mockCourse1);
      });

      expect(result.current.plans[0].courses).toContainEqual(mockCourse1);
    });

    it('should not add duplicate courses', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ ...mockPlan1, courses: [mockCourse1] }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCourseToPlan('plan1', mockCourse1);
      });

      expect(result.current.plans[0].courses).toHaveLength(1);
    });

    it('should add course in Supabase when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [mockPlan1],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [],
        error: null,
      });
      (scheduleVariantsService.addCourseToSchedule as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCourseToPlan('plan1', mockCourse1);
      });

      expect(scheduleVariantsService.addCourseToSchedule).toHaveBeenCalledWith(
        'user1',
        'plan1',
        'course1'
      );
    });
  });

  describe('removeCourseFromPlan', () => {
    it('should remove course from plan in offline mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ ...mockPlan1, courses: [mockCourse1, mockCourse2] }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.removeCourseFromPlan('plan1', 'course1');
      });

      expect(result.current.plans[0].courses).toHaveLength(1);
      expect(result.current.plans[0].courses).not.toContainEqual(mockCourse1);
      expect(result.current.plans[0].courses).toContainEqual(mockCourse2);
    });
  });

  describe('moveCourseBetweenPlans', () => {
    it('should move course between plans', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([
          { ...mockPlan1, courses: [mockCourse1] },
          { ...mockPlan1, id: 'plan2', courses: [], isActive: false },
        ])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.moveCourseBetweenPlans('course1', 'plan1', 'plan2');
      });

      expect(result.current.plans[0].courses).toHaveLength(0);
      expect(result.current.plans[1].courses).toContainEqual(mockCourse1);
    });
  });

  describe('updatePlanCourses', () => {
    it('should update plan courses in offline mode', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([{ ...mockPlan1, courses: [mockCourse1] }])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePlanCourses('plan1', [mockCourse1, mockCourse2]);
      });

      expect(result.current.plans[0].courses).toHaveLength(2);
      expect(result.current.plans[0].courses).toContainEqual(mockCourse2);
    });
  });

  describe('createPlanFromCourses', () => {
    it('should create plan with courses', async () => {
      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createPlanFromCourses('New Plan', [mockCourse1, mockCourse2], 'Description');
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.plans[0].name).toBe('New Plan');
      expect(result.current.plans[0].courses).toHaveLength(2);
    });
  });

  describe('mergePlans', () => {
    it('should merge multiple plans into one', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([
          { ...mockPlan1, courses: [mockCourse1] },
          { ...mockPlan1, id: 'plan2', courses: [mockCourse2], isActive: false },
        ])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.mergePlans(['plan1', 'plan2'], 'Merged Plan');
      });

      const mergedPlan = result.current.plans.find(p => p.name === 'Merged Plan');
      expect(mergedPlan).toBeTruthy();
      expect(mergedPlan?.courses).toHaveLength(2);
    });

    it('should not duplicate courses when merging', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify([
          { ...mockPlan1, courses: [mockCourse1] },
          { ...mockPlan1, id: 'plan2', courses: [mockCourse1], isActive: false },
        ])
      );

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.mergePlans(['plan1', 'plan2'], 'Merged Plan');
      });

      const mergedPlan = result.current.plans.find(p => p.name === 'Merged Plan');
      expect(mergedPlan?.courses).toHaveLength(1);
    });
  });

  describe('sharing', () => {
    it('should generate share token', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [mockPlan1],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [],
        error: null,
      });
      (scheduleVariantsService.updateSchedulePlan as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let token: string | null = null;
      await act(async () => {
        token = await result.current.generateShareToken('plan1');
      });

      expect(token).toBeTruthy();
      expect(scheduleVariantsService.updateSchedulePlan).toHaveBeenCalledWith(
        'user1',
        'plan1',
        expect.objectContaining({
          shareToken: expect.any(String),
          isPublic: true,
        })
      );
    });

    it('should make plan public', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [{ ...mockPlan1, shareToken: 'existing-token' }],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [],
        error: null,
      });
      (scheduleVariantsService.updateSchedulePlan as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.makePublic('plan1');
      });

      expect(scheduleVariantsService.updateSchedulePlan).toHaveBeenCalledWith('user1', 'plan1', {
        isPublic: true,
      });
    });

    it('should make plan private', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [mockPlan1],
        error: null,
      });
      (scheduleVariantsService.getSchedulePlanCourses as jest.Mock).mockResolvedValue({
        courses: [],
        error: null,
      });
      (scheduleVariantsService.updateSchedulePlan as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.makePrivate('plan1');
      });

      expect(scheduleVariantsService.updateSchedulePlan).toHaveBeenCalledWith('user1', 'plan1', {
        isPublic: false,
      });
    });
  });

  describe('error handling', () => {
    it('should fall back to AsyncStorage on Supabase error', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (scheduleVariantsService.getSchedulePlans as jest.Mock).mockResolvedValue({
        plans: [],
        error: new Error('Network error'),
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify([mockPlan1]));

      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.plans).toHaveLength(1);
      expect(result.current.syncError).toBeTruthy();
    });

    it('should throw error when used outside provider', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useScheduleVariants());
      }).toThrow('useScheduleVariants must be used within a ScheduleVariantsProvider');

      console.error = originalError;
    });
  });

  describe('AsyncStorage backup', () => {
    it('should save to AsyncStorage after data changes', async () => {
      const { result } = renderHook(() => useScheduleVariants(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.createPlan('Test Plan');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@CourseSwipe:schedulePlans',
          expect.any(String)
        );
      });
    });
  });
});
