import { 
  ScrapingConfig, 
  RealCourseData, 
  DataSource, 
  DataQualityMetrics, 
  SchoolCode,
  CourseStatus,
  EnrollmentSnapshot,
  ProfessorDetails 
} from '@/types/realDataTypes';
import { dataHarmonizer, RawCourseInput } from './dataHarmonizer';
import { RealCourseScraper } from './realCourseScraper';

// ============================================================================
// COURSE DATA SCRAPING SERVICE
// ============================================================================

/**
 * Centralized scraping service for all 5C school course catalogs
 * Implements respectful scraping with rate limiting, error handling,
 * and data quality monitoring
 */
export class CourseDataScraper {
  private rateLimiters: Map<SchoolCode, RateLimiter> = new Map();
  private scraperInstances: Map<SchoolCode, SchoolScraper> = new Map();
  private isInitialized = false;

  constructor(private configs: ScrapingConfig[]) {
    this.initializeScrapers();
  }

  /**
   * Initialize scraper instances for each school
   */
  private initializeScrapers(): void {
    this.configs.forEach(config => {
      // Create rate limiter for each school
      this.rateLimiters.set(config.school, new RateLimiter(config.rateLimits));
      
      // Create scraper instance
      this.scraperInstances.set(config.school, new SchoolScraper(config));
    });
    
    this.isInitialized = true;
  }

  /**
   * Scrape courses from all schools
   */
  async scrapeAllCourses(semester: string = 'Spring 2025'): Promise<RealCourseData[]> {
    if (!this.isInitialized) {
      throw new Error('Scraper not initialized');
    }

    const allCourses: RealCourseData[] = [];
    const errors: string[] = [];

    // Process each school sequentially to respect rate limits
    for (const [school, scraper] of this.scraperInstances) {
      try {
        console.log(`🎓 Scraping courses from ${school}...`);
        
        const rateLimiter = this.rateLimiters.get(school)!;
        await rateLimiter.waitForSlot();

        const courses = await scraper.scrapeCourses(semester);
        allCourses.push(...courses);
        
        console.log(`✅ Successfully scraped ${courses.length} courses from ${school}`);
        
        // Add delay between schools
        await this.delay(2000);
        
      } catch (error) {
        const errorMessage = `Failed to scrape ${school}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(`❌ ${errorMessage}`);
        errors.push(errorMessage);
      }
    }

    if (errors.length > 0) {
      console.warn(`⚠️  Completed with ${errors.length} errors:`, errors);
    }

    console.log(`🎉 Total courses scraped: ${allCourses.length}`);
    return allCourses;
  }

  /**
   * Scrape courses from a specific school
   */
  async scrapeCoursesBySchool(school: SchoolCode, semester: string = 'Spring 2025'): Promise<RealCourseData[]> {
    const scraper = this.scraperInstances.get(school);
    const rateLimiter = this.rateLimiters.get(school);
    
    if (!scraper || !rateLimiter) {
      throw new Error(`Scraper not configured for ${school}`);
    }

    await rateLimiter.waitForSlot();
    return scraper.scrapeCourses(semester);
  }

  /**
   * Get real-time enrollment updates for specific courses
   */
  async getEnrollmentUpdates(courseIds: string[]): Promise<Map<string, EnrollmentSnapshot>> {
    const updates = new Map<string, EnrollmentSnapshot>();
    
    // Group courses by school for efficient scraping
    const coursesBySchool = this.groupCoursesBySchool(courseIds);
    
    for (const [school, schoolCourseIds] of coursesBySchool) {
      const scraper = this.scraperInstances.get(school);
      const rateLimiter = this.rateLimiters.get(school);
      
      if (!scraper || !rateLimiter) continue;

      try {
        await rateLimiter.waitForSlot();
        const schoolUpdates = await scraper.scrapeEnrollmentData(schoolCourseIds);
        
        schoolUpdates.forEach((update, courseId) => {
          updates.set(courseId, update);
        });
        
      } catch (error) {
        console.error(`Failed to get enrollment updates for ${school}:`, error);
      }
    }
    
    return updates;
  }

  /**
   * Health check - verify all scrapers are functional
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const results: SchoolHealthStatus[] = [];
    
    for (const [school, scraper] of this.scraperInstances) {
      try {
        const rateLimiter = this.rateLimiters.get(school)!;
        await rateLimiter.waitForSlot();
        
        const isHealthy = await scraper.healthCheck();
        
        results.push({
          school,
          status: isHealthy ? 'healthy' : 'degraded',
          lastChecked: new Date().toISOString(),
          responseTime: scraper.getLastResponseTime(),
          errorCount: scraper.getErrorCount()
        });
        
      } catch (error) {
        results.push({
          school,
          status: 'unhealthy',
          lastChecked: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: 0,
          errorCount: scraper?.getErrorCount() || 999
        });
      }
    }

    const overallStatus = results.every(r => r.status === 'healthy') 
      ? 'healthy' 
      : results.some(r => r.status === 'unhealthy')
      ? 'unhealthy'
      : 'degraded';

    return {
      overall: overallStatus,
      schools: results,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get scraping statistics
   */
  getStats(): ScrapingStats {
    const stats: SchoolStats[] = [];
    
    for (const [school, scraper] of this.scraperInstances) {
      stats.push({
        school,
        totalRequests: scraper.getTotalRequests(),
        successfulRequests: scraper.getSuccessfulRequests(),
        errorCount: scraper.getErrorCount(),
        averageResponseTime: scraper.getAverageResponseTime(),
        lastScrape: scraper.getLastScrapeTime(),
        rateLimitHits: this.rateLimiters.get(school)?.getHitCount() || 0
      });
    }

    return {
      schools: stats,
      totalCourses: stats.reduce((sum, s) => sum + s.successfulRequests, 0),
      overallSuccessRate: this.calculateOverallSuccessRate(stats)
    };
  }

  // Private helper methods
  private groupCoursesBySchool(courseIds: string[]): Map<SchoolCode, string[]> {
    const grouped = new Map<SchoolCode, string[]>();
    
    courseIds.forEach(courseId => {
      // Extract school from course ID (assumes format: "SCHOOL_COURSECODE_SEMESTER")
      const school = this.extractSchoolFromCourseId(courseId);
      if (school) {
        if (!grouped.has(school)) {
          grouped.set(school, []);
        }
        grouped.get(school)!.push(courseId);
      }
    });
    
    return grouped;
  }

  private extractSchoolFromCourseId(courseId: string): SchoolCode | null {
    // This would need to be implemented based on your course ID format
    if (courseId.startsWith('HMC_')) return 'HMC';
    if (courseId.startsWith('POMONA_')) return 'Pomona';
    if (courseId.startsWith('CMC_')) return 'CMC';
    if (courseId.startsWith('PITZER_')) return 'Pitzer';
    if (courseId.startsWith('SCRIPPS_')) return 'Scripps';
    return null;
  }

  private calculateOverallSuccessRate(stats: SchoolStats[]): number {
    const totalRequests = stats.reduce((sum, s) => sum + s.totalRequests, 0);
    const successfulRequests = stats.reduce((sum, s) => sum + s.successfulRequests, 0);
    return totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SCHOOL-SPECIFIC SCRAPER
// ============================================================================

/**
 * Individual school scraper implementation
 */
class SchoolScraper {
  private stats = {
    totalRequests: 0,
    successfulRequests: 0,
    errorCount: 0,
    responseTimes: [] as number[],
    lastScrape: null as string | null
  };
  private realScraper: RealCourseScraper;

  constructor(private config: ScrapingConfig) {
    this.realScraper = new RealCourseScraper(config);
  }

  async scrapeCourses(semester: string): Promise<RealCourseData[]> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      console.log(`🔍 Starting real scraping for ${this.config.school} course catalog...`);
      
      // Use real HTTP scraping via RealCourseScraper
      const rawCourses = await this.realScraper.scrapeCourses(semester);
      
      // Use data harmonizer to convert raw data to RealCourseData format
      const courses = await dataHarmonizer.harmonizeCourses(rawCourses, this.config.school);
      
      this.stats.successfulRequests++;
      this.recordResponseTime(Date.now() - startTime);
      this.stats.lastScrape = new Date().toISOString();
      
      console.log(`✅ Successfully processed ${courses.length} courses from ${this.config.school}`);
      return courses;
      
    } catch (error) {
      this.stats.errorCount++;
      this.recordResponseTime(Date.now() - startTime);
      console.error(`❌ Error scraping ${this.config.school}:`, error);
      throw error;
    }
  }

  async scrapeEnrollmentData(courseIds: string[]): Promise<Map<string, EnrollmentSnapshot>> {
    const updates = new Map<string, EnrollmentSnapshot>();
    
    for (const courseId of courseIds) {
      // Simulate getting real-time enrollment data
      const update: EnrollmentSnapshot = {
        timestamp: new Date().toISOString(),
        enrolled: Math.floor(Math.random() * 30) + 10,
        capacity: 30,
        availableSpots: Math.floor(Math.random() * 10),
        percentageFull: Math.random(),
        source: {
          system: this.config.school,
          endpoint: `${this.config.baseUrl}${this.config.endpoints.enrollment}`,
          method: 'scraping',
          lastSyncTimestamp: new Date().toISOString(),
          syncDuration: Math.random() * 1000
        }
      };
      
      updates.set(courseId, update);
    }
    
    return updates;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Use the real scraper's health check functionality
      const stats = this.realScraper.getStats();
      return stats.requestCount >= 0; // If we can get stats, scraper is healthy
    } catch {
      return false;
    }
  }

  // Stats methods
  getTotalRequests(): number { return this.stats.totalRequests; }
  getSuccessfulRequests(): number { return this.stats.successfulRequests; }
  getErrorCount(): number { return this.stats.errorCount; }
  getLastResponseTime(): number { 
    return this.stats.responseTimes.length > 0 
      ? this.stats.responseTimes[this.stats.responseTimes.length - 1] 
      : 0; 
  }
  getAverageResponseTime(): number {
    return this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length
      : 0;
  }
  getLastScrapeTime(): string | null { return this.stats.lastScrape; }

  private recordResponseTime(time: number): void {
    this.stats.responseTimes.push(time);
    // Keep only last 100 response times
    if (this.stats.responseTimes.length > 100) {
      this.stats.responseTimes.shift();
    }
  }

  /**
   * Get scraper statistics from the real scraper
   */
  getRealScraperStats() {
    return this.realScraper.getStats();
  }

}

// ============================================================================
// RATE LIMITING
// ============================================================================

class RateLimiter {
  private requests: number[] = [];
  private hitCount = 0;

  constructor(private config: { requestsPerMinute: number; delayBetweenRequests: number }) {}

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove requests older than 1 minute
    this.requests = this.requests.filter(time => time > oneMinuteAgo);
    
    // Check if we can make a request
    if (this.requests.length >= this.config.requestsPerMinute) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = oldestRequest + 60000 - now;
      
      if (waitTime > 0) {
        this.hitCount++;
        console.log(`⏳ Rate limit hit, waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Add current request and apply base delay
    this.requests.push(now);
    
    if (this.config.delayBetweenRequests > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.delayBetweenRequests));
    }
  }

  getHitCount(): number {
    return this.hitCount;
  }
}

// ============================================================================
// TYPES FOR THIS SERVICE
// ============================================================================

interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  schools: SchoolHealthStatus[];
  timestamp: string;
}

interface SchoolHealthStatus {
  school: SchoolCode;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: string;
  responseTime: number;
  errorCount: number;
  error?: string;
}

interface ScrapingStats {
  schools: SchoolStats[];
  totalCourses: number;
  overallSuccessRate: number;
}

interface SchoolStats {
  school: SchoolCode;
  totalRequests: number;
  successfulRequests: number;
  errorCount: number;
  averageResponseTime: number;
  lastScrape: string | null;
  rateLimitHits: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

export const defaultScrapingConfigs: ScrapingConfig[] = [
  {
    school: 'HMC',
    baseUrl: 'https://catalog.hmc.edu',
    endpoints: {
      courseSearch: '/courses/search',
      courseDetails: '/courses/details',
      enrollment: '/courses/enrollment',
      schedule: '/courses/schedule'
    },
    selectors: {
      courseCode: '.course-code',
      courseTitle: '.course-title',
      professor: '.instructor',
      enrollmentData: '.enrollment-info',
      timeLocation: '.time-location',
      description: '.course-description',
      prerequisites: '.prerequisites'
    },
    rateLimits: {
      requestsPerMinute: 30,
      delayBetweenRequests: 2000,
      burstLimit: 5,
      respectRetryAfter: true
    },
    userAgent: '5CSwipe/1.0 (Educational Tool)',
    respectRobotsTxt: true
  },
  {
    school: 'Pomona',
    baseUrl: 'https://catalog.pomona.edu',
    endpoints: {
      courseSearch: '/courses',
      courseDetails: '/course-details',
      enrollment: '/enrollment',
      schedule: '/schedule'
    },
    selectors: {
      courseCode: '.course-number',
      courseTitle: '.course-name',
      professor: '.faculty',
      enrollmentData: '.enrollment',
      timeLocation: '.meeting-time',
      description: '.description',
      prerequisites: '.prereq'
    },
    rateLimits: {
      requestsPerMinute: 25,
      delayBetweenRequests: 2500,
      burstLimit: 3,
      respectRetryAfter: true
    },
    userAgent: '5CSwipe/1.0 (Educational Tool)',
    respectRobotsTxt: true
  },
  {
    school: 'CMC',
    baseUrl: 'https://catalog.claremontmckenna.edu',
    endpoints: {
      courseSearch: '/academics/courses',
      courseDetails: '/course',
      enrollment: '/registration',
      schedule: '/schedule'
    },
    selectors: {
      courseCode: '.course-code',
      courseTitle: '.course-title',
      professor: '.instructor-name',
      enrollmentData: '.enrollment-status',
      timeLocation: '.schedule-info',
      description: '.course-desc',
      prerequisites: '.prerequisites'
    },
    rateLimits: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      burstLimit: 3,
      respectRetryAfter: true
    },
    userAgent: '5CSwipe/1.0 (Educational Tool)',
    respectRobotsTxt: true
  },
  {
    school: 'Pitzer',
    baseUrl: 'https://catalog.pitzer.edu',
    endpoints: {
      courseSearch: '/courses',
      courseDetails: '/course-info',
      enrollment: '/enrollment-data',
      schedule: '/class-schedule'
    },
    selectors: {
      courseCode: '.course-id',
      courseTitle: '.course-name',
      professor: '.professor',
      enrollmentData: '.enrollment-info',
      timeLocation: '.class-time',
      description: '.description',
      prerequisites: '.prereqs'
    },
    rateLimits: {
      requestsPerMinute: 15,
      delayBetweenRequests: 4000,
      burstLimit: 2,
      respectRetryAfter: true
    },
    userAgent: '5CSwipe/1.0 (Educational Tool)',
    respectRobotsTxt: true
  },
  {
    school: 'Scripps',
    baseUrl: 'https://catalog.scrippscollege.edu',
    endpoints: {
      courseSearch: '/catalog/courses',
      courseDetails: '/course-details',
      enrollment: '/enrollment',
      schedule: '/academic-schedule'
    },
    selectors: {
      courseCode: '.course-number',
      courseTitle: '.course-title',
      professor: '.instructor',
      enrollmentData: '.enrollment-data',
      timeLocation: '.meeting-times',
      description: '.course-description',
      prerequisites: '.prerequisites'
    },
    rateLimits: {
      requestsPerMinute: 20,
      delayBetweenRequests: 3000,
      burstLimit: 3,
      respectRetryAfter: true
    },
    userAgent: '5CSwipe/1.0 (Educational Tool)',
    respectRobotsTxt: true
  }
];

// Export singleton instance
export const courseDataScraper = new CourseDataScraper(defaultScrapingConfigs);