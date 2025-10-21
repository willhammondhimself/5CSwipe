/**
 * AuthContext.tsx
 * ================
 * Authentication context provider for 5CSwipe using Supabase Auth
 *
 * Features:
 * - Email/password authentication
 * - Google OAuth (when configured)
 * - Apple Sign In (when configured)
 * - Automatic session persistence
 * - User profile management
 * - Real-time auth state updates
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AuthContext');

// User profile interface matching database schema
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  school: 'HMC' | 'CMC' | 'PO' | 'PZ' | 'SC' | 'KS';
  graduation_year: number | null;
  major: string | null;
  minor: string | null;
  double_major: string | null;
  credit_system: 'standard' | 'hmc';
  notification_preferences: {
    spot_available: boolean;
    waitlist_movement: boolean;
    course_added: boolean;
  };
  profile_visibility: 'public' | 'friends' | 'private';
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Auth context interface
interface AuthContextType {
  // State
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;

  // Auth methods
  signUp: (email: string, password: string, school: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;

  // Profile methods
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from storage
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) return;

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logger.debug('🔐 Auth state change:', event);

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function initializeAuth() {
    if (!supabase) {
      logger.warn('⚠️ Supabase not configured, skipping auth');
      setLoading(false);
      return;
    }

    try {
      // Get session from Supabase
      const { data: { session } } = await supabase.auth.getSession();

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await loadUserProfile(session.user.id);
      }
    } catch (error) {
      logger.error('❌ Error initializing auth:', error as Error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserProfile(userId: string) {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        logger.error('❌ Error loading profile:', error as Error);
        return;
      }

      setProfile(data);
    } catch (error) {
      logger.error('❌ Error loading profile:', error as Error);
    }
  }

  async function signUp(
    email: string,
    password: string,
    school: string,
    fullName?: string
  ): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            school: school,
          },
        },
      });

      if (error) {
        logger.error('❌ Signup error:', error);
        return { error };
      }

      logger.info('✅ Signup successful');
      return { error: null };
    } catch (error) {
      logger.error('❌ Signup exception:', error as Error);
      return { error: error as AuthError };
    }
  }

  async function signIn(
    email: string,
    password: string
  ): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('❌ Login error:', error);
        return { error };
      }

      logger.info('✅ Login successful');
      return { error: null };
    } catch (error) {
      logger.error('❌ Login exception:', error as Error);
      return { error: error as AuthError };
    }
  }

  async function signOut() {
    if (!supabase) return;

    try {
      await supabase.auth.signOut();

      // Clear local state
      setUser(null);
      setProfile(null);
      setSession(null);

      logger.info('✅ Signed out successfully');
    } catch (error) {
      logger.error('❌ Sign out error:', error as Error);
    }
  }

  async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'exp://localhost:8081/auth/reset-password',
      });

      if (error) {
        logger.error('❌ Password reset error:', error);
        return { error };
      }

      logger.info('✅ Password reset email sent');
      return { error: null };
    } catch (error) {
      logger.error('❌ Password reset exception:', error as Error);
      return { error: error as AuthError };
    }
  }

  async function updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    if (!supabase) {
      return { error: new Error('Supabase not configured') as AuthError };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        logger.error('❌ Password update error:', error);
        return { error };
      }

      logger.info('✅ Password updated successfully');
      return { error: null };
    } catch (error) {
      logger.error('❌ Password update exception:', error as Error);
      return { error: error as AuthError };
    }
  }

  async function updateProfile(updates: Partial<UserProfile>): Promise<{ error: Error | null }> {
    if (!supabase || !user) {
      return { error: new Error('Not authenticated') };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        logger.error('❌ Profile update error:', error as Error);
        return { error };
      }

      // Refresh profile
      await loadUserProfile(user.id);

      logger.info('✅ Profile updated successfully');
      return { error: null };
    } catch (error) {
      logger.error('❌ Profile update exception:', error as Error);
      return { error: error as Error };
    }
  }

  async function refreshProfile() {
    if (user) {
      await loadUserProfile(user.id);
    }
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
