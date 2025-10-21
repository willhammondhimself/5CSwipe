import { useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { Course } from '@/data/mockCourses';
import NotificationService, { 
  NotificationSubscription, 
  NotificationPreferences 
} from '@/services/notificationService';

export function useNotifications() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const notificationService = NotificationService.getInstance();

  // Initialize notification service
  useEffect(() => {
    const initializeService = async () => {
      setIsLoading(true);
      try {
        const success = await notificationService.initialize();
        setIsInitialized(success);
        setHasPermission(success);

        if (success) {
          // Load current subscriptions and preferences
          const currentSubscriptions = notificationService.getActiveSubscriptions();
          const currentPreferences = await NotificationService.getPreferences();
          
          setSubscriptions(currentSubscriptions);
          setPreferences(currentPreferences);
        }
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
        setIsInitialized(false);
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, []);

  // Set up notification response listener
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        notificationService.handleNotificationResponse(response);
      }
    );

    return () => {
      responseSubscription.remove();
    };
  }, []);

  // Request notification permissions
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await notificationService.requestPermissions();
      setHasPermission(granted);
      
      if (granted && !isInitialized) {
        const success = await notificationService.initialize();
        setIsInitialized(success);
      }
      
      return granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, [isInitialized]);

  // Subscribe to course notifications
  const subscribeToCourse = useCallback(async (
    course: Course,
    type: NotificationSubscription['type']
  ): Promise<boolean> => {
    if (!isInitialized || !hasPermission) {
      console.warn('Notifications not initialized or permission not granted');
      return false;
    }

    try {
      const success = await notificationService.subscribeToCourse(course, type);
      
      if (success) {
        // Refresh subscriptions list
        const updatedSubscriptions = notificationService.getActiveSubscriptions();
        setSubscriptions(updatedSubscriptions);
      }
      
      return success;
    } catch (error) {
      console.error('Error subscribing to course:', error);
      return false;
    }
  }, [isInitialized, hasPermission]);

  // Unsubscribe from course notifications
  const unsubscribeFromCourse = useCallback(async (
    courseId: string,
    type: NotificationSubscription['type']
  ): Promise<boolean> => {
    if (!isInitialized) {
      console.warn('Notifications not initialized');
      return false;
    }

    try {
      const success = await notificationService.unsubscribeFromCourse(courseId, type);
      
      if (success) {
        // Refresh subscriptions list
        const updatedSubscriptions = notificationService.getActiveSubscriptions();
        setSubscriptions(updatedSubscriptions);
      }
      
      return success;
    } catch (error) {
      console.error('Error unsubscribing from course:', error);
      return false;
    }
  }, [isInitialized]);

  // Update notification preferences
  const updatePreferences = useCallback(async (
    newPreferences: Partial<NotificationPreferences>
  ): Promise<void> => {
    if (!isInitialized) {
      console.warn('Notifications not initialized');
      return;
    }

    try {
      await notificationService.updatePreferences(newPreferences);
      const updatedPreferences = await NotificationService.getPreferences();
      setPreferences(updatedPreferences);

      // If notifications were disabled, refresh subscriptions
      if (newPreferences.enablePushNotifications === false) {
        setSubscriptions([]);
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  }, [isInitialized]);

  // Check if subscribed to a course
  const isSubscribedToCourse = useCallback((
    courseId: string,
    type: NotificationSubscription['type']
  ): boolean => {
    return notificationService.isSubscribed(courseId, type);
  }, [subscriptions]);

  // Get subscriptions for a specific course
  const getCourseSubscriptions = useCallback((courseId: string): NotificationSubscription[] => {
    return notificationService.getCourseSubscriptions(courseId);
  }, [subscriptions]);

  // Toggle subscription for a course
  const toggleCourseSubscription = useCallback(async (
    course: Course,
    type: NotificationSubscription['type']
  ): Promise<boolean> => {
    const isCurrentlySubscribed = isSubscribedToCourse(course.id, type);
    
    if (isCurrentlySubscribed) {
      return await unsubscribeFromCourse(course.id, type);
    } else {
      return await subscribeToCourse(course, type);
    }
  }, [isSubscribedToCourse, subscribeToCourse, unsubscribeFromCourse]);

  // Cancel all subscriptions
  const cancelAllSubscriptions = useCallback(async (): Promise<void> => {
    if (!isInitialized) {
      console.warn('Notifications not initialized');
      return;
    }

    try {
      await notificationService.cancelAllSubscriptions();
      setSubscriptions([]);
    } catch (error) {
      console.error('Error canceling all subscriptions:', error);
    }
  }, [isInitialized]);

  // Send test notification
  const sendTestNotification = useCallback(async (course: Course): Promise<void> => {
    if (!isInitialized || !hasPermission) {
      console.warn('Notifications not available');
      return;
    }

    try {
      await notificationService.sendTestNotification(course);
    } catch (error) {
      console.error('Error sending test notification:', error);
    }
  }, [isInitialized, hasPermission]);

  // Get notification statistics
  const getNotificationStats = useCallback(() => {
    return {
      totalSubscriptions: subscriptions.length,
      spotAlerts: subscriptions.filter(s => s.type === 'spot_available').length,
      waitlistAlerts: subscriptions.filter(s => s.type === 'waitlist_movement').length,
      enrollmentReminders: subscriptions.filter(s => s.type === 'enrollment_reminder').length,
      courseAddedAlerts: subscriptions.filter(s => s.type === 'course_added').length,
    };
  }, [subscriptions]);

  // Quick subscribe to most useful notifications for a course
  const quickSubscribeToCourse = useCallback(async (course: Course): Promise<boolean> => {
    if (!isInitialized || !hasPermission) {
      return false;
    }

    try {
      let allSuccess = true;

      // Subscribe to spot availability if course is full or nearly full
      const enrollmentPercentage = (course.enrollmentCurrent / course.enrollmentCap) * 100;
      if (enrollmentPercentage >= 90) {
        const spotSuccess = await subscribeToCourse(course, 'spot_available');
        if (!spotSuccess) allSuccess = false;
      }

      // Subscribe to waitlist movement if there's a waitlist
      if (course.waitlistCap && course.waitlistCap > 0) {
        const waitlistSuccess = await subscribeToCourse(course, 'waitlist_movement');
        if (!waitlistSuccess) allSuccess = false;
      }

      // Always subscribe to course added notification
      const addedSuccess = await subscribeToCourse(course, 'course_added');
      if (!addedSuccess) allSuccess = false;

      return allSuccess;
    } catch (error) {
      console.error('Error with quick subscribe:', error);
      return false;
    }
  }, [isInitialized, hasPermission, subscribeToCourse]);

  return {
    // State
    isInitialized,
    hasPermission,
    isLoading,
    subscriptions,
    preferences,
    
    // Actions
    requestPermissions,
    subscribeToCourse,
    unsubscribeFromCourse,
    toggleCourseSubscription,
    quickSubscribeToCourse,
    updatePreferences,
    cancelAllSubscriptions,
    sendTestNotification,
    
    // Utilities
    isSubscribedToCourse,
    getCourseSubscriptions,
    getNotificationStats,
  };
}

export default useNotifications;