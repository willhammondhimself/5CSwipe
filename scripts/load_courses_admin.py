#!/usr/bin/env python3
"""
Admin Supabase Course Data Loader
==================================
Loads comprehensive 5C course data using service role key to bypass RLS.

IMPORTANT: You need to add SUPABASE_SERVICE_ROLE_KEY to your .env file.
Get it from: Supabase Dashboard > Project Settings > API > service_role key
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
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        os.environ[key] = value

def get_supabase_client() -> Client:
    """Initialize Supabase client with service role key for admin access"""
    load_env_vars()

    url = os.environ.get('EXPO_PUBLIC_SUPABASE_URL')
    service_key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url:
        raise ValueError("Missing EXPO_PUBLIC_SUPABASE_URL in .env file")

    if not service_key:
        print("\n❌ ERROR: Missing SUPABASE_SERVICE_ROLE_KEY")
        print("\n📋 To fix this:")
        print("1. Go to: https://supabase.com/dashboard/project/kiwjejzxqmodevqnvbqx/settings/api")
        print("2. Copy the 'service_role' key (NOT the anon key)")
        print("3. Add this line to your .env file:")
        print("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here")
        print("\n⚠️  WARNING: Service role key bypasses ALL security. Never commit it to git!")
        sys.exit(1)

    return create_client(url, service_key)

def transform_course_data(course: Dict[str, Any]) -> Dict[str, Any]:
    """Transform scraped course data to core fields only"""
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

def deduplicate_courses(courses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate courses, keeping the last occurrence of each course_code"""
    seen = {}
    for course in courses:
        course_code = course.get('course_code', '')
        # Keep last occurrence by overwriting
        seen[course_code] = course

    deduplicated = list(seen.values())
    duplicates_removed = len(courses) - len(deduplicated)

    if duplicates_removed > 0:
        print(f"🔄 Removed {duplicates_removed} duplicate courses (kept last occurrence)")

    return deduplicated

def load_courses_from_json(file_path: str) -> List[Dict[str, Any]]:
    """Load courses from comprehensive JSON file"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Course data file not found: {file_path}")

    print(f"📂 Loading course data from: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if isinstance(data, list):
        courses = data
    else:
        courses = data.get('courses', [])

    print(f"📊 Loaded {len(courses)} courses from JSON file")

    # Deduplicate before returning
    courses = deduplicate_courses(courses)
    print(f"📊 After deduplication: {len(courses)} unique courses")

    return courses

def batch_insert_courses(supabase: Client, courses: List[Dict[str, Any]], batch_size: int = 100):
    """Insert courses in batches using service role (bypasses RLS)"""
    total_courses = len(courses)
    total_batches = (total_courses + batch_size - 1) // batch_size

    print(f"💾 Inserting {total_courses} courses in {total_batches} batches of {batch_size}")
    print("🔓 Using service role key to bypass Row Level Security")

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
        # Get ACTUAL count using count='exact' (not len(data))
        result = supabase.table('courses').select('id', count='exact').eq('semester', 'FA 2025').execute()
        total_count = result.count if hasattr(result, 'count') and result.count else len(result.data)

        print(f"📊 Total courses in database: {total_count}")

        # Check for Physics courses specifically
        physics_result = supabase.table('courses').select('course_code', count='exact').eq('department', 'PHYS').eq('semester', 'FA 2025').execute()
        physics_count = physics_result.count if hasattr(physics_result, 'count') and physics_result.count else len(physics_result.data)
        print(f"  🔬 Physics courses: {physics_count}")

        # Show sample Physics courses if found
        if physics_count > 0:
            print(f"  ✅ Physics courses found! Sample:")
            for course in physics_result.data[:3]:
                print(f"     • {course['course_code']}")

        # Count unique departments (need to fetch all, limited by Supabase default)
        dept_result = supabase.table('courses').select('department', count='exact').eq('semester', 'FA 2025').execute()
        unique_depts = len(set(c['department'] for c in dept_result.data if c.get('department')))
        print(f"  📚 Unique departments: {unique_depts}")

        # Sample a few courses
        sample_result = supabase.table('courses').select('course_code,title,department,school').limit(5).execute()

        print(f"\n📋 Sample courses:")
        for course in sample_result.data:
            print(f"  • {course['course_code']}: {course['title']} ({course['department']}/{course['school']})")

    except Exception as e:
        print(f"❌ Verification failed: {str(e)}")

def main():
    """Main execution function"""
    print("🚀 Starting Admin Supabase Course Data Loader")
    print("=" * 60)

    try:
        # Initialize Supabase client with service role
        print("🔗 Connecting to Supabase with service role key...")
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

        if successful > 0:
            print("✅ Courses loaded! Physics search should now work in your app.")

    except Exception as e:
        print(f"❌ Fatal error: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
