import { Course } from '@/data/mockCourses';

export interface RecommendationScore {
  course: Course;
  score: number;
  reasons: string[];
  category: 'time-match' | 'academic-fit' | 'popularity' | 'balance' | 'professor';
}

export interface TimeSlotPreference {
  day: string;
  startTime: string;
  endTime: string;
  weight: number; // 0-1, higher = more preferred
}

export interface AcademicProfile {
  major?: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  completedCourses: string[]; // Course codes
  preferredSchools: string[];
  creditLoadPreference: 'light' | 'normal' | 'heavy'; // <12, 12-16, >16 credits
  difficultyPreference: 'easy' | 'moderate' | 'challenging';
}

export class CourseRecommendationEngine {
  private courses: Course[];
  private userProfile: AcademicProfile;
  private existingSchedule: Course[];

  constructor(courses: Course[], userProfile: AcademicProfile, existingSchedule: Course[] = []) {
    this.courses = courses;
    this.userProfile = userProfile;
    this.existingSchedule = existingSchedule;
  }

  /**
   * Get course recommendations for a specific time slot
   */
  getTimeSlotRecommendations(
    day: string,
    selectedTime: string,
    limit: number = 10
  ): RecommendationScore[] {
    const timeSlotCourses = this.getCoursesForTimeSlot(day, selectedTime);
    const scoredCourses = timeSlotCourses.map(course => this.scoreCourse(course, day, selectedTime));
    
    return scoredCourses
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get general course recommendations based on user profile
   */
  getGeneralRecommendations(limit: number = 20): RecommendationScore[] {
    const availableCourses = this.courses.filter(course => 
      !this.existingSchedule.some(existing => existing.id === course.id)
    );

    const scoredCourses = availableCourses.map(course => this.scoreCourse(course));
    
    return scoredCourses
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get course recommendations to balance the schedule
   */
  getBalanceRecommendations(): RecommendationScore[] {
    const scheduleAnalysis = this.analyzeScheduleBalance();
    const recommendations: RecommendationScore[] = [];

    // Recommend courses to fill empty time slots
    if (scheduleAnalysis.emptyTimeSlots.length > 0) {
      scheduleAnalysis.emptyTimeSlots.forEach(slot => {
        const slotRecommendations = this.getTimeSlotRecommendations(slot.day, slot.time, 3);
        recommendations.push(...slotRecommendations.map(rec => ({
          ...rec,
          category: 'balance' as const,
          reasons: [...rec.reasons, `Fills empty ${slot.day} ${slot.time} slot`],
        })));
      });
    }

    // Recommend courses to balance difficulty
    if (scheduleAnalysis.averageDifficulty < 3.0) {
      const challengingCourses = this.courses.filter(course => 
        (course.professorRating?.difficulty || 3.0) > 3.5 &&
        !this.existingSchedule.some(existing => existing.id === course.id)
      );
      
      challengingCourses.slice(0, 5).forEach(course => {
        recommendations.push({
          course,
          score: 0.7,
          reasons: ['Adds academic challenge to your schedule'],
          category: 'balance',
        });
      });
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Find courses that fit well with existing schedule
   */
  getScheduleCompletionRecommendations(): RecommendationScore[] {
    const availableSlots = this.getAvailableTimeSlots();
    const recommendations: RecommendationScore[] = [];

    availableSlots.forEach(slot => {
      const coursesForSlot = this.getCoursesForTimeSlot(slot.day, slot.startTime)
        .filter(course => !this.existingSchedule.some(existing => existing.id === course.id))
        .slice(0, 3);

      coursesForSlot.forEach(course => {
        const score = this.scoreCourse(course, slot.day, slot.startTime);
        recommendations.push({
          ...score,
          reasons: [...score.reasons, `Fits perfectly in your ${slot.day} ${slot.startTime} slot`],
        });
      });
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
  }

  private getCoursesForTimeSlot(day: string, selectedTime: string): Course[] {
    const selectedHour = parseInt(selectedTime.split(':')[0]);
    const dayMapping: { [key: string]: string } = {
      'Monday': 'M',
      'Tuesday': 'T',
      'Wednesday': 'W', 
      'Thursday': 'Th',
      'Friday': 'F'
    };

    const dayCode = dayMapping[day];
    if (!dayCode) return [];

    return this.courses.filter(course => {
      // Must meet on the selected day
      if (!course.meetingDays?.includes(dayCode as any)) return false;
      
      // Must have time information
      if (!course.startTime) return false;

      // Must be available (not full)
      if (course.enrollmentCurrent >= course.enrollmentCap) return false;

      // Must not conflict with existing courses
      const hasConflict = this.existingSchedule.some(existing => {
        if (!existing.meetingDays?.some(d => course.meetingDays?.includes(d))) return false;
        if (!existing.startTime || !existing.endTime || !course.startTime || !course.endTime) return false;
        
        return !(existing.endTime <= course.startTime || existing.startTime >= course.endTime);
      });

      if (hasConflict) return false;

      // Prefer courses that start within 2 hours of selected time
      const courseStartHour = parseInt(course.startTime.split(':')[0]);
      return Math.abs(courseStartHour - selectedHour) <= 2;
    });
  }

  private scoreCourse(course: Course, targetDay?: string, targetTime?: string): RecommendationScore {
    let score = 0;
    const reasons: string[] = [];
    let category: RecommendationScore['category'] = 'academic-fit';

    // Time matching score (if targeting specific time slot)
    if (targetDay && targetTime && course.startTime) {
      const targetHour = parseInt(targetTime.split(':')[0]);
      const courseHour = parseInt(course.startTime.split(':')[0]);
      const hourDiff = Math.abs(courseHour - targetHour);
      
      if (hourDiff === 0) {
        score += 0.3;
        reasons.push('Perfect time match');
        category = 'time-match';
      } else if (hourDiff <= 1) {
        score += 0.2;
        reasons.push('Close time match');
        category = 'time-match';
      }
    }

    // School preference
    if (this.userProfile.preferredSchools.includes(course.school)) {
      score += 0.2;
      reasons.push(`Matches your ${course.school} preference`);
    }

    // Availability score
    const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
    const availabilityRatio = spotsLeft / course.enrollmentCap;
    if (availabilityRatio > 0.3) {
      score += 0.15;
      reasons.push('Good availability');
    }

    // Professor rating
    if (course.professorRating) {
      const ratingScore = course.professorRating.overall / 5.0;
      score += ratingScore * 0.25;
      if (course.professorRating.overall >= 4.0) {
        reasons.push('Highly rated professor');
        if (category === 'academic-fit') category = 'professor';
      }
    }

    // Course level appropriateness
    const yearLevels = {
      'Freshman': ['Introductory'],
      'Sophomore': ['Introductory', 'Intermediate'],
      'Junior': ['Intermediate', 'Advanced'],
      'Senior': ['Advanced', 'Graduate']
    };
    
    if (yearLevels[this.userProfile.year].includes(course.courseLevel)) {
      score += 0.15;
      reasons.push(`Appropriate for ${this.userProfile.year}s`);
    }

    // Difficulty preference matching
    if (course.professorRating?.difficulty) {
      const difficulty = course.professorRating.difficulty;
      let difficultyMatch = false;

      switch (this.userProfile.difficultyPreference) {
        case 'easy':
          difficultyMatch = difficulty <= 2.5;
          break;
        case 'moderate':
          difficultyMatch = difficulty >= 2.0 && difficulty <= 4.0;
          break;
        case 'challenging':
          difficultyMatch = difficulty >= 3.5;
          break;
      }

      if (difficultyMatch) {
        score += 0.1;
        reasons.push('Matches difficulty preference');
      }
    }

    // Distribution requirements
    if (course.distributionReqs && course.distributionReqs.length > 0) {
      score += 0.1;
      reasons.push('Fulfills distribution requirements');
    }

    // Prerequisites check (bonus if user has completed them)
    if (course.prerequisites) {
      const hasPrereqs = course.prerequisites.split(',').some(prereq =>
        this.userProfile.completedCourses.includes(prereq.trim())
      );
      if (hasPrereqs) {
        score += 0.1;
        reasons.push('You meet the prerequisites');
      }
    }

    // Schedule balance consideration
    const currentCredits = this.existingSchedule.reduce((sum, c) => sum + c.credits, 0);
    const newTotal = currentCredits + course.credits;
    
    const targetCredits = {
      'light': 12,
      'normal': 15,
      'heavy': 18
    }[this.userProfile.creditLoadPreference];

    const creditDiff = Math.abs(newTotal - targetCredits);
    if (creditDiff <= 2) {
      score += 0.1;
      reasons.push('Good fit for your credit load preference');
    }

    // Popularity boost (enrollment percentage)
    const enrollmentRatio = course.enrollmentCurrent / course.enrollmentCap;
    if (enrollmentRatio > 0.7 && enrollmentRatio < 1.0) {
      score += 0.05;
      reasons.push('Popular course');
      if (category === 'academic-fit') category = 'popularity';
    }

    return {
      course,
      score: Math.min(score, 1.0), // Cap at 1.0
      reasons,
      category
    };
  }

  private analyzeScheduleBalance() {
    const analysis = {
      totalCredits: this.existingSchedule.reduce((sum, course) => sum + course.credits, 0),
      averageDifficulty: 0,
      emptyTimeSlots: [] as { day: string; time: string }[],
      timeDistribution: {} as { [key: string]: number },
    };

    // Calculate average difficulty
    const ratingsSum = this.existingSchedule.reduce((sum, course) => {
      return sum + (course.professorRating?.difficulty || 3.0);
    }, 0);
    analysis.averageDifficulty = this.existingSchedule.length > 0 
      ? ratingsSum / this.existingSchedule.length 
      : 3.0;

    // Find empty time slots (simplified)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];
    
    days.forEach(day => {
      timeSlots.forEach(time => {
        const hasClass = this.existingSchedule.some(course => {
          const dayMapping: { [key: string]: string } = {
            'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'Th', 'Friday': 'F'
          };
          const dayCode = dayMapping[day];
          
          if (!course.meetingDays?.includes(dayCode as any)) return false;
          if (!course.startTime || !course.endTime) return false;
          
          const courseStart = parseInt(course.startTime.split(':')[0]);
          const courseEnd = parseInt(course.endTime.split(':')[0]);
          const slotHour = parseInt(time.split(':')[0]);
          
          return slotHour >= courseStart && slotHour < courseEnd;
        });

        if (!hasClass) {
          analysis.emptyTimeSlots.push({ day, time });
        }
      });
    });

    return analysis;
  }

  private getAvailableTimeSlots() {
    // Simplified implementation - returns potential time slots that don't conflict
    const slots = [];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const times = ['09:00', '10:30', '13:00', '14:30', '16:00'];

    for (const day of days) {
      for (const startTime of times) {
        const hasConflict = this.existingSchedule.some(course => {
          const dayMapping: { [key: string]: string } = {
            'Monday': 'M', 'Tuesday': 'T', 'Wednesday': 'W', 'Thursday': 'Th', 'Friday': 'F'
          };
          const dayCode = dayMapping[day];
          
          if (!course.meetingDays?.includes(dayCode as any)) return false;
          if (!course.startTime || !course.endTime) return false;
          
          const courseStart = course.startTime;
          const courseEnd = course.endTime;
          const slotTime = startTime;
          
          return !(courseEnd <= slotTime || courseStart >= slotTime);
        });

        if (!hasConflict) {
          slots.push({ day, startTime });
        }
      }
    }

    return slots;
  }
}

/**
 * Helper function to create a recommendation engine with default profile
 */
export function createRecommendationEngine(
  courses: Course[], 
  existingSchedule: Course[] = [],
  userProfile?: Partial<AcademicProfile>
): CourseRecommendationEngine {
  const defaultProfile: AcademicProfile = {
    year: 'Sophomore',
    completedCourses: [],
    preferredSchools: ['CMC', 'HMC', 'Pitzer', 'Pomona', 'Scripps'],
    creditLoadPreference: 'normal',
    difficultyPreference: 'moderate',
    ...userProfile
  };

  return new CourseRecommendationEngine(courses, defaultProfile, existingSchedule);
}