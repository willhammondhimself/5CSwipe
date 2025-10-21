-- CourseSwipe Enhanced Database Schema for Supabase
-- Created for CourseSwipe app to store course data from all Claremont Colleges
-- Enhanced version with all available fields from CMC Portal

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'America/Los_Angeles';

-- Courses table - comprehensive course data
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Course identification
  course_code VARCHAR(20) NOT NULL, -- e.g., "CSCI005 HM - 01"
  title VARCHAR(255) NOT NULL,

  college VARCHAR(50), -- "Harvey Mudd", "Claremont McKenna College"
  college_code VARCHAR(10), -- "HM", "CM", "PO", "PZ", "SC"
  department VARCHAR(10) NOT NULL, -- CSCI, ECON, MATH, etc.
  semester VARCHAR(20) NOT NULL, -- FA 2025, SP 2025, etc.
  
  -- Course details
  description TEXT,
  credits DECIMAL(3,2) DEFAULT 3.00,
  prerequisites TEXT,
  prerequisites_parsed JSONB, -- Structured prerequisite data for future use
  notes TEXT, -- Course notes/comments
  
  -- Enhanced schedule information
  meeting_time TEXT, -- "TR 8:10AM-9:25AM"
  schedule TEXT, -- Full schedule string from portal
  days TEXT[], -- ["Tuesday", "Thursday"] - array of meeting days
  start_time VARCHAR(20), -- "8:10 AM"
  end_time VARCHAR(20), -- "9:25 AM"
  
  -- Enhanced location information
  location TEXT, -- "TR 8" or full location string
  building VARCHAR(10), -- "TR" (Tanenbaum Hall)
  room VARCHAR(20), -- "8" or "MCAL"
  campus VARCHAR(50), -- "HM Campus"
  full_location TEXT, -- "HM Campus, Galileo Hall, MCAL"
  
  -- Instructor information
  professor VARCHAR(255), -- "Dodds, Zachary B.Medero, Julie"
  instructor VARCHAR(255), -- Alternative instructor field
  professor_rating DECIMAL(3,2), -- RateMyProfessor score (1.0-5.0)
  professor_difficulty DECIMAL(3,2), -- RateMyProfessor difficulty (1.0-5.0)
  
  -- Enhanced enrollment data
  enrollment_cap INTEGER DEFAULT 0, -- capacity
  enrollment_current INTEGER DEFAULT 0, -- enrolled
  enrollment_available INTEGER, -- available seats
  seats_info VARCHAR(50), -- "11/204 (Open)" - raw seats string
  status VARCHAR(20) DEFAULT 'open', -- open, closed, waitlist
  portal_status VARCHAR(20), -- "Open", "Closed" - original status from portal
  waitlist INTEGER, -- waitlist count
  
  -- Data source and tracking
  data_source VARCHAR(50) DEFAULT 'CMC Portal', -- Source of the data
  course_url TEXT, -- Link to official course page
  syllabus_url TEXT, -- Link to syllabus (future enhancement)
  
  -- Cross-listing and relationships
  cross_listed_courses TEXT[], -- Array of cross-listed course codes
  parent_course_id UUID REFERENCES courses(id), -- For linked courses
  
  -- Metadata
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school);
CREATE INDEX IF NOT EXISTS idx_courses_college_code ON courses(college_code);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);  
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_courses_course_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_portal_status ON courses(portal_status);
CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor);
CREATE INDEX IF NOT EXISTS idx_courses_building ON courses(building);
CREATE INDEX IF NOT EXISTS idx_courses_scraped_at ON courses(scraped_at);

-- Enhanced indexes for schedule filtering
CREATE INDEX IF NOT EXISTS idx_courses_days ON courses USING GIN(days);
CREATE INDEX IF NOT EXISTS idx_courses_start_time ON courses(start_time);
CREATE INDEX IF NOT EXISTS idx_courses_end_time ON courses(end_time);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_courses_school_semester ON courses(school, semester);
CREATE INDEX IF NOT EXISTS idx_courses_department_semester ON courses(department, semester);
CREATE INDEX IF NOT EXISTS idx_courses_building_semester ON courses(building, semester);

-- Unique constraint to prevent duplicate courses
CREATE UNIQUE INDEX IF NOT EXISTS idx_courses_unique 
ON courses(course_code, semester);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at 
  BEFORE UPDATE ON courses 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically calculate enrollment_available
CREATE OR REPLACE FUNCTION calculate_enrollment_available()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate available seats if not explicitly provided
    IF NEW.enrollment_available IS NULL THEN
        NEW.enrollment_available = GREATEST(0, COALESCE(NEW.enrollment_cap, 0) - COALESCE(NEW.enrollment_current, 0));
    END IF;
    
    -- Update status based on availability
    IF NEW.enrollment_available > 0 THEN
        NEW.status = 'open';
    ELSIF NEW.enrollment_available = 0 AND NEW.enrollment_cap > 0 THEN
        NEW.status = 'closed';
    ELSIF NEW.waitlist > 0 THEN
        NEW.status = 'waitlist';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_courses_enrollment 
  BEFORE INSERT OR UPDATE ON courses 
  FOR EACH ROW 
  EXECUTE FUNCTION calculate_enrollment_available();

-- Row Level Security policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow public read access for now (can be restricted later)
CREATE POLICY "Allow public read access" ON courses FOR SELECT USING (true);

-- Only allow inserts/updates from authenticated service role (our scraper)
CREATE POLICY "Allow service role write access" ON courses 
FOR ALL USING (auth.role() = 'service_role');

-- Enhanced view for course search with all computed fields
CREATE OR REPLACE VIEW course_search_view AS
SELECT 
  id,
  course_code,
  title,
  school,
  college,
  college_code,
  department,
  semester,
  description,
  credits,
  prerequisites,
  prerequisites_parsed,
  notes,
  meeting_time,
  schedule,
  days,
  start_time,
  end_time,
  location,
  building,
  room,
  campus,
  full_location,
  professor,
  instructor,
  professor_rating,
  professor_difficulty,
  enrollment_cap,
  enrollment_current,
  enrollment_available,
  seats_info,
  CASE 
    WHEN enrollment_available > 0 THEN 'open'
    WHEN enrollment_available = 0 AND enrollment_cap > 0 THEN 'closed'
    WHEN waitlist > 0 THEN 'waitlist'
    ELSE 'unknown'
  END as computed_status,
  status,
  portal_status,
  waitlist,
  data_source,
  course_url,
  syllabus_url,
  cross_listed_courses,
  parent_course_id,
  -- Enhanced full text search vector
  to_tsvector('english', 
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(professor, '') || ' ' ||
    coalesce(instructor, '') || ' ' ||
    coalesce(course_code, '') || ' ' ||
    coalesce(notes, '') || ' ' ||
    coalesce(building, '') || ' ' ||
    coalesce(location, '')
  ) as search_vector,
  created_at,
  updated_at,
  scraped_at
FROM courses;

-- Enhanced index for full text search
CREATE INDEX IF NOT EXISTS idx_courses_search 
ON courses USING GIN(to_tsvector('english', 
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(professor, '') || ' ' ||
  coalesce(instructor, '') || ' ' ||
  coalesce(course_code, '') || ' ' ||
  coalesce(notes, '') || ' ' ||
  coalesce(building, '') || ' ' ||
  coalesce(location, '')
));

-- Sample enhanced data for testing
INSERT INTO courses (
  course_code, title, school, college, college_code, department, semester,
  description, credits, meeting_time, schedule, days, start_time, end_time,
  location, building, room, full_location, professor, instructor,
  enrollment_cap, enrollment_current, enrollment_available, seats_info,
  status, portal_status, data_source, scraped_at
) VALUES 
(
  'CSCI005 HM - 01', 
  'Introduction to Computer Science', 
  'HMC',
  'Harvey Mudd',
  'HM', 
  'CSCI', 
  'FA 2025',
  'Fundamental concepts in computer science including programming, algorithms, and data structures.',
  3.00,
  'TR 8:10AM-9:25AM',
  'TR   8:10AM-9:25AM / HM Campus, Galileo Hall, MCAL',
  ARRAY['Tuesday', 'Thursday'],
  '8:10 AM',
  '9:25 AM',
  'TR 8',
  'TR',
  '8',
  'HM Campus, Galileo Hall, MCAL',
  'Dodds, Zachary B.',
  'Dodds, Zachary B.Medero, Julie',
  204,
  193,
  11,
  '11/204 (Open)',
  'open',
  'Open',
  'CMC Portal',
  NOW()
) ON CONFLICT (course_code, semester) DO NOTHING;

-- Enhanced function to get courses by filters
CREATE OR REPLACE FUNCTION get_courses_filtered(
  p_school TEXT DEFAULT NULL,
  p_college_code TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_semester TEXT DEFAULT 'FA 2025',
  p_status TEXT DEFAULT NULL,
  p_building TEXT DEFAULT NULL,
  p_days TEXT[] DEFAULT NULL,
  p_start_time_after TEXT DEFAULT NULL,
  p_end_time_before TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  course_code VARCHAR,
  title VARCHAR,
  school VARCHAR,
  college VARCHAR,
  college_code VARCHAR,
  department VARCHAR,
  semester VARCHAR,
  description TEXT,
  credits DECIMAL,
  prerequisites TEXT,
  notes TEXT,
  meeting_time TEXT,
  schedule TEXT,
  days TEXT[],
  start_time VARCHAR,
  end_time VARCHAR,
  location TEXT,
  building VARCHAR,
  room VARCHAR,
  full_location TEXT,
  professor VARCHAR,
  instructor VARCHAR,
  professor_rating DECIMAL,
  professor_difficulty DECIMAL,
  enrollment_cap INTEGER,
  enrollment_current INTEGER,
  enrollment_available INTEGER,
  seats_info VARCHAR,
  status VARCHAR,
  portal_status VARCHAR,
  waitlist INTEGER,
  data_source VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.course_code, c.title, c.school, c.college, c.college_code, c.department, c.semester,
    c.description, c.credits, c.prerequisites, c.notes, c.meeting_time, c.schedule,
    c.days, c.start_time, c.end_time, c.location, c.building, c.room, c.full_location,
    c.professor, c.instructor, c.professor_rating, c.professor_difficulty,
    c.enrollment_cap, c.enrollment_current, c.enrollment_available, c.seats_info,
    c.status, c.portal_status, c.waitlist, c.data_source,
    c.created_at, c.updated_at, c.scraped_at
  FROM courses c
  WHERE 
    (p_school IS NULL OR c.school = p_school) AND
    (p_college_code IS NULL OR c.college_code = p_college_code) AND
    (p_department IS NULL OR c.department = p_department) AND
    (p_semester IS NULL OR c.semester = p_semester) AND
    (p_status IS NULL OR c.status = p_status) AND
    (p_building IS NULL OR c.building = p_building) AND
    (p_days IS NULL OR c.days && p_days) AND -- Array overlap operator
    (p_start_time_after IS NULL OR c.start_time >= p_start_time_after) AND
    (p_end_time_before IS NULL OR c.end_time <= p_end_time_before) AND
    (p_search IS NULL OR 
     to_tsvector('english', 
       coalesce(c.title, '') || ' ' ||
       coalesce(c.description, '') || ' ' ||
       coalesce(c.professor, '') || ' ' ||
       coalesce(c.instructor, '') || ' ' ||
       coalesce(c.course_code, '') || ' ' ||
       coalesce(c.notes, '') || ' ' ||
       coalesce(c.building, '') || ' ' ||
       coalesce(c.location, '')
     ) @@ plainto_tsquery('english', p_search))
  ORDER BY c.course_code, c.title
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get courses by time conflicts (useful for scheduling)
CREATE OR REPLACE FUNCTION get_conflicting_courses(
  p_days TEXT[],
  p_start_time TEXT,
  p_end_time TEXT,
  p_semester TEXT DEFAULT 'FA 2025'
)
RETURNS TABLE(
  course_code VARCHAR,
  title VARCHAR,
  professor VARCHAR,
  days TEXT[],
  start_time VARCHAR,
  end_time VARCHAR,
  location TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.course_code, c.title, c.professor, c.days, c.start_time, c.end_time, c.location
  FROM courses c
  WHERE 
    c.semester = p_semester AND
    c.days && p_days AND -- Days overlap
    (
      (c.start_time <= p_start_time AND c.end_time > p_start_time) OR
      (c.start_time < p_end_time AND c.end_time >= p_end_time) OR
      (c.start_time >= p_start_time AND c.end_time <= p_end_time)
    )
  ORDER BY c.start_time;
END;
$$ LANGUAGE plpgsql;