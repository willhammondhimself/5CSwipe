import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '@/data/mockCourses';

export interface NotificationSubscription {
  id: string;
  courseId: string;
  courseCode: string;
  type: 'spot_available' | 'waitlist_movement' | 'course_added' | 'enrollment_reminder';
  isActive: boolean;
  createdAt: string;
  notificationIds: string[]; // Store scheduled notification IDs for cancellation
}

export interface NotificationPreferences {
  enablePushNotifications: boolean;
  enableSpotAlerts: boolean;
  enableWaitlistAlerts: boolean;
  enableEnrollmentReminders: boolean;
  enableCourseAddedAlerts: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "08:00"
  notificationSound: 'default' | 'subtle' | 'urgent';
}

const STORAGE_KEYS = {
  SUBSCRIPTIONS: 'notification_subscriptions',
  PREFERENCES: 'notification_preferences',
  PUSH_TOKEN: 'push_token',
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enablePushNotifications: true,
  enableSpotAlerts: true,
  enableWaitlistAlerts: true,
  enableEnrollmentReminders: true,
  enableCourseAddedAlerts: true,
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
  notificationSound: 'default',
};

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const preferences = await NotificationService.getPreferences();

    return {
      shouldShowAlert: preferences.enablePushNotifications,
      shouldPlaySound: preferences.enablePushNotifications && preferences.notificationSound !== 'subtle',
      shouldSetBadge: true,
      shouldShowBanner: preferences.enablePushNotifications,
      shouldShowList: preferences.enablePushNotifications,
    };
  },
});

export class NotificationService {
  private static instance: NotificationService | null = null;
  private pushToken: string | null = null;
  private subscriptions: NotificationSubscription[] = [];
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize the notification service
  public async initialize(): Promise<boolean> {
    try {
      // Load stored preferences and subscriptions
      await this.loadPreferences();
      await this.loadSubscriptions();

      // Request permissions
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Get push token
      await this.getPushToken();

      // Set up notification categories
      await this.setupNotificationCategories();

      return true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return false;
    }
  }

  // Request notification permissions
  public async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('course-alerts', {
          name: 'Course Alerts',
          description: 'Notifications about course availability and enrollment',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#007AFF',
          sound: 'default',
        });

        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Enrollment Reminders',
          description: 'Reminders about upcoming enrollment deadlines',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF9500',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Get push notification token
  private async getPushToken(): Promise<string | null> {
    try {
      // Check if running on a platform that supports push notifications
      if (Platform.OS === 'web') {
        console.warn('Push notifications not supported on web');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      this.pushToken = token;

      // Store token for backend registration
      await AsyncStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

      console.log('Push token:', token);
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Set up notification categories and actions
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('course-alert', [
      {
        identifier: 'view-course',
        buttonTitle: 'View Course',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'dismiss',
        buttonTitle: 'Dismiss',
        options: { opensAppToForeground: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('enrollment-reminder', [
      {
        identifier: 'open-schedule',
        buttonTitle: 'Open Schedule',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'snooze',
        buttonTitle: 'Remind Later',
        options: { opensAppToForeground: false },
      },
    ]);
  }

  // Subscribe to course notifications
  public async subscribeToCourse(
    course: Course,
    type: NotificationSubscription['type']
  ): Promise<boolean> {
    try {
      if (!this.preferences.enablePushNotifications) {
        throw new Error('Push notifications are disabled');
      }

      // Check if already subscribed
      const existingSubscription = this.subscriptions.find(
        sub => sub.courseId === course.id && sub.type === type && sub.isActive
      );

      if (existingSubscription) {
        console.log('Already subscribed to this course notification');
        return true;
      }

      const subscription: NotificationSubscription = {
        id: `${course.id}_${type}_${Date.now()}`,
        courseId: course.id,
        courseCode: course.courseCode,
        type,
        isActive: true,
        createdAt: new Date().toISOString(),
        notificationIds: [],
      };

      // Schedule appropriate notifications based on type
      const notificationIds = await this.scheduleNotificationsForCourse(course, type);
      subscription.notificationIds = notificationIds;

      this.subscriptions.push(subscription);
      await this.saveSubscriptions();

      // In a real app, register with backend server
      await this.registerWithBackend(subscription);

      return true;
    } catch (error) {
      console.error('Error subscribing to course notifications:', error);
      return false;
    }
  }

  // Unsubscribe from course notifications
  public async unsubscribeFromCourse(
    courseId: string,
    type: NotificationSubscription['type']
  ): Promise<boolean> {
    try {
      const subscription = this.subscriptions.find(
        sub => sub.courseId === courseId && sub.type === type && sub.isActive
      );

      if (!subscription) {
        console.log('No active subscription found');
        return true;
      }

      // Cancel scheduled notifications
      await Promise.all(
        subscription.notificationIds.map(id =>
          Notifications.cancelScheduledNotificationAsync(id)
        )
      );

      // Mark subscription as inactive
      subscription.isActive = false;
      await this.saveSubscriptions();

      // Unregister with backend
      await this.unregisterWithBackend(subscription);

      return true;
    } catch (error) {
      console.error('Error unsubscribing from course notifications:', error);
      return false;
    }
  }

  // Schedule notifications for a course
  private async scheduleNotificationsForCourse(
    course: Course,
    type: NotificationSubscription['type']
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    try {
      switch (type) {
        case 'spot_available':
          // This would typically be handled by backend push notifications
          // For demo, we'll schedule a reminder to check
          const spotCheckId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${course.courseCode} - Check for Spots!`,
              body: `There might be spots available in ${course.title}. Check now!`,
              categoryIdentifier: 'course-alert',
              data: { courseId: course.id, type: 'spot_check' },
            },
            trigger: {
              type: 'timeInterval' as const,
              seconds: 3600, // Check in 1 hour
              repeats: true,
            },
          });
          notificationIds.push(spotCheckId);
          break;

        case 'enrollment_reminder':
          // Schedule enrollment deadline reminders
          const oneDayId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Enrollment Reminder',
              body: `Don't forget to enroll in ${course.courseCode} - ${course.title}`,
              categoryIdentifier: 'enrollment-reminder',
              data: { courseId: course.id, type: 'enrollment_reminder' },
            },
            trigger: {
              type: 'timeInterval' as const,
              seconds: 24 * 60 * 60, // 24 hours
            },
          });
          notificationIds.push(oneDayId);

          const threeHoursId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Enrollment Deadline Soon!',
              body: `Only a few hours left to enroll in ${course.courseCode}`,
              categoryIdentifier: 'enrollment-reminder',
              data: { courseId: course.id, type: 'enrollment_urgent' },
            },
            trigger: {
              type: 'timeInterval' as const,
              seconds: 3 * 60 * 60, // 3 hours
            },
          });
          notificationIds.push(threeHoursId);
          break;

        case 'waitlist_movement':
          // Schedule waitlist position check
          const waitlistId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${course.courseCode} Waitlist Update`,
              body: `Check your waitlist position for ${course.title}`,
              categoryIdentifier: 'course-alert',
              data: { courseId: course.id, type: 'waitlist_check' },
            },
            trigger: {
              type: 'timeInterval' as const,
              seconds: 2 * 60 * 60, // Check every 2 hours
              repeats: true,
            },
          });
          notificationIds.push(waitlistId);
          break;

        case 'course_added':
          // Immediate notification that course was added to watchlist
          const addedId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Course Added to Watchlist',
              body: `Now watching ${course.courseCode} - ${course.title} for availability`,
              categoryIdentifier: 'course-alert',
              data: { courseId: course.id, type: 'course_added' },
            },
            trigger: {
              type: 'timeInterval' as const,
              seconds: 5, // 5 seconds delay
            },
          });
          notificationIds.push(addedId);
          break;
      }

      return notificationIds;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return [];
    }
  }

  // Simulate backend registration (in a real app, this would make API calls)
  private async registerWithBackend(subscription: NotificationSubscription): Promise<void> {
    try {
      // Simulate API call
      console.log('Registering notification subscription with backend:', {
        pushToken: this.pushToken,
        subscription: subscription,
      });

      // In a real implementation, you would:
      // - Send push token and subscription details to your backend
      // - Backend would monitor course availability and send push notifications
      // - Store subscription in database with user association
    } catch (error) {
      console.error('Error registering with backend:', error);
    }
  }

  // Simulate backend unregistration
  private async unregisterWithBackend(subscription: NotificationSubscription): Promise<void> {
    try {
      console.log('Unregistering notification subscription with backend:', subscription.id);
      // In a real implementation, remove subscription from backend
    } catch (error) {
      console.error('Error unregistering with backend:', error);
    }
  }

  // Get user's notification preferences
  public static async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
      return stored ? JSON.parse(stored) : DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  // Update notification preferences
  public async updatePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      this.preferences = { ...this.preferences, ...preferences };
      await AsyncStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(this.preferences));

      // If notifications were disabled, cancel all subscriptions
      if (!preferences.enablePushNotifications) {
        await this.cancelAllSubscriptions();
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
    }
  }

  // Load preferences from storage
  private async loadPreferences(): Promise<void> {
    this.preferences = await NotificationService.getPreferences();
  }

  // Load subscriptions from storage
  private async loadSubscriptions(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS);
      this.subscriptions = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      this.subscriptions = [];
    }
  }

  // Save subscriptions to storage
  private async saveSubscriptions(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTIONS, JSON.stringify(this.subscriptions));
    } catch (error) {
      console.error('Error saving subscriptions:', error);
    }
  }

  // Get all active subscriptions
  public getActiveSubscriptions(): NotificationSubscription[] {
    return this.subscriptions.filter(sub => sub.isActive);
  }

  // Get subscriptions for a specific course
  public getCourseSubscriptions(courseId: string): NotificationSubscription[] {
    return this.subscriptions.filter(sub => sub.courseId === courseId && sub.isActive);
  }

  // Cancel all subscriptions
  public async cancelAllSubscriptions(): Promise<void> {
    try {
      // Cancel all scheduled notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Mark all subscriptions as inactive
      this.subscriptions.forEach(sub => {
        sub.isActive = false;
      });

      await this.saveSubscriptions();
    } catch (error) {
      console.error('Error canceling all subscriptions:', error);
    }
  }

  // Check if user is subscribed to a course
  public isSubscribed(courseId: string, type: NotificationSubscription['type']): boolean {
    return this.subscriptions.some(
      sub => sub.courseId === courseId && sub.type === type && sub.isActive
    );
  }

  // Send immediate local notification (for testing)
  public async sendTestNotification(course: Course): Promise<void> {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Test Notification',
        body: `This is a test notification for ${course.courseCode}`,
        categoryIdentifier: 'course-alert',
        data: { courseId: course.id, type: 'test' },
      },
      trigger: {
        type: 'timeInterval' as const,
        seconds: 1,
      },
    });
  }

  // Handle notification responses (when user taps notification)
  public handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification, actionIdentifier } = response;
    const { courseId, type } = notification.request.content.data as any;

    switch (actionIdentifier) {
      case 'view-course':
        // Navigate to course details
        console.log('Navigate to course:', courseId);
        break;
      case 'open-schedule':
        // Navigate to schedule
        console.log('Navigate to schedule');
        break;
      case 'snooze':
        // Reschedule notification for later
        console.log('Snoozing notification for course:', courseId);
        break;
      default:
        // Default tap action
        console.log('Notification tapped:', { courseId, type });
        break;
    }
  }
}

export default NotificationService;