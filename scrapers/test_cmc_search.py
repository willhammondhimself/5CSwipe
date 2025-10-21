#!/usr/bin/env python3
"""
Test CMC course search with actual data retrieval
"""

import requests
from bs4 import BeautifulSoup
import json

def test_cmc_search():
    print("🔍 Testing CMC Course Search with Real Data...")
    
    session = requests.Session()
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (compatible; 5C-Course-Inspector/1.0; Educational Use)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
    })
    
    try:
        # Test search with Computer Science courses
        print("💻 Searching for Computer Science courses...")
        
        search_data = {
            'Term': 'FA 2025',
            'CourseArea': 'All Computer Science',  # This should find CS courses
            'Instructor': '',
            'Title': '',
            'Course': '',
            'Status': '',
            # Day filters (unchecked = all days)
            'Mon': '',
            'Tue': '', 
            'Wed': '',
            'Thu': '',
            'Fri': '',
            'Sat': '',
            'Sun': ''
        }
        
        # Submit search request
        response = session.post('https://webapps.cmc.edu/course-search/search.php', data=search_data)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Save search results for analysis
        with open('cmc_search_results.html', 'w', encoding='utf-8') as f:
            f.write(soup.prettify())
        print("💾 Saved search results to 'cmc_search_results.html'")
        
        # Look for course data tables
        tables = soup.find_all('table')
        print(f"📊 Found {len(tables)} tables in results")
        
        # Look for course rows/entries
        courses = []
        for table in tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 4:  # Likely a course row
                    course_data = [cell.get_text(strip=True) for cell in cells]
                    if any(course_data):  # Skip empty rows
                        courses.append(course_data)
        
        print(f"📚 Found {len(courses)} potential course entries")
        
        # Show sample courses
        if courses:
            print("\n📖 Sample course data:")
            for i, course in enumerate(courses[:5]):
                print(f"   Course {i+1}: {course}")
                
            # Save as JSON for further analysis
            with open('sample_courses.json', 'w') as f:
                json.dump(courses[:10], f, indent=2)
            print("💾 Saved sample courses to 'sample_courses.json'")
        else:
            print("⚠️  No course data found - may need to analyze HTML structure")
            
            # Look for other potential course containers
            divs = soup.find_all('div')
            spans = soup.find_all('span')
            print(f"📋 Found {len(divs)} divs, {len(spans)} spans for further analysis")
        
        print(f"\n✅ Search test completed!")
        return len(courses) > 0
        
    except Exception as e:
        print(f"❌ Error during search: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_cmc_search()