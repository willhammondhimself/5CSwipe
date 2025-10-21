import { useState, useEffect, useCallback } from 'react';
import { realTimeDataService, RealTimeCourseData, CourseAlert } from '@/utils/realTimeDataService';

/**
 * Hook to get real-time data for a specific course
 */
export function useRealTimeCourse(courseId: string) {
  const [data, setData] = useState<RealTimeCourseData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!courseId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Get initial data
    const initialData = realTimeDataService.getCourseData(courseId);
    if (initialData) {
      setData(initialData);
      setLastUpdated(new Date());
      setIsLoading(false);
    }

    // Subscribe to updates
    const unsubscribe = realTimeDataService.subscribeToCourse(courseId, (newData) => {
      setData(newData);
      setLastUpdated(new Date());
      setIsLoading(false);
    });

    return unsubscribe;
  }, [courseId]);

  return {
    data,
    isLoading,
    lastUpdated,
    isStale: lastUpdated ? Date.now() - lastUpdated.getTime() > 5 * 60 * 1000 : false, // 5 minutes
  };
}

/**
 * Hook to get real-time data for multiple courses
 */
export function useRealTimeCoursesData(courseIds: string[]) {
  const [coursesData, setCoursesData] = useState<{ [courseId: string]: RealTimeCourseData }>({});
  const [loadingCourses, setLoadingCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!courseIds.length) {
      setCoursesData({});
      setLoadingCourses(new Set());
      return;
    }

    setLoadingCourses(new Set(courseIds));
    const unsubscribers: (() => void)[] = [];

    courseIds.forEach(courseId => {
      // Get initial data
      const initialData = realTimeDataService.getCourseData(courseId);
      if (initialData) {
        setCoursesData(prev => ({ ...prev, [courseId]: initialData }));
        setLoadingCourses(prev => {
          const newSet = new Set(prev);
          newSet.delete(courseId);
          return newSet;
        });
      }

      // Subscribe to updates
      const unsubscribe = realTimeDataService.subscribeToCourse(courseId, (newData) => {
        setCoursesData(prev => ({ ...prev, [courseId]: newData }));
        setLoadingCourses(prev => {
          const newSet = new Set(prev);
          newSet.delete(courseId);
          return newSet;
        });
      });

      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [courseIds.join(',')]);

  return {
    coursesData,
    isLoading: loadingCourses.size > 0,
    loadedCount: Object.keys(coursesData).length,
    totalCount: courseIds.length,
  };
}

/**
 * Hook to get real-time course alerts
 */
export function useRealTimeAlerts() {
  const [alerts, setAlerts] = useState<CourseAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = realTimeDataService.subscribeToAlerts((newAlerts) => {
      setAlerts(newAlerts);
      setUnreadCount(newAlerts.filter(alert => !alert.read).length);
    });

    // Get initial count
    setUnreadCount(realTimeDataService.getUnreadAlertsCount());

    return unsubscribe;
  }, []);

  const markAsRead = useCallback((alertId: string) => {
    realTimeDataService.markAlertAsRead(alertId);
  }, []);

  const markAllAsRead = useCallback(() => {
    alerts.forEach(alert => {
      if (!alert.read) {
        realTimeDataService.markAlertAsRead(alert.id);
      }
    });
  }, [alerts]);

  return {
    alerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    hasUnread: unreadCount > 0,
  };
}

/**
 * Hook to get enrollment status with real-time updates
 */
export function useEnrollmentStatus(courseId: string) {
  const { data, isLoading } = useRealTimeCourse(courseId);
  
  const enrollmentStatus = data ? {
    current: data.enrollment.enrollmentCurrent,
    capacity: data.enrollment.enrollmentCap,
    available: data.enrollment.enrollmentCap - data.enrollment.enrollmentCurrent,
    percentFull: (data.enrollment.enrollmentCurrent / data.enrollment.enrollmentCap) * 100,
    isFull: data.enrollment.enrollmentCurrent >= data.enrollment.enrollmentCap,
    trend: data.enrollment.trend,
    waitlist: {
      current: data.enrollment.waitlistCurrent,
      capacity: data.enrollment.waitlistCap,
      hasWaitlist: data.enrollment.waitlistCurrent > 0,
    },
  } : null;

  return {
    enrollmentStatus,
    isLoading,
    lastUpdated: data?.enrollment.lastUpdated,
  };
}

/**
 * Hook to get professor rating with real-time updates
 */
export function useProfessorRating(courseId: string) {
  const { data, isLoading } = useRealTimeCourse(courseId);
  
  const rating = data?.professorRating ? {
    overall: data.professorRating.overall,
    difficulty: data.professorRating.difficulty,
    reviews: data.professorRating.reviews,
    recentReviews: data.professorRating.recentReviews,
    lastUpdated: data.professorRating.lastUpdated,
  } : null;

  return {
    rating,
    isLoading,
    hasRating: rating !== null,
  };
}

/**
 * Hook to get course popularity metrics
 */
export function useCoursePopularity(courseId: string) {
  const { data, isLoading } = useRealTimeCourse(courseId);
  
  const popularity = data ? {
    likesLast24h: data.popularity.likesLast24h,
    viewsLast24h: data.popularity.viewsLast24h,
    searchRank: data.popularity.searchRank,
    trendingScore: data.popularity.trendingScore,
    isTrending: data.popularity.trendingScore > 70,
    isPopular: data.popularity.likesLast24h > 20,
  } : null;

  return {
    popularity,
    isLoading,
  };
}

/**
 * Hook to start/stop real-time data service
 */
export function useRealTimeService(enabled: boolean = true) {
  useEffect(() => {
    if (enabled) {
      realTimeDataService.startRealTimeUpdates(60000); // Update every minute
      return () => {
        realTimeDataService.stopRealTimeUpdates();
      };
    }
  }, [enabled]);

  const getGlobalStats = useCallback(() => {
    return realTimeDataService.getGlobalStats();
  }, []);

  const triggerEnrollmentUpdate = useCallback((courseId: string, newEnrollment: number, newPERMs?: number) => {
    realTimeDataService.triggerEnrollmentUpdate(courseId, newEnrollment, newPERMs);
  }, []);

  return {
    getGlobalStats,
    triggerEnrollmentUpdate, // For testing/demo purposes
  };
}