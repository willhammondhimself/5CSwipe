import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Create Supabase client only if credentials are provided
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase credentials not found - falling back to Python API');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
})();

// Enhanced Database types for TypeScript - matches enhanced schema
export interface CourseRecord {
  id: string;
  
  // Course identification
  course_code: string;
  title: string;
  school: string;
  college?: string; // "Harvey Mudd", "Claremont McKenna College"
  college_code?: string; // "HM", "CM", "PO", "PZ", "SC"
  department: string;
  semester: string;
  
  // Course details
  description?: string;
  credits: number;
  prerequisites?: string;
  prerequisites_parsed?: Record<string, any>; // JSONB field
  notes?: string;
  
  // Enhanced schedule information
  meeting_time?: string;
  schedule?: string; // Full schedule string from portal
  days?: string[]; // ["Tuesday", "Thursday"]
  start_time?: string; // "8:10 AM"
  end_time?: string; // "9:25 AM"
  
  // Enhanced location information
  location?: string;
  building?: string; // "TR" (Tanenbaum Hall)
  room?: string; // "8" or "MCAL"
  campus?: string; // "HM Campus"
  full_location?: string; // "HM Campus, Galileo Hall, MCAL"
  
  // Instructor information
  professor?: string;
  instructor?: string; // Alternative instructor field
  professor_rating?: number;
  professor_difficulty?: number;
  
  // Enhanced enrollment data
  enrollment_cap: number;
  enrollment_current: number;
  enrollment_available?: number;
  seats_info?: string; // "11/204 (Open)"
  status: 'open' | 'closed' | 'waitlist';
  portal_status?: string; // "Open", "Closed"
  waitlist?: number;
  
  // Data source and tracking
  data_source?: string; // "CMC Portal"
  course_url?: string;
  syllabus_url?: string;
  
  // Cross-listing and relationships
  cross_listed_courses?: string[];
  parent_course_id?: string;
  
  // Metadata
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      courses: {
        Row: CourseRecord;
        Insert: Omit<CourseRecord, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<CourseRecord, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}