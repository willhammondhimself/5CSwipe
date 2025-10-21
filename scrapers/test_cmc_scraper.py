#!/usr/bin/env python3
"""
Quick test of CMC Portal Scraper
Tests connectivity and basic parsing functionality
"""

from cmc_portal_scraper import FiveCCourseScraper
import json

def test_scraper():
    print("🧪 Testing CMC Portal Scraper...")
    
    scraper = FiveCCourseScraper()
    
    try:
        # Test 1: Check connectivity
        print("🔗 Testing portal connectivity...")
        terms = scraper.get_available_terms()
        print(f"   ✅ Found {len(terms)} terms: {terms[:3]}...")
        
        # Test 2: Get course areas
        print("🏫 Getting course areas...")
        areas = scraper.get_course_areas()
        print(f"   ✅ Found {len(areas)} areas: {areas[:5]}...")
        
        # Test 3: Try a limited search
        print("📚 Testing limited course search...")
        test_courses = scraper.search_courses(
            term="FA 2025", 
            course_area="ECON" if "ECON" in areas else areas[0] if areas else ""
        )
        
        if test_courses:
            print(f"   ✅ Found {len(test_courses)} courses")
            
            # Show sample course
            sample = test_courses[0]
            print(f"   📖 Sample course: {sample.get('course_code')} - {sample.get('title')}")
            print(f"   🏫 College: {sample.get('college')}")
            print(f"   📊 Enrollment: {sample.get('enrolled')}/{sample.get('capacity')} ({sample.get('status')})")
            
            # Save sample data for inspection
            with open('test_sample_courses.json', 'w') as f:
                json.dump(test_courses[:5], f, indent=2, default=str)
            print(f"   💾 Saved sample to test_sample_courses.json")
            
        else:
            print("   ⚠️  No courses found - may need to adjust selectors")
        
        print("\n🎉 Test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_scraper()