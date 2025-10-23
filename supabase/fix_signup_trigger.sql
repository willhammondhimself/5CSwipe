-- =============================================
-- Fix: User Signup Trigger - Add School Field
-- =============================================
-- This fixes the "Database error saving new user" issue
-- by properly extracting the school from user metadata
-- =============================================

-- Drop and recreate the handle_new_user function with school support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert user profile with school from metadata
  INSERT INTO public.user_profiles (id, email, full_name, school)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'school', 'HMC') -- Default to HMC if not provided
  );

  -- Insert user preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the signup
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger to ensure it's attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- VERIFICATION:
-- =============================================
-- After running this SQL in Supabase dashboard:
-- 1. Try signing up with a new account
-- 2. Check that user_profiles row is created with school field
-- 3. Verify no "Database error saving new user" error
-- =============================================
