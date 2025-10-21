import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SwipeColors } from '@/contexts/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

interface PermModalProps {
  visible: boolean;
  onClose: () => void;
  courseCode: string;
}

export default function PermModal({ visible, onClose, courseCode }: PermModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[SwipeColors.cardGradientStart, SwipeColors.cardGradientEnd]}
            style={styles.modalContent}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Success Icon */}
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="checkmark" size={32} color={SwipeColors.success} />
              </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>PERM Request Ready!</Text>
            
            {/* Message */}
            <Text style={styles.message}>
              Your PERM request for <Text style={styles.courseCode}>{courseCode}</Text> has been copied to your clipboard
            </Text>

            {/* Action Button */}
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <LinearGradient
                colors={['#007AFF', '#0051D5']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.buttonText}>Got it!</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: screenWidth - 60,
    maxWidth: 340,
  },
  modalContent: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
    shadowColor: SwipeColors.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: SwipeColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  courseCode: {
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  button: {
    width: '100%',
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});