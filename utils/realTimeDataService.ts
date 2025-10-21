import { Course } from '@/data/mockCourses';

export interface EnrollmentUpdate {
  courseId: string;
  enrollmentCurrent: number;
  enrollmentCap: number;
  waitlistCurrent: number;
  waitlistCap: number;
  lastUpdated: string;
  trend: 'rising' | 'falling' | 'stable';
}

export interface ProfessorRatingUpdate {
  professorName: string;
  overall: number;
  difficulty: number;
  reviews: number;
  lastUpdated: string;
  recentReviews: {
    rating: number;
    comment: string;
    courseCode: string;
    semester: string;
    date: string;
  }[];
}

export interface CourseAlert {
  id: string;
  courseId: string;
  type: 'enrollment_opening' | 'perms_movement' | 'rating_change' | 'schedule_change';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  read: boolean;
}

export interface RealTimeCourseData {
  courseId: string;
  enrollment: EnrollmentUpdate;
  professorRating: ProfessorRatingUpdate | null;
  alerts: CourseAlert[];
  popularity: {
    likesLast24h: number;
    viewsLast24h: number;
    searchRank: number;
    trendingScore: number;
  };
}

export class RealTimeDataService {
  private static instance: RealTimeDataService;
  private updateInterval: NodeJS.Timeout | null = null;
  private subscribers: { [courseId: string]: ((data: RealTimeCourseData) => void)[] } = {};
  private courseDataCache: { [courseId: string]: RealTimeCourseData } = {};
  private alertSubscribers: ((alerts: CourseAlert[]) => void)[] = [];
  private allAlerts: CourseAlert[] = [];

  static getInstance(): RealTimeDataService {
    if (!RealTimeDataService.instance) {
      RealTimeDataService.instance = new RealTimeDataService();
    }
    return RealTimeDataService.instance;
  }

  /**
   * Start real-time data updates
   */
  startRealTimeUpdates(intervalMs: number = 60000): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.simulateDataUpdates();
    }, intervalMs);
  }

  /**
   * Stop real-time data updates
   */
  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Subscribe to real-time updates for a specific course
   */
  subscribeToCourse(courseId: string, callback: (data: RealTimeCourseData) => void): () => void {
    if (!this.subscribers[courseId]) {
      this.subscribers[courseId] = [];
    }
    this.subscribers[courseId].push(callback);

    // Send current data immediately if available
    if (this.courseDataCache[courseId]) {
      callback(this.courseDataCache[courseId]);
    }

    // Return unsubscribe function
    return () => {
      this.subscribers[courseId] = this.subscribers[courseId].filter(cb => cb !== callback);
      if (this.subscribers[courseId].length === 0) {
        delete this.subscribers[courseId];
      }
    };
  }

  /**
   * Subscribe to course alerts
   */
  subscribeToAlerts(callback: (alerts: CourseAlert[]) => void): () => void {
    this.alertSubscribers.push(callback);

    // Send current alerts immediately
    if (this.allAlerts.length > 0) {
      callback(this.allAlerts);
    }

    // Return unsubscribe function
    return () => {
      this.alertSubscribers = this.alertSubscribers.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current data for a course (synchronous)
   */
  getCourseData(courseId: string): RealTimeCourseData | null {
    return this.courseDataCache[courseId] || null;
  }

  /**
   * Mark an alert as read
   */
  markAlertAsRead(alertId: string): void {
    const alert = this.allAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
      this.notifyAlertSubscribers();
    }
  }

  /**
   * Get unread alerts count
   */
  getUnreadAlertsCount(): number {
    return this.allAlerts.filter(alert => !alert.read).length;
  }

  /**
   * Simulate real-time data updates
   */
  private simulateDataUpdates(): void {
    // Get all subscribed course IDs
    const courseIds = Object.keys(this.subscribers);

    courseIds.forEach(courseId => {
      const currentData = this.courseDataCache[courseId] || this.generateInitialData(courseId);
      const updatedData = this.simulateDataChange(currentData);
      
      this.courseDataCache[courseId] = updatedData;
      
      // Check if we need to generate any alerts
      this.checkForAlerts(currentData, updatedData);
      
      // Notify subscribers
      this.subscribers[courseId].forEach(callback => {
        try {
          callback(updatedData);
        } catch (error) {
          console.error('Error in real-time data callback:', error);
        }
      });
    });
  }

  /**
   * Generate initial data for a course
   */
  private generateInitialData(courseId: string): RealTimeCourseData {
    const baseEnrollment = Math.floor(Math.random() * 80) + 10; // 10-90
    const enrollmentCap = Math.floor(Math.random() * 40) + 60; // 60-100
    const waitlistCap = Math.floor(enrollmentCap * 0.3);
    
    return {
      courseId,
      enrollment: {
        courseId,
        enrollmentCurrent: Math.min(baseEnrollment, enrollmentCap),
        enrollmentCap,
        waitlistCurrent: Math.floor(Math.random() * waitlistCap),
        waitlistCap,
        lastUpdated: new Date().toISOString(),
        trend: 'stable' as const,
      },
      professorRating: this.generateProfessorRating(),
      alerts: [],
      popularity: {
        likesLast24h: Math.floor(Math.random() * 50),
        viewsLast24h: Math.floor(Math.random() * 200) + 50,
        searchRank: Math.floor(Math.random() * 100) + 1,
        trendingScore: Math.random() * 100,
      },
    };
  }

  /**
   * Generate professor rating data
   */
  private generateProfessorRating(): ProfessorRatingUpdate {
    const professorNames = [
      'Dr. Sarah Johnson', 'Prof. Michael Chen', 'Dr. Emily Rodriguez',
      'Prof. David Kim', 'Dr. Jessica Williams', 'Prof. Thomas Anderson'
    ];
    
    const overall = Math.random() * 2 + 3; // 3.0-5.0
    const difficulty = Math.random() * 3 + 2; // 2.0-5.0
    
    return {
      professorName: professorNames[Math.floor(Math.random() * professorNames.length)],
      overall: Math.round(overall * 10) / 10,
      difficulty: Math.round(difficulty * 10) / 10,
      reviews: Math.floor(Math.random() * 200) + 10,
      lastUpdated: new Date().toISOString(),
      recentReviews: this.generateRecentReviews(),
    };
  }

  /**
   * Generate recent reviews
   */
  private generateRecentReviews() {
    const comments = [
      'Great professor, very engaging lectures',
      'Challenging but fair grading',
      'Office hours are very helpful',
      'Clear explanations of complex topics',
      'Heavy workload but worth it',
      'Responsive to student questions'
    ];

    const courses = ['CSCI 121', 'MATH 181', 'PHYS 24', 'CHEM 23'];

    return Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => ({
      rating: Math.floor(Math.random() * 5) + 1,
      comment: comments[Math.floor(Math.random() * comments.length)],
      courseCode: courses[Math.floor(Math.random() * courses.length)],
      semester: 'Fall 2024',
      date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  }

  /**
   * Simulate changes to data
   */
  private simulateDataChange(currentData: RealTimeCourseData): RealTimeCourseData {
    const newData = JSON.parse(JSON.stringify(currentData)) as RealTimeCourseData;

    // Simulate enrollment changes (small random fluctuations)
    const enrollmentChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
    newData.enrollment.enrollmentCurrent = Math.max(0, 
      Math.min(
        newData.enrollment.enrollmentCap, 
        newData.enrollment.enrollmentCurrent + enrollmentChange
      )
    );

    // Update trend
    if (enrollmentChange > 0) {
      newData.enrollment.trend = 'rising';
    } else if (enrollmentChange < 0) {
      newData.enrollment.trend = 'falling';
    } else {
      newData.enrollment.trend = 'stable';
    }

    // Simulate PERMs changes
    const waitlistChange = Math.floor(Math.random() * 3) - 1; // -1 to +1
    newData.enrollment.waitlistCurrent = Math.max(0,
      Math.min(
        newData.enrollment.waitlistCap,
        newData.enrollment.waitlistCurrent + waitlistChange
      )
    );

    // Update timestamp
    newData.enrollment.lastUpdated = new Date().toISOString();

    // Occasionally update professor ratings (5% chance)
    if (Math.random() < 0.05 && newData.professorRating) {
      const ratingChange = (Math.random() - 0.5) * 0.2; // -0.1 to +0.1
      newData.professorRating.overall = Math.max(1, Math.min(5, 
        newData.professorRating.overall + ratingChange
      ));
      newData.professorRating.reviews += Math.floor(Math.random() * 3);
      newData.professorRating.lastUpdated = new Date().toISOString();
    }

    // Update popularity metrics
    newData.popularity.likesLast24h += Math.floor(Math.random() * 10) - 4; // -4 to +5
    newData.popularity.viewsLast24h += Math.floor(Math.random() * 20) - 8; // -8 to +11
    newData.popularity.trendingScore = Math.max(0, 
      newData.popularity.trendingScore + (Math.random() - 0.5) * 10
    );

    return newData;
  }

  /**
   * Check for conditions that should generate alerts
   */
  private checkForAlerts(oldData: RealTimeCourseData | null, newData: RealTimeCourseData): void {
    if (!oldData) return;

    const alerts: CourseAlert[] = [];

    // Check for enrollment opening up
    if (oldData.enrollment.enrollmentCurrent >= oldData.enrollment.enrollmentCap &&
        newData.enrollment.enrollmentCurrent < newData.enrollment.enrollmentCap) {
      alerts.push({
        id: `${newData.courseId}-enrollment-${Date.now()}`,
        courseId: newData.courseId,
        type: 'enrollment_opening',
        title: 'Spot Available!',
        message: `A spot just opened up in course ${newData.courseId}`,
        priority: 'high',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // Check for PERMs movement
    if (oldData.enrollment.waitlistCurrent > newData.enrollment.waitlistCurrent) {
      alerts.push({
        id: `${newData.courseId}-perms-${Date.now()}`,
        courseId: newData.courseId,
        type: 'perms_movement',
        title: 'PERMs Moving',
        message: `PERMs for ${newData.courseId} are moving - you might get in soon!`,
        priority: 'medium',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // Check for significant rating changes
    if (oldData.professorRating && newData.professorRating) {
      const ratingDiff = Math.abs(newData.professorRating.overall - oldData.professorRating.overall);
      if (ratingDiff > 0.3) {
        alerts.push({
          id: `${newData.courseId}-rating-${Date.now()}`,
          courseId: newData.courseId,
          type: 'rating_change',
          title: 'Professor Rating Updated',
          message: `Professor rating for ${newData.courseId} changed to ${newData.professorRating.overall.toFixed(1)}⭐`,
          priority: 'low',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }
    }

    // Add new alerts to the global list
    if (alerts.length > 0) {
      this.allAlerts.unshift(...alerts);
      // Keep only last 50 alerts
      this.allAlerts = this.allAlerts.slice(0, 50);
      this.notifyAlertSubscribers();
    }
  }

  /**
   * Notify all alert subscribers
   */
  private notifyAlertSubscribers(): void {
    this.alertSubscribers.forEach(callback => {
      try {
        callback(this.allAlerts);
      } catch (error) {
        console.error('Error in alert callback:', error);
      }
    });
  }

  /**
   * Manually trigger enrollment update for a course (for testing)
   */
  triggerEnrollmentUpdate(courseId: string, newEnrollment: number, newPERMs?: number): void {
    const currentData = this.courseDataCache[courseId];
    if (currentData) {
      const oldData = JSON.parse(JSON.stringify(currentData));
      
      currentData.enrollment.enrollmentCurrent = newEnrollment;
      if (newPERMs !== undefined) {
        currentData.enrollment.waitlistCurrent = newPERMs;
      }
      currentData.enrollment.lastUpdated = new Date().toISOString();
      
      this.checkForAlerts(oldData, currentData);
      
      // Notify subscribers
      this.subscribers[courseId]?.forEach(callback => callback(currentData));
    }
  }

  /**
   * Get aggregated real-time statistics
   */
  getGlobalStats() {
    const allCourseData = Object.values(this.courseDataCache);
    
    return {
      totalCoursesTracked: allCourseData.length,
      averageEnrollmentPercentage: allCourseData.length > 0 
        ? allCourseData.reduce((sum, data) => 
            sum + (data.enrollment.enrollmentCurrent / data.enrollment.enrollmentCap), 0) / allCourseData.length 
        : 0,
      coursesWithAvailability: allCourseData.filter(data => 
        data.enrollment.enrollmentCurrent < data.enrollment.enrollmentCap).length,
      totalAlerts: this.allAlerts.length,
      unreadAlerts: this.getUnreadAlertsCount(),
      trendingCourses: allCourseData
        .sort((a, b) => b.popularity.trendingScore - a.popularity.trendingScore)
        .slice(0, 5)
        .map(data => data.courseId),
    };
  }
}

// Export singleton instance
export const realTimeDataService = RealTimeDataService.getInstance();