import axios, { AxiosInstance } from 'axios';
import { ScrapingConfig, SchoolCode } from '@/types/realDataTypes';
import { RawCourseInput } from './dataHarmonizer';

/**
 * Real course scraper using Python API backend
 * Connects to our working Python CMC scraper via HTTP API
 */
export class RealCourseScraper {
  private httpClient: AxiosInstance;
  private config: ScrapingConfig;
  private apiBaseUrl = 'http://localhost:8085';

  constructor(config: ScrapingConfig) {
    this.config = config;
    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout for scraping operations
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Scrape courses for the given semester via Python API
   */
  async scrapeCourses(semester: string): Promise<RawCourseInput[]> {
    console.log(`🌐 Getting real course data from Python API for ${this.config.school}...`);
    
    try {
      // First check if API is healthy
      await this.checkApiHealth();
      
      // Get all course areas to search comprehensively
      const areas = await this.getCourseAreas();
      console.log(`📚 Found ${areas.length} course areas to search`);
      
      // Search popular areas for courses (limit to prevent overwhelming)
      const allCourses: RawCourseInput[] = [];
      const popularAreas = ['Computer Science', 'Economics', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Psychology'];
      const areasToSearch = popularAreas.filter(area => areas.includes(area)).slice(0, 5);
      
      for (const area of areasToSearch) {
        try {
          console.log(`🔍 Searching ${area} courses...`);
          const areaCourses = await this.searchCoursesByArea(semester, area);
          
          // Convert Python API format to RawCourseInput format
          const convertedCourses = areaCourses.map(course => this.convertApiCourseToRawInput(course));
          allCourses.push(...convertedCourses);
          
          console.log(`✅ Found ${areaCourses.length} ${area} courses`);
          
          // Small delay between requests
          await new Promise(resolve => setTimeout(resolve, 1000));
          
        } catch (areaError) {
          console.warn(`⚠️ Failed to get ${area} courses:`, areaError);
        }
      }
      
      console.log(`✅ Successfully retrieved ${allCourses.length} real courses from CMC Portal`);
      return allCourses;
      
    } catch (error) {
      console.error(`❌ Error connecting to Python API:`, error);
      
      // Return enhanced mock data as fallback
      console.log(`⚠️  Falling back to enhanced mock data for ${this.config.school}`);
      return this.getFallbackData(semester);
    }
  }

  /**
   * Check if Python API is healthy
   */
  private async checkApiHealth(): Promise<void> {
    const response = await this.httpClient.get(`${this.apiBaseUrl}/health`);
    
    if (response.data.status !== 'healthy') {
      throw new Error('Python API is not healthy');
    }
  }
  
  /**
   * Get available course areas from Python API
   */
  private async getCourseAreas(): Promise<string[]> {
    const response = await this.httpClient.get(`${this.apiBaseUrl}/course-areas`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get course areas');
    }
    
    return response.data.areas;
  }
  
  /**
   * Search courses by area using Python API
   */
  private async searchCoursesByArea(term: string, area: string): Promise<any[]> {
    const params = new URLSearchParams({
      term: term,
      area: area
    });
    
    const response = await this.httpClient.get(`${this.apiBaseUrl}/courses?${params}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || `Failed to get ${area} courses`);
    }
    
    return response.data.courses;
  }
  
  /**
   * Convert Python API course format to RawCourseInput format
   */
  private convertApiCourseToRawInput(apiCourse: any): RawCourseInput {
    // Parse college from course code (e.g., "CSCI005 HM - 01" -> "HM")
    const collegeMatch = apiCourse.course_code.match(/([A-Z]{2,3})\s*-/);
    const college = collegeMatch ? collegeMatch[1] : 'Unknown';
    
    // Parse department from course code (e.g., "CSCI005" -> "CSCI")
    const deptMatch = apiCourse.course_code.match(/^([A-Z]+)/);
    const department = deptMatch ? deptMatch[1] : 'Unknown';
    
    return {
      school: this.mapCollegeCodeToSchool(college),
      courseCode: apiCourse.course_code,
      title: apiCourse.title,
      credits: parseFloat(apiCourse.credits) || 3,
      meetingTime: apiCourse.schedule,
      location: this.extractLocation(apiCourse.schedule),
      professor: apiCourse.instructor || 'TBA',
      department: department,
      prerequisites: '',
      description: apiCourse.notes || apiCourse.title,
      enrollmentInfo: apiCourse.seats_info,
      semester: 'FA 2025' // Default to current term
    };
  }
  
  /**
   * Map college code to school name
   */
  private mapCollegeCodeToSchool(code: string): SchoolCode {
    const mapping: Record<string, SchoolCode> = {
      'HM': 'HMC',
      'CM': 'CMC',
      'PO': 'Pomona',
      'PZ': 'Pitzer', 
      'SC': 'Scripps',
      'KS': 'HMC', // Keck Science -> HMC
      'JT': 'Pomona', // Joint programs -> Pomona
    };
    
    return mapping[code] || 'CMC'; // Default to CMC since that's our portal
  }
  
  /**
   * Extract location from schedule string
   */
  private extractLocation(schedule: string): string {
    // Extract location after "/" in format like "TR 8:10AM-9:25AM / HM Campus, Galileo Hall, MCAL"
    const locationMatch = schedule.match(/\/(.+)$/);
    return locationMatch ? locationMatch[1].trim() : '';
  }

  /**
   * Fallback to enhanced mock data when scraping fails
   */
  private async getFallbackData(semester: string): Promise<RawCourseInput[]> {
    // Import mock courses and filter by school
    const { mockCourses } = await import('@/data/mockCourses');
    
    return mockCourses
      .filter(course => course.school === this.config.school)
      .map(course => ({
        school: course.school,
        courseCode: course.courseCode,
        title: course.title,
        credits: course.credits,
        meetingTime: course.meetingTime,
        location: course.location,
        professor: course.professor,
        department: course.department,
        prerequisites: course.prerequisites,
        description: course.description,
        enrollmentInfo: `${course.enrollmentCurrent}/${course.enrollmentCap}`,
        semester: semester,
        gradeType: course.gradeType || 'Letter',
        instructionMethod: course.instructionMethod || 'In-Person'
      }));
  }
}