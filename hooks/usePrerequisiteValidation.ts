import { useMemo, useCallback } from 'react';
import { Course } from '@/data/mockCourses';
import { useLikedCourses } from '@/contexts/LikedCoursesContext';
import { useAcademicProfile } from '@/contexts/AcademicProfileContext';
import { PrerequisiteValidator, PrerequisiteValidationResult } from '@/utils/prerequisiteValidator';

export interface CourseValidationState {
  course: Course;
  validation: PrerequisiteValidationResult;
  canEnroll: boolean;
  priority: 'high' | 'medium' | 'low';
}

export function usePrerequisiteValidation(allCourses: Course[] = []) {
  const { likedCourses } = useLikedCourses();
  const { profile } = useAcademicProfile();

  // Mock completed courses - in a real app, this would come from the academic profile
  const completedCourses = useMemo(() => {
    // For now, we'll simulate some completed courses based on the profile
    // In a real implementation, this would be stored in the academic profile
    const mockCompleted: Course[] = [];
    
    // Add some basic prerequisites based on the major
    if (profile.major?.name === 'Computer Science') {
      const csCourses = allCourses.filter(c => 
        c.department === 'Computer Science' && 
        c.courseLevel === 'Introductory'
      );
      mockCompleted.push(...csCourses.slice(0, 2)); // Add first 2 intro CS courses
    }
    
    if (profile.major?.name === 'Mathematics') {
      const mathCourses = allCourses.filter(c => 
        c.department === 'Mathematics' && 
        c.courseLevel === 'Introductory'
      );
      mockCompleted.push(...mathCourses.slice(0, 2)); // Add first 2 intro Math courses
    }
    
    return mockCompleted;
  }, [profile.major, allCourses]);

  // Validate a single course
  const validateCourse = useCallback((course: Course): CourseValidationState => {
    const validation = PrerequisiteValidator.validatePrerequisites(
      course,
      completedCourses,
      likedCourses
    );

    // Determine enrollment eligibility
    const canEnroll = validation.isValid && !likedCourses.some(c => c.id === course.id);

    // Determine priority based on validation results
    let priority: 'high' | 'medium' | 'low' = 'medium';
    
    if (!validation.isValid) {
      priority = 'low'; // Has missing prerequisites
    } else if (validation.warnings.length === 0 && validation.recommendations.length === 0) {
      priority = 'high'; // Perfect match, no issues
    } else if (validation.warnings.length > 0) {
      priority = 'medium'; // Has warnings but is valid
    }

    return {
      course,
      validation,
      canEnroll,
      priority
    };
  }, [completedCourses, likedCourses]);

  // Validate multiple courses
  const validateCourses = useCallback((courses: Course[]): CourseValidationState[] => {
    return courses.map(validateCourse);
  }, [validateCourse]);

  // Check if liked courses form a valid sequence
  const validateLikedCoursesSequence = useCallback(() => {
    return PrerequisiteValidator.checkSequenceValidity(likedCourses);
  }, [likedCourses]);

  // Get prerequisite chain for a course
  const getPrerequisiteChain = useCallback((course: Course) => {
    return PrerequisiteValidator.getPrerequisiteChain(course, allCourses);
  }, [allCourses]);

  // Suggest prerequisite courses for missing requirements
  const suggestPrerequisites = useCallback((missingPrerequisites: string[]) => {
    return PrerequisiteValidator.suggestPrerequisiteCourses(missingPrerequisites, allCourses);
  }, [allCourses]);

  // Generate a course plan for degree completion
  const generateCoursePlan = useCallback(() => {
    if (!profile.major) {
      return {
        orderedCourses: [],
        totalSemesters: 0,
        warnings: ['No major selected']
      };
    }

    // Get required courses for the major
    const requiredCourses = allCourses.filter(c => 
      profile.major?.requiredCourses.includes(c.courseCode)
    );

    return PrerequisiteValidator.generateCoursePlan(
      requiredCourses,
      completedCourses,
      allCourses
    );
  }, [profile.major, allCourses, completedCourses]);

  // Filter courses based on prerequisite eligibility
  const getEligibleCourses = useCallback((courses: Course[]) => {
    return courses.filter(course => {
      const validation = validateCourse(course);
      return validation.canEnroll;
    });
  }, [validateCourse]);

  // Get courses that are blocked by prerequisites
  const getBlockedCourses = useCallback((courses: Course[]) => {
    return courses.filter(course => {
      const validation = validateCourse(course);
      return !validation.validation.isValid;
    });
  }, [validateCourse]);

  // Get recommended next courses based on current progress
  const getRecommendedNextCourses = useCallback(() => {
    if (!profile.major) return [];

    const requiredCourses = allCourses.filter(c => 
      profile.major?.requiredCourses.includes(c.courseCode)
    );

    const eligibleRequired = getEligibleCourses(requiredCourses);
    const notYetTaken = eligibleRequired.filter(c => 
      !likedCourses.some(liked => liked.courseCode === c.courseCode)
    );

    return notYetTaken.slice(0, 6); // Return top 6 recommendations
  }, [profile.major, allCourses, getEligibleCourses, likedCourses]);

  // Memoized validation statistics
  const validationStats = useMemo(() => {
    const validations = validateCourses(likedCourses);
    const sequenceValidation = validateLikedCoursesSequence();
    
    return {
      totalCourses: likedCourses.length,
      validCourses: validations.filter(v => v.validation.isValid).length,
      coursesWithWarnings: validations.filter(v => v.validation.warnings.length > 0).length,
      coursesWithMissingPrereqs: validations.filter(v => !v.validation.isValid).length,
      sequenceValid: sequenceValidation.isValid,
      sequenceConflicts: sequenceValidation.conflicts.length,
      completedPrerequisites: completedCourses.length,
    };
  }, [likedCourses, validateCourses, validateLikedCoursesSequence, completedCourses]);

  return {
    // Core validation functions
    validateCourse,
    validateCourses,
    validateLikedCoursesSequence,
    
    // Utility functions
    getPrerequisiteChain,
    suggestPrerequisites,
    generateCoursePlan,
    
    // Filtering functions
    getEligibleCourses,
    getBlockedCourses,
    getRecommendedNextCourses,
    
    // Data
    completedCourses,
    validationStats,
  };
}

export default usePrerequisiteValidation;