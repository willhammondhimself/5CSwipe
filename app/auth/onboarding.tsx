/**
 * onboarding.tsx
 * ==============
 * Multi-step profile completion wizard
 *
 * Features:
 * - 4-step wizard: graduation year, major, minor/double major, interests
 * - Progress bar showing completion %
 * - Input validation
 * - Updates user_profiles.onboarding_completed = true
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
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SwipeColors } from '@/contexts/constants/Colors';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { Ionicons } from '@expo/vector-icons';

const COMMON_MAJORS = [
  'Computer Science',
  'Mathematics',
  'Economics',
  'Biology',
  'Chemistry',
  'Physics',
  'Psychology',
  'Politics',
  'Philosophy',
  'English',
  'History',
  'Engineering',
  'Other',
];

const STEP_TITLES = ['Graduation Year', 'Major', 'Additional Info', 'Preferences'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { updateProfile, profile } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Graduation Year
  const [graduationYear, setGraduationYear] = useState('');
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Step 2: Major
  const [major, setMajor] = useState('');
  const [showMajorPicker, setShowMajorPicker] = useState(false);
  const [customMajor, setCustomMajor] = useState('');

  // Step 3: Minor/Double Major
  const [minor, setMinor] = useState('');
  const [doubleMajor, setDoubleMajor] = useState('');

  // Step 4: Credit System (HMC specific)
  const [creditSystem, setCreditSystem] = useState<'standard' | 'hmc'>(
    profile?.school === 'HMC' ? 'hmc' : 'standard'
  );

  const YEARS = Array.from({ length: 11 }, (_, i) => 2025 + i);

  async function handleNext() {
    if (currentStep === 1) {
      // Validate graduation year
      if (!graduationYear) {
        Alert.alert('Required', 'Please select your graduation year.');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate major
      if (!major && !customMajor) {
        Alert.alert('Required', 'Please enter your major.');
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Minor/double major are optional, just continue
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Final step - save everything
      await handleComplete();
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }

  async function handleComplete() {
    setLoading(true);

    try {
      const finalMajor = customMajor || major;

      const { error } = await updateProfile({
        graduation_year: parseInt(graduationYear),
        major: finalMajor,
        minor: minor || null,
        double_major: doubleMajor || null,
        credit_system: creditSystem,
        onboarding_completed: true,
      });

      if (error) {
        Alert.alert('Error', 'Unable to save your profile. Please try again.');
        console.error('Profile update error:', error);
      } else {
        // Success - navigate to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
      console.error('Onboarding completion error:', error);
    } finally {
      setLoading(false);
    }
  }

  function renderStep() {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              When do you plan to graduate? This helps us track your academic progress.
            </Text>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowYearPicker(true)}
              disabled={loading}
            >
              <Text style={[styles.selectorText, !graduationYear && styles.selectorPlaceholder]}>
                {graduationYear || 'Select Year'}
              </Text>
              <Ionicons name="calendar" size={24} color={SwipeColors.textSecondary} />
            </TouchableOpacity>

            {/* Year Picker Modal */}
            <Modal
              visible={showYearPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowYearPicker(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowYearPicker(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Graduation Year</Text>
                    <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {YEARS.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.option,
                          graduationYear === String(year) && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setGraduationYear(String(year));
                          setShowYearPicker(false);
                        }}
                      >
                        <Text style={styles.optionText}>{year}</Text>
                        {graduationYear === String(year) && (
                          <Ionicons name="checkmark-circle" size={24} color={SwipeColors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>What's your major?</Text>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowMajorPicker(true)}
              disabled={loading}
            >
              <Text style={[styles.selectorText, !major && styles.selectorPlaceholder]}>
                {major || 'Select Major'}
              </Text>
              <Ionicons name="school" size={24} color={SwipeColors.textSecondary} />
            </TouchableOpacity>

            {major === 'Other' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter your major</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Environmental Analysis"
                  placeholderTextColor={SwipeColors.textTertiary}
                  value={customMajor}
                  onChangeText={setCustomMajor}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            )}

            {/* Major Picker Modal */}
            <Modal
              visible={showMajorPicker}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setShowMajorPicker(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowMajorPicker(false)}
              >
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Major</Text>
                    <TouchableOpacity onPress={() => setShowMajorPicker(false)}>
                      <Text style={styles.modalClose}>✕</Text>
                    </TouchableOpacity>
                  </View>
                  <ScrollView showsVerticalScrollIndicator={false}>
                    {COMMON_MAJORS.map((majorOption) => (
                      <TouchableOpacity
                        key={majorOption}
                        style={[
                          styles.option,
                          major === majorOption && styles.optionSelected,
                        ]}
                        onPress={() => {
                          setMajor(majorOption);
                          setShowMajorPicker(false);
                        }}
                      >
                        <Text style={styles.optionText}>{majorOption}</Text>
                        {major === majorOption && (
                          <Ionicons name="checkmark-circle" size={24} color={SwipeColors.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              Do you have a minor or double major? (Optional)
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Minor (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Economics"
                placeholderTextColor={SwipeColors.textTertiary}
                value={minor}
                onChangeText={setMinor}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Double Major (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Physics"
                placeholderTextColor={SwipeColors.textTertiary}
                value={doubleMajor}
                onChangeText={setDoubleMajor}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              {profile?.school === 'HMC'
                ? 'HMC students use a different credit system. Select your preference:'
                : 'Set your course preferences:'}
            </Text>

            {profile?.school === 'HMC' && (
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    creditSystem === 'hmc' && styles.radioOptionSelected,
                  ]}
                  onPress={() => setCreditSystem('hmc')}
                  disabled={loading}
                >
                  <View style={styles.radioCircle}>
                    {creditSystem === 'hmc' && <View style={styles.radioCircleSelected} />}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioTitle}>HMC System</Text>
                    <Text style={styles.radioDescription}>
                      1.0, 1.5, 2.0 credits per course
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    creditSystem === 'standard' && styles.radioOptionSelected,
                  ]}
                  onPress={() => setCreditSystem('standard')}
                  disabled={loading}
                >
                  <View style={styles.radioCircle}>
                    {creditSystem === 'standard' && <View style={styles.radioCircleSelected} />}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={styles.radioTitle}>Standard System</Text>
                    <Text style={styles.radioDescription}>1-6 credits per course</Text>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.completionMessage}>
              <Ionicons name="checkmark-circle" size={48} color={SwipeColors.primary} />
              <Text style={styles.completionText}>
                You're all set! Let's start swiping.
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  }

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
        {/* Progress Bar */}
        <OnboardingProgressBar
          currentStep={currentStep}
          totalSteps={4}
          stepTitles={STEP_TITLES}
        />

        {/* Step Content */}
        {renderStep()}

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              disabled={loading}
            >
              <Ionicons name="arrow-back" size={24} color={SwipeColors.textSecondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              currentStep === 1 && styles.nextButtonFull,
              loading && styles.nextButtonDisabled,
            ]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {currentStep === 4 ? 'Complete' : 'Next'}
                </Text>
                <Ionicons
                  name={currentStep === 4 ? 'checkmark' : 'arrow-forward'}
                  size={24}
                  color="#FFFFFF"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 40,
  },
  stepContent: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  stepDescription: {
    fontSize: 18,
    color: SwipeColors.textSecondary,
    lineHeight: 26,
    marginBottom: 24,
  },
  selector: {
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
  selectorText: {
    fontSize: 16,
    color: SwipeColors.textPrimary,
  },
  selectorPlaceholder: {
    color: SwipeColors.textTertiary,
  },
  inputContainer: {
    marginTop: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 8,
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
  radioGroup: {
    gap: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: SwipeColors.border,
    borderRadius: 16,
    backgroundColor: SwipeColors.card,
  },
  radioOptionSelected: {
    borderColor: SwipeColors.primary,
    backgroundColor: `${SwipeColors.primary}10`,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: SwipeColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: SwipeColors.primary,
  },
  radioContent: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  completionMessage: {
    alignItems: 'center',
    marginTop: 40,
  },
  completionText: {
    fontSize: 18,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 40,
    gap: 12,
  },
  backButton: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: SwipeColors.border,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
  nextButton: {
    flex: 1,
    height: 56,
    backgroundColor: SwipeColors.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: SwipeColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SwipeColors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
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
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: SwipeColors.border,
  },
  optionSelected: {
    backgroundColor: `${SwipeColors.primary}10`,
  },
  optionText: {
    fontSize: 16,
    color: SwipeColors.textPrimary,
  },
});
