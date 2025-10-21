-- CourseSwipe Database Schema for Supabase
-- Created for CourseSwipe app to store course data from all Claremont Colleges

-- Enable Row Level Security
ALTER DATABASE postgres SET timezone TO 'America/Los_Angeles';

-- Courses table - main course data
CREATE TABLE IF NOT EXISTS courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Course identification
  course_code VARCHAR(20) NOT NULL, -- e.g., "CSCI005 HM - 01"
  title VARCHAR(255) NOT NULL,
  school VARCHAR(50) NOT NULL, -- CMC, HMC, Pomona, Pitzer, Scripps
  department VARCHAR(10) NOT NULL, -- CSCI, ECON, MATH, etc.
  semester VARCHAR(20) NOT NULL, -- FA 2025, SP 2025, etc.
  
  -- Course details
  description TEXT,
  credits DECIMAL(3,2) DEFAULT 3.00,
  prerequisites TEXT,
  
  -- Schedule information
  meeting_time TEXT, -- "TR 8:10AM-9:25AM"
  location TEXT, -- "HM Campus, Galileo Hall, MCAL"
  
  -- Instructor information
  professor VARCHAR(255), -- "Dodds, Zachary B.Medero, Julie"
  professor_rating DECIMAL(3,2), -- RateMyProfessor score (1.0-5.0)
  professor_difficulty DECIMAL(3,2), -- RateMyProfessor difficulty (1.0-5.0)
  
  -- Enrollment data
  enrollment_cap INTEGER DEFAULT 0,
  enrollment_current INTEGER DEFAULT 0,
  enrollment_available INTEGER GENERATED ALWAYS AS (enrollment_cap - enrollment_current) STORED,
  status VARCHAR(20) DEFAULT 'open', -- open, closed, waitlist
  
  -- Metadata
  scraped_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_school ON courses(school);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);  
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_courses_course_code ON courses(course_code);
CREATE INDEX IF NOT EXISTS idx_courses_status ON courses(status);
CREATE INDEX IF NOT EXISTS idx_courses_professor ON courses(professor);
CREATE INDEX IF NOT EXISTS idx_courses_scraped_at ON courses(scraped_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_courses_school_semester ON courses(school, semester);
CREATE INDEX IF NOT EXISTS idx_courses_department_semester ON courses(department, semester);

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

-- Row Level Security policies (for future user authentication)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Allow public read access for now (can be restricted later)
CREATE POLICY "Allow public read access" ON courses FOR SELECT USING (true);

-- Only allow inserts/updates from authenticated service role (our scraper)
CREATE POLICY "Allow service role write access" ON courses 
FOR ALL USING (auth.role() = 'service_role');

-- View for course search with computed fields
CREATE OR REPLACE VIEW course_search_view AS
SELECT 
  id,
  course_code,
  title,
  school,
  department,
  semester,
  description,
  credits,
  prerequisites,
  meeting_time,
  location,
  professor,
  professor_rating,
  professor_difficulty,
  enrollment_cap,
  enrollment_current,
  enrollment_available,
  CASE 
    WHEN enrollment_available > 0 THEN 'open'
    WHEN enrollment_available = 0 AND enrollment_cap > 0 THEN 'closed'
    ELSE 'unknown'
  END as computed_status,
  status,
  -- Full text search vector
  to_tsvector('english', 
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(professor, '') || ' ' ||
    coalesce(course_code, '')
  ) as search_vector,
  created_at,
  updated_at,
  scraped_at
FROM courses;

-- Index for full text search
CREATE INDEX IF NOT EXISTS idx_courses_search 
ON courses USING GIN(to_tsvector('english', 
  coalesce(title, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(professor, '') || ' ' ||
  coalesce(course_code, '')
));

-- Sample data for testing (can be removed after real data is loaded)
INSERT INTO courses (
  course_code, title, school, department, semester,
  description, credits, meeting_time, location, professor,
  enrollment_cap, enrollment_current, status, scraped_at
) VALUES 
(
  'CSCI005 HM - 01', 
  'Introduction to Computer Science', 
  'HMC', 
  'CSCI', 
  'FA 2025',
  'Fundamental concepts in computer science including programming, algorithms, and data structures.',
  3.00,
  'TR 8:10AM-9:25AM',
  'HM Campus, Galileo Hall, MCAL',
  'Dodds, Zachary B.',
  204,
  193,
  'open',
  NOW()
) ON CONFLICT (course_code, semester) DO NOTHING;

-- Function to get courses by filters (for API)
CREATE OR REPLACE FUNCTION get_courses_filtered(
  p_school TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_semester TEXT DEFAULT 'FA 2025',
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  course_code VARCHAR,
  title VARCHAR,
  school VARCHAR,
  department VARCHAR,
  semester VARCHAR,
  description TEXT,
  credits DECIMAL,
  prerequisites TEXT,
  meeting_time TEXT,
  location TEXT,
  professor VARCHAR,
  professor_rating DECIMAL,
  professor_difficulty DECIMAL,
  enrollment_cap INTEGER,
  enrollment_current INTEGER,
  enrollment_available INTEGER,
  status VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  scraped_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.course_code, c.title, c.school, c.department, c.semester,
    c.description, c.credits, c.prerequisites, c.meeting_time, c.location,
    c.professor, c.professor_rating, c.professor_difficulty,
    c.enrollment_cap, c.enrollment_current, c.enrollment_available, c.status,
    c.created_at, c.updated_at, c.scraped_at
  FROM courses c
  WHERE 
    (p_school IS NULL OR c.school = p_school) AND
    (p_department IS NULL OR c.department = p_department) AND
    (p_semester IS NULL OR c.semester = p_semester) AND
    (p_status IS NULL OR c.status = p_status) AND
    (p_search IS NULL OR 
     to_tsvector('english', 
       coalesce(c.title, '') || ' ' ||
       coalesce(c.description, '') || ' ' ||
       coalesce(c.professor, '') || ' ' ||
       coalesce(c.course_code, '')
     ) @@ plainto_tsquery('english', p_search))
  ORDER BY c.course_code, c.title
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;