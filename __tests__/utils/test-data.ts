/**
 * Test data factories for creating mock data in tests
 */

import { Course } from '@/data/mockCourses';

/**
 * Create a mock user profile
 */
export const createMockUserProfile = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  school: 'HMC',
  graduation_year: 2026,
  major: 'Computer Science',
  minor: null,
  credit_system: 'hmc',
  onboarding_completed: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Create a mock course
 */
export const createMockCourse = (overrides: Partial<Course> = {}): Course => ({
  id: 'CSCI-042-HMC-FA24',
  courseCode: 'CSCI 042',
  title: 'Introduction to Computer Science',
  school: 'HMC',
  department: 'Computer Science',
  semester: 'Fall 2024',
  credits: 3,
  professor: 'Dr. Smith',
  professorRating: {
    overall: 4.5,
    difficulty: 3.2,
    reviews: 50,
  },
  meetingTime: 'MWF 10:00-10:50 AM',
  meetingDays: ['M', 'W', 'F'],
  startTime: '10:00',
  endTime: '10:50',
  location: 'Parsons 2355',
  buildingCode: 'Parsons',
  roomNumber: '2355',
  enrollmentCap: 30,
  enrollmentCurrent: 25,
  waitlistCap: 10,
  waitlistCurrent: 2,
  description: 'An introduction to computer science fundamentals.',
  prerequisites: 'None',
  distributionReqs: ['STEM'],
  instructionMethod: 'In-Person',
  gradeType: 'Letter',
  lastUpdated: '2024-01-01T00:00:00Z',
  courseLevel: 'Introductory',
  majorRequirements: ['Computer Science'],
  ...overrides,
});

/**
 * Create a mock liked course
 */
export const createMockLikedCourse = (overrides = {}) => ({
  id: 'liked-1',
  user_id: 'test-user-id',
  course_id: 'CSCI-042-HMC-FA24',
  is_super_like: false,
  user_notes: null,
  priority: null,
  swipe_direction: 'right',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

/**
 * Create a mock schedule plan
 */
export const createMockSchedulePlan = (overrides = {}) => ({
  id: 'plan-1',
  user_id: 'test-user-id',
  name: 'Fall 2024 Plan A',
  description: 'Primary schedule',
  semester: 'Fall 2024',
  is_active: true,
  is_public: false,
  share_token: null,
  color: '#FFB6C1',
  total_credits: 15,
  has_conflicts: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  courses: [],
  ...overrides,
});

/**
 * Create multiple mock courses
 */
export const createMockCourses = (count: number): Course[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockCourse({
      id: `CSCI-${100 + i}-HMC-FA24`,
      courseCode: `CSCI ${100 + i}`,
      title: `Computer Science Course ${i + 1}`,
    })
  );
};

/**
 * Mock session data
 */
export const createMockSession = (overrides = {}) => ({
  access_token: 'test-access-token',
  refresh_token: 'test-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  ...overrides,
});

/**
 * Create a course with conflicting time
 */
export const createConflictingCourse = (baseCourse: Course): Course => {
  return createMockCourse({
    id: 'MATH-101-HMC-FA24',
    courseCode: 'MATH 101',
    title: 'Calculus I',
    meetingDays: baseCourse.meetingDays,
    startTime: baseCourse.startTime,
    endTime: baseCourse.endTime,
    meetingTime: baseCourse.meetingTime,
  });
};

/**
 * Create a course with specific time slot
 */
export const createCourseWithTime = (
  days: ('M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su')[],
  startTime: string,
  endTime: string
): Course => {
  const daysStr = days.map(d => d === 'Th' ? 'Th' : d).join('');
  return createMockCourse({
    meetingDays: days,
    startTime,
    endTime,
    meetingTime: `${daysStr} ${startTime}-${endTime}`,
    location: 'Test Location',
  });
};
