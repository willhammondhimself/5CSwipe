/**
 * AuthGuard.tsx
 * =============
 * Navigation guard component that protects routes
 *
 * Features:
 * - Redirects unauthenticated users to login
 * - Redirects incomplete profiles to onboarding
 * - Shows loading spinner while checking auth
 * - Allows authenticated users to access protected content
 */

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { SwipeColors } from '@/contexts/constants/Colors';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) {
      // Still checking auth state, don't redirect yet
      return;
    }

    const inAuthGroup = segments[0] === 'auth';

    if (!user) {
      // User is not authenticated
      if (!inAuthGroup) {
        // Redirect to login if trying to access protected route
        console.log('🔒 Not authenticated, redirecting to login');
        router.replace('/auth/login');
      }
    } else {
      // User is authenticated
      if (inAuthGroup) {
        // User is already authenticated but still on auth screens
        // Check if onboarding is complete
        if (profile && !profile.onboarding_completed) {
          console.log('📝 Onboarding incomplete, redirecting to onboarding');
          router.replace('/auth/onboarding');
        } else {
          // Fully authenticated and onboarded - redirect to main app
          console.log('✅ Fully authenticated, redirecting to main app');
          router.replace('/(tabs)');
        }
      } else {
        // User is on a protected route
        if (profile && !profile.onboarding_completed) {
          // Redirect to onboarding if not completed
          console.log('📝 Onboarding incomplete, redirecting to onboarding');
          router.replace('/auth/onboarding');
        }
      }
    }
  }, [user, profile, loading, segments]);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SwipeColors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SwipeColors.background,
  },
});
