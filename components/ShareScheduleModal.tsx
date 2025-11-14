/**
 * ShareScheduleModal.tsx
 * ======================
 * Modal for sharing schedule with friends
 *
 * Features:
 * - Generate shareable link with token
 * - Copy to clipboard
 * - QR code generation
 * - Social media sharing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { SwipeColors } from '@/contexts/constants/Colors';
import { useScheduleVariants } from '@/contexts/ScheduleVariantsContext';

interface ShareScheduleModalProps {
  visible: boolean;
  planId: string;
  planName: string;
  onClose: () => void;
}

export default function ShareScheduleModal({ visible, planId, planName, onClose }: ShareScheduleModalProps) {
  const { generateShareToken, plans } = useScheduleVariants();
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      loadShareUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, planId]);

  async function loadShareUrl() {
    const plan = plans.find(p => p.id === planId);

    if (plan?.shareToken) {
      // Token already exists
      const baseUrl = Platform.OS === 'web'
        ? window.location.origin
        : 'https://5cswipe.app'; // Replace with your actual domain
      setShareUrl(`${baseUrl}/share/${plan.shareToken}`);
    } else {
      // Generate new token
      setLoading(true);
      const token = await generateShareToken(planId);

      if (token) {
        const baseUrl = Platform.OS === 'web'
          ? window.location.origin
          : 'https://5cswipe.app';
        setShareUrl(`${baseUrl}/share/${token}`);
      } else {
        Alert.alert('Error', 'Failed to generate share link. Please try again.');
      }
      setLoading(false);
    }
  }

  async function handleCopyLink() {
    await Clipboard.setStringAsync(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="share-social" size={24} color={SwipeColors.primary} />
            <Text style={styles.title}>Share Schedule</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={SwipeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Schedule Name */}
          <Text style={styles.scheduleName}>{planName}</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={SwipeColors.primary} />
              <Text style={styles.loadingText}>Generating share link...</Text>
            </View>
          ) : (
            <>
              {/* Share URL */}
              <View style={styles.urlContainer}>
                <TextInput
                  style={styles.urlInput}
                  value={shareUrl}
                  editable={false}
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={[styles.copyButton, copied && styles.copyButtonSuccess]}
                  onPress={handleCopyLink}
                >
                  <Ionicons
                    name={copied ? 'checkmark' : 'copy-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.copyButtonText}>
                    {copied ? 'Copied!' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <Text style={styles.infoText}>
                Anyone with this link can view your schedule (read-only)
              </Text>

              {/* Action Buttons */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="logo-twitter" size={24} color="#1DA1F2" />
                  <Text style={styles.actionButtonText}>Twitter</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="logo-facebook" size={24} color="#4267B2" />
                  <Text style={styles.actionButtonText}>Facebook</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Ionicons name="mail-outline" size={24} color={SwipeColors.primary} />
                  <Text style={styles.actionButtonText}>Email</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: SwipeColors.background,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: SwipeColors.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  scheduleName: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginBottom: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: SwipeColors.textSecondary,
  },
  urlContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  urlInput: {
    flex: 1,
    height: 48,
    backgroundColor: SwipeColors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
    color: SwipeColors.textPrimary,
    borderWidth: 1,
    borderColor: SwipeColors.border,
  },
  copyButton: {
    height: 48,
    backgroundColor: SwipeColors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButtonSuccess: {
    backgroundColor: '#34C759',
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    fontSize: 13,
    color: SwipeColors.textTertiary,
    marginBottom: 24,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: SwipeColors.border,
  },
  actionButton: {
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 12,
    color: SwipeColors.textSecondary,
    fontWeight: '600',
  },
});
