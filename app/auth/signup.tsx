/**
 * signup.tsx
 * ==========
 * Beautiful signup screen for 5CSwipe with school selection
 *
 * Features:
 * - Email/password signup with validation
 * - School dropdown (HMC, CMC, PO, PZ, SC, KS)
 * - Optional full name field
 * - Password strength requirements
 * - Email verification flow
 * - Smooth animations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SwipeColors } from '@/contexts/constants/Colors';

const SCHOOLS = [
  { code: 'HMC', name: 'Harvey Mudd College', shortName: 'HMC' },
  { code: 'CMC', name: 'Claremont McKenna College', shortName: 'CMC' },
  { code: 'PO', name: 'Pomona College', shortName: 'Pomona' },
  { code: 'PZ', name: 'Pitzer College', shortName: 'Pitzer' },
  { code: 'SC', name: 'Scripps College', shortName: 'Scripps' },
];

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  function validateForm(): string | null {
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return 'Please enter a valid email address.';
    }

    // Password validation
    if (!password || password.length < 8) {
      return 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }

    // School validation
    if (!school) {
      return 'Please select your school.';
    }

    return null;
  }

  async function handleSignup() {
    console.log('🚀 Sign up button pressed');
    const validationError = validateForm();
    if (validationError) {
      console.log('❌ Validation error:', validationError);
      Alert.alert('Validation Error', validationError);
      return;
    }

    console.log('✅ Validation passed, starting signup...');
    setLoading(true);

    try {
      console.log('📧 Signing up with:', { email, school, fullName });
      const { error } = await signUp(email, password, school, fullName || undefined);

      if (error) {
        console.log('❌ Signup error:', error);
        // Friendly error messages
        let errorMessage = 'Unable to create account. Please try again.';

        if (error.message.includes('already registered')) {
          errorMessage = 'This email is already registered. Please log in instead.';
        } else if (error.message.includes('Password')) {
          errorMessage = error.message;
        }

        Alert.alert('Signup Failed', errorMessage);
      } else {
        // Success - navigate to welcome screen
        console.log('✅ Signup successful, navigating to welcome...');
        router.replace('/auth/welcome');
      }
    } catch (error) {
      console.error('❌ Unexpected signup error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function selectSchool(selectedSchool: string) {
    setSchool(selectedSchool);
    setShowSchoolPicker(false);
  }

  const selectedSchoolName = SCHOOLS.find((s) => s.code === school)?.name || 'Select School';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>5CSwipe</Text>
          <Text style={styles.subtitle}>Create Your Account</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Full Name Input (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>
              Full Name <Text style={styles.optionalText}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="John Doe"
              placeholderTextColor={SwipeColors.textTertiary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.edu"
              placeholderTextColor={SwipeColors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          {/* School Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>School</Text>
            <TouchableOpacity
              style={styles.schoolSelector}
              onPress={() => setShowSchoolPicker(true)}
              disabled={loading}
            >
              <Text
                style={[
                  styles.schoolSelectorText,
                  !school && styles.schoolSelectorPlaceholder,
                ]}
              >
                {selectedSchoolName}
              </Text>
              <Text style={styles.schoolSelectorArrow}>▼</Text>
            </TouchableOpacity>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={SwipeColors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              editable={!loading}
            />
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={SwipeColors.textTertiary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="newPassword"
              editable={!loading}
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.signupButton, loading && styles.signupButtonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signupButtonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/auth/login')} disabled={loading}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing up, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>

      {/* School Picker Modal */}
      <Modal
        visible={showSchoolPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSchoolPicker(false)}
      >
        <BlurView intensity={80} style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalOverlayTouch}
            activeOpacity={1}
            onPress={() => setShowSchoolPicker(false)}
          >
            <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your School</Text>
                <TouchableOpacity onPress={() => setShowSchoolPicker(false)}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.schoolList}>
                {SCHOOLS.map((schoolOption) => (
                  <TouchableOpacity
                    key={schoolOption.code}
                    style={[
                      styles.schoolOption,
                      school === schoolOption.code && styles.schoolOptionSelected,
                    ]}
                    onPress={() => selectSchool(schoolOption.code)}
                  >
                    <View>
                      <Text style={styles.schoolOptionName}>{schoolOption.name}</Text>
                      <Text style={styles.schoolOptionCode}>{schoolOption.code}</Text>
                    </View>
                    {school === schoolOption.code && (
                      <Text style={styles.schoolOptionCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SwipeColors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: '900',
    color: SwipeColors.primary,
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: SwipeColors.textSecondary,
    fontWeight: '500',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 8,
  },
  optionalText: {
    fontWeight: '400',
    color: SwipeColors.textTertiary,
  },
  input: {
    height: 56,
    borderWidth: 2,
    borderColor: SwipeColors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: SwipeColors.textPrimary,
    backgroundColor: SwipeColors.card,
  },
  schoolSelector: {
    height: 56,
    borderWidth: 2,
    borderColor: SwipeColors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SwipeColors.card,
  },
  schoolSelectorText: {
    fontSize: 16,
    color: SwipeColors.textPrimary,
  },
  schoolSelectorPlaceholder: {
    color: SwipeColors.textTertiary,
  },
  schoolSelectorArrow: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
  },
  signupButton: {
    height: 56,
    backgroundColor: SwipeColors.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: SwipeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signupButtonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 15,
    color: SwipeColors.textSecondary,
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: SwipeColors.primary,
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalOverlayTouch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    backgroundColor: 'rgba(28, 28, 30, 0.98)',
    borderRadius: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  modalClose: {
    fontSize: 24,
    color: SwipeColors.textSecondary,
    fontWeight: '300',
  },
  schoolList: {
    maxHeight: 400,
  },
  schoolOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.border,
  },
  schoolOptionSelected: {
    backgroundColor: `${SwipeColors.primary}10`,
  },
  schoolOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  schoolOptionCode: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  schoolOptionCheck: {
    fontSize: 24,
    color: SwipeColors.primary,
    fontWeight: '700',
  },
});
