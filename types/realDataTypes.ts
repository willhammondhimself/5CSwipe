import { Course } from '@/data/mockCourses';

// ============================================================================
// ENHANCED DATA INTERFACES FOR REAL DATA INTEGRATION
// ============================================================================

/**
 * Data quality and source tracking for each course record
 */
export interface DataQualityMetrics {
  completeness: number; // 0-1 score of how complete the data is
  accuracy: number; // 0-1 score based on validation checks
  freshness: number; // 0-1 score based on how recent the data is
  reliability: number; // 0-1 score based on source consistency
  lastValidated: string; // ISO timestamp of last validation
  validationErrors: string[]; // Any data quality issues found
}

/**
 * Source system information for data provenance
 */
export interface DataSource {
  system: 'HMC' | 'Pomona' | 'CMC' | 'Pitzer' | 'Scripps' | 'CCS' | 'RateMyProfessor';
  endpoint: string; // URL or identifier where data was collected
  method: 'scraping' | 'api' | 'manual' | 'integrated';
  lastSyncTimestamp: string; // ISO timestamp
  syncDuration: number; // milliseconds taken to collect this data
  responseCode?: number; // HTTP response code if applicable
  errors?: string[]; // Any errors encountered during collection
}

/**
 * Enhanced Course interface extending the base Course with real data fields
 */
export interface RealCourseData extends Course {
  // Data provenance and quality
  dataQuality: DataQualityMetrics;
  dataSources: DataSource[];
  
  // Enhanced enrollment tracking
  enrollmentHistory: EnrollmentSnapshot[];
  waitlistHistory: WaitlistSnapshot[];
  enrollmentTrend: 'rising' | 'falling' | 'stable' | 'full' | 'opening';
  
  // Real-time status
  status: 'OPEN' | 'CLOSED' | 'WAITLIST' | 'PERMISSION' | 'CANCELLED' | 'REOPENED';
  statusLastChanged: string; // ISO timestamp
  permissionRequired: boolean;
  permissionInstructions?: string;
  
  // Enhanced professor information
  professorDetails: ProfessorDetails[];
  
  // Detailed scheduling
  scheduleSections: CourseSection[];
  
  // Cross-college information
  crossCollegeEnrollment: CrossCollegeEnrollment;
  consortiumCourseId?: string; // Unified ID across all 5Cs
  
  // Academic integration
  degreeRequirements: DegreeRequirementMapping[];
  courseSequencing: CourseSequencing;
  
  // Enhanced metadata
  popularity: PopularityMetrics;
  courseMaterials: CourseMaterials;
  assessmentInfo: AssessmentInfo;
  
  // Real-world impact
  careerRelevance: CareerRelevance[];
  alumniOutcomes?: AlumniOutcomes;
}

/**
 * Historical enrollment data for trend analysis
 */
export interface EnrollmentSnapshot {
  timestamp: string; // ISO timestamp
  enrolled: number;
  capacity: number;
  availableSpots: number;
  percentageFull: number;
  source: DataSource;
}

/**
 * Waitlist tracking information
 */
export interface WaitlistSnapshot {
  timestamp: string;
  position?: number; // User's position if on waitlist
  totalWaitlist: number;
  estimatedAdmissionProbability: number; // 0-1 based on historical data
  averageWaitTime: number; // hours typically spent on waitlist
  source: DataSource;
}

/**
 * Comprehensive professor information
 */
export interface ProfessorDetails {
  name: string;
  email?: string;
  officeLocation?: string;
  officeHours?: OfficeHours[];
  
  // Teaching history
  coursesHistoryCount: number;
  semestersAtSchool: number;
  
  // External ratings
  rateMyProfessorData?: RateMyProfessorData;
  internalRatings?: InternalRating[];
  
  // Professional background
  education: Education[];
  researchInterests: string[];
  publications?: Publication[];
  professionalExperience?: ProfessionalExperience[];
  
  // Course-specific info
  teachingStyle: TeachingStyle;
  gradingPolicy?: string;
  courseExpectations?: string;
}

export interface OfficeHours {
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  format: 'in-person' | 'virtual' | 'hybrid';
  bookingRequired: boolean;
}

export interface RateMyProfessorData {
  overallRating: number;
  difficultyRating: number;
  totalReviews: number;
  wouldTakeAgainPercentage: number;
  tags: string[]; // "Tough Grader", "Lots of Homework", etc.
  recentReviews: ProfessorReview[];
  lastUpdated: string;
}

export interface ProfessorReview {
  rating: number;
  difficulty: number;
  comment: string;
  courseCode: string;
  semester: string;
  date: string;
  wouldTakeAgain: boolean;
  attendanceRequired: boolean;
  textbookUsed: boolean;
}

export interface InternalRating {
  semester: string;
  courseCode: string;
  overallSatisfaction: number;
  instructorEffectiveness: number;
  courseDifficulty: number;
  recommendationRate: number;
  responseCount: number;
  comments?: string[];
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
  year?: number;
}

export interface Publication {
  title: string;
  journal?: string;
  year: number;
  coAuthors?: string[];
  abstract?: string;
}

export interface ProfessionalExperience {
  organization: string;
  position: string;
  startYear: number;
  endYear?: number;
  description?: string;
}

export interface TeachingStyle {
  lectureHeavy: boolean;
  discussionBased: boolean;
  handsOnLearning: boolean;
  groupWork: boolean;
  researchOriented: boolean;
  technologyIntegrated: boolean;
  assessment: 'exam-heavy' | 'project-based' | 'continuous' | 'mixed';
}

/**
 * Multiple sections of the same course
 */
export interface CourseSection {
  sectionId: string;
  sectionNumber: string; // "01", "02", etc.
  professor: string[];
  meetingTimes: MeetingTime[];
  enrollmentCap: number;
  enrollmentCurrent: number;
  waitlistCap?: number;
  waitlistCurrent?: number;
  status: 'OPEN' | 'CLOSED' | 'WAITLIST' | 'CANCELLED';
  specialNotes?: string;
  labRequired?: boolean;
  additionalFees?: number;
}

export interface MeetingTime {
  days: ('M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su')[];
  startTime: string; // "09:00"
  endTime: string; // "10:15"
  location: LocationDetails;
  format: 'in-person' | 'online' | 'hybrid';
  recurring: boolean;
  exceptions?: DateException[]; // Holiday breaks, etc.
}

export interface LocationDetails {
  buildingCode: string;
  buildingName: string;
  roomNumber: string;
  roomType: 'classroom' | 'lab' | 'seminar' | 'auditorium' | 'outdoor' | 'virtual';
  capacity: number;
  accessibility: AccessibilityFeatures;
  equipment: string[]; // "projector", "whiteboards", "computers"
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface AccessibilityFeatures {
  wheelchairAccessible: boolean;
  hearingLoopInstalled: boolean;
  adjustableFurniture: boolean;
  proximityToParking: 'close' | 'moderate' | 'far';
}

export interface DateException {
  date: string; // ISO date
  type: 'cancelled' | 'moved' | 'online-only';
  alternativeLocation?: LocationDetails;
  reason: string;
}

/**
 * Cross-college enrollment data
 */
export interface CrossCollegeEnrollment {
  homeSchoolStudents: number;
  crossEnrolledStudents: Record<string, number>; // school -> count
  totalCrossEnrollment: number;
  crossEnrollmentCap?: number;
  crossEnrollmentRestrictions?: string;
  consortiumPriority: 'home' | 'consortium' | 'equal';
}

/**
 * Degree requirement mapping
 */
export interface DegreeRequirementMapping {
  school: 'HMC' | 'Pomona' | 'CMC' | 'Pitzer' | 'Scripps';
  major?: string;
  requirementType: 'core' | 'elective' | 'distribution' | 'prerequisite' | 'capstone';
  requirementName: string;
  credits: number;
  isSatisfied: boolean;
  alternatives?: string[]; // Other courses that satisfy same requirement
}

/**
 * Course sequencing and prerequisite information
 */
export interface CourseSequencing {
  immediatePrerequisites: PrerequisiteRequirement[];
  corequisites: string[]; // Must take simultaneously
  recommendedPreparation: string[];
  nextCourses: string[]; // Courses this course prepares you for
  alternativeSequences: string[][]; // Different paths to reach learning objectives
}

export interface PrerequisiteRequirement {
  courseCode: string;
  alternatives: string[]; // OR relationships
  minimumGrade?: string;
  canBeTakenConcurrently: boolean;
  substitutionAllowed: boolean;
  waiverPossible: boolean;
}

/**
 * Course popularity and engagement metrics
 */
export interface PopularityMetrics {
  // App engagement
  likesLast7Days: number;
  likesLast30Days: number;
  viewsLast7Days: number;
  viewsLast30Days: number;
  searchRankPosition: number;
  trendingScore: number; // Calculated based on recent activity
  
  // Academic metrics
  historicalDemand: HistoricalDemand[];
  averageWaitlistSize: number;
  courseEvaluationScore: number;
  recommendationRate: number; // Student would recommend to others
  
  // Comparative metrics
  schoolRanking: number; // Within the school
  departmentRanking: number; // Within the department
  consortiumRanking: number; // Across all 5Cs
}

export interface HistoricalDemand {
  semester: string;
  applicants: number;
  enrolled: number;
  waitlisted: number;
  demandRatio: number; // applicants / spots
}

/**
 * Course materials and resources
 */
export interface CourseMaterials {
  textbooks: Textbook[];
  additionalReading: Reading[];
  software: Software[];
  equipment: Equipment[];
  estimatedCost: number;
  libraryReserves: LibraryReserve[];
}

export interface Textbook {
  title: string;
  author: string;
  isbn?: string;
  edition?: string;
  required: boolean;
  estimatedCost: number;
  availableUsed: boolean;
  digitalVersion: boolean;
  libraryAccess: boolean;
}

export interface Reading {
  title: string;
  type: 'article' | 'chapter' | 'paper' | 'case-study';
  source: string;
  url?: string;
  libraryAccess: boolean;
}

export interface Software {
  name: string;
  version?: string;
  cost: number;
  studentDiscount: boolean;
  schoolProvided: boolean;
  alternatives?: string[];
}

export interface Equipment {
  name: string;
  required: boolean;
  schoolProvided: boolean;
  rentalAvailable: boolean;
  estimatedCost?: number;
}

export interface LibraryReserve {
  title: string;
  author: string;
  type: 'book' | 'article' | 'media';
  copiesAvailable: number;
  loanPeriod: number; // hours
}

/**
 * Assessment and grading information
 */
export interface AssessmentInfo {
  gradingScale: 'letter' | 'pass-fail' | 'numeric' | 'narrative';
  examSchedule: ExamInfo[];
  projectSchedule: ProjectInfo[];
  participationWeight: number; // Percentage of grade
  attendancePolicy: AttendancePolicy;
  latePolicyGeneral: string;
  makeupPolicyGeneral: string;
  gradingRubrics?: GradingRubric[];
}

export interface ExamInfo {
  type: 'midterm' | 'final' | 'quiz' | 'practical';
  date?: string;
  duration: number; // minutes
  weight: number; // Percentage of grade
  format: 'in-person' | 'online' | 'take-home' | 'oral';
  studyMaterials: string[];
  retakePolicy?: string;
}

export interface ProjectInfo {
  name: string;
  description: string;
  dueDate?: string;
  weight: number; // Percentage of grade
  groupWork: boolean;
  presentationRequired: boolean;
  resourcesProvided: string[];
}

export interface AttendancePolicy {
  required: boolean;
  excusedAbsences: number;
  penaltyPerUnexcused: string;
  makeupOpportunities: boolean;
  participationAffected: boolean;
}

export interface GradingRubric {
  assignment: string;
  criteria: RubricCriterion[];
}

export interface RubricCriterion {
  name: string;
  description: string;
  points: number;
  levels: RubricLevel[];
}

export interface RubricLevel {
  name: string; // "Excellent", "Good", etc.
  description: string;
  pointValue: number;
}

/**
 * Career relevance and outcomes
 */
export interface CareerRelevance {
  industry: string;
  roles: string[];
  skills: Skill[];
  certificationPrep?: string[];
  internshipConnections?: InternshipConnection[];
}

export interface Skill {
  name: string;
  category: 'technical' | 'analytical' | 'communication' | 'leadership' | 'creative';
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced';
  marketDemand: 'low' | 'medium' | 'high' | 'very-high';
}

export interface InternshipConnection {
  organization: string;
  type: 'partnership' | 'alumni-network' | 'recruiting-relationship';
  positions: string[];
  applicationDeadline?: string;
}

/**
 * Alumni outcomes and career tracking
 */
export interface AlumniOutcomes {
  graduationYear: number;
  surveyResponseCount: number;
  
  // Career outcomes
  employmentRate: number; // 6 months post-graduation
  graduateSchoolRate: number;
  averageStartingSalary?: number;
  
  // Career paths
  topIndustries: IndustryOutcome[];
  topRoles: RoleOutcome[];
  topEmployers: EmployerOutcome[];
  
  // Graduate school
  graduatePrograms: GraduateProgram[];
  
  // Geographic distribution
  locations: LocationOutcome[];
}

export interface IndustryOutcome {
  industry: string;
  percentage: number;
  averageSalary?: number;
}

export interface RoleOutcome {
  role: string;
  percentage: number;
  averageSalary?: number;
}

export interface EmployerOutcome {
  employer: string;
  percentage: number;
  positions: string[];
}

export interface GraduateProgram {
  institution: string;
  program: string;
  degree: string;
  percentage: number;
}

export interface LocationOutcome {
  city: string;
  state: string;
  percentage: number;
}

// ============================================================================
// DATA COLLECTION AND PROCESSING TYPES
// ============================================================================

/**
 * Configuration for web scraping each school
 */
export interface ScrapingConfig {
  school: 'HMC' | 'Pomona' | 'CMC' | 'Pitzer' | 'Scripps';
  baseUrl: string;
  endpoints: ScrapingEndpoints;
  selectors: CSSSelectors;
  rateLimits: RateLimits;
  authentication?: AuthConfig;
  userAgent: string;
  respectRobotsTxt: boolean;
}

export interface ScrapingEndpoints {
  courseSearch: string;
  courseDetails: string;
  enrollment: string;
  schedule: string;
  professorInfo?: string;
}

export interface CSSSelectors {
  courseCode: string;
  courseTitle: string;
  professor: string;
  enrollmentData: string;
  timeLocation: string;
  description: string;
  prerequisites: string;
  [key: string]: string; // Allow additional selectors
}

export interface RateLimits {
  requestsPerMinute: number;
  delayBetweenRequests: number;
  burstLimit: number;
  respectRetryAfter: boolean;
}

export interface AuthConfig {
  type: 'none' | 'basic' | 'session' | 'oauth';
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
  };
  loginUrl?: string;
}

/**
 * Data harmonization and normalization rules
 */
export interface DataNormalizationRules {
  courseCodeMapping: Record<string, string>; // School-specific to standard format
  timeFormatPatterns: TimeFormatRule[];
  locationMappings: Record<string, LocationDetails>;
  prerequisiteParsingRules: PrerequisiteParsingRule[];
  gradingScaleMapping: Record<string, string>;
  creditCalculationRules: CreditRule[];
}

export interface TimeFormatRule {
  pattern: RegExp;
  parser: (match: RegExpMatchArray) => MeetingTime;
  examples: string[];
}

export interface PrerequisiteParsingRule {
  pattern: RegExp;
  parser: (match: RegExpMatchArray) => PrerequisiteRequirement[];
  priority: number;
}

export interface CreditRule {
  pattern: RegExp;
  calculator: (match: RegExpMatchArray) => number;
  fallback: number;
}

/**
 * Monitoring and alerting configuration
 */
export interface MonitoringConfig {
  healthChecks: HealthCheck[];
  alertThresholds: AlertThreshold[];
  notifications: NotificationConfig[];
  metrics: MetricConfig[];
}

export interface HealthCheck {
  name: string;
  endpoint: string;
  interval: number; // seconds
  timeout: number; // seconds
  expectedStatus: number;
  alertOnFailure: boolean;
}

export interface AlertThreshold {
  metric: string;
  operator: '>' | '<' | '==' | '!=' | '>=' | '<=';
  value: number;
  duration: number; // seconds threshold must be exceeded
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface NotificationConfig {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  target: string;
  conditions: string[];
  enabled: boolean;
}

export interface MetricConfig {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  labels?: string[];
  retentionDays: number;
}

// Export utility types for easier usage
export type SchoolCode = 'HMC' | 'Pomona' | 'CMC' | 'Pitzer' | 'Scripps';
export type CourseStatus = 'OPEN' | 'CLOSED' | 'WAITLIST' | 'PERMISSION' | 'CANCELLED' | 'REOPENED';
export type EnrollmentTrend = 'rising' | 'falling' | 'stable' | 'full' | 'opening';