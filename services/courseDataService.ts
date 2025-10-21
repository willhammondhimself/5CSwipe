import { Course } from '@/data/mockCourses';
import { RealCourseData, SchoolCode } from '@/types/realDataTypes';
import { courseDataScraper } from './courseDataScraper';

export interface CourseApiParams {
  semester: string;
  schools: string[];
  departments?: string[];
  courseLevel?: string[];
  instructionMethod?: string[];
  credits?: [number, number];
  timeSlots?: string[];
  searchQuery?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
  lastUpdated: string;
  totalCount: number;
  hasMore: boolean;
}

export interface CourseStats {
  totalCourses: number;
  coursesBySchool: Record<string, number>;
  coursesByDepartment: Record<string, number>;
  averageEnrollment: number;
  permsStats: {
    totalOnPERMs: number;
    averagePERMsSize: number;
  };
}

class CourseDataService {
  private baseUrl = 'https://api.claremontcolleges.edu'; // Placeholder - would be real API
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private realDataCache = new Map<string, { data: RealCourseData[]; timestamp: number; ttl: number }>();
  private readonly REAL_DATA_TTL = 15 * 60 * 1000; // 15 minutes for real data

  // Cache management
  private getCacheKey(params: any): string {
    return JSON.stringify(params);
  }

  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Public API methods
  async getCourses(params: CourseApiParams): Promise<ApiResponse<Course[]>> {
    try {
      console.log('🔄 Fetching courses with real data scraping...', params);
      
      // Get real course data from scraper
      const realCourses = await this.getRealCourseData(params);
      
      // Convert RealCourseData to Course format for backward compatibility
      const courses = realCourses.map(realCourse => this.convertToBaseCourse(realCourse));
      
      // Apply client-side filters
      const filteredCourses = this.applyFilters(courses, params);
      
      const response: ApiResponse<Course[]> = {
        data: filteredCourses,
        success: true,
        lastUpdated: new Date().toISOString(),
        totalCount: filteredCourses.length,
        hasMore: false,
      };
      
      console.log(`✅ Successfully fetched ${filteredCourses.length} real courses`);
      return response;
      
    } catch (error) {
      console.error('❌ Real Course API Error:', error);
      
      // Fallback to mock data if real data fails
      console.log('⚠️  Falling back to mock data...');
      return this.getFallbackMockData(params);
    }
  }

  // New method to get real course data with caching
  private async getRealCourseData(params: CourseApiParams): Promise<RealCourseData[]> {
    const cacheKey = `real_${this.getCacheKey(params)}`;
    const cached = this.getRealDataCached(cacheKey);
    
    if (cached) {
      console.log('📦 Using cached real course data');
      return cached;
    }

    // Scrape real course data
    const startTime = Date.now();
    let allCourses: RealCourseData[] = [];

    // If specific schools are requested, scrape only those
    if (params.schools && params.schools.length > 0) {
      for (const schoolName of params.schools) {
        const school = this.mapSchoolName(schoolName);
        if (school) {
          try {
            const schoolCourses = await courseDataScraper.scrapeCoursesBySchool(school, params.semester);
            allCourses.push(...schoolCourses);
          } catch (error) {
            console.warn(`⚠️  Failed to scrape ${school}:`, error);
          }
        }
      }
    } else {
      // Scrape all schools
      allCourses = await courseDataScraper.scrapeAllCourses(params.semester);
    }

    const duration = Date.now() - startTime;
    console.log(`🕐 Real data scraping took ${duration}ms for ${allCourses.length} courses`);

    // Cache the results
    this.setRealDataCached(cacheKey, allCourses);
    
    return allCourses;
  }

  async getCourseDetails(courseId: string): Promise<ApiResponse<Course>> {
    const cacheKey = `course_${courseId}`;
    const cached = this.getCachedData<ApiResponse<Course>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      // Simulate detailed course fetch
      const mockCourse = await this.simulateDetailedCourseFetch(courseId);
      
      const response: ApiResponse<Course> = {
        data: mockCourse,
        success: true,
        lastUpdated: new Date().toISOString(),
        totalCount: 1,
        hasMore: false,
      };
      
      this.setCachedData(cacheKey, response, this.CACHE_TTL * 2); // Cache details longer
      return response;
    } catch (error) {
      console.error('Course Details API Error:', error);
      throw error;
    }
  }

  async getCourseStats(semester: string): Promise<ApiResponse<CourseStats>> {
    const cacheKey = `stats_${semester}`;
    const cached = this.getCachedData<ApiResponse<CourseStats>>(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const stats = await this.simulateStatsApiCall(semester);
      
      const response: ApiResponse<CourseStats> = {
        data: stats,
        success: true,
        lastUpdated: new Date().toISOString(),
        totalCount: 1,
        hasMore: false,
      };
      
      this.setCachedData(cacheKey, response, this.CACHE_TTL * 4); // Cache stats longer
      return response;
    } catch (error) {
      console.error('Course Stats API Error:', error);
      throw error;
    }
  }

  async searchCourses(query: string, filters?: Partial<CourseApiParams>): Promise<ApiResponse<Course[]>> {
    const params: CourseApiParams = {
      semester: 'Spring 2025',
      schools: ['HMC', 'Pomona', 'CMC', 'Pitzer', 'Scripps'],
      searchQuery: query,
      ...filters,
    };

    return this.getCourses(params);
  }

  // Real data cache management
  private getRealDataCached(key: string): RealCourseData[] | null {
    const cached = this.realDataCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.realDataCache.delete(key);
    return null;
  }

  private setRealDataCached(key: string, data: RealCourseData[], ttl: number = this.REAL_DATA_TTL): void {
    this.realDataCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // School name mapping
  private mapSchoolName(schoolName: string): SchoolCode | null {
    const mapping: Record<string, SchoolCode> = {
      'HMC': 'HMC',
      'Harvey Mudd': 'HMC',
      'Harvey Mudd College': 'HMC',
      'Pomona': 'Pomona',
      'Pomona College': 'Pomona',
      'CMC': 'CMC',
      'Claremont McKenna': 'CMC',
      'Claremont McKenna College': 'CMC',
      'Pitzer': 'Pitzer',
      'Pitzer College': 'Pitzer',
      'Scripps': 'Scripps',
      'Scripps College': 'Scripps',
    };
    return mapping[schoolName] || null;
  }

  // Convert RealCourseData back to base Course format for backward compatibility
  private convertToBaseCourse(realCourse: RealCourseData): Course {
    return {
      id: realCourse.id,
      courseCode: realCourse.courseCode,
      title: realCourse.title,
      professor: realCourse.professor,
      school: realCourse.school,
      department: realCourse.department,
      meetingTime: realCourse.meetingTime,
      location: realCourse.location,
      credits: realCourse.credits,
      description: realCourse.description,
      enrollmentCap: realCourse.enrollmentCap,
      enrollmentCurrent: realCourse.enrollmentCurrent,
      semester: realCourse.semester,
      distributionReqs: realCourse.distributionReqs,
      prerequisites: realCourse.prerequisites,
      imageUrl: realCourse.imageUrl,
      professorRating: realCourse.professorRating,
      meetingDays: realCourse.meetingDays,
      startTime: realCourse.startTime,
      endTime: realCourse.endTime,
      buildingCode: realCourse.buildingCode,
      roomNumber: realCourse.roomNumber,
      crossListings: realCourse.crossListings,
      instructionMethod: realCourse.instructionMethod,
      gradeType: realCourse.gradeType,
      waitlistCap: realCourse.waitlistCap,
      waitlistCurrent: realCourse.waitlistCurrent,
      lastUpdated: realCourse.lastUpdated,
      courseLevel: realCourse.courseLevel,
      majorRequirements: realCourse.majorRequirements,
    };
  }

  // Apply filters to course data
  private applyFilters(courses: Course[], params: CourseApiParams): Course[] {
    let filtered = [...courses];

    // Filter by departments
    if (params.departments && params.departments.length > 0) {
      filtered = filtered.filter(course => 
        params.departments!.includes(course.department)
      );
    }

    // Filter by course level
    if (params.courseLevel && params.courseLevel.length > 0) {
      filtered = filtered.filter(course =>
        params.courseLevel!.includes(course.courseLevel)
      );
    }

    // Filter by instruction method
    if (params.instructionMethod && params.instructionMethod.length > 0) {
      filtered = filtered.filter(course =>
        params.instructionMethod!.includes(course.instructionMethod)
      );
    }

    // Filter by credits
    if (params.credits) {
      const [minCredits, maxCredits] = params.credits;
      filtered = filtered.filter(course =>
        course.credits >= minCredits && course.credits <= maxCredits
      );
    }

    // Filter by search query
    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase();
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.courseCode.toLowerCase().includes(query) ||
        course.professor.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.department.toLowerCase().includes(query)
      );
    }

    return filtered;
  }

  // Fallback to mock data if real data fails
  private async getFallbackMockData(params: CourseApiParams): Promise<ApiResponse<Course[]>> {
    try {
      return await this.simulateApiCall(params);
    } catch (fallbackError) {
      console.error('❌ Even fallback mock data failed:', fallbackError);
      return {
        data: [],
        success: false,
        error: 'Failed to fetch courses from all sources',
        lastUpdated: new Date().toISOString(),
        totalCount: 0,
        hasMore: false,
      };
    }
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear();
    this.realDataCache.clear();
  }

  getCacheSize(): number {
    return this.cache.size + this.realDataCache.size;
  }

  // Get scraper health status
  async getScraperHealth(): Promise<any> {
    try {
      return await courseDataScraper.healthCheck();
    } catch (error) {
      return {
        overall: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get scraper statistics
  getScraperStats(): any {
    try {
      return courseDataScraper.getStats();
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Private simulation methods (would be replaced with real API calls)
  private async simulateApiCall(params: CourseApiParams): Promise<ApiResponse<Course[]>> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Import mock data and apply filters
    const { mockCourses } = await import('@/data/mockCourses');
    
    let filteredCourses = [...mockCourses];

    // Apply filters
    if (params.schools.length > 0) {
      filteredCourses = filteredCourses.filter(course => params.schools.includes(course.school));
    }

    if (params.departments) {
      filteredCourses = filteredCourses.filter(course => 
        params.departments!.includes(course.department)
      );
    }

    if (params.searchQuery) {
      const query = params.searchQuery.toLowerCase();
      filteredCourses = filteredCourses.filter(course =>
        course.title.toLowerCase().includes(query) ||
        course.courseCode.toLowerCase().includes(query) ||
        course.professor.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query)
      );
    }

    return {
      data: filteredCourses,
      success: true,
      lastUpdated: new Date().toISOString(),
      totalCount: filteredCourses.length,
      hasMore: false,
    };
  }

  private async simulateDetailedCourseFetch(courseId: string): Promise<Course> {
    const { mockCourses } = await import('@/data/mockCourses');
    const course = mockCourses.find(c => c.id === courseId);
    
    if (!course) {
      throw new Error(`Course ${courseId} not found`);
    }

    return course;
  }

  private async simulateStatsApiCall(semester: string): Promise<CourseStats> {
    const { mockCourses } = await import('@/data/mockCourses');
    
    const coursesBySchool: Record<string, number> = {};
    const coursesByDepartment: Record<string, number> = {};
    let totalOnPERMs = 0;
    let totalPERMsSize = 0;
    let permsCount = 0;

    mockCourses.forEach(course => {
      coursesBySchool[course.school] = (coursesBySchool[course.school] || 0) + 1;
      coursesByDepartment[course.department] = (coursesByDepartment[course.department] || 0) + 1;
      
      if (course.waitlistCurrent) {
        totalOnPERMs += course.waitlistCurrent;
        permsCount++;
      }
      if (course.waitlistCap) {
        totalPERMsSize += course.waitlistCap;
      }
    });

    const totalEnrollment = mockCourses.reduce((sum, course) => sum + course.enrollmentCurrent, 0);

    return {
      totalCourses: mockCourses.length,
      coursesBySchool,
      coursesByDepartment,
      averageEnrollment: totalEnrollment / mockCourses.length,
      permsStats: {
        totalOnPERMs,
        averagePERMsSize: permsCount > 0 ? totalPERMsSize / permsCount : 0,
      },
    };
  }
}

export const courseDataService = new CourseDataService();