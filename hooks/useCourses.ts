import { useState, useEffect } from 'react';
import { Course } from '@/data/mockCourses';
import { courseService } from '@/services/courseService';
import { offlineStorageService } from '@/services/offlineStorageService';
import NetInfo from '@react-native-community/netinfo';

interface CourseFilters {
  school?: string;
  department?: string;
  semester?: string;
  search?: string;
}

interface UseCoursesResult {
  courses: Course[];
  loading: boolean;
  error: string | null;
  refreshCourses: () => Promise<void>;
  dataSource: 'supabase' | 'python-api' | 'mock' | 'cache';
}

/**
 * Custom hook for managing course data with real-time updates
 * Automatically handles fallback between Supabase -> Python API -> Mock data
 */
export function useCourses(filters?: CourseFilters): UseCoursesResult {
  console.log('🎯 useCourses hook called with filters:', filters);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'supabase' | 'python-api' | 'mock' | 'cache'>('mock');
  
  console.log('🔄 useCourses hook initialized with filters:', filters);

  const loadCourses = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Loading courses with filters:', filters);

      const semester = filters?.semester || 'FA 2025';

      // Check network status
      const netState = await NetInfo.fetch();
      const isOnline = netState.isConnected && netState.isInternetReachable !== false;

      // If offline or not forcing refresh, try cache first
      if (!isOnline || !forceRefresh) {
        const cached = await offlineStorageService.getCachedCourses(semester);
        if (cached && cached.courses.length > 0) {
          console.log(`📦 Using cached courses: ${cached.courses.length} courses`);
          setCourses(cached.courses);
          setDataSource('cache');
          setLoading(false);

          // If online and not forcing refresh, still try to update cache in background
          if (isOnline && !forceRefresh) {
            console.log('🔄 Updating cache in background...');
            courseService.getCourses(filters)
              .then(async (freshData) => {
                if (freshData.length > 0) {
                  await offlineStorageService.cacheCourses(semester, freshData);
                  setCourses(freshData);
                  setDataSource('python-api');
                  console.log('✅ Cache updated with fresh data');
                }
              })
              .catch((err) => console.warn('⚠️ Background cache update failed:', err));
          }

          return;
        }
      }

      // If online, fetch fresh data
      if (isOnline) {
        const courseData = forceRefresh
          ? await courseService.refreshCourses(filters)
          : await courseService.getCourses(filters);

        console.log('📋 Raw course data received:', courseData.length, 'courses');
        if (courseData.length > 0) {
          console.log('📋 First course sample:', {
            courseCode: courseData[0].courseCode,
            title: courseData[0].title,
            school: courseData[0].school,
            semester: courseData[0].semester,
            meetingDays: courseData[0].meetingDays,
            courseLevel: courseData[0].courseLevel
          });

          // Cache the fresh data
          await offlineStorageService.cacheCourses(semester, courseData);
          console.log('💾 Courses cached for offline use');
        }

        // Determine data source from console logs or response metadata
        if (courseData.length === 0) {
          setDataSource('mock');
        } else {
          setDataSource('python-api');
        }

        setCourses(courseData);
        console.log(`✅ Loaded ${courseData.length} courses`);
      } else {
        // Offline with no cache
        console.log('📵 Offline with no cached data');
        setError('No internet connection. Please try again when online.');
      }

    } catch (err) {
      console.error('❌ Error loading courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');

      // On error, try to use cache as fallback
      try {
        const semester = filters?.semester || 'FA 2025';
        const cached = await offlineStorageService.getCachedCourses(semester);
        if (cached && cached.courses.length > 0) {
          console.log('📦 Using cached courses after error');
          setCourses(cached.courses);
          setDataSource('cache');
        }
      } catch (cacheErr) {
        console.error('❌ Cache fallback also failed:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshCourses = async () => {
    await loadCourses(true);
  };

  console.log('🔄 Setting up useEffect with filters:', filters);
  
  // Load courses when component mounts or filters change
  useEffect(() => {
    console.log('🚀 useEffect TRIGGERED! Loading courses with filters:', filters);
    console.log('🔍 useEffect execution confirmed - calling loadCourses()');
    
    loadCourses().catch((error) => {
      console.error('❌ useEffect loadCourses error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load courses');
      setLoading(false);
    });
  }, [filters?.school, filters?.department, filters?.semester, filters?.search]); // Fixed: proper dependency array
  
  console.log('✅ useCourses hook setup complete, returning results');

  return {
    courses,
    loading,
    error,
    refreshCourses,
    dataSource
  };
}

/**
 * Hook for getting courses with specific department
 */
export function useCoursesForDepartment(department: string): UseCoursesResult {
  return useCourses({ department, semester: 'FA 2025' });
}

/**
 * Hook for getting courses with search
 */
export function useCoursesWithSearch(searchTerm: string): UseCoursesResult {
  return useCourses({ search: searchTerm, semester: 'FA 2025' });
}