#!/usr/bin/env python3
"""
Supabase Course Data Loader
============================
Loads comprehensive 5C course data from JSON file into Supabase database.

Reads the comprehensive_5c_courses.json file (1,553 courses) and loads
all course data into the Supabase courses table with proper transformation.
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
    Transform scraped course data to match Supabase CourseRecord schema
    
    Args:
        course: Raw course data from comprehensive_5c_courses.json
        
    Returns:
        Transformed course data matching Supabase schema
    """
    # Parse enrollment from "11/204 (Open)" format
    enrollment_match = None
    available = 0
    cap = 0
    
    if course.get('seats_info'):
        import re
        enrollment_match = re.search(r'(\d+)\/(\d+)', course['seats_info'])
        if enrollment_match:
            available = int(enrollment_match.group(1))
            cap = int(enrollment_match.group(2))
    
    # Map college codes to full names
    college_mapping = {
        'HM': 'Harvey Mudd',
        'CM': 'Claremont McKenna College', 
        'PO': 'Pomona',
        'PZ': 'Pitzer',
        'SC': 'Scripps'
    }
    
    # Extract department from course code (e.g., CSCI005 -> CSCI)
    department = 'Unknown'
    if course.get('course_code'):
        import re
        dept_match = re.match(r'^([A-Z]+)', course['course_code'])
        if dept_match:
            department = dept_match.group(1)
    
    # Transform to Supabase format
    return {
        # Course identification
        'course_code': course.get('course_code', ''),
        'title': course.get('title', ''),
        'school': course.get('college_code', ''),
        'college': college_mapping.get(course.get('college_code', ''), course.get('college', '')),
        'college_code': course.get('college_code', ''),
        'department': department,
        'semester': 'FA 2025',
        
        # Course details
        'description': course.get('notes', ''),
        'credits': float(course.get('credits', 3)),
        'prerequisites': course.get('prerequisites', ''),
        'notes': course.get('notes', ''),
        
        # Enhanced schedule information
        'meeting_time': course.get('schedule', ''),
        'schedule': course.get('schedule', ''),
        'days': course.get('days', []),
        'start_time': course.get('start_time', ''),
        'end_time': course.get('end_time', ''),
        
        # Enhanced location information
        'location': course.get('location', ''),
        'building': course.get('building', ''),
        'room': course.get('room', ''),
        'campus': f"{college_mapping.get(course.get('college_code', ''), 'Unknown')} Campus",
        'full_location': course.get('schedule', ''),
        
        # Instructor information
        'professor': course.get('instructor', ''),
        'instructor': course.get('instructor', ''),
        
        # Enhanced enrollment data (using standard field names)
        'enrollment_cap': cap,
        'enrollment_current': cap - available,
        'enrollment_available': available,
        'seats_info': course.get('seats_info', ''),
        'status': 'open' if available > 0 else 'closed',
        'portal_status': course.get('status', ''),
        
        # Additional fields that might be expected
        'capacity': cap,
        'available': available,
        'enrolled': cap - available,
        
        # Data source and tracking
        'data_source': course.get('data_source', 'CMC Portal'),
        'course_url': course.get('course_url', ''),
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
    """Insert courses in batches to avoid rate limits"""
    total_courses = len(courses)
    total_batches = (total_courses + batch_size - 1) // batch_size
    
    print(f"💾 Inserting {total_courses} courses in {total_batches} batches of {batch_size}")
    
    successful_inserts = 0
    failed_inserts = 0
    
    for i in range(0, total_courses, batch_size):
        batch = courses[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        try:
            print(f"🔄 Processing batch {batch_num}/{total_batches} ({len(batch)} courses)")
            
            # Transform courses for this batch
            transformed_batch = [transform_course_data(course) for course in batch]
            
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
        
        # Count by college
        colleges = ['HM', 'CM', 'PO', 'PZ', 'SC']
        for college in colleges:
            college_result = supabase.table('courses').select('id', count='exact').eq('college_code', college).execute()
            college_count = len(college_result.data) if college_result.data else 0
            print(f"  📚 {college}: {college_count} courses")
        
        # Sample a few courses
        sample_result = supabase.table('courses').select('course_code,title,college_code,enrollment_cap').limit(3).execute()
        
        print(f"\n📋 Sample courses:")
        for course in sample_result.data:
            print(f"  • {course['course_code']}: {course['title']} ({course['college_code']}) - Cap: {course['enrollment_cap']}")
            
    except Exception as e:
        print(f"❌ Verification failed: {str(e)}")

def main():
    """Main execution function"""
    print("🚀 Starting Supabase Course Data Loader")
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
        successful, failed = batch_insert_courses(supabase, courses, batch_size=50)
        
        # Verify the load
        verify_data_load(supabase)
        
        print(f"\n🎉 Data loading completed!")
        print(f"📊 Final Results: {successful} successful, {failed} failed")
        
        if failed > 0:
            print(f"⚠️  {failed} courses failed to load. Check logs above for details.")
            sys.exit(1)
        else:
            print("✅ All courses loaded successfully!")
            
    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()