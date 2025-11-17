/**
 * Tests for CourseRecommendationEngine
 */

import {
  CourseRecommendationEngine,
  createRecommendationEngine,
  AcademicProfile,
} from '@/utils/courseRecommendations';
import { Course } from '@/data/mockCourses';

const mockCourse1: Course = {
  id: 'cs121',
  courseCode: 'CS121',
  title: 'Software Development',
  school: 'HMC',
  department: 'Computer Science',
  semester: 'Spring 2025',
  credits: 3,
  enrollmentCap: 30,
  enrollmentCurrent: 20,
  status: 'open',
  courseLevel: 'Intermediate',
  meetingDays: ['M', 'W', 'F'],
  startTime: '09:00',
  endTime: '10:00',
  professorRating: { overall: 4.5, difficulty: 3.5 },
  distributionReqs: ['CS'],
  prerequisites: 'CS5',
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourse2: Course = {
  id: 'math60',
  courseCode: 'MATH60',
  title: 'Linear Algebra',
  school: 'HMC',
  department: 'Mathematics',
  semester: 'Spring 2025',
  credits: 3,
  enrollmentCap: 25,
  enrollmentCurrent: 5,
  status: 'open',
  courseLevel: 'Intermediate',
  meetingDays: ['T', 'Th'],
  startTime: '13:00',
  endTime: '14:30',
  professorRating: { overall: 4.0, difficulty: 4.0 },
  distributionReqs: ['Math'],
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourse3: Course = {
  id: 'eng10',
  courseCode: 'ENG10',
  title: 'Introduction to Engineering',
  school: 'HMC',
  department: 'Engineering',
  semester: 'Spring 2025',
  credits: 3,
  enrollmentCap: 20,
  enrollmentCurrent: 20, // Full course
  status: 'closed',
  courseLevel: 'Introductory',
  meetingDays: ['M', 'W'],
  startTime: '10:00',
  endTime: '11:30',
  professorRating: { overall: 3.5, difficulty: 2.5 },
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockProfile: AcademicProfile = {
  major: 'Computer Science',
  year: 'Sophomore',
  completedCourses: ['CS5'],
  preferredSchools: ['HMC'],
  creditLoadPreference: 'normal',
  difficultyPreference: 'moderate',
};

describe('CourseRecommendationEngine', () => {
  describe('constructor', () => {
    it('should initialize with courses and profile', () => {
      const engine = new CourseRecommendationEngine([mockCourse1], mockProfile);

      expect(engine).toBeDefined();
    });

    it('should initialize with existing schedule', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse2], mockProfile, [mockCourse1]);

      expect(engine).toBeDefined();
    });
  });

  describe('getTimeSlotRecommendations', () => {
    it('should return courses for a specific time slot', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse2], mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('Monday', '09:00', 5);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].course.meetingDays).toContain('M');
    });

    it('should exclude full courses', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse3], mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('Monday', '10:00', 5);

      // mockCourse3 is full, should not be recommended
      expect(recommendations.find(r => r.course.id === 'eng10')).toBeUndefined();
    });

    it('should exclude courses that conflict with existing schedule', () => {
      const engine = new CourseRecommendationEngine(
        [mockCourse1, { ...mockCourse2, meetingDays: ['M', 'W'], startTime: '09:15', endTime: '10:15' }],
        mockProfile,
        [mockCourse1] // CS121 at 9-10 on MWF
      );

      const recommendations = engine.getTimeSlotRecommendations('Monday', '09:00', 5);

      // Should not recommend courses that overlap with CS121
      expect(recommendations.length).toBe(0);
    });

    it('should sort by score', () => {
      const courses = [
        { ...mockCourse1, professorRating: { overall: 3.0, difficulty: 3.0 } },
        { ...mockCourse1, id: 'cs2', courseCode: 'CS2', professorRating: { overall: 4.5, difficulty: 3.0 } },
      ];
      const engine = new CourseRecommendationEngine(courses, mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('Monday', '09:00', 5);

      // Higher rated professor should score higher
      if (recommendations.length > 1) {
        expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1].score);
      }
    });

    it('should limit results', () => {
      const manyCourses = Array.from({ length: 20 }, (_, i) => ({
        ...mockCourse1,
        id: `course${i}`,
        courseCode: `CS${i}`,
      }));
      const engine = new CourseRecommendationEngine(manyCourses, mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('Monday', '09:00', 5);

      expect(recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should handle invalid day names', () => {
      const engine = new CourseRecommendationEngine([mockCourse1], mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('InvalidDay', '09:00', 5);

      expect(recommendations).toEqual([]);
    });
  });

  describe('getGeneralRecommendations', () => {
    it('should return general course recommendations', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse2], mockProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].score).toBeDefined();
      expect(recommendations[0].reasons).toBeDefined();
    });

    it('should exclude courses in existing schedule', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse2], mockProfile, [mockCourse1]);

      const recommendations = engine.getGeneralRecommendations(10);

      expect(recommendations.find(r => r.course.id === 'cs121')).toBeUndefined();
      expect(recommendations.find(r => r.course.id === 'math60')).toBeDefined();
    });

    it('should sort by score descending', () => {
      const courses = [
        { ...mockCourse1, professorRating: { overall: 2.0, difficulty: 3.0 } },
        { ...mockCourse2, professorRating: { overall: 5.0, difficulty: 3.0 } },
      ];
      const engine = new CourseRecommendationEngine(courses, mockProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      expect(recommendations[0].score).toBeGreaterThanOrEqual(recommendations[1]?.score || 0);
    });

    it('should limit results', () => {
      const manyCourses = Array.from({ length: 50 }, (_, i) => ({
        ...mockCourse1,
        id: `course${i}`,
        courseCode: `CS${i}`,
      }));
      const engine = new CourseRecommendationEngine(manyCourses, mockProfile);

      const recommendations = engine.getGeneralRecommendations(15);

      expect(recommendations.length).toBeLessThanOrEqual(15);
    });
  });

  describe('getBalanceRecommendations', () => {
    it('should recommend courses to balance schedule', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse2], mockProfile, [mockCourse1]);

      const recommendations = engine.getBalanceRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend challenging courses for easy schedules', () => {
      const easyCourse = {
        ...mockCourse1,
        professorRating: { overall: 4.0, difficulty: 1.5 },
      };
      const hardCourse = {
        ...mockCourse2,
        id: 'hard',
        courseCode: 'HARD',
        professorRating: { overall: 4.0, difficulty: 4.5 },
        meetingDays: undefined, // No meeting days so it won't match time slots
        startTime: undefined,
        endTime: undefined,
      };
      const engine = new CourseRecommendationEngine([easyCourse, hardCourse], mockProfile, [easyCourse]);

      const recommendations = engine.getBalanceRecommendations();

      // Should recommend challenging course to balance
      const hardCourseRec = recommendations.find(r => r.course.id === 'hard');
      expect(hardCourseRec).toBeDefined();
      expect(hardCourseRec?.reasons).toContain('Adds academic challenge to your schedule');
    });
  });

  describe('getScheduleCompletionRecommendations', () => {
    it('should recommend courses that fit available time slots', () => {
      const engine = new CourseRecommendationEngine([mockCourse1, mockCourse2], mockProfile);

      const recommendations = engine.getScheduleCompletionRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
    });

    it('should exclude courses that conflict', () => {
      const conflictingCourse = {
        ...mockCourse2,
        id: 'conflict',
        meetingDays: ['M', 'W', 'F'],
        startTime: '09:30',
        endTime: '10:30',
      };
      const engine = new CourseRecommendationEngine(
        [mockCourse1, conflictingCourse],
        mockProfile,
        [mockCourse1]
      );

      const recommendations = engine.getScheduleCompletionRecommendations();

      expect(recommendations.find(r => r.course.id === 'conflict')).toBeUndefined();
    });
  });

  describe('scoring system', () => {
    it('should give higher scores to preferred schools', () => {
      const hmcCourse = { ...mockCourse1, school: 'HMC' };
      const cmcCourse = { ...mockCourse1, id: 'cmc', school: 'CMC' };
      const profile = { ...mockProfile, preferredSchools: ['HMC'] };
      const engine = new CourseRecommendationEngine([hmcCourse, cmcCourse], profile);

      const recommendations = engine.getGeneralRecommendations(10);

      const hmcScore = recommendations.find(r => r.course.school === 'HMC')?.score || 0;
      const cmcScore = recommendations.find(r => r.course.school === 'CMC')?.score || 0;
      expect(hmcScore).toBeGreaterThan(cmcScore);
    });

    it('should score highly rated professors better', () => {
      const highRated = { ...mockCourse1, professorRating: { overall: 5.0, difficulty: 3.0 } };
      const lowRated = { ...mockCourse1, id: 'low', courseCode: 'LOW', professorRating: { overall: 2.0, difficulty: 3.0 } };
      const engine = new CourseRecommendationEngine([highRated, lowRated], mockProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      const highScore = recommendations.find(r => r.course.id === 'cs121')?.score || 0;
      const lowScore = recommendations.find(r => r.course.id === 'low')?.score || 0;
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should boost courses with good availability', () => {
      const highAvailability = { ...mockCourse1, enrollmentCurrent: 5, enrollmentCap: 30 };
      const lowAvailability = { ...mockCourse1, id: 'low', enrollmentCurrent: 28, enrollmentCap: 30 };
      const engine = new CourseRecommendationEngine([highAvailability, lowAvailability], mockProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      const highScore = recommendations.find(r => r.course.id === 'cs121')?.score || 0;
      const lowScore = recommendations.find(r => r.course.id === 'low')?.score || 0;
      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('should match difficulty preferences', () => {
      const easyCourse = { ...mockCourse1, professorRating: { overall: 4.0, difficulty: 2.0 } };
      const hardCourse = { ...mockCourse1, id: 'hard', courseCode: 'HARD', professorRating: { overall: 4.0, difficulty: 4.5 } };

      const easyPrefProfile = { ...mockProfile, difficultyPreference: 'easy' as const };
      const engine = new CourseRecommendationEngine([easyCourse, hardCourse], easyPrefProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      const easyRec = recommendations.find(r => r.course.id === 'cs121');
      expect(easyRec?.reasons).toContain('Matches difficulty preference');
    });

    it('should boost courses appropriate for student year', () => {
      const introProfile = { ...mockProfile, year: 'Freshman' as const };
      const introCourse = { ...mockCourse1, courseLevel: 'Introductory' };
      const advancedCourse = { ...mockCourse1, id: 'adv', courseLevel: 'Advanced' };

      const engine = new CourseRecommendationEngine([introCourse, advancedCourse], introProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      const introRec = recommendations.find(r => r.course.id === 'cs121');
      expect(introRec?.reasons).toContain('Appropriate for Freshmans');
    });

    it('should boost courses that fulfill distribution requirements', () => {
      const distReqCourse = { ...mockCourse1, distributionReqs: ['CS', 'Math'] };
      const noDistReqCourse = { ...mockCourse1, id: 'nodist', distributionReqs: [] };

      const engine = new CourseRecommendationEngine([distReqCourse, noDistReqCourse], mockProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      const distRec = recommendations.find(r => r.course.id === 'cs121');
      expect(distRec?.reasons).toContain('Fulfills distribution requirements');
    });

    it('should boost courses where prerequisites are met', () => {
      const prereqMet = { ...mockCourse1, prerequisites: 'CS5' };
      const prereqNotMet = { ...mockCourse1, id: 'noprereq', courseCode: 'CS999', prerequisites: 'CS999' };
      const profile = { ...mockProfile, completedCourses: ['CS5'] };

      const engine = new CourseRecommendationEngine([prereqMet, prereqNotMet], profile);

      const recommendations = engine.getGeneralRecommendations(10);

      const metRec = recommendations.find(r => r.course.id === 'cs121');
      expect(metRec?.reasons).toContain('You meet the prerequisites');
    });

    it('should match credit load preference', () => {
      const lightProfile = { ...mockProfile, creditLoadPreference: 'light' as const };
      const lightSchedule = [
        { ...mockCourse1, credits: 3 },
        { ...mockCourse2, credits: 3 },
        { ...mockCourse3, credits: 4 },
      ]; // 10 credits
      const twoCreditCourse = { ...mockCourse1, id: 'two', credits: 2 }; // Total: 12 credits exactly

      const engine = new CourseRecommendationEngine([twoCreditCourse], lightProfile, lightSchedule);

      const recommendations = engine.getGeneralRecommendations(10);

      const rec = recommendations.find(r => r.course.id === 'two');
      expect(rec?.reasons).toContain('Good fit for your credit load preference');
    });

    it('should boost popular courses', () => {
      const popularCourse = { ...mockCourse1, enrollmentCurrent: 25, enrollmentCap: 30 }; // 83% full
      const unpopularCourse = { ...mockCourse1, id: 'unpop', enrollmentCurrent: 5, enrollmentCap: 30 }; // 17% full

      const engine = new CourseRecommendationEngine([popularCourse, unpopularCourse], mockProfile);

      const recommendations = engine.getGeneralRecommendations(10);

      const popRec = recommendations.find(r => r.course.id === 'cs121');
      expect(popRec?.reasons).toContain('Popular course');
    });

    it('should cap scores at 1.0', () => {
      const perfectCourse = {
        ...mockCourse1,
        school: 'HMC',
        professorRating: { overall: 5.0, difficulty: 3.0 },
        enrollmentCurrent: 1,
        enrollmentCap: 30,
        distributionReqs: ['CS'],
        prerequisites: 'CS5',
        courseLevel: 'Intermediate',
      };
      const profile = { ...mockProfile, completedCourses: ['CS5'] };

      const engine = new CourseRecommendationEngine([perfectCourse], profile);

      const recommendations = engine.getGeneralRecommendations(1);

      expect(recommendations[0].score).toBeLessThanOrEqual(1.0);
    });

    it('should include perfect time match bonus', () => {
      const engine = new CourseRecommendationEngine([mockCourse1], mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('Monday', '09:00', 5);

      const rec = recommendations.find(r => r.course.id === 'cs121');
      expect(rec?.reasons).toContain('Perfect time match');
      expect(rec?.category).toBe('time-match');
    });

    it('should handle courses without professor ratings', () => {
      const noRatingCourse = { ...mockCourse1, professorRating: undefined };
      const engine = new CourseRecommendationEngine([noRatingCourse], mockProfile);

      const recommendations = engine.getGeneralRecommendations(5);

      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('category assignment', () => {
    it('should assign time-match category for time slot searches', () => {
      const engine = new CourseRecommendationEngine([mockCourse1], mockProfile);

      const recommendations = engine.getTimeSlotRecommendations('Monday', '09:00', 5);

      expect(recommendations[0].category).toBe('time-match');
    });

    it('should assign professor category for highly rated professors', () => {
      const highRatedCourse = { ...mockCourse1, professorRating: { overall: 4.8, difficulty: 3.0 } };
      const engine = new CourseRecommendationEngine([highRatedCourse], mockProfile);

      const recommendations = engine.getGeneralRecommendations(5);

      expect(recommendations[0].category).toBe('professor');
    });

    it('should assign popularity category for popular courses', () => {
      const popularCourse = { ...mockCourse1, enrollmentCurrent: 25, enrollmentCap: 30, professorRating: undefined };
      const engine = new CourseRecommendationEngine([popularCourse], mockProfile);

      const recommendations = engine.getGeneralRecommendations(5);

      expect(recommendations[0].category).toBe('popularity');
    });
  });
});

describe('createRecommendationEngine', () => {
  it('should create engine with default profile', () => {
    const engine = createRecommendationEngine([mockCourse1]);

    expect(engine).toBeInstanceOf(CourseRecommendationEngine);
  });

  it('should merge custom profile with defaults', () => {
    const customProfile = { year: 'Senior' as const };
    const engine = createRecommendationEngine([mockCourse1], [], customProfile);

    expect(engine).toBeInstanceOf(CourseRecommendationEngine);
  });

  it('should use provided existing schedule', () => {
    const engine = createRecommendationEngine([mockCourse1, mockCourse2], [mockCourse1]);

    const recommendations = engine.getGeneralRecommendations(10);

    // Should not recommend mockCourse1 since it's in existing schedule
    expect(recommendations.find(r => r.course.id === 'cs121')).toBeUndefined();
  });
});
