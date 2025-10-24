/**
 * LikedCoursesContext.tsx
 * =======================
 * User liked courses management with Supabase sync
 *
 * Features:
 * - Supabase backend with RLS
 * - Real-time sync across devices
 * - Super-like support
 * - AsyncStorage fallback for offline
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '@/data/mockCourses';
import { useAuth } from './AuthContext';
import {
  getLikedCourses,
  addLikedCourse as addLikedCourseDB,
  removeLikedCourse as removeLikedCourseDB,
  subscribeLikedCourses,
} from '../services/likedCoursesService';
import { syncQueueService } from '../services/syncQueueService';
import { offlineStorageService } from '../services/offlineStorageService';
import NetInfo from '@react-native-community/netinfo';

interface LikedCoursesContextType {
  likedCourses: Course[];
  superLikedCourses: Course[];
  addLikedCourse: (course: Course) => Promise<void>;
  addSuperLikedCourse: (course: Course) => Promise<void>;
  removeLikedCourse: (courseId: string) => Promise<void>;
  removeSuperLikedCourse: (courseId: string) => Promise<void>;
  isCourseLiked: (courseId: string) => boolean;
  isCourseSuperLiked: (courseId: string) => boolean;
  loading: boolean;
  syncError: Error | null;
}

const LikedCoursesContext = createContext<LikedCoursesContextType | undefined>(undefined);

const LIKED_COURSES_KEY = '@CourseSwipe:likedCourses';
const SUPER_LIKED_COURSES_KEY = '@CourseSwipe:superLikedCourses';

export function LikedCoursesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [likedCourses, setLikedCourses] = useState<Course[]>([]);
  const [superLikedCourses, setSuperLikedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Load data on mount and when user changes
  useEffect(() => {
    if (user) {
      loadFromSupabase();
      processSyncQueue(); // Process any queued mutations on mount

      // Subscribe to real-time updates
      const unsubscribe = subscribeLikedCourses(user.id, () => {
        console.log('📡 Real-time update received, refreshing liked courses');
        loadFromSupabase();
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      // Not logged in - load from AsyncStorage
      loadFromAsyncStorage();
    }
  }, [user]);

  // Save to AsyncStorage as backup whenever data changes
  useEffect(() => {
    if (!loading) {
      saveToAsyncStorage();
    }
  }, [likedCourses, superLikedCourses, loading]);

  const processSyncQueue = async () => {
    if (!user) return;

    console.log('🔄 Processing sync queue for liked courses...');

    const result = await syncQueueService.processQueue(async (mutation) => {
      switch (mutation.type) {
        case 'LIKE_COURSE':
          await addLikedCourseDB(mutation.userId, mutation.payload.course, mutation.payload.isSuperLike);
          break;
        case 'UNLIKE_COURSE':
          await removeLikedCourseDB(mutation.userId, mutation.payload.courseId);
          break;
      }
    });

    if (result.processed > 0) {
      console.log(`✅ Processed ${result.processed} queued mutations`);
      await loadFromSupabase(); // Reload fresh data after sync
    }

    if (result.failed > 0) {
      console.warn(`⚠️ ${result.failed} mutations failed to sync`);
    }
  };

  const loadFromSupabase = async () => {
    if (!user) return;

    setLoading(true);
    setSyncError(null);

    try {
      const { courses, superLikedCourses: superLiked, error } = await getLikedCourses(user.id);

      if (error) {
        console.error('❌ Error loading liked courses from Supabase:', error);
        setSyncError(error);
        // Fall back to cache
        const cached = await offlineStorageService.getCachedLikedCourses(user.id);
        if (cached) {
          setLikedCourses(cached.filter(c => !c.isSuperLike));
          setSuperLikedCourses(cached.filter(c => c.isSuperLike));
        } else {
          await loadFromAsyncStorage();
        }
      } else {
        console.log(`✅ Loaded ${courses.length} liked courses from Supabase`);
        setLikedCourses(courses);
        setSuperLikedCourses(superLiked);

        // Cache for offline use
        await offlineStorageService.cacheLikedCourses(user.id, [...courses, ...superLiked]);
      }
    } catch (error) {
      console.error('❌ Exception loading liked courses:', error);
      setSyncError(error as Error);
      await loadFromAsyncStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromAsyncStorage = async () => {
    try {
      const [storedLiked, storedSuperLiked] = await Promise.all([
        AsyncStorage.getItem(LIKED_COURSES_KEY),
        AsyncStorage.getItem(SUPER_LIKED_COURSES_KEY),
      ]);

      if (storedLiked) {
        setLikedCourses(JSON.parse(storedLiked));
      }
      if (storedSuperLiked) {
        setSuperLikedCourses(JSON.parse(storedSuperLiked));
      }

      console.log('📱 Loaded liked courses from AsyncStorage');
    } catch (error) {
      console.error('Error loading from AsyncStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveToAsyncStorage = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(LIKED_COURSES_KEY, JSON.stringify(likedCourses)),
        AsyncStorage.setItem(SUPER_LIKED_COURSES_KEY, JSON.stringify(superLikedCourses)),
      ]);
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
  };

  const addLikedCourse = async (course: Course) => {
    // Optimistic update
    setLikedCourses(prev => {
      if (prev.some(c => c.id === course.id)) return prev;
      return [...prev, course];
    });

    // Sync to Supabase if logged in
    if (user) {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      if (!isOnline) {
        // Queue for later sync
        console.log('📵 Offline - queuing like mutation');
        await syncQueueService.addToQueue({
          type: 'LIKE_COURSE',
          payload: { course, isSuperLike: false },
          timestamp: Date.now(),
          userId: user.id,
        });
        return;
      }

      const { error } = await addLikedCourseDB(user.id, course, false);
      if (error) {
        console.error('❌ Error adding liked course:', error);
        setSyncError(error);

        // Queue for retry
        await syncQueueService.addToQueue({
          type: 'LIKE_COURSE',
          payload: { course, isSuperLike: false },
          timestamp: Date.now(),
          userId: user.id,
        });

        // Revert optimistic update
        setLikedCourses(prev => prev.filter(c => c.id !== course.id));
      } else {
        console.log('✅ Added liked course to Supabase');
        // Cache updated data
        await offlineStorageService.cacheLikedCourses(user.id, [...likedCourses, course]);
      }
    }
  };

  const addSuperLikedCourse = async (course: Course) => {
    // Optimistic update
    setSuperLikedCourses(prev => {
      if (prev.some(c => c.id === course.id)) return prev;
      return [...prev, course];
    });

    // Also add to regular likes
    if (!likedCourses.some(c => c.id === course.id)) {
      setLikedCourses(prev => [...prev, course]);
    }

    // Sync to Supabase if logged in
    if (user) {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      if (!isOnline) {
        // Queue for later sync
        console.log('📵 Offline - queuing super-like mutation');
        await syncQueueService.addToQueue({
          type: 'LIKE_COURSE',
          payload: { course, isSuperLike: true },
          timestamp: Date.now(),
          userId: user.id,
        });
        return;
      }

      const { error } = await addLikedCourseDB(user.id, course, true);
      if (error) {
        console.error('❌ Error adding super-liked course:', error);
        setSyncError(error);

        // Queue for retry
        await syncQueueService.addToQueue({
          type: 'LIKE_COURSE',
          payload: { course, isSuperLike: true },
          timestamp: Date.now(),
          userId: user.id,
        });

        // Revert optimistic update
        setSuperLikedCourses(prev => prev.filter(c => c.id !== course.id));
      } else {
        console.log('✅ Added super-liked course to Supabase');
        // Cache updated data
        await offlineStorageService.cacheLikedCourses(user.id, [...likedCourses, ...superLikedCourses, course]);
      }
    }
  };

  const removeLikedCourse = async (courseId: string) => {
    // Optimistic update
    setLikedCourses(prev => prev.filter(c => c.id !== courseId));
    setSuperLikedCourses(prev => prev.filter(c => c.id !== courseId));

    // Sync to Supabase if logged in
    if (user) {
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      if (!isOnline) {
        // Queue for later sync
        console.log('📵 Offline - queuing unlike mutation');
        await syncQueueService.addToQueue({
          type: 'UNLIKE_COURSE',
          payload: { courseId },
          timestamp: Date.now(),
          userId: user.id,
        });
        return;
      }

      const { error } = await removeLikedCourseDB(user.id, courseId);
      if (error) {
        console.error('❌ Error removing liked course:', error);
        setSyncError(error);

        // Queue for retry
        await syncQueueService.addToQueue({
          type: 'UNLIKE_COURSE',
          payload: { courseId },
          timestamp: Date.now(),
          userId: user.id,
        });

        // Revert optimistic update - reload from server
        await loadFromSupabase();
      } else {
        console.log('✅ Removed liked course from Supabase');
        // Cache updated data
        const updatedLiked = likedCourses.filter(c => c.id !== courseId);
        const updatedSuperLiked = superLikedCourses.filter(c => c.id !== courseId);
        await offlineStorageService.cacheLikedCourses(user.id, [...updatedLiked, ...updatedSuperLiked]);
      }
    }
  };

  const removeSuperLikedCourse = async (courseId: string) => {
    // Just remove from super likes, keep in regular likes
    setSuperLikedCourses(prev => prev.filter(c => c.id !== courseId));

    // Update in Supabase if logged in
    if (user) {
      const { error } = await addLikedCourseDB(
        user.id,
        likedCourses.find(c => c.id === courseId)!,
        false
      );
      if (error) {
        console.error('❌ Error updating super-like status:', error);
        setSyncError(error);
        // Reload from server
        await loadFromSupabase();
      } else {
        console.log('✅ Updated super-like status in Supabase');
      }
    }
  };

  const isCourseLiked = (courseId: string): boolean => {
    return likedCourses.some(c => c.id === courseId);
  };

  const isCourseSuperLiked = (courseId: string): boolean => {
    return superLikedCourses.some(c => c.id === courseId);
  };

  const value: LikedCoursesContextType = {
    likedCourses,
    superLikedCourses,
    addLikedCourse,
    addSuperLikedCourse,
    removeLikedCourse,
    removeSuperLikedCourse,
    isCourseLiked,
    isCourseSuperLiked,
    loading,
    syncError,
  };

  return (
    <LikedCoursesContext.Provider value={value}>
      {children}
    </LikedCoursesContext.Provider>
  );
}

export function useLikedCourses() {
  const context = useContext(LikedCoursesContext);
  if (context === undefined) {
    throw new Error('useLikedCourses must be used within a LikedCoursesProvider');
  }
  return context;
}
