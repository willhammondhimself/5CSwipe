#!/usr/bin/env python3
"""
Simple Supabase Course Data Loader
==================================
Loads comprehensive 5C course data with only core fields that definitely exist.
"""

import json
import os
import sys
from typing import Dict, List, Any
from supabase import create_client, Client

def load_env_vars():
    """Load environment variables from .env file"""
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value

def get_supabase_client() -> Client:
    """Initialize Supabase client with environment credentials"""
    load_env_vars()
    
    url = os.environ.get('EXPO_PUBLIC_SUPABASE_URL')
    key = os.environ.get('EXPO_PUBLIC_SUPABASE_ANON_KEY')
    
    if not url or not key:
        raise ValueError("Missing Supabase credentials. Check your .env file.")
    
    return create_client(url, key)

def transform_course_data(course: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform scraped course data to core fields only
    """
    # Parse enrollment from "11/204 (Open)" format
    available = 0
    cap = 0
    
    if course.get('seats_info'):
        import re
        enrollment_match = re.search(r'(\d+)\/(\d+)', course['seats_info'])
        if enrollment_match:
            available = int(enrollment_match.group(1))
            cap = int(enrollment_match.group(2))
    
    # Extract department from course code (e.g., CSCI005 -> CSCI)
    department = 'Unknown'
    if course.get('course_code'):
        import re
        dept_match = re.match(r'^([A-Z]+)', course['course_code'])
        if dept_match:
            department = dept_match.group(1)
    
    # Transform to minimal required fields
    return {
        # Core required fields only
        'course_code': course.get('course_code', ''),
        'title': course.get('title', ''),
        'school': course.get('college_code', ''),
        'department': department,
        'semester': 'FA 2025',
        'credits': float(course.get('credits', 3)),
        'professor': course.get('instructor', ''),
        'meeting_time': course.get('schedule', ''),
        'location': course.get('location', ''),
        'enrollment_cap': cap,
        'enrollment_current': cap - available,
        'status': 'open' if available > 0 else 'closed',
        'scraped_at': course.get('scraped_at', '2025-09-09T00:00:00Z')
    }

def load_courses_from_json(file_path: str) -> List[Dict[str, Any]]:
    """Load courses from comprehensive JSON file"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Course data file not found: {file_path}")
    
    print(f"📂 Loading course data from: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Check if data is directly an array of courses or wrapped in an object
    if isinstance(data, list):
        courses = data
    else:
        courses = data.get('courses', [])
    
    print(f"📊 Loaded {len(courses)} courses from JSON file")
    
    return courses

def batch_insert_courses(supabase: Client, courses: List[Dict[str, Any]], batch_size: int = 100):
    """Insert courses in batches with minimal fields"""
    total_courses = len(courses)
    total_batches = (total_courses + batch_size - 1) // batch_size
    
    print(f"💾 Inserting {total_courses} courses in {total_batches} batches of {batch_size}")
    print("📋 Using minimal field set to avoid schema conflicts")
    
    successful_inserts = 0
    failed_inserts = 0
    
    for i in range(0, total_courses, batch_size):
        batch = courses[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        try:
            print(f"🔄 Processing batch {batch_num}/{total_batches} ({len(batch)} courses)")
            
            # Transform courses for this batch
            transformed_batch = [transform_course_data(course) for course in batch]
            
            # Print first course for debugging
            if transformed_batch:
                print(f"🔍 Sample course: {transformed_batch[0]['course_code']} - {transformed_batch[0]['title']}")
            
            # Insert batch into Supabase
            result = supabase.table('courses').upsert(
                transformed_batch, 
                on_conflict='course_code,semester',
                count='exact'
            ).execute()
            
            batch_count = len(transformed_batch)
            successful_inserts += batch_count
            print(f"✅ Batch {batch_num} completed: {batch_count} courses inserted")
            
        except Exception as e:
            print(f"❌ Batch {batch_num} failed: {str(e)}")
            failed_inserts += len(batch)
            
            # Print details of first failed course for debugging
            if batch:
                print(f"🔍 First course in failed batch: {batch[0].get('course_code', 'Unknown')}")
                # Print what we tried to insert
                try:
                    sample = transform_course_data(batch[0])
                    print(f"🔍 Attempted to insert: {list(sample.keys())}")
                except Exception as te:
                    print(f"🔍 Transform error: {str(te)}")
    
    print(f"\n📈 Load Summary:")
    print(f"  ✅ Successful: {successful_inserts} courses")
    print(f"  ❌ Failed: {failed_inserts} courses")
    print(f"  📊 Success Rate: {(successful_inserts/total_courses)*100:.1f}%")
    
    return successful_inserts, failed_inserts

def verify_data_load(supabase: Client):
    """Verify that data was loaded correctly"""
    print("\n🔍 Verifying data load...")
    
    try:
        # Count total courses
        result = supabase.table('courses').select('id', count='exact').execute()
        total_count = len(result.data) if result.data else 0
        
        print(f"📊 Total courses in database: {total_count}")
        
        # Sample a few courses
        sample_result = supabase.table('courses').select('course_code,title,school,enrollment_cap').limit(5).execute()
        
        print(f"\n📋 Sample courses:")
        for course in sample_result.data:
            print(f"  • {course['course_code']}: {course['title']} ({course['school']}) - Cap: {course['enrollment_cap']}")
            
    except Exception as e:
        print(f"❌ Verification failed: {str(e)}")

def main():
    """Main execution function"""
    print("🚀 Starting Simple Supabase Course Data Loader")
    print("=" * 50)
    
    try:
        # Initialize Supabase client
        print("🔗 Connecting to Supabase...")
        supabase = get_supabase_client()
        print("✅ Supabase connection established")
        
        # Load course data from JSON
        json_file_path = os.path.join(os.path.dirname(__file__), '..', 'scrapers', 'comprehensive_5c_courses.json')
        courses = load_courses_from_json(json_file_path)
        
        if not courses:
            print("❌ No courses found in JSON file")
            return
        
        # Insert courses into Supabase
        successful, failed = batch_insert_courses(supabase, courses, batch_size=25)  # Smaller batches
        
        # Verify the load
        verify_data_load(supabase)
        
        print(f"\n🎉 Data loading completed!")
        print(f"📊 Final Results: {successful} successful, {failed} failed")
        
        if successful > 0:
            print("✅ Some courses loaded successfully! Your app should now show courses.")
            
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()