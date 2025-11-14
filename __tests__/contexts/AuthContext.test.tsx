/**
 * Tests for AuthContext
 */

// Mock supabase BEFORE any imports that use it
jest.mock('@/lib/supabase');

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { mockSupabaseClient, mockAuthSuccess, mockAuthError, resetSupabaseMocks } from '../mocks/supabase';

// Wrapper for hooks that need the AuthProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  describe('sign up', () => {
    it('should successfully sign up a new user', async () => {
      // Mock successful signup
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockAuthSuccess);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signUp('test@example.com', 'password123', 'HMC');
      });

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            full_name: undefined,
            school: 'HMC',
          },
        },
      });
    });

    it('should handle signup errors', async () => {
      // Mock signup error
      mockSupabaseClient.auth.signUp.mockResolvedValueOnce(mockAuthError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.signUp('test@example.com', 'weak', 'HMC');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled();
    });
  });

  describe('sign in', () => {
    it('should successfully sign in an existing user', async () => {
      // Mock successful sign in
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(mockAuthSuccess);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signIn('test@example.com', 'password123');
      });

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('should handle invalid credentials', async () => {
      // Mock authentication error
      mockSupabaseClient.auth.signInWithPassword.mockResolvedValueOnce(mockAuthError);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        try {
          await result.current.signIn('wrong@example.com', 'wrongpassword');
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalled();
    });
  });

  describe('sign out', () => {
    it('should successfully sign out the user', async () => {
      // Mock successful sign out
      mockSupabaseClient.auth.signOut.mockResolvedValueOnce({ error: null });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.signOut();
      });

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('password reset', () => {
    it('should send password reset email', async () => {
      // Mock successful password reset request
      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: {},
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        await result.current.resetPassword('test@example.com');
      });

      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({
          redirectTo: expect.any(String),
        })
      );
    });
  });

  describe('session management', () => {
    it('should get the current session', async () => {
      // Mock session retrieval
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: mockAuthSuccess.data.session },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled();
      });
    });

    it('should handle no active session', async () => {
      // Mock no session
      mockSupabaseClient.auth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });
  });
});
