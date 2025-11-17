/**
 * Tests for LikedCoursesContext
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { LikedCoursesProvider, useLikedCourses } from '@/contexts/LikedCoursesContext';
import * as likedCoursesService from '@/services/likedCoursesService';
import { syncQueueService } from '@/services/syncQueueService';
import { offlineStorageService } from '@/services/offlineStorageService';
import { Course } from '@/data/mockCourses';

// Mock all dependencies
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}));
jest.mock('@/services/likedCoursesService');
jest.mock('@/services/syncQueueService');
jest.mock('@/services/offlineStorageService');

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <LikedCoursesProvider>{children}</LikedCoursesProvider>
);

describe('LikedCoursesContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: null });
    (NetInfo.fetch as jest.Mock).mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    });
    (syncQueueService.processQueue as jest.Mock).mockResolvedValue({
      success: 0,
      failed: 0,
    });
  });

  describe('initialization', () => {
    it('should start with empty arrays', () => {
      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      expect(result.current.likedCourses).toEqual([]);
      expect(result.current.superLikedCourses).toEqual([]);
    });

    it('should load from AsyncStorage when not logged in', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]))
        .mockResolvedValueOnce(JSON.stringify([mockCourse2]));

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.likedCourses).toEqual([mockCourse1]);
      expect(result.current.superLikedCourses).toEqual([mockCourse2]);
    });

    it('should load from Supabase when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [mockCourse1],
        superLikedCourses: [mockCourse2],
        error: null,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.likedCourses).toEqual([mockCourse1]);
      expect(result.current.superLikedCourses).toEqual([mockCourse2]);
      expect(likedCoursesService.getLikedCourses).toHaveBeenCalledWith('user1');
    });

    it('should process sync queue on mount when logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });

      renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(syncQueueService.processQueue).toHaveBeenCalled();
      });
    });

    it('should subscribe to real-time updates when logged in', async () => {
      const unsubscribeMock = jest.fn();
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });
      (likedCoursesService.subscribeLikedCourses as jest.Mock).mockReturnValue(unsubscribeMock);

      const { unmount } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(likedCoursesService.subscribeLikedCourses).toHaveBeenCalledWith(
          'user1',
          expect.any(Function)
        );
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('addLikedCourse', () => {
    it('should add course optimistically', async () => {
      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      expect(result.current.likedCourses).toContainEqual(mockCourse1);
    });

    it('should sync to Supabase when online and logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });
      (likedCoursesService.addLikedCourse as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      expect(likedCoursesService.addLikedCourse).toHaveBeenCalledWith('user1', mockCourse1, false);
    });

    it('should queue mutation when offline', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      expect(syncQueueService.addToQueue).toHaveBeenCalledWith({
        type: 'LIKE_COURSE',
        payload: { course: mockCourse1, isSuperLike: false },
        timestamp: expect.any(Number),
        userId: 'user1',
      });
      expect(likedCoursesService.addLikedCourse).not.toHaveBeenCalled();
    });

    it('should not add duplicate courses', async () => {
      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      expect(result.current.likedCourses).toHaveLength(1);

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      expect(result.current.likedCourses).toHaveLength(1);
    });

    it('should revert optimistic update on error', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });
      (likedCoursesService.addLikedCourse as jest.Mock).mockResolvedValue({
        error: new Error('Sync failed'),
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      // Should be reverted
      expect(result.current.likedCourses).toEqual([]);
      expect(result.current.syncError).toEqual(new Error('Sync failed'));
    });
  });

  describe('addSuperLikedCourse', () => {
    it('should add course to both liked and super-liked', async () => {
      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await act(async () => {
        await result.current.addSuperLikedCourse(mockCourse1);
      });

      expect(result.current.likedCourses).toContainEqual(mockCourse1);
      expect(result.current.superLikedCourses).toContainEqual(mockCourse1);
    });

    it('should sync to Supabase with super-like flag', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });
      (likedCoursesService.addLikedCourse as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addSuperLikedCourse(mockCourse1);
      });

      expect(likedCoursesService.addLikedCourse).toHaveBeenCalledWith('user1', mockCourse1, true);
    });

    it('should queue mutation when offline', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: null,
      });
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addSuperLikedCourse(mockCourse1);
      });

      expect(syncQueueService.addToQueue).toHaveBeenCalledWith({
        type: 'LIKE_COURSE',
        payload: { course: mockCourse1, isSuperLike: true },
        timestamp: expect.any(Number),
        userId: 'user1',
      });
    });
  });

  describe('removeLikedCourse', () => {
    it('should remove course from both lists', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([mockCourse1, mockCourse2]))
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]));

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeLikedCourse('course1');
      });

      expect(result.current.likedCourses).not.toContainEqual(mockCourse1);
      expect(result.current.superLikedCourses).not.toContainEqual(mockCourse1);
    });

    it('should sync to Supabase when online and logged in', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [mockCourse1],
        superLikedCourses: [],
        error: null,
      });
      (likedCoursesService.removeLikedCourse as jest.Mock).mockResolvedValue({
        error: null,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeLikedCourse('course1');
      });

      expect(likedCoursesService.removeLikedCourse).toHaveBeenCalledWith('user1', 'course1');
    });

    it('should queue mutation when offline', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [mockCourse1],
        superLikedCourses: [],
        error: null,
      });
      (NetInfo.fetch as jest.Mock).mockResolvedValue({
        isConnected: false,
        isInternetReachable: false,
      });

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeLikedCourse('course1');
      });

      expect(syncQueueService.addToQueue).toHaveBeenCalledWith({
        type: 'UNLIKE_COURSE',
        payload: { courseId: 'course1' },
        timestamp: expect.any(Number),
        userId: 'user1',
      });
    });
  });

  describe('removeSuperLikedCourse', () => {
    it('should remove from super-liked but keep in liked', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]))
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]));

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.removeSuperLikedCourse('course1');
      });

      expect(result.current.likedCourses).toContainEqual(mockCourse1);
      expect(result.current.superLikedCourses).not.toContainEqual(mockCourse1);
    });
  });

  describe('isCourseLiked', () => {
    it('should return true if course is in liked list', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]))
        .mockResolvedValueOnce(JSON.stringify([]));

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isCourseLiked('course1')).toBe(true);
      expect(result.current.isCourseLiked('course2')).toBe(false);
    });
  });

  describe('isCourseSuperLiked', () => {
    it('should return true if course is in super-liked list', async () => {
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([]))
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]));

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isCourseSuperLiked('course1')).toBe(true);
      expect(result.current.isCourseSuperLiked('course2')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should fall back to cache on Supabase error', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: new Error('Network error'),
      });
      (offlineStorageService.getCachedLikedCourses as jest.Mock).mockResolvedValue([mockCourse1]);

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.likedCourses).toEqual([mockCourse1]);
      expect(result.current.syncError).toEqual(new Error('Network error'));
    });

    it('should fall back to AsyncStorage if cache is empty', async () => {
      (useAuth as jest.Mock).mockReturnValue({
        user: { id: 'user1', email: 'test@example.com' },
      });
      (likedCoursesService.getLikedCourses as jest.Mock).mockResolvedValue({
        courses: [],
        superLikedCourses: [],
        error: new Error('Network error'),
      });
      (offlineStorageService.getCachedLikedCourses as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.getItem as jest.Mock)
        .mockResolvedValueOnce(JSON.stringify([mockCourse1]))
        .mockResolvedValueOnce(JSON.stringify([]));

      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.likedCourses).toEqual([mockCourse1]);
    });

    it('should throw error when used outside provider', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useLikedCourses());
      }).toThrow('useLikedCourses must be used within a LikedCoursesProvider');

      console.error = originalError;
    });
  });

  describe('AsyncStorage backup', () => {
    it('should save to AsyncStorage after data changes', async () => {
      const { result } = renderHook(() => useLikedCourses(), { wrapper });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addLikedCourse(mockCourse1);
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          '@CourseSwipe:likedCourses',
          JSON.stringify([mockCourse1])
        );
      });
    });
  });
});
