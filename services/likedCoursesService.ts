/**
 * likedCoursesService.ts
 * ======================
 * Supabase service layer for user liked courses
 *
 * Features:
 * - CRUD operations for liked courses
 * - Real-time subscriptions
 * - Super-like support
 * - User-specific data isolation via RLS
 */

import { supabase } from '../lib/supabase';
import { Course } from '@/data/mockCourses';

export interface UserLikedCourse {
  id: string;
  user_id: string;
  course_id: string;
  liked_at: string;
  is_super_like: boolean;
  swipe_direction: 'right' | 'super_right';
  user_notes: string | null;
  priority: number;
}

/**
 * Fetch all liked courses for the current user
 */
export async function getLikedCourses(userId: string): Promise<{ courses: Course[]; superLikedCourses: Course[]; error: Error | null }> {
  if (!supabase) {
    return { courses: [], superLikedCourses: [], error: new Error('Supabase not configured') };
  }

  try {
    // Get user's liked courses with JOIN to courses table
    const { data: likedData, error: likedError } = await supabase
      .from('user_liked_courses')
      .select(`
        id,
        course_id,
        is_super_like,
        swipe_direction,
        user_notes,
        priority,
        liked_at,
        courses (*)
      `)
      .eq('user_id', userId)
      .order('liked_at', { ascending: false });

    if (likedError) {
      console.error('Error fetching liked courses:', likedError);
      return { courses: [], superLikedCourses: [], error: likedError };
    }

    if (!likedData) {
      return { courses: [], superLikedCourses: [], error: null };
    }

    // Extract courses and separate super likes
    const courses: Course[] = [];
    const superLikedCourses: Course[] = [];

    likedData.forEach((item: any) => {
      if (item.courses) {
        const course = item.courses as Course;
        courses.push(course);

        if (item.is_super_like) {
          superLikedCourses.push(course);
        }
      }
    });

    return { courses, superLikedCourses, error: null };
  } catch (error) {
    console.error('Exception fetching liked courses:', error);
    return { courses: [], superLikedCourses: [], error: error as Error };
  }
}

/**
 * Add a course to user's liked courses
 */
export async function addLikedCourse(
  userId: string,
  course: Course,
  isSuperLike: boolean = false
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('user_liked_courses')
      .upsert({
        user_id: userId,
        course_id: course.id,
        is_super_like: isSuperLike,
        swipe_direction: isSuperLike ? 'super_right' : 'right',
        priority: 5, // Default priority
        liked_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,course_id',
        ignoreDuplicates: false, // Update if exists
      });

    if (error) {
      console.error('Error adding liked course:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception adding liked course:', error);
    return { error: error as Error };
  }
}

/**
 * Remove a course from user's liked courses
 */
export async function removeLikedCourse(
  userId: string,
  courseId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('user_liked_courses')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error removing liked course:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception removing liked course:', error);
    return { error: error as Error };
  }
}

/**
 * Update super-like status for a course
 */
export async function updateSuperLike(
  userId: string,
  courseId: string,
  isSuperLike: boolean
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('user_liked_courses')
      .update({
        is_super_like: isSuperLike,
        swipe_direction: isSuperLike ? 'super_right' : 'right',
      })
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error updating super-like:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception updating super-like:', error);
    return { error: error as Error };
  }
}

/**
 * Update user notes for a liked course
 */
export async function updateCourseNotes(
  userId: string,
  courseId: string,
  notes: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('user_liked_courses')
      .update({ user_notes: notes })
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error updating course notes:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception updating course notes:', error);
    return { error: error as Error };
  }
}

/**
 * Update priority for a liked course
 */
export async function updateCoursePriority(
  userId: string,
  courseId: string,
  priority: number
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  // Validate priority range (1-10)
  const validPriority = Math.max(1, Math.min(10, priority));

  try {
    const { error } = await supabase
      .from('user_liked_courses')
      .update({ priority: validPriority })
      .eq('user_id', userId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Error updating course priority:', error);
      return { error };
    }

    return { error: null };
  } catch (error) {
    console.error('Exception updating course priority:', error);
    return { error: error as Error };
  }
}

/**
 * Subscribe to real-time changes for user's liked courses
 */
export function subscribeLikedCourses(
  userId: string,
  onUpdate: () => void
): (() => void) | null {
  if (!supabase) {
    console.warn('Supabase not configured, real-time disabled');
    return null;
  }

  const channel = supabase
    .channel('user_liked_courses_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_liked_courses',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📡 Liked courses changed:', payload);
        onUpdate();
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
}
