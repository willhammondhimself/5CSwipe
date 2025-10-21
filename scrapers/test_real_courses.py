#!/usr/bin/env python3
"""
Test CMC course search with correct parameters to get real course data
"""

import requests
from bs4 import BeautifulSoup
import json

def test_real_courses():
    print("🔍 Testing CMC Course Search with Correct Parameters...")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (compatible; 5C-Course-Inspector/1.0; Educational Use)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    })
    
    try:
        print("💻 Searching for Computer Science courses...")
        
        search_data = {
            'Term': 'FA 2025',
            'CourseArea': 'Computer Science',  # Corrected value
            'Instructor': '',
            'Title': '',
            'Course': '',
            'Status': '',
        }
        
        # Submit search request
        response = session.post('https://webapps.cmc.edu/course-search/search.php', data=search_data)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Save search results
        with open('real_cs_courses.html', 'w', encoding='utf-8') as f:
            f.write(soup.prettify())
        print("💾 Saved CS course results to 'real_cs_courses.html'")
        
        # Parse course table
        table = soup.find('table', class_='table')
        if table and table.find('tbody'):
            tbody = table.find('tbody')
            rows = tbody.find_all('tr')
            
            # Filter out "No result found" message
            course_rows = [row for row in rows if 'No result found' not in row.get_text()]
            
            print(f"📚 Found {len(course_rows)} Computer Science courses")
            
            courses = []
            for row in course_rows:
                cells = row.find_all('td')
                if len(cells) >= 6:
                    course_data = {
                        'course_section': cells[0].get_text(strip=True),
                        'title': cells[1].get_text(strip=True),
                        'seats_available': cells[2].get_text(strip=True),
                        'credit': cells[3].get_text(strip=True),
                        'meetings': cells[4].get_text(strip=True),
                        'instructors': cells[5].get_text(strip=True),
                        'notes': cells[6].get_text(strip=True) if len(cells) > 6 else ''
                    }
                    courses.append(course_data)
            
            # Display sample courses
            if courses:
                print("\n📖 Sample Computer Science courses:")
                for i, course in enumerate(courses[:3]):
                    print(f"\n   Course {i+1}:")
                    print(f"      Code: {course['course_section']}")
                    print(f"      Title: {course['title']}")
                    print(f"      Available: {course['seats_available']}")
                    print(f"      Credits: {course['credit']}")
                    print(f"      Times: {course['meetings']}")
                    print(f"      Instructor: {course['instructors']}")
                
                # Save as JSON
                with open('real_courses.json', 'w') as f:
                    json.dump(courses, f, indent=2)
                print(f"\n💾 Saved {len(courses)} courses to 'real_courses.json'")
                
                return True
            else:
                print("⚠️  No courses found in table")
        else:
            print("⚠️  No course table found")
        
        # Also test with Economics courses for diversity
        print("\n📈 Testing with Economics courses...")
        
        econ_data = {
            'Term': 'FA 2025',
            'CourseArea': 'Economics',
            'Instructor': '',
            'Title': '',
            'Course': '',
            'Status': '',
        }
        
        response = session.post('https://webapps.cmc.edu/course-search/search.php', data=econ_data)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        table = soup.find('table', class_='table')
        if table and table.find('tbody'):
            tbody = table.find('tbody')
            econ_rows = [row for row in tbody.find_all('tr') if 'No result found' not in row.get_text()]
            print(f"📊 Found {len(econ_rows)} Economics courses")
        
        return True
        
    except Exception as e:
        print(f"❌ Error during search: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_real_courses()