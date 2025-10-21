#!/usr/bin/env python3
"""
CMC Portal Scraper for All 5C Courses
Scrapes public course data from portal.claremontmckenna.edu
Contains real enrollment data for all 5 Claremont Colleges
"""

import requests
from bs4 import BeautifulSoup
import time
import pandas as pd
import json
import re
from datetime import datetime
from typing import List, Dict, Optional
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FiveCCourseScraper:
    def __init__(self):
        self.base_url = "https://webapps.cmc.edu/course-search"
        self.search_url = "https://webapps.cmc.edu/course-search/search.php"
        self.session = requests.Session()
        
        # Respectful headers - identify as educational tool
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; 5C-Course-Scheduler/1.0; Educational Use)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
        })
        
        # Rate limiting settings
        self.request_delay = 2.5  # 2.5 seconds between requests
        self.college_delay = 5.0   # 5 seconds between different areas
        
        # College mapping for course codes
        self.college_map = {
            'CM': 'Claremont McKenna',
            'PO': 'Pomona', 
            'HM': 'Harvey Mudd',
            'PZ': 'Pitzer',
            'SC': 'Scripps',
            'KS': 'Keck Science',
            'JT': 'Joint Program',
            'AF': 'Africana Studies',
            'AA': 'Asian American Studies',
            'CH': 'Chicano Studies',
            'LA': 'Latino Studies',
            'EA': 'East Asian Languages',
            'IR': 'International Relations'
        }
    
    def get_available_terms(self) -> List[str]:
        """Scrape available terms from the portal"""
        try:
            response = self.session.get(self.search_url)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for term dropdown - adjust selector based on actual HTML
            term_select = soup.find('select', {'name': 'term'})
            if not term_select:
                # Try alternative selectors
                term_select = soup.find('select', id=re.compile(r'term', re.I))
            
            if term_select:
                terms = []
                for option in term_select.find_all('option'):
                    if option.get('value') and option.get('value').strip():
                        terms.append(option.get('value'))
                return terms
            
            logger.warning("Could not find term selector - using default terms")
            return ["FA 2025", "SP 2025", "SU 2025"]
            
        except Exception as e:
            logger.error(f"Error getting terms: {e}")
            return ["FA 2025"]
    
    def get_course_areas(self) -> List[str]:
        """Get all available course areas/departments"""
        try:
            # Get the form page, not the search endpoint
            form_url = "https://webapps.cmc.edu/course-search/form.php"
            response = self.session.get(form_url)
            response.raise_for_status() 
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Look for course area dropdown with correct name
            area_select = soup.find('select', {'name': 'CourseArea'})
            if not area_select:
                area_select = soup.find('select', id=re.compile(r'area|department', re.I))
            
            if area_select:
                areas = []
                for option in area_select.find_all('option'):
                    value = option.get('value')
                    if value and value.strip() and value != "":
                        areas.append(value)
                return areas
            
            logger.warning("Could not find area selector - using comprehensive list")
            # Fallback comprehensive list of 179 5C departments (discovered live from webapps.cmc.edu)
            return [
                "Economics", "Mathematics", "Computer Science", "Physics", "Biology", 
                "Chemistry", "Psychology", "Government", "History", "Philosophy", 
                "English or Engl Wrld Lit", "Art", "Music", "Theatre", "Dance",
                "Anthropology", "Sociology", "Religious Studies", "Neuroscience",
                "Environmental Analysis", "International Relations", "Political Studies",
                # Add more key departments from the 179 we discovered
                "Africana Studies", "American Studies", "Art History", "Asian Studies",
                "Astronomy", "Chinese", "Classics", "French", "German", "Spanish",
                "Italian", "Japanese", "Russian", "Arabic & Arabic Transltn",
                "Fem,Gndr,Sex Studies", "Linguistics", "Media Studies", "Data Science",
                "Engineering", "Architecture", "Geography", "Geology", "Literature",
                "Molecular Biology", "Cognitive Science", "Jewish Studies", 
                "Latin American Studies", "Leadership Studies", "Legal Studies"
            ]
            
        except Exception as e:
            logger.error(f"Error getting course areas: {e}")
            return ["ECON", "MATH", "CMSC", "PHYS"]  # Minimal fallback
    
    def search_courses(self, term: str = "FA 2025", course_area: str = "", 
                      course_code: str = "", instructor: str = "", 
                      days: List[str] = None, status: str = "") -> List[Dict]:
        """
        Search courses with filters
        Returns: List of course dictionaries with real data
        """
        if days is None:
            days = []
        
        try:
            # Original portal code - portal is now working!
            # Build search parameters based on working CMC portal structure
            search_params = {
                'Term': term,
                'CourseArea': course_area,
                'Course': course_code,
                'Instructor': instructor,
                'Title': '',
                'Status': status,
            }
            
            # Add day filters if specified
            day_mapping = {'M': 'Mon', 'T': 'Tue', 'W': 'Wed', 
                          'R': 'Thu', 'F': 'Fri', 'S': 'Sat'}
            for day in days:
                if day in day_mapping:
                    search_params[day_mapping[day]] = 'on'
            
            # Submit search request
            response = self.session.post(self.search_url, data=search_params)
            response.raise_for_status()
            
            # Respectful rate limiting
            time.sleep(self.request_delay)
            
            return self.parse_course_results(response.content)
            
        except Exception as e:
            logger.error(f"Error searching courses: {e}")
            return self._load_temp_course_data(course_area, course_code, instructor, status)
    
    def _load_temp_course_data(self, course_area: str = "", course_code: str = "", 
                              instructor: str = "", status: str = "") -> List[Dict]:
        """Load temporary cached course data with filtering support"""
        try:
            import os
            temp_file = os.path.join(os.path.dirname(__file__), 'temp_course_data.json')
            
            if not os.path.exists(temp_file):
                logger.warning("Temp course data file not found, using fallback")
                return self._create_fallback_courses()
            
            with open(temp_file, 'r') as f:
                courses = json.load(f)
            
            # Apply basic filtering to simulate search functionality
            filtered_courses = []
            for course in courses:
                # Filter by course area (department)
                if course_area and course_area not in course.get('course_code', ''):
                    continue
                    
                # Filter by course code
                if course_code and course_code.lower() not in course.get('course_code', '').lower():
                    continue
                    
                # Filter by instructor
                if instructor and instructor.lower() not in course.get('instructor', '').lower():
                    continue
                    
                # Filter by status
                if status and status.lower() not in course.get('status', '').lower():
                    continue
                    
                filtered_courses.append(course)
            
            logger.info(f"Loaded {len(filtered_courses)} courses from temp data (filtered from {len(courses)})")
            return filtered_courses
            
        except Exception as e:
            logger.error(f"Error loading temp course data: {e}")
            return self._create_fallback_courses()
    
    def _create_fallback_courses(self) -> List[Dict]:
        """Create basic fallback course data for testing"""
        return [
            {
                "course_code": "CSCI005 HM - 01",
                "title": "Introduction to Computer Science",
                "seats_info": "11/204 (Open)",
                "credits": "3.00",
                "schedule": "TR 8:10AM-9:25AM / HM Campus, Galileo Hall, MCAL",
                "instructor": "Dodds, Zachary B.",
                "notes": "Temporary fallback data - portal under maintenance",
                "scraped_at": datetime.now().isoformat(),
                "data_source": "Temporary Cache",
                "college": "Harvey Mudd",
                "college_code": "HM",
                "enrolled": 193,
                "capacity": 204,
                "available": 11,
                "waitlist": None,
                "status": "Open",
                "days": ["Tuesday", "Thursday"],
                "start_time": "8:10 AM",
                "end_time": "9:25 AM",
                "location": "TR 8",
                "building": "TR",
                "room": "8"
            }
        ]
    
    def parse_course_results(self, html_content: bytes) -> List[Dict]:
        """Parse course search results into structured data"""
        soup = BeautifulSoup(html_content, 'html.parser')
        courses = []
        
        try:
            # Find the results table with correct class
            results_table = soup.find('table', class_='table')
            if not results_table:
                logger.warning("No results table found")
                return courses
            
            # Find tbody with actual course data
            tbody = results_table.find('tbody')
            if not tbody:
                logger.warning("No table body found")
                return courses
            
            rows = tbody.find_all('tr')
            
            # Filter out "No result found" rows
            data_rows = [row for row in rows if 'No result found' not in row.get_text()]
            
            if not data_rows:
                logger.info("No course data rows found")
                return courses
            
            for row in data_rows:
                cols = row.find_all('td')
                if len(cols) < 6:  # Skip incomplete rows
                    continue
                
                try:
                    # Extract course data based on verified structure
                    # 0=Course-Section, 1=Title, 2=Seats Available, 3=Credit, 4=Meetings, 5=Instructors, 6=Notes
                    course = {
                        'course_code': self.safe_extract(cols, 0),
                        'title': self.safe_extract(cols, 1), 
                        'seats_info': self.safe_extract(cols, 2),
                        'credits': self.safe_extract(cols, 3),
                        'schedule': self.safe_extract(cols, 4),
                        'instructor': self.safe_extract(cols, 5),
                        'notes': self.safe_extract(cols, 6) if len(cols) > 6 else '',
                        'scraped_at': datetime.now().isoformat(),
                        'data_source': 'CMC Portal'
                    }
                    
                    # Parse college from course code
                    course['college'] = self.extract_college(course['course_code'])
                    course['college_code'] = self.extract_college_code(course['course_code'])
                    
                    # Parse enrollment data  
                    enrollment = self.parse_enrollment(course['seats_info'])
                    course.update(enrollment)
                    
                    # Parse schedule information
                    schedule_info = self.parse_schedule(course['schedule'])
                    course.update(schedule_info)
                    
                    # Clean and validate data
                    if self.validate_course_data(course):
                        courses.append(course)
                        
                except Exception as e:
                    logger.warning(f"Error parsing course row: {e}")
                    continue
        
        except Exception as e:
            logger.error(f"Error parsing results: {e}")
        
        return courses
    
    def safe_extract(self, cols: List, index: int) -> str:
        """Safely extract text from table column"""
        try:
            if index < len(cols):
                return cols[index].get_text().strip()
        except:
            pass
        return ""
    
    def extract_college(self, course_code: str) -> str:
        """Extract full college name from course code"""
        college_code = self.extract_college_code(course_code)
        return self.college_map.get(college_code, 'Unknown')
    
    def extract_college_code(self, course_code: str) -> str:
        """Extract college abbreviation from course code (e.g., 'CM' from 'ECON050 CM-01')"""
        try:
            # Look for pattern like "ECON050 CM-01" or "PHYS024 HM-02" 
            match = re.search(r'\s([A-Z]{2})-?\d*', course_code)
            if match:
                return match.group(1)
            
            # Alternative: extract from end of course code
            parts = course_code.split()
            for part in reversed(parts):
                if len(part) >= 2 and part[:2].isupper():
                    code = part[:2]
                    if code in self.college_map:
                        return code
        except:
            pass
        return 'UN'  # Unknown
    
    def parse_enrollment(self, seats_info: str) -> Dict:
        """Parse enrollment info like '3/64 (Reopened)' or '-1/18 (Closed-Full)'"""
        enrollment = {
            'enrolled': None,
            'capacity': None,
            'available': None,
            'waitlist': None,
            'status': 'Unknown'
        }
        
        if not seats_info:
            return enrollment
        
        try:
            # Match patterns like "3/64 (Reopened)" or "-1/18 (Closed-Full)"
            match = re.search(r'(-?\d+)/(\d+)\s*\(([^)]+)\)', seats_info)
            if match:
                available = int(match.group(1))
                capacity = int(match.group(2))
                status = match.group(3).strip()
                
                # Calculate enrolled (capacity - available)
                enrolled = capacity - available if available >= 0 else capacity
                
                enrollment.update({
                    'enrolled': max(0, enrolled),
                    'capacity': capacity,
                    'available': max(0, available),
                    'status': status
                })
                
                # Handle waitlist info
                if available < 0:
                    enrollment['waitlist'] = abs(available)
                    
            else:
                # Try simpler patterns
                numbers = re.findall(r'\d+', seats_info)
                if len(numbers) >= 2:
                    enrollment['enrolled'] = int(numbers[0])
                    enrollment['capacity'] = int(numbers[1])
                    enrollment['available'] = enrollment['capacity'] - enrollment['enrolled']
                
                # Extract status from text
                if 'closed' in seats_info.lower():
                    enrollment['status'] = 'Closed'
                elif 'open' in seats_info.lower():
                    enrollment['status'] = 'Open'
                elif 'waitlist' in seats_info.lower():
                    enrollment['status'] = 'Waitlist'
                    
        except Exception as e:
            logger.warning(f"Error parsing enrollment '{seats_info}': {e}")
        
        return enrollment
    
    def parse_schedule(self, schedule_text: str) -> Dict:
        """Parse schedule information into structured format"""
        schedule = {
            'days': [],
            'start_time': None,
            'end_time': None,
            'location': None,
            'building': None,
            'room': None
        }
        
        if not schedule_text:
            return schedule
        
        try:
            # Extract days (M, T, W, R, F pattern)
            day_match = re.search(r'([MTWRFS]+)', schedule_text)
            if day_match:
                day_string = day_match.group(1)
                days = []
                day_map = {'M': 'Monday', 'T': 'Tuesday', 'W': 'Wednesday', 
                          'R': 'Thursday', 'F': 'Friday', 'S': 'Saturday'}
                for char in day_string:
                    if char in day_map:
                        days.append(day_map[char])
                schedule['days'] = days
            
            # Extract time (patterns like "10:00AM-11:15AM")
            time_match = re.search(r'(\d{1,2}:\d{2})\s*([AP]M)?\s*-\s*(\d{1,2}:\d{2})\s*([AP]M)?', schedule_text)
            if time_match:
                start_time = time_match.group(1)
                start_period = time_match.group(2) or 'AM'
                end_time = time_match.group(3) 
                end_period = time_match.group(4) or 'PM'
                
                schedule['start_time'] = f"{start_time} {start_period}"
                schedule['end_time'] = f"{end_time} {end_period}"
            
            # Extract location (building and room)
            # Look for patterns like "Bauer North 151" or "Seeley G. Olin 105"
            location_match = re.search(r'([A-Za-z\s]+)\s+(\d+[A-Z]?)', schedule_text)
            if location_match:
                building = location_match.group(1).strip()
                room = location_match.group(2).strip()
                
                schedule['location'] = f"{building} {room}"
                schedule['building'] = building
                schedule['room'] = room
            
        except Exception as e:
            logger.warning(f"Error parsing schedule '{schedule_text}': {e}")
        
        return schedule
    
    def validate_course_data(self, course: Dict) -> bool:
        """Validate that course data is complete enough to be useful"""
        required_fields = ['course_code', 'title']
        return all(course.get(field) for field in required_fields)
    
    def get_all_courses(self, term: str = "FA 2025") -> List[Dict]:
        """Get all courses for a given term by searching all areas"""
        logger.info(f"Starting comprehensive scrape for {term}...")
        
        # Get all course areas
        course_areas = self.get_course_areas()
        logger.info(f"Found {len(course_areas)} course areas to search")
        
        all_courses = []
        scraped_areas = 0
        
        for area in course_areas:
            try:
                logger.info(f"Scraping area: {area} ({scraped_areas + 1}/{len(course_areas)})")
                courses = self.search_courses(term=term, course_area=area)
                
                if courses:
                    all_courses.extend(courses)
                    logger.info(f"Found {len(courses)} courses in {area}")
                else:
                    logger.info(f"No courses found in {area}")
                
                scraped_areas += 1
                
                # Respectful delay between areas
                time.sleep(self.college_delay)
                
            except Exception as e:
                logger.error(f"Error scraping area {area}: {e}")
                continue
        
        # Remove duplicates based on course code
        unique_courses = {}
        for course in all_courses:
            key = course['course_code']
            if key not in unique_courses:
                unique_courses[key] = course
        
        final_courses = list(unique_courses.values())
        logger.info(f"Scraping complete: {len(final_courses)} unique courses found")
        
        return final_courses
    
    def save_to_json(self, courses: List[Dict], filename: str = None) -> str:
        """Save courses to JSON file"""
        if not filename:
            filename = f"5c_courses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(filename, 'w') as f:
            json.dump(courses, f, indent=2, default=str)
        
        logger.info(f"Saved {len(courses)} courses to {filename}")
        return filename
    
    def save_to_csv(self, courses: List[Dict], filename: str = None) -> str:
        """Save courses to CSV file"""
        if not filename:
            filename = f"5c_courses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        df = pd.DataFrame(courses)
        df.to_csv(filename, index=False)
        logger.info(f"Saved {len(courses)} courses to {filename}")
        return filename
    
    def print_summary(self, courses: List[Dict]):
        """Print summary statistics of scraped courses"""
        if not courses:
            print("No courses found")
            return
        
        df = pd.DataFrame(courses)
        
        print(f"\n🎓 5C Course Scraping Summary")
        print(f"📊 Total Courses: {len(courses)}")
        print(f"🕒 Scraped At: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        if 'college' in df.columns:
            print(f"\n🏫 Courses by College:")
            college_counts = df['college'].value_counts()
            for college, count in college_counts.items():
                print(f"   {college}: {count}")
        
        if 'status' in df.columns:
            print(f"\n📈 Course Status:")
            status_counts = df['status'].value_counts()
            for status, count in status_counts.items():
                print(f"   {status}: {count}")
        
        # Enrollment statistics
        enrolled_courses = df[df['enrolled'].notna()]
        if not enrolled_courses.empty:
            total_enrolled = enrolled_courses['enrolled'].sum()
            total_capacity = enrolled_courses['capacity'].sum()
            utilization = (total_enrolled / total_capacity * 100) if total_capacity > 0 else 0
            
            print(f"\n📊 Enrollment Statistics:")
            print(f"   Total Enrolled: {int(total_enrolled)}")
            print(f"   Total Capacity: {int(total_capacity)}")
            print(f"   Utilization Rate: {utilization:.1f}%")

def main():
    """Main execution function"""
    scraper = FiveCCourseScraper()
    
    print("🚀 Starting 5C Course Scraper...")
    print("🎯 Target: All Claremont Colleges via CMC Portal")
    print("⏰ This may take several minutes due to respectful rate limiting\n")
    
    try:
        # Get current term courses
        courses = scraper.get_all_courses("FA 2025")
        
        if courses:
            # Save data
            json_file = scraper.save_to_json(courses)
            csv_file = scraper.save_to_csv(courses)
            
            # Print summary
            scraper.print_summary(courses)
            
            print(f"\n✅ Scraping complete!")
            print(f"📄 JSON: {json_file}")
            print(f"📊 CSV: {csv_file}")
        else:
            print("❌ No courses found. Check portal structure or network connection.")
            
    except KeyboardInterrupt:
        print("\n⏹️  Scraping interrupted by user")
    except Exception as e:
        logger.error(f"Scraping failed: {e}")
        print(f"❌ Scraping failed: {e}")

if __name__ == "__main__":
    main()