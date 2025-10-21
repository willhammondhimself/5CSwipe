#!/usr/bin/env python3
"""
Test updated CMC scraper with working endpoints and parsing
"""

from cmc_portal_scraper import FiveCCourseScraper
import json

def test_updated_scraper():
    print("🧪 Testing Updated CMC Scraper...")
    
    scraper = FiveCCourseScraper()
    
    try:
        # Test 1: Get course areas
        print("🏫 Getting course areas...")
        areas = scraper.get_course_areas()
        print(f"   ✅ Found {len(areas)} areas")
        if areas:
            print(f"   📋 Sample areas: {areas[:5]}...")
            if "Computer Science" in areas:
                print("   ✅ Computer Science found in areas!")
            if "Economics" in areas:
                print("   ✅ Economics found in areas!")
        
        # Test 2: Search Computer Science courses
        print("\n💻 Searching Computer Science courses...")
        cs_courses = scraper.search_courses(
            term="FA 2025",
            course_area="Computer Science"
        )
        
        if cs_courses:
            print(f"   ✅ Found {len(cs_courses)} CS courses")
            
            # Show sample course
            sample = cs_courses[0]
            print(f"\n   📖 Sample CS course:")
            print(f"      Code: {sample['course_code']}")
            print(f"      Title: {sample['title']}")
            print(f"      Seats: {sample['seats_info']}")
            print(f"      Credits: {sample['credits']}")
            print(f"      Schedule: {sample['schedule']}")
            print(f"      Instructor: {sample['instructor']}")
            print(f"      College: {sample.get('college', 'Not parsed')}")
            
            # Save sample
            with open('updated_scraper_results.json', 'w') as f:
                json.dump(cs_courses[:5], f, indent=2)
            print(f"   💾 Saved sample to 'updated_scraper_results.json'")
        else:
            print("   ❌ No CS courses found - check parsing logic")
        
        # Test 3: Quick search for Economics
        print("\n📈 Testing Economics courses...")
        econ_courses = scraper.search_courses(
            term="FA 2025", 
            course_area="Economics"
        )
        print(f"   📊 Found {len(econ_courses)} Economics courses")
        
        print("\n🎉 Scraper test completed!")
        return len(cs_courses) > 0
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_updated_scraper()