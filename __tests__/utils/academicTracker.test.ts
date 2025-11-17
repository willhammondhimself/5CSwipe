/**
 * Tests for AcademicTracker
 */

import { AcademicTracker, CourseCompletion } from '@/utils/academicTracker';
import { Course } from '@/data/mockCourses';
import { AcademicProfile, DegreeRequirement, Major } from '@/data/academicData';

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
  professorRating: { overall: 4.5, difficulty: 3.0 },
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
  enrollmentCurrent: 15,
  status: 'open',
  professorRating: { overall: 4.0, difficulty: 3.5 },
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockCourse3: Course = {
  id: 'cs70',
  courseCode: 'CS70',
  title: 'Data Structures',
  school: 'HMC',
  department: 'Computer Science',
  semester: 'Spring 2025',
  credits: 3,
  enrollmentCap: 30,
  enrollmentCurrent: 25,
  status: 'open',
  scraped_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockMajor: Major = {
  id: 'cs-major',
  name: 'Computer Science',
  school: 'HMC',
  totalCredits: 120,
  requiredCourses: ['CS121', 'CS70'],
  electiveCourses: ['CS105', 'CS131'],
  description: 'CS Major',
};

const mockRequirement1: DegreeRequirement = {
  id: 'req1',
  name: 'Core Computer Science',
  category: 'major',
  requiredCredits: 30,
  courses: ['CS121', 'CS70'],
};

const mockRequirement2: DegreeRequirement = {
  id: 'req2',
  name: 'Mathematics',
  category: 'general_education',
  requiredCredits: 12,
  courses: ['MATH60'],
};

const mockProfile: AcademicProfile = {
  userId: 'user1',
  school: 'HMC',
  major: mockMajor,
  minor: undefined,
  graduationYear: 2026,
  requirements: [mockRequirement1, mockRequirement2],
  totalCreditsRequired: 120,
  completedCredits: 0,
};

describe('AcademicTracker', () => {
  describe('constructor', () => {
    it('should initialize with empty courses', () => {
      const tracker = new AcademicTracker(mockProfile);

      expect(tracker.getCompletedCourses()).toEqual([]);
      expect(tracker.getInProgressCourses()).toEqual([]);
    });

    it('should initialize with provided courses', () => {
      const completedCourses: CourseCompletion[] = [
        {
          courseCode: 'CS121',
          course: mockCourse1,
          semester: 'Fall 2024',
          grade: 'A',
          credits: 3,
          completedDate: new Date(),
        },
      ];
      const inProgressCourses = [mockCourse2];

      const tracker = new AcademicTracker(mockProfile, completedCourses, inProgressCourses);

      expect(tracker.getCompletedCourses()).toHaveLength(1);
      expect(tracker.getInProgressCourses()).toHaveLength(1);
    });
  });

  describe('addCompletedCourse', () => {
    it('should add a completed course', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A');

      const completed = tracker.getCompletedCourses();
      expect(completed).toHaveLength(1);
      expect(completed[0].courseCode).toBe('CS121');
      expect(completed[0].grade).toBe('A');
      expect(completed[0].semester).toBe('Fall 2024');
    });

    it('should remove course from in-progress when marked completed', () => {
      const tracker = new AcademicTracker(mockProfile, [], [mockCourse1]);

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A');

      expect(tracker.getInProgressCourses()).toHaveLength(0);
      expect(tracker.getCompletedCourses()).toHaveLength(1);
    });

    it('should replace existing completed course', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'B');
      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A'); // Retake

      const completed = tracker.getCompletedCourses();
      expect(completed).toHaveLength(1);
      expect(completed[0].grade).toBe('A');
    });

    it('should mark transfer credits', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(mockCourse1, 'Transfer', 'P', true);

      const completed = tracker.getCompletedCourses();
      expect(completed[0].isTransferCredit).toBe(true);
    });
  });

  describe('addInProgressCourse', () => {
    it('should add an in-progress course', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addInProgressCourse(mockCourse1);

      expect(tracker.getInProgressCourses()).toHaveLength(1);
      expect(tracker.getInProgressCourses()[0].id).toBe('cs121');
    });

    it('should not add duplicate in-progress courses', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addInProgressCourse(mockCourse1);
      tracker.addInProgressCourse(mockCourse1);

      expect(tracker.getInProgressCourses()).toHaveLength(1);
    });
  });

  describe('removeInProgressCourse', () => {
    it('should remove an in-progress course', () => {
      const tracker = new AcademicTracker(mockProfile, [], [mockCourse1, mockCourse2]);

      tracker.removeInProgressCourse('cs121');

      expect(tracker.getInProgressCourses()).toHaveLength(1);
      expect(tracker.getInProgressCourses()[0].id).toBe('math60');
    });
  });

  describe('analyzeRequirements', () => {
    it('should analyze all requirements', () => {
      const tracker = new AcademicTracker(mockProfile);

      const analysis = tracker.analyzeRequirements();

      expect(analysis).toHaveLength(2);
      expect(analysis[0].requirementId).toBe('req1');
      expect(analysis[1].requirementId).toBe('req2');
    });

    it('should calculate completed credits', () => {
      const tracker = new AcademicTracker(mockProfile);
      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A');

      const analysis = tracker.analyzeRequirements();
      const csRequirement = analysis.find(a => a.requirementId === 'req1');

      expect(csRequirement?.completedCredits).toBe(3);
      expect(csRequirement?.remainingCredits).toBe(27);
    });

    it('should calculate in-progress credits', () => {
      const tracker = new AcademicTracker(mockProfile, [], [mockCourse2]);

      const analysis = tracker.analyzeRequirements();
      const mathRequirement = analysis.find(a => a.requirementId === 'req2');

      expect(mathRequirement?.inProgressCredits).toBe(3);
    });

    it('should determine requirement status correctly', () => {
      const tracker = new AcademicTracker(mockProfile);

      // Not started
      let analysis = tracker.analyzeRequirements();
      expect(analysis[0].status).toBe('not_started');

      // In progress
      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A');
      analysis = tracker.analyzeRequirements();
      const csReq = analysis.find(a => a.requirementId === 'req1');
      expect(csReq?.status).toBe('in_progress');
    });

    it('should mark requirement as completed when credits met', () => {
      const flexibleRequirement: DegreeRequirement = {
        id: 'req2',
        name: 'Mathematics',
        category: 'general_education',
        requiredCredits: 12,
        courses: ['MATH60', 'MATH2', 'MATH3', 'MATH4'], // Include all courses we'll use
      };

      const customProfile = {
        ...mockProfile,
        requirements: [mockRequirement1, flexibleRequirement],
      };

      const tracker = new AcademicTracker(customProfile);

      // Add enough courses to complete math requirement (12 credits)
      tracker.addCompletedCourse(mockCourse2, 'Fall 2024', 'A'); // 3 credits
      tracker.addCompletedCourse({ ...mockCourse2, id: 'math2', courseCode: 'MATH2' }, 'Fall 2024', 'A'); // 3 credits
      tracker.addCompletedCourse({ ...mockCourse2, id: 'math3', courseCode: 'MATH3' }, 'Fall 2024', 'A'); // 3 credits
      tracker.addCompletedCourse({ ...mockCourse2, id: 'math4', courseCode: 'MATH4' }, 'Fall 2024', 'A'); // 3 credits

      const analysis = tracker.analyzeRequirements();
      const mathReq = analysis.find(a => a.requirementId === 'req2');

      expect(mathReq?.completedCredits).toBe(12);
      expect(mathReq?.status).toBe('completed');
    });

    it('should mark requirement as over_fulfilled', () => {
      const flexibleRequirement: DegreeRequirement = {
        id: 'req2',
        name: 'Mathematics',
        category: 'general_education',
        requiredCredits: 12,
        courses: ['MATH0', 'MATH1', 'MATH2', 'MATH3', 'MATH4'],
      };

      const customProfile = {
        ...mockProfile,
        requirements: [mockRequirement1, flexibleRequirement],
      };

      const tracker = new AcademicTracker(customProfile);

      // Add more than required credits (5 courses x 3 credits = 15 > 12)
      for (let i = 0; i < 5; i++) {
        tracker.addCompletedCourse(
          { ...mockCourse2, id: `math${i}`, courseCode: `MATH${i}` },
          'Fall 2024',
          'A'
        );
      }

      const analysis = tracker.analyzeRequirements();
      const mathReq = analysis.find(a => a.requirementId === 'req2');

      expect(mathReq?.completedCredits).toBeGreaterThan(flexibleRequirement.requiredCredits);
      expect(mathReq?.status).toBe('over_fulfilled');
    });

    it('should find suggested courses', () => {
      const tracker = new AcademicTracker(mockProfile);
      const availableCourses = [mockCourse1, mockCourse3];

      const analysis = tracker.analyzeRequirements(availableCourses);
      const csReq = analysis.find(a => a.requirementId === 'req1');

      expect(csReq?.suggestedCourses.length).toBeGreaterThan(0);
    });

    it('should not count failing grades', () => {
      const tracker = new AcademicTracker(mockProfile);
      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'F');

      const analysis = tracker.analyzeRequirements();
      const csReq = analysis.find(a => a.requirementId === 'req1');

      expect(csReq?.completedCredits).toBe(0);
    });
  });

  describe('calculateGPA', () => {
    it('should calculate GPA correctly', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A'); // 4.0 * 3 = 12
      tracker.addCompletedCourse(mockCourse2, 'Fall 2024', 'B'); // 3.0 * 3 = 9
      // Total: 21 / 6 = 3.5

      const gpa = tracker.calculateGPA();
      expect(gpa).toBeCloseTo(3.5, 2);
    });

    it('should exclude transfer credits from GPA', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A');
      tracker.addCompletedCourse(mockCourse2, 'Transfer', 'P', true);

      const gpa = tracker.calculateGPA();
      expect(gpa).toBeCloseTo(4.0, 2);
    });

    it('should handle various grade values', () => {
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A-'); // 3.7
      tracker.addCompletedCourse(mockCourse2, 'Fall 2024', 'B+'); // 3.3
      tracker.addCompletedCourse(mockCourse3, 'Fall 2024', 'C'); // 2.0
      // (3.7 + 3.3 + 2.0) / 3 = 3.0

      const gpa = tracker.calculateGPA();
      expect(gpa).toBeCloseTo(3.0, 2);
    });

    it('should return 0 for no graded courses', () => {
      const tracker = new AcademicTracker(mockProfile);

      const gpa = tracker.calculateGPA();
      expect(gpa).toBe(0);
    });
  });

  describe('analyzeGraduation', () => {
    it('should determine if student is on track', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 2,
      });

      // Complete 50% of requirements
      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'A');
      tracker.addCompletedCourse(mockCourse2, 'Fall 2024', 'A');

      const analysis = tracker.analyzeGraduation();

      expect(analysis.onTrack).toBe(true);
      expect(analysis.creditsNeeded).toBeGreaterThan(0);
    });

    it('should identify critical requirements', () => {
      const largeRequirement: DegreeRequirement = {
        id: 'large-req',
        name: 'Large Requirement',
        category: 'major',
        requiredCredits: 30,
        courses: [],
      };

      const tracker = new AcademicTracker({
        ...mockProfile,
        requirements: [largeRequirement],
        graduationYear: new Date().getFullYear() + 2,
      });

      const analysis = tracker.analyzeGraduation();

      expect(analysis.criticalRequirements.length).toBeGreaterThan(0);
    });

    it('should generate warnings for heavy course load', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 1,
      });

      const analysis = tracker.analyzeGraduation();

      expect(analysis.warnings.length).toBeGreaterThan(0);
    });

    it('should generate recommendations', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 1,
      });

      const analysis = tracker.analyzeGraduation();

      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should recommend retaking courses for low GPA', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 2,
      });

      tracker.addCompletedCourse(mockCourse1, 'Fall 2024', 'D');
      tracker.addCompletedCourse(mockCourse2, 'Fall 2024', 'D');

      const analysis = tracker.analyzeGraduation();

      expect(analysis.recommendations).toContain('Consider retaking courses to improve GPA');
    });

    it('should estimate graduation date', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 2,
      });

      const analysis = tracker.analyzeGraduation();

      expect(analysis.estimatedGraduation).toBeTruthy();
      expect(analysis.estimatedGraduation).toContain('Spring');
    });
  });

  describe('generateAcademicPlan', () => {
    it('should generate semester plans', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 2,
      });

      const availableCourses = [mockCourse1, mockCourse2, mockCourse3];
      const plan = tracker.generateAcademicPlan(availableCourses);

      expect(plan.semesters.length).toBeGreaterThan(0);
      expect(plan.graduationYear).toBe(new Date().getFullYear() + 2);
    });

    it('should distribute credits reasonably across semesters', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 2,
      });

      const availableCourses = [mockCourse1, mockCourse2, mockCourse3];
      const plan = tracker.generateAcademicPlan(availableCourses);

      plan.semesters.forEach(semester => {
        expect(semester.totalCredits).toBeLessThanOrEqual(15);
      });
    });

    it('should calculate total credits planned', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() + 2,
      });

      const availableCourses = [mockCourse1, mockCourse2, mockCourse3];
      const plan = tracker.generateAcademicPlan(availableCourses);

      expect(plan.totalCreditsPlanned).toBeGreaterThan(0);
    });
  });

  describe('academic plan management', () => {
    it('should set and get academic plan', () => {
      const tracker = new AcademicTracker(mockProfile);

      const plan = tracker.generateAcademicPlan([mockCourse1]);
      tracker.setAcademicPlan(plan);

      const retrievedPlan = tracker.getAcademicPlan();
      expect(retrievedPlan).toEqual(plan);
    });

    it('should start with null academic plan', () => {
      const tracker = new AcademicTracker(mockProfile);

      expect(tracker.getAcademicPlan()).toBeNull();
    });

    it('should use academic plan in requirement analysis', () => {
      const tracker = new AcademicTracker(mockProfile);

      const plan = tracker.generateAcademicPlan([mockCourse1, mockCourse2]);
      tracker.setAcademicPlan(plan);

      const analysis = tracker.analyzeRequirements();

      // Some requirements should show planned credits
      const hasPlannedCredits = analysis.some(req => req.plannedCredits > 0);
      expect(hasPlannedCredits).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty requirements list', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        requirements: [],
      });

      const analysis = tracker.analyzeRequirements();
      expect(analysis).toEqual([]);
    });

    it('should handle courses with zero credits', () => {
      const zeroCreditCourse = { ...mockCourse1, credits: 0 };
      const tracker = new AcademicTracker(mockProfile);

      tracker.addCompletedCourse(zeroCreditCourse, 'Fall 2024', 'A');

      expect(tracker.getCompletedCourses()).toHaveLength(1);
    });

    it('should handle graduation year in the past', () => {
      const tracker = new AcademicTracker({
        ...mockProfile,
        graduationYear: new Date().getFullYear() - 1,
      });

      const analysis = tracker.analyzeGraduation();

      // Should still provide analysis
      expect(analysis.onTrack).toBeDefined();
    });

    it('should handle courses without professor ratings', () => {
      const noProfRatingCourse = { ...mockCourse1, professorRating: undefined };
      const tracker = new AcademicTracker(mockProfile);

      const analysis = tracker.analyzeRequirements([noProfRatingCourse]);

      // Should still find suggested courses
      expect(analysis[0].suggestedCourses).toBeDefined();
    });
  });
});
