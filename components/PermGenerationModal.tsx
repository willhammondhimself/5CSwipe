import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';
import { usePremium } from '@/contexts/PremiumContext';

const { height: screenHeight } = Dimensions.get('window');

interface PermGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  course: Course | null;
  onUpgradeToPremium?: () => void;
}

export default function PermGenerationModal({
  visible,
  onClose,
  course,
  onUpgradeToPremium,
}: PermGenerationModalProps) {
  const { isPremium, canGeneratePerm, permRequestsUsed, maxPermRequests, generatePerm } = usePremium();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPerm, setGeneratedPerm] = useState<string | null>(null);

  const handleGeneratePerm = async () => {
    if (!course) return;
    
    if (!canGeneratePerm) {
      Alert.alert(
        'PERM Limit Reached',
        `You've used all ${maxPermRequests} PERM requests. ${isPremium ? 'Monthly limit reached.' : 'Upgrade to Premium for 50 requests per month!'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          ...(isPremium ? [] : [{ text: 'Upgrade to Premium', onPress: onUpgradeToPremium }]),
        ]
      );
      return;
    }

    setIsGenerating(true);
    try {
      const perm = await generatePerm(course);
      setGeneratedPerm(perm);
    } catch {
      Alert.alert('Error', 'Failed to generate PERM request. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (generatedPerm) {
      await Clipboard.setStringAsync(generatedPerm);
      Alert.alert('Copied!', 'PERM request copied to clipboard');
    }
  };

  const handleClose = () => {
    setGeneratedPerm(null);
    setIsGenerating(false);
    onClose();
  };

  const remainingRequests = maxPermRequests - permRequestsUsed;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.modalContent}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="star" size={24} color={SwipeColors.accentBlue} />
                <Text style={styles.title}>Super Like PERM</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={SwipeColors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Course Info */}
            {course && (
              <View style={styles.courseInfo}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.courseTitle}>{course.title}</Text>
                <Text style={styles.professor}>Prof. {course.professor.replace('Prof. ', '')}</Text>
              </View>
            )}

            {/* Content */}
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {!generatedPerm && !isGenerating && (
                <View style={styles.introSection}>
                  <Text style={styles.introText}>
                    Generate a professional PERM request email using AI to help you get into this course!
                  </Text>
                  
                  {/* Premium Status */}
                  <View style={styles.statusContainer}>
                    <View style={[styles.statusBadge, isPremium && styles.premiumBadge]}>
                      <Ionicons 
                        name={isPremium ? "star" : "star-outline"} 
                        size={16} 
                        color={isPremium ? SwipeColors.accentBlue : SwipeColors.textTertiary} 
                      />
                      <Text style={[styles.statusText, isPremium && styles.premiumText]}>
                        {isPremium ? 'Premium User' : 'Free User'}
                      </Text>
                    </View>
                    <Text style={styles.requestsRemaining}>
                      {remainingRequests} requests remaining this month
                    </Text>
                  </View>

                  {!isPremium && (
                    <View style={styles.upgradePrompt}>
                      <Text style={styles.upgradeText}>
                        ✨ Upgrade to Premium for 50 PERM requests per month and priority support!
                      </Text>
                      <TouchableOpacity style={styles.upgradeButton} onPress={onUpgradeToPremium}>
                        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {isGenerating && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={SwipeColors.accentBlue} />
                  <Text style={styles.loadingText}>Generating your PERM request...</Text>
                  <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
                </View>
              )}

              {generatedPerm && (
                <View style={styles.resultContainer}>
                  <Text style={styles.resultTitle}>Generated PERM Request:</Text>
                  <View style={styles.permContainer}>
                    <Text style={styles.permText}>{generatedPerm}</Text>
                  </View>
                  <TouchableOpacity style={styles.copyButton} onPress={handleCopyToClipboard}>
                    <Ionicons name="copy-outline" size={18} color={SwipeColors.textPrimary} />
                    <Text style={styles.copyButtonText}>Copy to Clipboard</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            {!generatedPerm && !isGenerating && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.generateButton, !canGeneratePerm && styles.disabledButton]} 
                  onPress={handleGeneratePerm}
                  disabled={!canGeneratePerm}
                >
                  <Ionicons name="create-outline" size={20} color={SwipeColors.textPrimary} />
                  <Text style={styles.generateButtonText}>Generate PERM Request</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    maxHeight: screenHeight * 0.9,
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseInfo: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  courseCode: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  courseTitle: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  professor: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    marginTop: 4,
  },
  content: {
    maxHeight: screenHeight * 0.5,
    paddingHorizontal: 24,
  },
  introSection: {
    paddingVertical: 20,
  },
  introText: {
    fontSize: 16,
    color: SwipeColors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    gap: 6,
    marginBottom: 8,
  },
  premiumBadge: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: SwipeColors.accentBlue,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textTertiary,
  },
  premiumText: {
    color: SwipeColors.accentBlue,
  },
  requestsRemaining: {
    fontSize: 12,
    color: SwipeColors.textTertiary,
  },
  upgradePrompt: {
    backgroundColor: 'rgba(0, 122, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
  },
  upgradeText: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  upgradeButton: {
    backgroundColor: SwipeColors.accentBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: SwipeColors.textTertiary,
    marginTop: 4,
  },
  resultContainer: {
    paddingVertical: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
  },
  permContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    marginBottom: 16,
    maxHeight: 300,
  },
  permText: {
    fontSize: 13,
    color: SwipeColors.textSecondary,
    lineHeight: 18,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    gap: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: SwipeColors.textPrimary,
  },
  actionButtons: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SwipeColors.accentBlue,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});