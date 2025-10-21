-- =============================================
-- 5CSwipe User Authentication & Database Setup
-- =============================================
-- Migration 001: User authentication, profiles, and data tables
-- Created for Week 1 of Polished Beta development
-- =============================================

BEGIN;

-- =============================================
-- PART 1: User Profiles Table
-- =============================================
-- Extended user profile beyond Supabase auth.users
-- Stores 5C-specific student information

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,

  -- 5C-Specific Information
  school TEXT CHECK (school IN ('HMC', 'CMC', 'PO', 'PZ', 'SC', 'KS')) NOT NULL,
  graduation_year INTEGER CHECK (graduation_year >= 2024 AND graduation_year <= 2035),
  major TEXT,
  minor TEXT,
  double_major TEXT,

  -- Preferences
  credit_system TEXT CHECK (credit_system IN ('standard', 'hmc')) DEFAULT 'standard',
  notification_preferences JSONB DEFAULT '{"spot_available": true, "waitlist_movement": true, "course_added": true}'::jsonb,

  -- Privacy
  profile_visibility TEXT CHECK (profile_visibility IN ('public', 'friends', 'private')) DEFAULT 'public',
  allow_friend_requests BOOLEAN DEFAULT true,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT false
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_school ON public.user_profiles(school);
CREATE INDEX idx_user_profiles_grad_year ON public.user_profiles(graduation_year);
CREATE INDEX idx_user_profiles_major ON public.user_profiles(major);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view public profiles"
  ON public.user_profiles FOR SELECT
  USING (
    profile_visibility = 'public' OR
    auth.uid() = id
  );

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =============================================
-- PART 2: User Liked Courses Table
-- =============================================
-- Stores courses that users have swiped right on

CREATE TABLE IF NOT EXISTS public.user_liked_courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,

  -- Swipe metadata
  liked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_super_like BOOLEAN DEFAULT false,
  swipe_direction TEXT CHECK (swipe_direction IN ('right', 'super_right')) DEFAULT 'right',

  -- Notes
  user_notes TEXT,
  priority INTEGER CHECK (priority >= 1 AND priority <= 10) DEFAULT 5,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: user can only like a course once
  UNIQUE(user_id, course_id)
);

-- Indexes for user_liked_courses
CREATE INDEX idx_user_liked_courses_user ON public.user_liked_courses(user_id);
CREATE INDEX idx_user_liked_courses_course ON public.user_liked_courses(course_id);
CREATE INDEX idx_user_liked_courses_liked_at ON public.user_liked_courses(liked_at DESC);
CREATE INDEX idx_user_liked_courses_super ON public.user_liked_courses(user_id) WHERE is_super_like = true;

-- Enable RLS on user_liked_courses
ALTER TABLE public.user_liked_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_liked_courses
CREATE POLICY "Users can view own liked courses"
  ON public.user_liked_courses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own liked courses"
  ON public.user_liked_courses FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- PART 3: User Schedule Plans Table
-- =============================================
-- Stores different schedule variations users create

CREATE TABLE IF NOT EXISTS public.user_schedule_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Plan Information
  name TEXT NOT NULL DEFAULT 'My Schedule',
  description TEXT,
  semester TEXT NOT NULL DEFAULT 'FA 2025',

  -- Settings
  is_active BOOLEAN DEFAULT false, -- Only one plan can be active at a time
  color TEXT DEFAULT '#007AFF', -- Color coding for visual organization

  -- Courses in this plan (array of course IDs)
  course_ids UUID[] DEFAULT ARRAY[]::UUID[],

  -- Analytics
  total_credits DECIMAL(4,2) DEFAULT 0,
  course_count INTEGER DEFAULT 0,
  has_conflicts BOOLEAN DEFAULT false,

  -- Sharing
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE, -- For generating shareable links

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_schedule_plans
CREATE INDEX idx_user_schedule_plans_user ON public.user_schedule_plans(user_id);
CREATE INDEX idx_user_schedule_plans_active ON public.user_schedule_plans(user_id) WHERE is_active = true;
CREATE INDEX idx_user_schedule_plans_semester ON public.user_schedule_plans(semester);
CREATE INDEX idx_user_schedule_plans_share_token ON public.user_schedule_plans(share_token) WHERE share_token IS NOT NULL;

-- Enable RLS on user_schedule_plans
ALTER TABLE public.user_schedule_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_schedule_plans
CREATE POLICY "Users can view own schedule plans"
  ON public.user_schedule_plans FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can manage own schedule plans"
  ON public.user_schedule_plans FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- PART 4: User Preferences Table
-- =============================================
-- Stores user app preferences and filter settings

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Filter Preferences (saved state)
  preferred_schools TEXT[] DEFAULT ARRAY['HMC', 'CMC', 'PO', 'PZ', 'SC', 'KS']::TEXT[],
  preferred_time_slot TEXT DEFAULT 'any',
  preferred_credit_range INTEGER[] DEFAULT ARRAY[1, 6]::INTEGER[],
  show_full_courses BOOLEAN DEFAULT true,

  -- Display Preferences
  theme TEXT CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
  card_animation_speed TEXT CHECK (card_animation_speed IN ('slow', 'normal', 'fast')) DEFAULT 'normal',
  haptic_feedback BOOLEAN DEFAULT true,

  -- Notification Preferences
  enable_push_notifications BOOLEAN DEFAULT true,
  notification_quiet_hours_start TIME,
  notification_quiet_hours_end TIME,

  -- Privacy Preferences
  analytics_consent BOOLEAN DEFAULT true,
  data_sharing_consent BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_preferences
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- =============================================
-- PART 5: Automatic Triggers
-- =============================================

-- Trigger: Create user profile when new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Attach update triggers to all tables
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_liked_courses_updated_at
  BEFORE UPDATE ON public.user_liked_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_schedule_plans_updated_at
  BEFORE UPDATE ON public.user_schedule_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- PART 6: Helper Functions
-- =============================================

-- Function: Generate share token for schedule
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Function: Get user's active schedule plan
CREATE OR REPLACE FUNCTION public.get_active_schedule_plan(p_user_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  course_ids UUID[],
  total_credits DECIMAL,
  course_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    usp.id,
    usp.name,
    usp.course_ids,
    usp.total_credits,
    usp.course_count
  FROM public.user_schedule_plans usp
  WHERE usp.user_id = p_user_id
  AND usp.is_active = true
  LIMIT 1;
END;
$$;

-- Function: Get user's liked courses with course details
CREATE OR REPLACE FUNCTION public.get_user_liked_courses_with_details(p_user_id UUID)
RETURNS TABLE(
  liked_course_id UUID,
  course_code TEXT,
  title TEXT,
  credits DECIMAL,
  is_super_like BOOLEAN,
  liked_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ulc.id as liked_course_id,
    c.course_code::TEXT,
    c.title::TEXT,
    c.credits,
    ulc.is_super_like,
    ulc.liked_at
  FROM public.user_liked_courses ulc
  JOIN public.courses c ON c.id = ulc.course_id
  WHERE ulc.user_id = p_user_id
  ORDER BY ulc.liked_at DESC;
END;
$$;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES
-- =============================================
-- Run these after migration to verify setup:

-- 1. Check all tables were created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'user_%'
ORDER BY table_name;

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'user_%';

-- 3. Check triggers are attached
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table LIKE 'user_%';

-- =============================================
-- SUCCESS INDICATORS:
-- =============================================
-- ✅ 4 new tables created (user_profiles, user_liked_courses, user_schedule_plans, user_preferences)
-- ✅ RLS enabled on all tables
-- ✅ Triggers attached for auto-profile creation and timestamp updates
-- ✅ Helper functions created for common operations
-- ✅ Ready for frontend integration!
-- =============================================
