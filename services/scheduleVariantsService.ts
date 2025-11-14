/**
 * scheduleVariantsService.ts
 * ===========================
 * Supabase service layer for user schedule plans
 *
 * Features:
 * - CRUD operations for schedule plans
 * - Real-time subscriptions
 * - Conflict detection
 * - Public sharing with tokens
 * - User-specific data isolation via RLS
 */

import { supabase } from '../lib/supabase';
import { Course } from '@/data/mockCourses';

export interface SchedulePlanDB {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  semester: string;
  is_active: boolean;
  color: string;
  course_ids: string[];
  total_credits: number;
  course_count: number;
  has_conflicts: boolean;
  is_public: boolean;
  share_token: string | null;
  created_at: string;
}

export interface SchedulePlan {
  id: string;
  name: string;
  description: string;
  courses: Course[];
  createdAt: Date;
  lastModified: Date;
  isActive: boolean;
  semester: string;
  color: string;
  totalCredits: number;
  hasConflicts: boolean;
  isPublic: boolean;
  shareToken: string | null;
}

/**
 * Fetch all schedule plans for the current user
 */
export async function getSchedulePlans(
  userId: string
): Promise<{ plans: SchedulePlan[]; error: Error | null }> {
  if (!supabase) {
    return { plans: [], error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('user_schedule_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching schedule plans:', error);
      return { plans: [], error };
    }

    if (!data) {
      return { plans: [], error: null };
    }

    // Convert DB format to app format
    // Note: We'll need to fetch actual course data separately
    const plans: SchedulePlan[] = data.map((plan: SchedulePlanDB) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      courses: [], // Will be populated separately
      createdAt: new Date(plan.created_at),
      lastModified: new Date(plan.created_at),
      isActive: plan.is_active,
      semester: plan.semester,
      color: plan.color,
      totalCredits: plan.total_credits,
      hasConflicts: plan.has_conflicts,
      isPublic: plan.is_public,
      shareToken: plan.share_token,
    }));

    return { plans, error: null };
  } catch (error) {
    console.error('Exception fetching schedule plans:', error);
    return { plans: [], error: error as Error };
  }
}

/**
 * Get courses for a specific schedule plan
 */
export async function getSchedulePlanCourses(
  planId: string
): Promise<{ courses: Course[]; error: Error | null }> {
  if (!supabase) {
    return { courses: [], error: new Error('Supabase not configured') };
  }

  try {
    // Get the plan with course_ids
    const { data: plan, error: planError } = await supabase
      .from('user_schedule_plans')
      .select('course_ids')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return { courses: [], error: planError };
    }

    if (!plan.course_ids || plan.course_ids.length === 0) {
      return { courses: [], error: null };
    }

    // Fetch the actual courses
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('*')
      .in('id', plan.course_ids);

    if (coursesError) {
      console.error('Error fetching courses:', coursesError);
      return { courses: [], error: coursesError };
    }

    return { courses: courses as Course[], error: null };
  } catch (error) {
    console.error('Exception fetching plan courses:', error);
    return { courses: [], error: error as Error };
  }
}

/**
 * Create a new schedule plan
 */
export async function createSchedulePlan(
  userId: string,
  name: string,
  description?: string,
  semester: string = 'FA 2025'
): Promise<{ planId: string | null; error: Error | null }> {
  if (!supabase) {
    return { planId: null, error: new Error('Supabase not configured') };
  }

  try {
    const { data, error } = await supabase
      .from('user_schedule_plans')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        semester,
        is_active: false,
        color: generateRandomColor(),
        course_ids: [],
        total_credits: 0,
        course_count: 0,
        has_conflicts: false,
        is_public: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating schedule plan:', error);
      return { planId: null, error };
    }

    console.log('✅ Created schedule plan:', data.id);
    return { planId: data.id, error: null };
  } catch (error) {
    console.error('Exception creating schedule plan:', error);
    return { planId: null, error: error as Error };
  }
}

/**
 * Update schedule plan
 */
export async function updateSchedulePlan(
  userId: string,
  planId: string,
  updates: {
    name?: string;
    description?: string;
    courseIds?: string[];
    isActive?: boolean;
    semester?: string;
    color?: string;
    isPublic?: boolean;
    shareToken?: string;
  }
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.semester !== undefined) updateData.semester = updates.semester;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.isPublic !== undefined) updateData.is_public = updates.isPublic;
    if (updates.shareToken !== undefined) updateData.share_token = updates.shareToken;

    if (updates.courseIds !== undefined) {
      updateData.course_ids = updates.courseIds;
      updateData.course_count = updates.courseIds.length;

      // Calculate total credits if we have course IDs
      if (updates.courseIds.length > 0) {
        const { data: courses } = await supabase
          .from('courses')
          .select('credits')
          .in('id', updates.courseIds);

        if (courses) {
          updateData.total_credits = courses.reduce(
            (sum, course) => sum + (course.credits || 0),
            0
          );
        }
      } else {
        updateData.total_credits = 0;
      }
    }

    // If setting a plan as active, deactivate others
    if (updates.isActive === true) {
      await supabase
        .from('user_schedule_plans')
        .update({ is_active: false })
        .eq('user_id', userId)
        .neq('id', planId);
    }

    const { error } = await supabase
      .from('user_schedule_plans')
      .update(updateData)
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating schedule plan:', error);
      return { error };
    }

    console.log('✅ Updated schedule plan:', planId);
    return { error: null };
  } catch (error) {
    console.error('Exception updating schedule plan:', error);
    return { error: error as Error };
  }
}

/**
 * Delete a schedule plan
 */
export async function deleteSchedulePlan(
  userId: string,
  planId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    const { error } = await supabase
      .from('user_schedule_plans')
      .delete()
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting schedule plan:', error);
      return { error };
    }

    console.log('✅ Deleted schedule plan:', planId);
    return { error: null };
  } catch (error) {
    console.error('Exception deleting schedule plan:', error);
    return { error: error as Error };
  }
}

/**
 * Add course to schedule plan
 */
export async function addCourseToSchedule(
  userId: string,
  planId: string,
  courseId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // Get current course_ids
    const { data: plan, error: fetchError } = await supabase
      .from('user_schedule_plans')
      .select('course_ids')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !plan) {
      return { error: fetchError || new Error('Plan not found') };
    }

    const courseIds = plan.course_ids || [];

    // Check if course already exists
    if (courseIds.includes(courseId)) {
      return { error: null }; // Already exists, no error
    }

    // Add course ID
    const updatedCourseIds = [...courseIds, courseId];

    // Update the plan
    return await updateSchedulePlan(userId, planId, { courseIds: updatedCourseIds });
  } catch (error) {
    console.error('Exception adding course to schedule:', error);
    return { error: error as Error };
  }
}

/**
 * Remove course from schedule plan
 */
export async function removeCourseFromSchedule(
  userId: string,
  planId: string,
  courseId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  try {
    // Get current course_ids
    const { data: plan, error: fetchError } = await supabase
      .from('user_schedule_plans')
      .select('course_ids')
      .eq('id', planId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !plan) {
      return { error: fetchError || new Error('Plan not found') };
    }

    // Remove course ID
    const updatedCourseIds = (plan.course_ids || []).filter((id: string) => id !== courseId);

    // Update the plan
    return await updateSchedulePlan(userId, planId, { courseIds: updatedCourseIds });
  } catch (error) {
    console.error('Exception removing course from schedule:', error);
    return { error: error as Error };
  }
}

/**
 * Generate public share token
 */
export async function generateShareToken(
  userId: string,
  planId: string
): Promise<{ token: string | null; error: Error | null }> {
  if (!supabase) {
    return { token: null, error: new Error('Supabase not configured') };
  }

  try {
    const token = Math.random().toString(36).substring(2, 15);

    const { error } = await supabase
      .from('user_schedule_plans')
      .update({
        share_token: token,
        is_public: true,
      })
      .eq('id', planId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error generating share token:', error);
      return { token: null, error };
    }

    console.log('✅ Generated share token:', token);
    return { token, error: null };
  } catch (error) {
    console.error('Exception generating share token:', error);
    return { token: null, error: error as Error };
  }
}

/**
 * Subscribe to real-time changes for user's schedule plans
 */
export function subscribeSchedulePlans(
  userId: string,
  onUpdate: () => void
): (() => void) | null {
  if (!supabase) {
    console.warn('Supabase not configured, real-time disabled');
    return null;
  }

  const channel = supabase
    .channel('user_schedule_plans_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_schedule_plans',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📡 Schedule plans changed:', payload);
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

/**
 * Helper: Generate random color for new plans
 */
function generateRandomColor(): string {
  const colors = [
    '#007AFF', // Blue
    '#FF6B9D', // Pink
    '#4ECDC4', // Teal
    '#FFE66D', // Yellow
    '#A8E6CF', // Mint
    '#FF6B6B', // Red
    '#C7B3FF', // Purple
    '#FFB347', // Orange
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
