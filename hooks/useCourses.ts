import { useState, useEffect } from 'react';
import { Course } from '@/data/mockCourses';
import { courseService } from '@/services/courseService';

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
      }
      
      // Determine data source from console logs or response metadata
      if (courseData.length === 0) {
        setDataSource('mock');
      } else {
        // We can enhance this later to get actual source info
        setDataSource('python-api'); // Assume Python API for now since Supabase is empty
      }
      
      setCourses(courseData);
      console.log(`✅ Loaded ${courseData.length} courses`);
      
    } catch (err) {
      console.error('❌ Error loading courses:', err);
      setError(err instanceof Error ? err.message : 'Failed to load courses');
      // Don't clear courses on error - keep showing last good data
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