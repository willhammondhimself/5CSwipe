/**
 * ScheduleVariantsContext.tsx
 * ============================
 * Schedule plan management with Supabase sync
 *
 * Features:
 * - Supabase backend with RLS
 * - Real-time sync across devices
 * - Multiple named schedule variants
 * - Course conflict detection
 * - Public sharing with tokens
 * - AsyncStorage fallback for offline
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '@/data/mockCourses';
import { useAuth } from './AuthContext';
import {
  getSchedulePlans,
  getSchedulePlanCourses,
  createSchedulePlan,
  updateSchedulePlan,
  deleteSchedulePlan as deleteSchedulePlanDB,
  addCourseToSchedule,
  removeCourseFromSchedule,
  subscribeSchedulePlans,
} from '../services/scheduleVariantsService';

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

interface ScheduleVariantsContextType {
  plans: SchedulePlan[];
  activePlan: SchedulePlan | null;
  isLoading: boolean;
  syncError: Error | null;

  // Plan management
  createPlan: (name: string, description?: string) => Promise<string>;
  duplicatePlan: (planId: string) => Promise<string>;
  deletePlan: (planId: string) => Promise<boolean>;
  renamePlan: (planId: string, name: string, description?: string) => Promise<boolean>;

  // Plan activation
  setActivePlan: (planId: string) => Promise<boolean>;

  // Course management within plans
  addCourseToPlan: (planId: string, course: Course) => Promise<boolean>;
  removeCourseFromPlan: (planId: string, courseId: string) => Promise<boolean>;
  moveCourseBetweenPlans: (courseId: string, fromPlanId: string, toPlanId: string) => Promise<boolean>;
  updatePlanCourses: (planId: string, courses: Course[]) => Promise<boolean>;

  // Bulk operations
  createPlanFromCourses: (name: string, courses: Course[], description?: string) => Promise<string>;
  mergePlans: (planIds: string[], newName: string) => Promise<string>;

  // Sharing
  generateShareToken: (planId: string) => Promise<string | null>;
  makePublic: (planId: string) => Promise<boolean>;
  makePrivate: (planId: string) => Promise<boolean>;
}

const ScheduleVariantsContext = createContext<ScheduleVariantsContextType | undefined>(undefined);

const STORAGE_KEY = '@CourseSwipe:schedulePlans';

interface ScheduleVariantsProviderProps {
  children: ReactNode;
  initialCourses?: Course[];
}

export function ScheduleVariantsProvider({
  children,
  initialCourses = []
}: ScheduleVariantsProviderProps) {
  const { user } = useAuth();
  const [plans, setPlans] = useState<SchedulePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // Load plans on mount and when user changes
  useEffect(() => {
    if (user) {
      loadFromSupabase();

      // Subscribe to real-time updates
      const unsubscribe = subscribeSchedulePlans(user.id, () => {
        console.log('📡 Real-time update received, refreshing schedule plans');
        loadFromSupabase();
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } else {
      // Not logged in - load from AsyncStorage
      loadFromAsyncStorage();
    }
  }, [user]);

  // Create initial plan from liked courses if needed
  useEffect(() => {
    if (!isLoading && initialCourses.length > 0 && plans.length === 0 && user) {
      createInitialPlan(initialCourses);
    }
  }, [isLoading, initialCourses, plans.length, user]);

  // Save to AsyncStorage as backup whenever data changes
  useEffect(() => {
    if (!isLoading) {
      saveToAsyncStorage();
    }
  }, [plans, isLoading]);

  const loadFromSupabase = async () => {
    if (!user) return;

    setIsLoading(true);
    setSyncError(null);

    try {
      const { plans: dbPlans, error: plansError } = await getSchedulePlans(user.id);

      if (plansError) {
        console.error('❌ Error loading schedule plans from Supabase:', plansError);
        setSyncError(plansError);
        await loadFromAsyncStorage();
        return;
      }

      // Load courses for each plan
      const plansWithCourses = await Promise.all(
        dbPlans.map(async (plan) => {
          const { courses, error: coursesError } = await getSchedulePlanCourses(plan.id);

          if (coursesError) {
            console.error(`❌ Error loading courses for plan ${plan.id}:`, coursesError);
            return { ...plan, courses: [] };
          }

          return { ...plan, courses };
        })
      );

      console.log(`✅ Loaded ${plansWithCourses.length} schedule plans from Supabase`);
      setPlans(plansWithCourses);
    } catch (error) {
      console.error('❌ Exception loading schedule plans:', error);
      setSyncError(error as Error);
      await loadFromAsyncStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromAsyncStorage = async () => {
    try {
      const savedPlans = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedPlans) {
        const parsedPlans: SchedulePlan[] = JSON.parse(savedPlans).map((plan: any) => ({
          ...plan,
          createdAt: new Date(plan.createdAt),
          lastModified: new Date(plan.lastModified),
        }));
        setPlans(parsedPlans);
        console.log('📱 Loaded schedule plans from AsyncStorage');
      }
    } catch (error) {
      console.error('Error loading from AsyncStorage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveToAsyncStorage = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    } catch (error) {
      console.error('Error saving to AsyncStorage:', error);
    }
  };

  const createInitialPlan = async (courses: Course[]) => {
    if (!user) return;

    const { planId, error } = await createSchedulePlan(user.id, 'My Schedule', 'Your main schedule with liked courses');

    if (error || !planId) {
      console.error('❌ Error creating initial plan:', error);
      return;
    }

    // Add courses to the plan
    const courseIds = courses.map(c => c.id);
    await updateSchedulePlan(user.id, planId, {
      courseIds,
      isActive: true
    });

    // Reload from server
    await loadFromSupabase();
  };

  const createPlan = async (name: string, description = ''): Promise<string> => {
    if (!user) {
      // Offline mode - create local plan
      const newPlan: SchedulePlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name.trim(),
        description: description.trim(),
        courses: [],
        createdAt: new Date(),
        lastModified: new Date(),
        isActive: false,
        semester: 'FA 2025',
        color: '#007AFF',
        totalCredits: 0,
        hasConflicts: false,
        isPublic: false,
        shareToken: null,
      };

      setPlans(prev => [...prev, newPlan]);
      return newPlan.id;
    }

    // Supabase mode
    const { planId, error } = await createSchedulePlan(user.id, name, description);

    if (error || !planId) {
      console.error('❌ Error creating plan:', error);
      setSyncError(error);
      return '';
    }

    console.log('✅ Created plan:', planId);
    await loadFromSupabase();
    return planId;
  };

  const duplicatePlan = async (planId: string): Promise<string> => {
    const originalPlan = plans.find(p => p.id === planId);
    if (!originalPlan) return '';

    return await createPlanFromCourses(
      `${originalPlan.name} Copy`,
      originalPlan.courses,
      `Copy of ${originalPlan.name}`
    );
  };

  const deletePlan = async (planId: string): Promise<boolean> => {
    if (!user) {
      // Offline mode
      const planToDelete = plans.find(p => p.id === planId);
      if (!planToDelete) return false;

      let updatedPlans = plans.filter(p => p.id !== planId);

      if (planToDelete.isActive && updatedPlans.length > 0) {
        updatedPlans[0].isActive = true;
      }

      setPlans(updatedPlans);
      return true;
    }

    // Supabase mode
    const { error } = await deleteSchedulePlanDB(user.id, planId);

    if (error) {
      console.error('❌ Error deleting plan:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Deleted plan:', planId);
    await loadFromSupabase();
    return true;
  };

  const renamePlan = async (planId: string, name: string, description = ''): Promise<boolean> => {
    if (!user) {
      // Offline mode
      setPlans(prev => prev.map(plan =>
        plan.id === planId
          ? { ...plan, name: name.trim(), description: description.trim(), lastModified: new Date() }
          : plan
      ));
      return true;
    }

    // Supabase mode
    const { error } = await updateSchedulePlan(user.id, planId, { name, description });

    if (error) {
      console.error('❌ Error renaming plan:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Renamed plan:', planId);
    await loadFromSupabase();
    return true;
  };

  const setActivePlan = async (planId: string): Promise<boolean> => {
    if (!user) {
      // Offline mode
      setPlans(prev => prev.map(plan => ({
        ...plan,
        isActive: plan.id === planId
      })));
      return true;
    }

    // Supabase mode
    const { error } = await updateSchedulePlan(user.id, planId, { isActive: true });

    if (error) {
      console.error('❌ Error setting active plan:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Set active plan:', planId);
    await loadFromSupabase();
    return true;
  };

  const addCourseToPlan = async (planId: string, course: Course): Promise<boolean> => {
    if (!user) {
      // Offline mode
      setPlans(prev => prev.map(plan => {
        if (plan.id === planId) {
          const courseExists = plan.courses.some(c => c.id === course.id);
          if (courseExists) return plan;

          return {
            ...plan,
            courses: [...plan.courses, course],
            lastModified: new Date(),
          };
        }
        return plan;
      }));
      return true;
    }

    // Supabase mode
    const { error } = await addCourseToSchedule(user.id, planId, course.id);

    if (error) {
      console.error('❌ Error adding course to plan:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Added course to plan:', course.id);
    await loadFromSupabase();
    return true;
  };

  const removeCourseFromPlan = async (planId: string, courseId: string): Promise<boolean> => {
    if (!user) {
      // Offline mode
      setPlans(prev => prev.map(plan => {
        if (plan.id === planId) {
          return {
            ...plan,
            courses: plan.courses.filter(c => c.id !== courseId),
            lastModified: new Date(),
          };
        }
        return plan;
      }));
      return true;
    }

    // Supabase mode
    const { error } = await removeCourseFromSchedule(user.id, planId, courseId);

    if (error) {
      console.error('❌ Error removing course from plan:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Removed course from plan:', courseId);
    await loadFromSupabase();
    return true;
  };

  const moveCourseBetweenPlans = async (
    courseId: string,
    fromPlanId: string,
    toPlanId: string
  ): Promise<boolean> => {
    const fromPlan = plans.find(p => p.id === fromPlanId);
    const course = fromPlan?.courses.find(c => c.id === courseId);

    if (!course) return false;

    await removeCourseFromPlan(fromPlanId, courseId);
    await addCourseToPlan(toPlanId, course);

    return true;
  };

  const updatePlanCourses = async (planId: string, courses: Course[]): Promise<boolean> => {
    if (!user) {
      // Offline mode
      setPlans(prev => prev.map(plan => {
        if (plan.id === planId) {
          return {
            ...plan,
            courses,
            lastModified: new Date(),
          };
        }
        return plan;
      }));
      return true;
    }

    // Supabase mode
    const courseIds = courses.map(c => c.id);
    const { error } = await updateSchedulePlan(user.id, planId, { courseIds });

    if (error) {
      console.error('❌ Error updating plan courses:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Updated plan courses');
    await loadFromSupabase();
    return true;
  };

  const createPlanFromCourses = async (
    name: string,
    courses: Course[],
    description = ''
  ): Promise<string> => {
    const planId = await createPlan(name, description);
    if (!planId) return '';

    await updatePlanCourses(planId, courses);
    return planId;
  };

  const mergePlans = async (planIds: string[], newName: string): Promise<string> => {
    const plansToMerge = plans.filter(p => planIds.includes(p.id));
    const allCourses = plansToMerge.reduce((acc, plan) => {
      plan.courses.forEach(course => {
        if (!acc.some(c => c.id === course.id)) {
          acc.push(course);
        }
      });
      return acc;
    }, [] as Course[]);

    return await createPlanFromCourses(newName, allCourses, `Merged from ${plansToMerge.length} plans`);
  };

  const generateShareToken = async (planId: string): Promise<string | null> => {
    if (!user) {
      console.warn('⚠️ Cannot generate share token: user not authenticated');
      return null;
    }

    // Generate a random token
    const token = `${Date.now()}-${Math.random().toString(36).substr(2, 16)}`;

    const { error } = await updateSchedulePlan(user.id, planId, {
      shareToken: token,
      isPublic: true,
    });

    if (error) {
      console.error('❌ Error generating share token:', error);
      setSyncError(error);
      return null;
    }

    console.log('✅ Generated share token:', token);
    await loadFromSupabase();
    return token;
  };

  const makePublic = async (planId: string): Promise<boolean> => {
    if (!user) return false;

    const plan = plans.find(p => p.id === planId);
    if (!plan) return false;

    // Generate token if doesn't exist
    if (!plan.shareToken) {
      const token = await generateShareToken(planId);
      return !!token;
    }

    const { error } = await updateSchedulePlan(user.id, planId, { isPublic: true });

    if (error) {
      console.error('❌ Error making plan public:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Made plan public');
    await loadFromSupabase();
    return true;
  };

  const makePrivate = async (planId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await updateSchedulePlan(user.id, planId, { isPublic: false });

    if (error) {
      console.error('❌ Error making plan private:', error);
      setSyncError(error);
      return false;
    }

    console.log('✅ Made plan private');
    await loadFromSupabase();
    return true;
  };

  const activePlan = plans.find(p => p.isActive) || null;

  const value: ScheduleVariantsContextType = {
    plans,
    activePlan,
    isLoading,
    syncError,

    createPlan,
    duplicatePlan,
    deletePlan,
    renamePlan,

    setActivePlan,

    addCourseToPlan,
    removeCourseFromPlan,
    moveCourseBetweenPlans,
    updatePlanCourses,

    createPlanFromCourses,
    mergePlans,

    generateShareToken,
    makePublic,
    makePrivate,
  };

  return (
    <ScheduleVariantsContext.Provider value={value}>
      {children}
    </ScheduleVariantsContext.Provider>
  );
}

export function useScheduleVariants() {
  const context = useContext(ScheduleVariantsContext);
  if (context === undefined) {
    throw new Error('useScheduleVariants must be used within a ScheduleVariantsProvider');
  }
  return context;
}
