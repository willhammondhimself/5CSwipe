#!/usr/bin/env node

/**
 * Direct integration test for CourseService
 * Tests Python API → Supabase → App data flow
 */

console.log('🧪 CourseSwipe Integration Test Starting...\n');

async function testCourseService() {
  try {
    // Test 1: Direct Python API call
    console.log('📋 Step 1: Testing Python API directly');
    const apiResponse = await fetch('http://localhost:8085/courses?term=FA%202025&area=Computer%20Science');
    const apiData = await apiResponse.json();
    
    console.log(`✅ Python API: ${apiData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`📊 Course count: ${apiData.courses?.length || 0}`);
    
    if (apiData.courses && apiData.courses.length > 0) {
      console.log('📋 Sample course data:');
      const sample = apiData.courses[0];
      console.log(`   - Course: ${sample.course_code}`);
      console.log(`   - Title: ${sample.title}`);
      console.log(`   - Building: ${sample.building}`);
      console.log(`   - Days: ${sample.days?.join(', ') || 'N/A'}`);
      console.log(`   - Seats: ${sample.seats_info}`);
    }
    
    // Test 2: Supabase connection
    console.log('\n📋 Step 2: Testing Supabase connection');
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log(`🔗 Supabase URL: ${supabaseUrl ? 'SET' : 'MISSING'}`);
    console.log(`🔑 Supabase Key: ${supabaseKey ? 'SET' : 'MISSING'}`);
    
    if (supabaseUrl && supabaseKey) {
      // Simple test to see if Supabase is reachable
      const supabaseTest = await fetch(`${supabaseUrl}/rest/v1/courses?select=count`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      });
      console.log(`✅ Supabase connection: ${supabaseTest.ok ? 'SUCCESS' : 'FAILED'}`);
      
      if (supabaseTest.ok) {
        const countData = await supabaseTest.text();
        console.log(`📊 Current Supabase data: ${countData}`);
      }
    }
    
    console.log('\n🎯 Integration test completed!');
    console.log('📋 Next steps:');
    console.log('   1. Verify React Native app is calling useCourses correctly');
    console.log('   2. Check if courseService.getCourses() is being triggered');
    console.log('   3. Ensure data conversion is working properly');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

// Load environment variables
require('dotenv').config();
testCourseService();