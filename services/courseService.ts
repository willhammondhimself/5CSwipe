import { supabase, CourseRecord } from '@/lib/supabase';
import { Course } from '@/data/mockCourses'; // For type compatibility
import { mockCourses } from '@/data/mockCourses'; // Fallback data

/**
 * Course Service - Bridge between app and real course data
 * Handles data fetching from Supabase with fallback to Python API and mock data
 */
export class CourseService {
  private static instance: CourseService;
  private cache: Map<string, Course[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly PYTHON_API_URL = process.env.EXPO_PUBLIC_PYTHON_API_URL || 'http://localhost:8085';

  public static getInstance(): CourseService {
    if (!CourseService.instance) {
      CourseService.instance = new CourseService();
    }
    return CourseService.instance;
  }

  /**
   * Get courses with automatic fallback strategy:
   * 1. Try Supabase database
   * 2. Fall back to Python API (live scraping)
   * 3. Fall back to mock data
   */
  async getCourses(filters?: {
    school?: string;
    department?: string;
    semester?: string;
    search?: string;
  }): Promise<Course[]> {
    console.log('🔧 CourseService.getCourses() called with filters:', filters);
    console.log('🔧 Python API URL:', this.PYTHON_API_URL);
    console.log('🔧 Cache status:', { cacheSize: this.cache.size, cacheKeys: Array.from(this.cache.keys()) });
    
    const cacheKey = JSON.stringify(filters);
    
    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cachedCourses = this.cache.get(cacheKey)!;
      console.log('📦 Returning cached courses:', cachedCourses.length);
      return cachedCourses;
    }

    try {
      // Strategy 1: Try Supabase first
      console.log('🗄️ Attempting to fetch from Supabase...');
      const supabaseCourses = await this.getCoursesFromSupabase(filters);
      
      if (supabaseCourses.length > 0) {
        console.log(`✅ Found ${supabaseCourses.length} courses from Supabase`);
        this.setCacheData(cacheKey, supabaseCourses);
        return supabaseCourses;
      }

      // Strategy 2: Fall back to Python API
      console.log('🐍 Supabase empty, trying Python API...');
      const rawPythonData = await this.getRawPythonAPIData(filters);
      
      if (rawPythonData.length > 0) {
        console.log(`✅ Found ${rawPythonData.length} courses from Python API`);
        // Save raw Python data to Supabase with enhanced fields
        await this.savePythonDataToSupabase(rawPythonData);
        
        // Convert to app format for return
        const pythonCourses = rawPythonData.map(course => this.convertPythonToAppFormat(course));
        this.setCacheData(cacheKey, pythonCourses);
        return pythonCourses;
      }

      // Strategy 3: Fall back to mock data
      console.log('⚠️ All real data sources failed, using mock data');
      const filteredMocks = this.filterMockCourses(filters);
      this.setCacheData(cacheKey, filteredMocks);
      return filteredMocks;

    } catch (error) {
      console.error('❌ Error in course service:', error);
      console.log('⚠️ Falling back to mock data');
      return this.filterMockCourses(filters);
    }
  }

  /**
   * Get courses from Supabase database
   */
  private async getCoursesFromSupabase(filters?: {
    school?: string;
    department?: string;
    semester?: string;
    search?: string;
  }): Promise<Course[]> {
    try {
      // Skip Supabase if client is not available
      if (!supabase) {
        console.log('⚠️ Supabase client not available - skipping');
        return [];
      }

      console.log('🗄️ Supabase client available, building query with filters:', filters);

      let query = supabase
        .from('courses')
        .select('*')
        .order('course_code');

      // Apply filters
      if (filters?.school) query = query.eq('school', filters.school);
      if (filters?.department) query = query.eq('department', filters.department);
      if (filters?.semester) query = query.eq('semester', filters.semester);

      // Text search
      if (filters?.search) {
        query = query.textSearch('search_vector', filters.search);
      }

      const { data, error } = await query.limit(2000);

      if (error) {
        console.error('❌ Supabase query error:', error);
        throw error;
      }

      console.log('✅ Supabase query successful, received:', data?.length || 0, 'courses');
      
      if (data && data.length > 0) {
        console.log('📋 First course sample from Supabase:', {
          course_code: data[0].course_code,
          title: data[0].title,
          school: data[0].school,
          semester: data[0].semester
        });
      }

      return (data || []).map(record => this.convertSupabaseToAppFormat(record));
    } catch (error) {
      console.error('Supabase query failed:', error);
      return [];
    }
  }

  /**
   * Get raw data from Python API (live scraping) - returns original Python format
   */
  private async getRawPythonAPIData(filters?: {
    school?: string;
    department?: string;
    semester?: string;
  }): Promise<any[]> {
    try {
      // Map department filter to course area
      const area = filters?.department || 'Computer Science';
      const term = filters?.semester || 'FA 2025';
      
      console.log('🐍 Calling Python API with:', { term, area, url: this.PYTHON_API_URL });
      
      const params = new URLSearchParams({
        term,
        area
      });

      const apiUrl = `${this.PYTHON_API_URL}/courses?${params}`;
      console.log('🌐 Full API URL:', apiUrl);

      const response = await fetch(apiUrl);
      
      console.log('📡 API Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`Python API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 API Response data structure:', {
        success: data.success,
        coursesCount: data.courses?.length || 0,
        hasError: !!data.error
      });
      
      if (!data.success) {
        console.error('❌ API returned success: false, error:', data.error);
        throw new Error(data.error || 'Python API returned error');
      }

      console.log('✅ Successfully received courses from Python API:', data.courses?.length || 0);
      return data.courses || [];
    } catch (error) {
      console.error('❌ Python API failed:', error);
      return [];
    }
  }

  /**
   * Get courses from Python API (live scraping) - legacy method
   */
  private async getCoursesFromPythonAPI(filters?: {
    school?: string;
    department?: string;
    semester?: string;
  }): Promise<Course[]> {
    try {
      // Map department filter to course area
      const area = filters?.department || 'Computer Science';
      const term = filters?.semester || 'FA 2025';
      
      const params = new URLSearchParams({
        term,
        area
      });

      const response = await fetch(`${this.PYTHON_API_URL}/courses?${params}`);
      
      if (!response.ok) {
        throw new Error(`Python API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Python API returned error');
      }

      return data.courses.map(course => this.convertPythonToAppFormat(course));
    } catch (error) {
      console.error('Python API failed:', error);
      return [];
    }
  }

  /**
   * Save raw Python API data directly to Supabase with enhanced fields
   */
  private async savePythonDataToSupabase(rawPythonData: any[]): Promise<void> {
    try {
      // Skip Supabase if client is not available
      if (!supabase) {
        console.log('⚠️ Supabase client not available - skipping save');
        return;
      }

      const supabaseRecords = rawPythonData.map(course => this.convertPythonToSupabaseFormat(course));
      
      const { error } = await supabase
        .from('courses')
        .upsert(supabaseRecords, {
          onConflict: 'course_code,semester',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Failed to save Python data to Supabase:', error);
      } else {
        console.log(`💾 Saved ${rawPythonData.length} enhanced courses to Supabase`);
      }
    } catch (error) {
      console.error('Error saving Python data to Supabase:', error);
    }
  }

  /**
   * Save courses from Python API to Supabase for caching (legacy method)
   */
  private async saveCoursesToSupabase(courses: Course[]): Promise<void> {
    try {
      // Skip Supabase if client is not available
      if (!supabase) {
        console.log('⚠️ Supabase client not available - skipping save');
        return;
      }

      const supabaseRecords = courses.map(course => this.convertAppToSupabaseFormat(course));
      
      const { error } = await supabase
        .from('courses')
        .upsert(supabaseRecords, {
          onConflict: 'course_code,semester',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('Failed to save courses to Supabase:', error);
      } else {
        console.log(`💾 Saved ${courses.length} courses to Supabase`);
      }
    } catch (error) {
      console.error('Error saving to Supabase:', error);
    }
  }

  /**
   * Filter mock courses based on criteria
   */
  private filterMockCourses(filters?: {
    school?: string;
    department?: string;
    semester?: string;
    search?: string;
  }): Course[] {
    let filtered = [...mockCourses];

    if (filters?.school) {
      filtered = filtered.filter(course => course.school === filters.school);
    }

    if (filters?.department) {
      filtered = filtered.filter(course => course.department === filters.department);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(course => 
        course.title.toLowerCase().includes(searchLower) ||
        course.courseCode.toLowerCase().includes(searchLower) ||
        course.professor.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  // Format conversion methods
  private convertSupabaseToAppFormat(record: CourseRecord): Course {
    // Convert days from ["Tuesday", "Thursday"] to ["T", "Th"]
    const dayMapping: Record<string, 'M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su'> = {
      'Monday': 'M',
      'Tuesday': 'T',
      'Wednesday': 'W',
      'Thursday': 'Th',
      'Friday': 'F',
      'Saturday': 'Sa',
      'Sunday': 'Su'
    };

    const meetingDays = (record.days || []).map((day: string) => dayMapping[day]).filter(Boolean);

    // Generate formatted meeting time from components (e.g., "MWF 10:00-10:50 AM")
    const meetingTime = this.formatMeetingTime(meetingDays, record.start_time, record.end_time);

    // Determine course level from course code
    const courseNumberMatch = record.course_code?.match(/(\d{3})/);
    const courseNumber = courseNumberMatch ? parseInt(courseNumberMatch[1]) : 0;
    const courseLevel = courseNumber < 100 ? 'Introductory' :
                       courseNumber < 300 ? 'Intermediate' :
                       courseNumber < 500 ? 'Advanced' : 'Graduate';

    return {
      id: record.id,
      courseCode: record.course_code,
      title: record.title,
      professor: record.professor || 'TBA',
      school: record.school as any,
      department: record.department,
      meetingTime: meetingTime || record.meeting_time || '',
      location: record.location || '',
      credits: record.credits || 3,
      description: record.description || '',
      enrollmentCap: record.enrollment_cap || 0,
      enrollmentCurrent: record.enrollment_current || 0,
      semester: record.semester as any,
      prerequisites: record.prerequisites,
      professorRating: record.professor_rating ? {
        overall: record.professor_rating,
        difficulty: record.professor_difficulty || 3,
        reviews: 0
      } : undefined,
      // Enhanced required fields
      meetingDays,
      startTime: record.start_time || '',
      endTime: record.end_time || '',
      buildingCode: record.building || '',
      roomNumber: record.room || '',
      instructionMethod: 'In-Person',
      gradeType: 'Letter',
      lastUpdated: record.updated_at,
      courseLevel,
    };
  }

  private convertPythonToAppFormat(pythonCourse: any): Course {
    console.log('🔄 Converting Python course to app format:', {
      course_code: pythonCourse.course_code,
      title: pythonCourse.title,
      days: pythonCourse.days,
      instructor: pythonCourse.instructor,
      seats_info: pythonCourse.seats_info
    });

    try {
      // Parse enrollment from "11/204 (Open)" format
      const enrollmentMatch = pythonCourse.seats_info?.match(/(\d+)\/(\d+)/);
      const available = enrollmentMatch ? parseInt(enrollmentMatch[1]) : 0;
      const cap = enrollmentMatch ? parseInt(enrollmentMatch[2]) : 0;
      
      console.log('📊 Parsed enrollment:', { available, cap, seats_info: pythonCourse.seats_info });
    
    // Convert days from ["Tuesday", "Thursday"] or "Tuesday,Thursday" to ["T", "Th"]
    const dayMapping: Record<string, 'M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su'> = {
      'Monday': 'M',
      'Tuesday': 'T', 
      'Wednesday': 'W',
      'Thursday': 'Th',
      'Friday': 'F',
      'Saturday': 'Sa',
      'Sunday': 'Su'
    };
    
    // Handle both array and string formats for days
    const daysArray = Array.isArray(pythonCourse.days) 
      ? pythonCourse.days 
      : (pythonCourse.days ? pythonCourse.days.split(',').map((d: string) => d.trim()) : []);
    
    const meetingDays = daysArray.map((day: string) => dayMapping[day]).filter(Boolean);

    // Generate formatted meeting time from components
    const meetingTime = this.formatMeetingTime(meetingDays, pythonCourse.start_time, pythonCourse.end_time);

    // Determine course level from course code (e.g., CSCI005 -> Introductory)
    const courseNumberMatch = pythonCourse.course_code?.match(/(\d{3})/);
    const courseNumber = courseNumberMatch ? parseInt(courseNumberMatch[1]) : 0;
    const courseLevel = courseNumber < 100 ? 'Introductory' :
                       courseNumber < 300 ? 'Intermediate' :
                       courseNumber < 500 ? 'Advanced' : 'Graduate';

    const convertedCourse = {
      id: pythonCourse.course_code || `${Date.now()}-${Math.random()}`,
      courseCode: pythonCourse.course_code || '',
      title: pythonCourse.title || '',
      professor: pythonCourse.instructor || 'TBA',
      school: this.mapCollegeCode(pythonCourse.college_code),
      department: pythonCourse.course_code?.match(/^([A-Z]+)/)?.[1] || 'Unknown',
      meetingTime: meetingTime || pythonCourse.schedule || '',
      location: pythonCourse.location || '',
      credits: parseFloat(pythonCourse.credits) || 3,
      description: pythonCourse.notes || pythonCourse.title || '',
      enrollmentCap: cap,
      enrollmentCurrent: cap - available,
      semester: 'FA 2025',
      prerequisites: '',
      // Enhanced required fields
      meetingDays,
      startTime: pythonCourse.start_time || '',
      endTime: pythonCourse.end_time || '',
      buildingCode: pythonCourse.building || '',
      roomNumber: pythonCourse.room || '',
      instructionMethod: 'In-Person', // Default for in-person courses
      gradeType: 'Letter', // Default grade type
      lastUpdated: new Date().toISOString(),
      courseLevel,
    };

    console.log('✅ Successfully converted course:', {
      courseCode: convertedCourse.courseCode,
      title: convertedCourse.title,
      school: convertedCourse.school,
      meetingDays: convertedCourse.meetingDays,
      startTime: convertedCourse.startTime
    });

    return convertedCourse;
    
    } catch (error) {
      console.error('❌ Error converting Python course:', error);
      console.error('❌ Failed course data:', pythonCourse);
      throw new Error(`Failed to convert course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Enhanced conversion method: Python API data directly to Supabase format
  private convertPythonToSupabaseFormat(pythonCourse: any): Omit<CourseRecord, 'id' | 'created_at' | 'updated_at'> {
    // Parse enrollment from "11/204 (Open)" format
    const enrollmentMatch = pythonCourse.seats_info?.match(/(\d+)\/(\d+)/);
    const available = enrollmentMatch ? parseInt(enrollmentMatch[1]) : 0;
    const cap = enrollmentMatch ? parseInt(enrollmentMatch[2]) : 0;
    
    return {
      // Course identification
      course_code: pythonCourse.course_code || '',
      title: pythonCourse.title || '',
      school: this.mapCollegeCode(pythonCourse.college_code),
      college: pythonCourse.college || '',
      college_code: pythonCourse.college_code || '',
      department: pythonCourse.course_code?.match(/^([A-Z]+)/)?.[1] || 'Unknown',
      semester: 'FA 2025',
      
      // Course details  
      description: pythonCourse.notes || '',
      credits: parseFloat(pythonCourse.credits) || 3,
      notes: pythonCourse.notes || '',
      
      // Enhanced schedule information
      meeting_time: pythonCourse.schedule || '',
      schedule: pythonCourse.schedule || '',
      days: pythonCourse.days || [],
      start_time: pythonCourse.start_time || '',
      end_time: pythonCourse.end_time || '',
      
      // Enhanced location information
      location: pythonCourse.location || '',
      building: pythonCourse.building || '',
      room: pythonCourse.room || '',
      full_location: pythonCourse.schedule || '',
      
      // Instructor information
      professor: pythonCourse.instructor || '',
      instructor: pythonCourse.instructor || '',
      
      // Enhanced enrollment data
      enrollment_cap: cap,
      enrollment_current: cap - available,
      enrollment_available: available,
      seats_info: pythonCourse.seats_info || '',
      status: available > 0 ? 'open' : 'closed',
      portal_status: pythonCourse.status || '',
      waitlist: pythonCourse.waitlist || null,
      
      // Data source tracking
      data_source: pythonCourse.data_source || 'CMC Portal',
      scraped_at: pythonCourse.scraped_at || new Date().toISOString()
    };
  }

  private convertAppToSupabaseFormat(course: Course): Omit<CourseRecord, 'id' | 'created_at' | 'updated_at'> {
    return {
      course_code: course.courseCode,
      title: course.title,
      professor: course.professor,
      school: course.school,
      department: course.department,
      semester: course.semester,
      
      // Basic course details
      description: course.description,
      credits: course.credits,
      prerequisites: course.prerequisites,
      
      // Schedule information
      meeting_time: course.meetingTime,
      
      // Location information
      location: course.location,
      
      // Enrollment data
      enrollment_cap: course.enrollmentCap,
      enrollment_current: course.enrollmentCurrent,
      enrollment_available: course.enrollmentCap - course.enrollmentCurrent,
      status: course.enrollmentCurrent < course.enrollmentCap ? 'open' : 'closed',
      
      // Professor ratings
      professor_rating: course.professorRating?.overall,
      professor_difficulty: course.professorRating?.difficulty,
      
      // Data source tracking
      data_source: 'Python API',
      scraped_at: new Date().toISOString()
    };
  }

  private mapCollegeCode(code?: string): Course['school'] {
    const mapping: Record<string, Course['school']> = {
      'HM': 'HMC',
      'CM': 'CMC',
      'PO': 'Pomona',
      'PZ': 'Pitzer',
      'SC': 'Scripps',
      'AF': '5C', // Map AF to 5C for now
      'KS': '5C'  // Map KS to 5C for now
    };
    return mapping[code || ''] || '5C';
  }

  /**
   * Format meeting time string from components
   * Example: formatMeetingTime(['M', 'W', 'F'], '09:00', '09:50') => "MWF 9:00-9:50 AM"
   */
  private formatMeetingTime(
    days: ('M' | 'T' | 'W' | 'Th' | 'F' | 'Sa' | 'Su')[],
    startTime?: string,
    endTime?: string
  ): string {
    if (!days || days.length === 0 || !startTime || !endTime) {
      return '';
    }

    // Convert 24-hour time to 12-hour format
    const formatTime = (time: string): { formatted: string, period: string } => {
      const [hourStr, minute] = time.split(':');
      let hour = parseInt(hourStr);
      const period = hour >= 12 ? 'PM' : 'AM';

      // Convert to 12-hour format
      if (hour === 0) hour = 12;
      else if (hour > 12) hour -= 12;

      // Remove leading zero and trailing :00 for cleaner display
      const formattedMinute = minute === '00' ? '' : `:${minute}`;
      return { formatted: `${hour}${formattedMinute}`, period };
    };

    const start = formatTime(startTime);
    const end = formatTime(endTime);

    // Only show period once if both times are in the same period
    const periodDisplay = start.period === end.period
      ? ` ${end.period}`
      : ` ${start.period}-${end.period}`;

    // Join days without spaces (MWF, TR, etc.)
    const daysString = days.join('');

    return `${daysString} ${start.formatted}-${end.formatted}${periodDisplay}`;
  }

  // Cache management
  private isCacheValid(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return expiry ? Date.now() < expiry : false;
  }

  private setCacheData(key: string, data: Course[]): void {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
  }

  /**
   * Clear cache (useful for testing)
   */
  public clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Force refresh from live sources
   */
  public async refreshCourses(filters?: any): Promise<Course[]> {
    this.clearCache();
    return this.getCourses(filters);
  }
}

// Export singleton instance
export const courseService = CourseService.getInstance();