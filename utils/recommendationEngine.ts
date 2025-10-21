import { Course } from '@/data/mockCourses';

export interface SwipeHistory {
  courseId: string;
  action: 'like' | 'superlike' | 'nope';
  timestamp: Date;
  course: Course;
}

export interface UserPreferences {
  preferredSchools: string[];
  preferredDepartments: string[];
  preferredProfessorRatingMin: number;
  preferredTimeSlots: string[];
  preferredMeetingDays: string[];
  preferredCourseLevel: string[];
  preferredInstructionMethod: string[];
  avoidedProfessors: string[];
  maxEnrollmentPercentage: number;
}

export interface RecommendationScore {
  courseId: string;
  score: number;
  reasons: string[];
  confidence: 'low' | 'medium' | 'high';
}

export class CourseRecommendationEngine {
  private swipeHistory: SwipeHistory[] = [];
  private userPreferences: UserPreferences = {
    preferredSchools: [],
    preferredDepartments: [],
    preferredProfessorRatingMin: 0,
    preferredTimeSlots: [],
    preferredMeetingDays: [],
    preferredCourseLevel: [],
    preferredInstructionMethod: [],
    avoidedProfessors: [],
    maxEnrollmentPercentage: 100,
  };

  constructor(swipeHistory?: SwipeHistory[]) {
    if (swipeHistory) {
      this.swipeHistory = swipeHistory;
      this.analyzeSwipePatterns();
    }
  }

  /**
   * Add a new swipe to the history and update preferences
   */
  recordSwipe(course: Course, action: 'like' | 'superlike' | 'nope'): void {
    const swipe: SwipeHistory = {
      courseId: course.id,
      action,
      timestamp: new Date(),
      course,
    };
    
    this.swipeHistory.push(swipe);
    
    // Keep only last 200 swipes for performance
    if (this.swipeHistory.length > 200) {
      this.swipeHistory = this.swipeHistory.slice(-200);
    }
    
    this.analyzeSwipePatterns();
  }

  /**
   * Analyze swipe patterns to extract user preferences
   */
  private analyzeSwipePatterns(): void {
    const likedCourses = this.swipeHistory.filter(s => s.action === 'like' || s.action === 'superlike');
    const nopedCourses = this.swipeHistory.filter(s => s.action === 'nope');
    
    if (likedCourses.length === 0) return;

    // Analyze preferred schools
    const schoolCounts = this.countOccurrences(likedCourses, 'school');
    this.userPreferences.preferredSchools = this.getTopChoices(schoolCounts, 0.3);

    // Analyze preferred departments
    const deptCounts = this.countOccurrences(likedCourses, 'department');
    this.userPreferences.preferredDepartments = this.getTopChoices(deptCounts, 0.25);

    // Analyze preferred course levels
    const levelCounts = this.countOccurrences(likedCourses, 'courseLevel');
    this.userPreferences.preferredCourseLevel = this.getTopChoices(levelCounts, 0.2);

    // Analyze preferred instruction methods
    const methodCounts = this.countOccurrences(likedCourses, 'instructionMethod');
    this.userPreferences.preferredInstructionMethod = this.getTopChoices(methodCounts, 0.4);

    // Analyze professor rating threshold
    const likedRatings = likedCourses
      .map(s => s.course.professorRating?.overall)
      .filter(rating => rating !== undefined) as number[];
    
    if (likedRatings.length > 0) {
      this.userPreferences.preferredProfessorRatingMin = Math.max(
        0, 
        this.calculatePercentile(likedRatings, 0.25) // 25th percentile of liked ratings
      );
    }

    // Analyze avoided professors
    const nopedProfessors = nopedCourses.map(s => s.course.professor);
    const professorNopes = this.countArray(nopedProfessors);
    this.userPreferences.avoidedProfessors = Object.keys(professorNopes)
      .filter(prof => professorNopes[prof] >= 2); // Avoid if noped twice

    // Analyze enrollment preference (avoid overcrowded courses?)
    const likedEnrollmentPercentages = likedCourses.map(s => 
      (s.course.enrollmentCurrent / s.course.enrollmentCap) * 100
    );
    
    if (likedEnrollmentPercentages.length > 0) {
      this.userPreferences.maxEnrollmentPercentage = Math.min(
        100,
        this.calculatePercentile(likedEnrollmentPercentages, 0.8) // 80th percentile
      );
    }

    // Analyze preferred meeting days
    const dayPreferences: { [key: string]: number } = {};
    likedCourses.forEach(swipe => {
      swipe.course.meetingDays?.forEach(day => {
        dayPreferences[day] = (dayPreferences[day] || 0) + 1;
      });
    });
    
    const totalLiked = likedCourses.length;
    this.userPreferences.preferredMeetingDays = Object.keys(dayPreferences)
      .filter(day => dayPreferences[day] / totalLiked > 0.3); // Appear in 30%+ of liked courses
  }

  /**
   * Generate recommendations for a list of courses
   */
  getRecommendations(courses: Course[], alreadyLiked: Course[] = []): RecommendationScore[] {
    const likedIds = new Set(alreadyLiked.map(c => c.id));
    const swipedIds = new Set(this.swipeHistory.map(s => s.courseId));
    
    const recommendations = courses
      .filter(course => !likedIds.has(course.id) && !swipedIds.has(course.id))
      .map(course => this.scoreCourse(course))
      .sort((a, b) => b.score - a.score);

    return recommendations;
  }

  /**
   * Score a single course based on user preferences
   */
  private scoreCourse(course: Course): RecommendationScore {
    let score = 0;
    const reasons: string[] = [];
    
    // School preference (weight: 0.15)
    if (this.userPreferences.preferredSchools.includes(course.school)) {
      score += 15;
      reasons.push(`Popular ${course.school} school`);
    }

    // Department preference (weight: 0.2)
    if (this.userPreferences.preferredDepartments.includes(course.department)) {
      score += 20;
      reasons.push(`${course.department} department match`);
    }

    // Course level preference (weight: 0.1)
    if (this.userPreferences.preferredCourseLevel.includes(course.courseLevel)) {
      score += 10;
      reasons.push(`${course.courseLevel} level preference`);
    }

    // Instruction method preference (weight: 0.1)
    if (this.userPreferences.preferredInstructionMethod.includes(course.instructionMethod)) {
      score += 10;
      reasons.push(`${course.instructionMethod} format preference`);
    }

    // Professor rating (weight: 0.2)
    if (course.professorRating && course.professorRating.overall >= this.userPreferences.preferredProfessorRatingMin) {
      const ratingBonus = (course.professorRating.overall - this.userPreferences.preferredProfessorRatingMin) * 5;
      score += ratingBonus;
      if (course.professorRating.overall >= 4.0) {
        reasons.push(`Highly rated professor (${course.professorRating.overall.toFixed(1)})`);
      }
    }

    // Avoid professors user has consistently noped
    if (this.userPreferences.avoidedProfessors.includes(course.professor)) {
      score -= 25;
      reasons.push(`Previously avoided professor`);
    }

    // Enrollment availability (weight: 0.15)
    const enrollmentPercentage = (course.enrollmentCurrent / course.enrollmentCap) * 100;
    if (enrollmentPercentage <= this.userPreferences.maxEnrollmentPercentage) {
      if (enrollmentPercentage < 70) {
        score += 15;
        reasons.push(`Good availability (${Math.round(100 - enrollmentPercentage)}% open)`);
      } else if (enrollmentPercentage < 90) {
        score += 8;
        reasons.push(`Moderate availability`);
      }
    } else if (enrollmentPercentage >= 95) {
      score -= 10;
      reasons.push(`Very limited availability`);
    }

    // Meeting days preference (weight: 0.1)
    if (course.meetingDays && this.userPreferences.preferredMeetingDays.length > 0) {
      const dayMatches = course.meetingDays.filter(day => 
        this.userPreferences.preferredMeetingDays.includes(day)
      ).length;
      
      if (dayMatches > 0) {
        score += dayMatches * 3;
        reasons.push(`Preferred meeting days`);
      }
    }

    // Bonus for courses with major requirements that match liked patterns
    if (course.majorRequirements && course.majorRequirements.length > 0) {
      const likedMajorReqs = this.swipeHistory
        .filter(s => s.action === 'like' || s.action === 'superlike')
        .flatMap(s => s.course.majorRequirements || []);
      
      const matchingReqs = course.majorRequirements.filter(req => 
        likedMajorReqs.includes(req)
      );
      
      if (matchingReqs.length > 0) {
        score += matchingReqs.length * 5;
        reasons.push(`Matches academic interests`);
      }
    }

    // Determine confidence level
    let confidence: 'low' | 'medium' | 'high' = 'low';
    
    if (this.swipeHistory.length >= 20) {
      if (score >= 40) confidence = 'high';
      else if (score >= 25) confidence = 'medium';
    } else if (this.swipeHistory.length >= 10) {
      if (score >= 30) confidence = 'medium';
    }

    return {
      courseId: course.id,
      score: Math.max(0, Math.min(100, score)), // Clamp between 0-100
      reasons: reasons.slice(0, 3), // Top 3 reasons
      confidence,
    };
  }

  /**
   * Get user preferences for debugging or display
   */
  getUserPreferences(): UserPreferences {
    return { ...this.userPreferences };
  }

  /**
   * Get swipe statistics for insights
   */
  getSwipeStatistics() {
    const total = this.swipeHistory.length;
    const likes = this.swipeHistory.filter(s => s.action === 'like').length;
    const superlikes = this.swipeHistory.filter(s => s.action === 'superlike').length;
    const nopes = this.swipeHistory.filter(s => s.action === 'nope').length;

    return {
      total,
      likes,
      superlikes,
      nopes,
      likeRate: total > 0 ? (likes + superlikes) / total : 0,
    };
  }

  // Helper methods
  private countOccurrences(swipes: SwipeHistory[], field: keyof Course): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    swipes.forEach(swipe => {
      const value = swipe.course[field] as string;
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    return counts;
  }

  private countArray(items: string[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    items.forEach(item => {
      counts[item] = (counts[item] || 0) + 1;
    });
    return counts;
  }

  private getTopChoices(counts: { [key: string]: number }, threshold: number): string[] {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return Object.keys(counts).filter(key => counts[key] / total >= threshold);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil(percentile * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }
}

// Global instance for the app
export const recommendationEngine = new CourseRecommendationEngine();