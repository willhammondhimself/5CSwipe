# 5C Swipe - Data Sources Documentation

## Overview
This document outlines the data sources, APIs, and scraping strategies for collecting real course information from all five Claremont Colleges.

## 🏫 Individual School Systems

### 1. Harvey Mudd College (HMC)
**Primary Source**: HMC Course Catalog
- **URL Pattern**: `https://catalog.hmc.edu/`
- **Registration Portal**: HMC Portal student access
- **Data Format**: HTML scraping required
- **Update Frequency**: Daily during registration periods
- **Key Data**:
  - Course listings with detailed descriptions
  - Professor assignments per semester
  - Enrollment caps and current enrollment
  - Time slots and location information
  - Prerequisites and co-requisites

### 2. Pomona College
**Primary Source**: Pomona College Course Catalog
- **URL Pattern**: `https://catalog.pomona.edu/`
- **Registration System**: PeopleSoft-based portal
- **Data Format**: Structured HTML/potential API endpoints
- **Update Frequency**: Real-time during registration
- **Key Data**:
  - Comprehensive course descriptions
  - Cross-college enrollment data
  - Distribution requirement mappings
  - Professor information and ratings

### 3. Claremont McKenna College (CMC)
**Primary Source**: CMC Course Offerings
- **URL Pattern**: `https://catalog.claremontmckenna.edu/`
- **Registration Portal**: Student portal with course search
- **Data Format**: HTML parsing required
- **Update Frequency**: Periodic updates
- **Key Data**:
  - Business and economics focused courses
  - Joint program offerings
  - Internship and practicum information
  - Cross-registration availability

### 4. Pitzer College
**Primary Source**: Pitzer Course Catalog
- **URL Pattern**: `https://catalog.pitzer.edu/`
- **System**: Integrated with consortium database
- **Data Format**: HTML scraping
- **Update Frequency**: Semester-based updates
- **Key Data**:
  - Interdisciplinary program courses
  - Study abroad integration
  - Self-designed major requirements
  - Community engagement courses

### 5. Scripps College
**Primary Source**: Scripps Course Catalog  
- **URL Pattern**: `https://catalog.scrippscollege.edu/`
- **Registration**: Integrated student portal
- **Data Format**: HTML parsing required
- **Update Frequency**: Regular updates during registration
- **Key Data**:
  - Liberal arts focused curriculum
  - Core curriculum requirements
  - Joint program offerings with other 5Cs
  - Study abroad and off-campus programs

## 🔗 Consortium-Level Sources

### Claremont Colleges Services (CCS)
- **Cross-Registration Database**: Unified course search across all 5Cs
- **Potential API**: May have internal APIs for cross-college enrollment
- **Academic Calendar**: Shared semester dates and deadlines
- **Library System**: Integrated library course reserves

### The Claremont Colleges Portal
- **Student Portal**: Single sign-on access to all college resources
- **Course Search**: Unified interface for finding courses across schools
- **Registration System**: Cross-college enrollment management
- **Real-time Updates**: Live enrollment and waitlist information

## 📊 External Data Sources

### Rate My Professor
- **API Endpoint**: `https://www.ratemyprofessors.com/` (unofficial API available)
- **Data Available**:
  - Professor ratings (overall, difficulty)
  - Student reviews and comments
  - Course-specific feedback
  - Historical rating trends
- **Rate Limits**: Need to implement respectful scraping
- **Data Quality**: User-generated, requires validation

### Building and Location Data
- **Campus Maps**: Each college provides building location data
- **Room Information**: Capacity, accessibility, equipment
- **Walking Times**: Distance calculations between buildings
- **Parking and Transportation**: Campus shuttle and parking data

## 🛠️ Technical Implementation Strategy

### Data Collection Architecture

#### Phase 1: Web Scraping Infrastructure
```typescript
interface ScrapingTarget {
  school: 'HMC' | 'Pomona' | 'CMC' | 'Pitzer' | 'Scripps';
  baseUrl: string;
  endpoints: {
    courseSearch: string;
    courseDetails: string;
    enrollment: string;
  };
  selectors: {
    courseCode: string;
    courseTitle: string;
    professor: string;
    enrollmentData: string;
    timeLocation: string;
  };
  updateFrequency: number; // minutes
  rateLimits: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
  };
}
```

#### Phase 2: Data Harmonization
```typescript
interface DataNormalizationRules {
  courseCodeMapping: Record<string, string>; // "CLMC 123" -> "CMC 123"
  timeFormatStandardization: (input: string) => TimeSlot;
  locationCodeMapping: Record<string, BuildingLocation>;
  prerequisiteParser: (input: string) => PrerequisiteTree;
  creditCalculation: (course: RawCourseData) => number;
}
```

#### Phase 3: Real-Time Updates
```typescript
interface EnrollmentMonitor {
  courseId: string;
  lastKnownEnrollment: number;
  checkInterval: number;
  subscribers: string[]; // User IDs to notify
  alertThresholds: {
    spotsOpening: number;
    waitlistMovement: number;
    statusChange: boolean;
  };
}
```

## 🔐 Privacy and Compliance

### Data Collection Ethics
- **Respectful Scraping**: Implement delays and rate limiting
- **Terms of Service**: Review and comply with each school's ToS
- **User Privacy**: Never store personal student information
- **Data Minimization**: Collect only necessary course information

### Legal Considerations
- **Public Information**: Focus on publicly available course catalogs
- **Attribution**: Credit data sources appropriately
- **Opt-out Mechanisms**: Allow users to exclude personal data
- **FERPA Compliance**: Ensure no protected educational information is stored

## 📈 Data Quality Metrics

### Freshness Indicators
- **Last Update Timestamp**: When data was last refreshed
- **Staleness Score**: Age of data relative to update frequency
- **Sync Status**: Success/failure of last data collection attempt

### Accuracy Validation
- **Cross-Reference Checks**: Compare data across multiple sources
- **Historical Consistency**: Track changes and flag anomalies
- **User Feedback**: Allow students to report incorrect information
- **Manual Verification**: Periodic spot-checks of critical data

### Coverage Assessment
- **Course Completeness**: Percentage of offered courses captured
- **School Representation**: Balanced coverage across all 5Cs
- **Semester Currency**: Current vs. historical data availability

## 🚀 Implementation Roadmap

### Week 1-2: Infrastructure Setup
- Set up scraping infrastructure
- Implement rate limiting and error handling
- Create data storage schema
- Build basic monitoring dashboard

### Week 3-4: Data Collection
- Deploy scrapers for each school
- Implement data normalization pipeline  
- Set up real-time monitoring
- Create data quality validation

### Week 5-6: Integration
- Replace mock data with real API calls
- Implement caching and performance optimization
- Add error handling and fallback mechanisms
- Deploy monitoring and alerting systems

### Week 7-8: Enhancement
- Integrate external data sources (Rate My Professor)
- Add advanced features (popularity trends, recommendations)
- Implement user feedback mechanisms
- Optimize performance and reliability

This comprehensive data sourcing strategy will transform 5C Swipe from a prototype into a production-ready platform with real, up-to-date course information from all five Claremont Colleges.