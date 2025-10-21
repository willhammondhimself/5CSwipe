import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Course } from '@/data/mockCourses';

export type SchoolFilter = '5C' | 'CMC' | 'HMC' | 'Pitzer' | 'Pomona' | 'Scripps';
export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'any';
export type CourseLevel = 'Introductory' | 'Intermediate' | 'Advanced' | 'Graduate';
export type InstructionMethod = 'In-Person' | 'Online' | 'Hybrid';

interface FilterState {
  schools: SchoolFilter[];
  timeSlot: TimeSlot;
  maxCredits: number;
  showFullCourses: boolean;
  creditRange: [number, number];
  departments: string[];
  distributionReqs: string[];
  courseLevels: CourseLevel[];
  instructionMethods: InstructionMethod[];
  searchQuery: string;
  semester: string;
}

interface FilterContextType {
  filters: FilterState;
  updateSchoolFilter: (school: SchoolFilter, enabled: boolean) => void;
  updateTimeSlot: (timeSlot: TimeSlot) => void;
  updateMaxCredits: (credits: number) => void;
  updateShowFullCourses: (show: boolean) => void;
  updateCreditRange: (range: [number, number]) => void;
  updateDepartmentFilter: (department: string, enabled: boolean) => void;
  updateDistributionReqFilter: (req: string, enabled: boolean) => void;
  updateCourseLevelFilter: (level: CourseLevel, enabled: boolean) => void;
  updateInstructionMethodFilter: (method: InstructionMethod, enabled: boolean) => void;
  updateSearchQuery: (query: string) => void;
  updateSemester: (semester: string) => void;
  getFilteredCourses: (courses: Course[]) => Course[];
  resetFilters: () => void;
  getAvailableDepartments: (courses: Course[]) => string[];
  getAvailableDistributionReqs: (courses: Course[]) => string[];
}

const defaultFilters: FilterState = {
  schools: ['5C', 'CMC', 'HMC', 'Pitzer', 'Pomona', 'Scripps'],
  timeSlot: 'any',
  maxCredits: 4,
  showFullCourses: true,
  creditRange: [1, 6],
  departments: [],
  distributionReqs: [],
  courseLevels: ['Introductory', 'Intermediate', 'Advanced', 'Graduate'],
  instructionMethods: ['In-Person', 'Online', 'Hybrid'],
  searchQuery: '',
  semester: 'FA 2025',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);

  const updateSchoolFilter = (school: SchoolFilter, enabled: boolean) => {
    setFilters(prev => ({
      ...prev,
      schools: enabled
        ? [...prev.schools, school]
        : prev.schools.filter(s => s !== school)
    }));
  };

  const updateTimeSlot = (timeSlot: TimeSlot) => {
    setFilters(prev => ({ ...prev, timeSlot }));
  };

  const updateMaxCredits = (credits: number) => {
    setFilters(prev => ({ ...prev, maxCredits: credits }));
  };

  const updateShowFullCourses = (show: boolean) => {
    setFilters(prev => ({ ...prev, showFullCourses: show }));
  };

  const updateCreditRange = (range: [number, number]) => {
    setFilters(prev => ({ ...prev, creditRange: range }));
  };

  const updateDepartmentFilter = (department: string, enabled: boolean) => {
    setFilters(prev => ({
      ...prev,
      departments: enabled
        ? [...prev.departments, department]
        : prev.departments.filter(d => d !== department)
    }));
  };

  const updateDistributionReqFilter = (req: string, enabled: boolean) => {
    setFilters(prev => ({
      ...prev,
      distributionReqs: enabled
        ? [...prev.distributionReqs, req]
        : prev.distributionReqs.filter(r => r !== req)
    }));
  };

  const updateCourseLevelFilter = (level: CourseLevel, enabled: boolean) => {
    setFilters(prev => ({
      ...prev,
      courseLevels: enabled
        ? [...prev.courseLevels, level]
        : prev.courseLevels.filter(l => l !== level)
    }));
  };

  const updateInstructionMethodFilter = (method: InstructionMethod, enabled: boolean) => {
    setFilters(prev => ({
      ...prev,
      instructionMethods: enabled
        ? [...prev.instructionMethods, method]
        : prev.instructionMethods.filter(m => m !== method)
    }));
  };

  const updateSearchQuery = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
  };

  const updateSemester = (semester: string) => {
    setFilters(prev => ({ ...prev, semester }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const getAvailableDepartments = (courses: Course[]): string[] => {
    const departments = Array.from(new Set(courses.map(course => course.department)));
    return departments.sort();
  };

  const getAvailableDistributionReqs = (courses: Course[]): string[] => {
    const reqs = new Set<string>();
    courses.forEach(course => {
      course.distributionReqs?.forEach(req => reqs.add(req));
    });
    return Array.from(reqs).sort();
  };

  const getFilteredCourses = (courses: Course[]): Course[] => {
    return courses.filter(course => {
      // School filter - temporarily disabled for all school data
      // TODO: Map actual school codes from Supabase to filter values
      // Skip school filter when all schools are selected (length === 6)
      if (filters.schools.length < 6) {
        // Only apply school filtering if user has specifically deselected schools
        if (!filters.schools.includes(course.school)) {
          return false;
        }
      }

      // Semester filter
      if (filters.semester && course.semester !== filters.semester) {
        return false;
      }

      // Department filter
      if (filters.departments.length > 0 && !filters.departments.includes(course.department)) {
        return false;
      }

      // Distribution requirements filter
      if (filters.distributionReqs.length > 0) {
        const hasMatchingReq = course.distributionReqs?.some(req => 
          filters.distributionReqs.includes(req)
        );
        if (!hasMatchingReq) {
          return false;
        }
      }

      // Course level filter - only apply if course has courseLevel data
      if (course.courseLevel && !filters.courseLevels.includes(course.courseLevel)) {
        return false;
      }

      // Instruction method filter - only apply if course has instructionMethod data
      if (course.instructionMethod && !filters.instructionMethods.includes(course.instructionMethod)) {
        return false;
      }

      // Unit range filter - only apply if course has credits data
      if (course.credits && (course.credits < filters.creditRange[0] || course.credits > filters.creditRange[1])) {
        return false;
      }

      // Full courses filter - only apply if course has enrollment data
      if (!filters.showFullCourses && course.enrollmentCap && course.enrollmentCurrent) {
        const spotsLeft = course.enrollmentCap - course.enrollmentCurrent;
        if (spotsLeft <= 0) {
          return false;
        }
      }

      // Search query filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const searchableText = [
          course.title || '',
          course.courseCode || '',
          course.professor || '',
          course.description || '',
          course.department || ''
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }

      // Enhanced time slot filter using new data structure
      if (filters.timeSlot !== 'any') {
        if (course.startTime) {
          const startHour = parseInt(course.startTime.split(':')[0]);
          
          if (filters.timeSlot === 'morning' && (startHour < 8 || startHour >= 12)) {
            return false;
          }
          
          if (filters.timeSlot === 'afternoon' && (startHour < 12 || startHour >= 17)) {
            return false;
          }
          
          if (filters.timeSlot === 'evening' && startHour < 17) {
            return false;
          }
        } else if (course.meetingTime) {
          // Fallback to old method for courses without enhanced data
          const meetingTime = course.meetingTime.toLowerCase();
          
          if (filters.timeSlot === 'morning' && !meetingTime.includes('am') && !meetingTime.includes('8:') && !meetingTime.includes('9:') && !meetingTime.includes('10:') && !meetingTime.includes('11:')) {
            return false;
          }
          
          if (filters.timeSlot === 'afternoon' && !meetingTime.includes('pm') && !meetingTime.includes('12:') && !meetingTime.includes('1:') && !meetingTime.includes('2:') && !meetingTime.includes('3:') && !meetingTime.includes('4:')) {
            return false;
          }
          
          if (filters.timeSlot === 'evening' && !meetingTime.includes('5:') && !meetingTime.includes('6:') && !meetingTime.includes('7:') && !meetingTime.includes('8:') && !meetingTime.includes('9:')) {
            return false;
          }
        }
      }

      return true;
    });
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        updateSchoolFilter,
        updateTimeSlot,
        updateMaxCredits,
        updateShowFullCourses,
        updateCreditRange,
        updateDepartmentFilter,
        updateDistributionReqFilter,
        updateCourseLevelFilter,
        updateInstructionMethodFilter,
        updateSearchQuery,
        updateSemester,
        getFilteredCourses,
        resetFilters,
        getAvailableDepartments,
        getAvailableDistributionReqs,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}