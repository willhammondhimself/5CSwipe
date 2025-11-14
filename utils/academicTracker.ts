import { Course } from '@/data/mockCourses';
import { Major, DegreeRequirement, AcademicProfile } from '@/data/academicData';

export interface CourseCompletion {
  courseCode: string;
  course: Course;
  semester: string;
  grade: string;
  credits: number;
  isTransferCredit?: boolean;
  completedDate: Date;
}

export interface SemesterPlan {
  semester: string;
  year: number;
  courses: Course[];
  totalCredits: number;
  isCompleted: boolean;
}

export interface AcademicPlan {
  semesters: SemesterPlan[];
  totalCreditsPlanned: number;
  graduationSemester: string;
  graduationYear: number;
}

export interface RequirementAnalysis {
  requirementId: string;
  name: string;
  requiredCredits: number;
  completedCredits: number;
  inProgressCredits: number;
  plannedCredits: number;
  remainingCredits: number;
  completedCourses: CourseCompletion[];
  inProgressCourses: Course[];
  plannedCourses: Course[];
  suggestedCourses: Course[];
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'over_fulfilled';
  estimatedCompletion?: string;
}

export interface GraduationAnalysis {
  onTrack: boolean;
  estimatedGraduation: string;
  creditsNeeded: number;
  semestersRemaining: number;
  averageCreditsPerSemester: number;
  criticalRequirements: RequirementAnalysis[];
  warnings: string[];
  recommendations: string[];
}

export class AcademicTracker {
  private completedCourses: CourseCompletion[] = [];
  private inProgressCourses: Course[] = [];
  private academicPlan: AcademicPlan | null = null;

  constructor(
    private profile: AcademicProfile,
    completedCourses: CourseCompletion[] = [],
    inProgressCourses: Course[] = []
  ) {
    this.completedCourses = completedCourses;
    this.inProgressCourses = inProgressCourses;
  }

  /**
   * Add a completed course to the academic record
   */
  addCompletedCourse(course: Course, semester: string, grade: string, isTransferCredit = false): void {
    const completion: CourseCompletion = {
      courseCode: course.courseCode,
      course,
      semester,
      grade,
      credits: course.credits,
      isTransferCredit,
      completedDate: new Date(),
    };

    // Remove from in-progress if it exists
    this.inProgressCourses = this.inProgressCourses.filter(c => c.id !== course.id);
    
    // Add to completed (replace if already exists)
    this.completedCourses = this.completedCourses.filter(c => c.courseCode !== course.courseCode);
    this.completedCourses.push(completion);
  }

  /**
   * Add a course to the current in-progress list (for current semester)
   */
  addInProgressCourse(course: Course): void {
    if (!this.inProgressCourses.find(c => c.id === course.id)) {
      this.inProgressCourses.push(course);
    }
  }

  /**
   * Remove a course from in-progress (if dropped)
   */
  removeInProgressCourse(courseId: string): void {
    this.inProgressCourses = this.inProgressCourses.filter(c => c.id !== courseId);
  }

  /**
   * Analyze progress for all degree requirements
   */
  analyzeRequirements(availableCourses: Course[] = []): RequirementAnalysis[] {
    return this.profile.requirements.map(requirement => 
      this.analyzeRequirement(requirement, availableCourses)
    );
  }

  /**
   * Analyze progress for a specific requirement
   */
  private analyzeRequirement(requirement: DegreeRequirement, availableCourses: Course[]): RequirementAnalysis {
    // Find completed courses that satisfy this requirement
    const completedCourses = this.completedCourses.filter(completion => {
      return this.coursesSatisfiesRequirement(completion.course, requirement) &&
             this.isPassingGrade(completion.grade);
    });

    // Find in-progress courses that satisfy this requirement
    const inProgressCourses = this.inProgressCourses.filter(course =>
      this.coursesSatisfiesRequirement(course, requirement)
    );

    // Find planned courses that satisfy this requirement (from academic plan)
    const plannedCourses = this.academicPlan?.semesters
      .flatMap(semester => semester.courses)
      .filter(course => this.coursesSatisfiesRequirement(course, requirement)) || [];

    // Calculate credits
    const completedCredits = completedCourses.reduce((sum, c) => sum + c.credits, 0);
    const inProgressCredits = inProgressCourses.reduce((sum, c) => sum + c.credits, 0);
    const plannedCredits = plannedCourses.reduce((sum, c) => sum + c.credits, 0);
    const remainingCredits = Math.max(0, requirement.requiredCredits - completedCredits - inProgressCredits);

    // Find suggested courses
    const suggestedCourses = this.findSuggestedCourses(requirement, availableCourses, 5);

    // Calculate progress and status
    const progress = Math.min(1, (completedCredits + inProgressCredits) / requirement.requiredCredits);
    let status: RequirementAnalysis['status'] = 'not_started';
    
    if (completedCredits >= requirement.requiredCredits) {
      status = completedCredits > requirement.requiredCredits ? 'over_fulfilled' : 'completed';
    } else if (completedCredits > 0 || inProgressCredits > 0) {
      status = 'in_progress';
    }

    // Estimate completion
    let estimatedCompletion: string | undefined;
    if (status !== 'completed' && remainingCredits > 0) {
      const creditsPerSemester = 12; // Assume 12 credits per semester (3-4 courses x 3-4 credits, or 4 courses x 1 credit in HMC system)
      const semestersNeeded = Math.ceil(remainingCredits / creditsPerSemester);
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentSemester = currentMonth < 6 ? 'Spring' : 'Fall';
      
      estimatedCompletion = `${currentSemester} ${currentYear + Math.floor(semestersNeeded / 2)}`;
    }

    return {
      requirementId: requirement.id,
      name: requirement.name,
      requiredCredits: requirement.requiredCredits,
      completedCredits,
      inProgressCredits,
      plannedCredits,
      remainingCredits,
      completedCourses,
      inProgressCourses,
      plannedCourses,
      suggestedCourses,
      progress,
      status,
      estimatedCompletion,
    };
  }

  /**
   * Perform comprehensive graduation analysis
   */
  analyzeGraduation(): GraduationAnalysis {
    const requirementAnalyses = this.analyzeRequirements();
    
    const totalRequiredCredits = requirementAnalyses.reduce((sum, req) => sum + req.requiredCredits, 0);
    const totalCompletedCredits = requirementAnalyses.reduce((sum, req) => sum + req.completedCredits, 0);
    const totalInProgressCredits = requirementAnalyses.reduce((sum, req) => sum + req.inProgressCredits, 0);
    const creditsNeeded = totalRequiredCredits - totalCompletedCredits - totalInProgressCredits;

    // Calculate if on track
    const currentYear = new Date().getFullYear();
    const expectedGraduationYear = this.profile.graduationYear;
    const yearsRemaining = expectedGraduationYear - currentYear;
    const semestersRemaining = Math.max(1, yearsRemaining * 2);
    const averageCreditsPerSemester = creditsNeeded / semestersRemaining;

    const onTrack = averageCreditsPerSemester <= 15 && creditsNeeded >= 0; // Max reasonable load is ~15 credits (4-5 courses)

    // Find critical requirements (far behind)
    const criticalRequirements = requirementAnalyses.filter(req => 
      req.status !== 'completed' && req.progress < 0.5 && req.requiredCredits >= 20
    );

    // Generate warnings
    const warnings: string[] = [];
    if (averageCreditsPerSemester > 15) {
      warnings.push('Course load may be too heavy for on-time graduation');
    }
    if (criticalRequirements.length > 0) {
      warnings.push(`${criticalRequirements.length} major requirements are significantly behind`);
    }
    if (yearsRemaining <= 1 && creditsNeeded > 30) {
      warnings.push('May need to consider summer courses or extended graduation timeline');
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (averageCreditsPerSemester > 13) {
      recommendations.push('Consider summer courses to reduce semester load');
    }
    if (criticalRequirements.length > 0) {
      recommendations.push('Prioritize major requirements in upcoming semesters');
    }
    if (this.completedCourses.length > 0) {
      const gpa = this.calculateGPA();
      if (gpa < 2.5) {
        recommendations.push('Consider retaking courses to improve GPA');
      }
    }

    // Estimate graduation date
    const semestersToGraduation = Math.ceil(creditsNeeded / Math.min(averageCreditsPerSemester, 15));
    const estimatedGraduationYear = currentYear + Math.ceil(semestersToGraduation / 2);
    const estimatedGraduation = `Spring ${estimatedGraduationYear}`;

    return {
      onTrack,
      estimatedGraduation,
      creditsNeeded: Math.max(0, creditsNeeded),
      semestersRemaining,
      averageCreditsPerSemester: Math.max(0, averageCreditsPerSemester),
      criticalRequirements,
      warnings,
      recommendations,
    };
  }

  /**
   * Calculate current GPA based on completed courses
   */
  calculateGPA(): number {
    const gradePoints = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0
    };

    const gradedCourses = this.completedCourses.filter(c => 
      !c.isTransferCredit && gradePoints[c.grade as keyof typeof gradePoints] !== undefined
    );

    if (gradedCourses.length === 0) return 0;

    const totalQualityPoints = gradedCourses.reduce((sum, course) => 
      sum + (gradePoints[course.grade as keyof typeof gradePoints] * course.credits), 0
    );
    const totalCredits = gradedCourses.reduce((sum, course) => sum + course.credits, 0);

    return totalCredits > 0 ? totalQualityPoints / totalCredits : 0;
  }

  /**
   * Generate an academic plan for remaining semesters
   */
  generateAcademicPlan(availableCourses: Course[]): AcademicPlan {
    const requirements = this.analyzeRequirements(availableCourses);
    const currentYear = new Date().getFullYear();
    const targetGraduation = this.profile.graduationYear;
    
    const semesters: SemesterPlan[] = [];
    const unfulfilledRequirements = requirements.filter(req => req.status !== 'completed');

    // Generate semester plans
    for (let year = currentYear; year <= targetGraduation; year++) {
      for (const semester of ['Fall', 'Spring']) {
        if (year === targetGraduation && semester === 'Spring' && semesters.length >= 8) break;

        const semesterCourses = this.planSemester(unfulfilledRequirements, availableCourses, 12);
        
        semesters.push({
          semester: `${semester} ${year}`,
          year,
          courses: semesterCourses,
          totalCredits: semesterCourses.reduce((sum, c) => sum + c.credits, 0),
          isCompleted: false,
        });

        // Remove planned courses from available pool
        semesterCourses.forEach(course => {
          const reqIndex = unfulfilledRequirements.findIndex(req => {
            // Find the original requirement from profile
            const originalReq = this.profile.requirements.find(r => r.id === req.requirementId);
            return originalReq ? this.coursesSatisfiesRequirement(course, originalReq) : false;
          });
          if (reqIndex >= 0) {
            unfulfilledRequirements[reqIndex].remainingCredits -= course.credits;
          }
        });
      }
    }

    const totalCreditsPlanned = semesters.reduce((sum, sem) => sum + sem.totalCredits, 0);

    return {
      semesters,
      totalCreditsPlanned,
      graduationSemester: `Spring ${targetGraduation}`,
      graduationYear: targetGraduation,
    };
  }

  /**
   * Plan courses for a single semester
   */
  private planSemester(requirements: RequirementAnalysis[], availableCourses: Course[], maxCredits: number): Course[] {
    const selectedCourses: Course[] = [];
    let currentCredits = 0;

    // Prioritize high-priority requirements
    const prioritizedRequirements = requirements
      .filter(req => req.remainingCredits > 0)
      .sort((a, b) => {
        // Sort by urgency and importance
        const urgencyA = a.requiredCredits - a.completedCredits;
        const urgencyB = b.requiredCredits - b.completedCredits;
        return urgencyB - urgencyA;
      });

    for (const requirement of prioritizedRequirements) {
      if (currentCredits >= maxCredits) break;

      const suitableCourses = requirement.suggestedCourses
        .filter(course => 
          !selectedCourses.find(selected => selected.id === course.id) &&
          currentCredits + course.credits <= maxCredits
        )
        .slice(0, 2); // Max 2 courses per requirement per semester

      for (const course of suitableCourses) {
        if (currentCredits + course.credits <= maxCredits) {
          selectedCourses.push(course);
          currentCredits += course.credits;
          break; // One course per requirement per iteration
        }
      }
    }

    return selectedCourses;
  }

  /**
   * Check if a course satisfies a degree requirement
   */
  private coursesSatisfiesRequirement(course: Course, requirement: DegreeRequirement): boolean {
    // Check if course is explicitly listed in requirement courses
    if (requirement.courses.includes(course.courseCode)) {
      return true;
    }

    // Check if course meets requirement by category/attributes
    switch (requirement.category) {
      case 'major':
        return this.profile.major?.requiredCourses.includes(course.courseCode) ||
               this.profile.major?.electiveCourses.includes(course.courseCode) ||
               false;
      case 'minor':
        return this.profile.minor?.requiredCourses.includes(course.courseCode) ||
               this.profile.minor?.electiveCourses.includes(course.courseCode) ||
               false;
      case 'general_education':
        return course.distributionReqs?.some(req => requirement.name.includes(req)) || false;
      case 'elective':
        return true; // Any course can fulfill electives
      default:
        return false;
    }
  }

  /**
   * Find suggested courses for a requirement
   */
  private findSuggestedCourses(requirement: DegreeRequirement, availableCourses: Course[], limit: number): Course[] {
    const alreadyTaken = new Set(this.completedCourses.map(c => c.courseCode));
    const inProgress = new Set(this.inProgressCourses.map(c => c.courseCode));

    return availableCourses
      .filter(course => 
        !alreadyTaken.has(course.courseCode) &&
        !inProgress.has(course.courseCode) &&
        this.coursesSatisfiesRequirement(course, requirement)
      )
      .sort((a, b) => {
        // Prioritize by professor rating and availability
        const ratingA = a.professorRating?.overall || 0;
        const ratingB = b.professorRating?.overall || 0;
        const availabilityA = (a.enrollmentCap - a.enrollmentCurrent) / a.enrollmentCap;
        const availabilityB = (b.enrollmentCap - b.enrollmentCurrent) / b.enrollmentCap;
        
        return (ratingB * 0.7 + availabilityB * 0.3) - (ratingA * 0.7 + availabilityA * 0.3);
      })
      .slice(0, limit);
  }

  /**
   * Check if a grade is passing
   */
  private isPassingGrade(grade: string): boolean {
    const passingGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'P'];
    return passingGrades.includes(grade);
  }

  /**
   * Get completion data
   */
  getCompletedCourses(): CourseCompletion[] {
    return this.completedCourses;
  }

  getInProgressCourses(): Course[] {
    return this.inProgressCourses;
  }

  setAcademicPlan(plan: AcademicPlan): void {
    this.academicPlan = plan;
  }

  getAcademicPlan(): AcademicPlan | null {
    return this.academicPlan;
  }
}