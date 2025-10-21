/**
 * email-verification.tsx
 * ======================
 * Email verification helper screen
 *
 * Features:
 * - Friendly explanation of email verification
 * - Resend verification email button
 * - Check verification status
 * - Beautiful illustrations/animations
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

export default function EmailVerificationScreen() {
  const router = useRouter();
  const { user, session, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Cooldown timer for resend button
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  async function handleResendEmail() {
    if (!user?.email) {
      Alert.alert('Error', 'Unable to find your email address.');
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        Alert.alert('Error', 'Supabase not configured.');
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (error) {
        Alert.alert('Error', 'Unable to resend verification email. Please try again later.');
        console.error('Resend error:', error);
      } else {
        Alert.alert(
          'Email Sent',
          'We sent another verification email to ' + user.email + '. Please check your inbox.'
        );
        setResendCooldown(60); // 60 second cooldown
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Resend exception:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckStatus() {
    setCheckingStatus(true);

    try {
      if (!supabase) {
        Alert.alert('Error', 'Supabase not configured.');
        return;
      }

      // Refresh session to check if email is verified
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        Alert.alert('Error', 'Unable to check verification status.');
        console.error('Session check error:', error);
        return;
      }

      if (data.session?.user.email_confirmed_at) {
        Alert.alert(
          'Email Verified!',
          'Your email has been verified. You can now continue to the app.',
          [
            {
              text: 'Continue',
              onPress: () => {
                refreshProfile();
                router.replace('/(tabs)');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Your email hasn\'t been verified yet. Please check your inbox and click the verification link.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Status check exception:', error);
    } finally {
      setCheckingStatus(false);
    }
  }

  function handleSkip() {
    // Allow user to skip for now but they'll be prompted again later
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread" size={64} color={SwipeColors.primary} />
        </View>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{user?.email}</Text>
        </Text>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <View style={styles.instruction}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={styles.instructionText}>
            Open your email inbox and find our verification email
          </Text>
        </View>

        <View style={styles.instruction}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={styles.instructionText}>
            Click the verification link in the email
          </Text>
        </View>

        <View style={styles.instruction}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={styles.instructionText}>
            Come back here and check your verification status
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {/* Check Status Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckStatus}
          disabled={checkingStatus}
        >
          {checkingStatus ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>I've Verified My Email</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resend Email Button */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleResendEmail}
          disabled={loading || resendCooldown > 0}
        >
          {loading ? (
            <ActivityIndicator color={SwipeColors.primary} />
          ) : (
            <>
              <Ionicons name="refresh" size={24} color={SwipeColors.primary} />
              <Text style={styles.secondaryButtonText}>
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : 'Resend Verification Email'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>I'll verify later</Text>
        </TouchableOpacity>
      </View>

      {/* Help Text */}
      <View style={styles.helpContainer}>
        <Ionicons name="information-circle" size={20} color={SwipeColors.textTertiary} />
        <Text style={styles.helpText}>
          Can't find the email? Check your spam folder or request a new one.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SwipeColors.background,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${SwipeColors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    fontWeight: '700',
    color: SwipeColors.primary,
  },
  instructionsContainer: {
    marginBottom: 40,
  },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: SwipeColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    color: SwipeColors.textPrimary,
    lineHeight: 24,
    paddingTop: 4,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  primaryButton: {
    height: 56,
    backgroundColor: SwipeColors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
    shadowColor: SwipeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    height: 56,
    borderWidth: 2,
    borderColor: SwipeColors.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SwipeColors.card,
    marginBottom: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: SwipeColors.primary,
  },
  skipButton: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: SwipeColors.textTertiary,
    lineHeight: 20,
  },
});
