#!/usr/bin/env node

// Test script to populate Supabase with real course data
const { CourseService } = require('./services/courseService.ts');

console.log('🧪 Testing CourseService integration...\n');

async function testIntegration() {
  try {
    const courseService = CourseService.getInstance();
    
    console.log('📋 Step 1: Clear cache to force fresh data fetch');
    courseService.clearCache();
    
    console.log('📋 Step 2: Fetch courses (will trigger Python API → Supabase flow)');
    const courses = await courseService.getCourses({
      department: 'Computer Science',
      semester: 'FA 2025'
    });
    
    console.log(`✅ Successfully fetched ${courses.length} courses`);
    console.log('📊 Sample course:', courses[0]);
    
    console.log('\n🎯 Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testIntegration();