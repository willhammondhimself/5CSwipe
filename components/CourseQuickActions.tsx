/**
 * CourseQuickActions.tsx
 * ======================
 * Long-press context menu for course cards
 *
 * Features:
 * - Quick actions: Like, Skip, Super Like, View Details
 * - Animated slide-up menu
 * - Backdrop dismissal
 * - Haptic feedback
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  HeartIcon,
  XMarkIcon,
  StarIcon,
  InformationCircleIcon,
} from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { Course } from '@/data/mockCourses';

const { height: screenHeight } = Dimensions.get('window');

interface CourseQuickActionsProps {
  visible: boolean;
  course: Course | null;
  onClose: () => void;
  onLike?: () => void;
  onSkip?: () => void;
  onSuperLike?: () => void;
  onViewDetails?: () => void;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}

export default function CourseQuickActions({
  visible,
  course,
  onClose,
  onLike,
  onSkip,
  onSuperLike,
  onViewDetails,
}: CourseQuickActionsProps) {
  const slideAnim = React.useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Entrance animation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          mass: 0.8,
          stiffness: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Exit animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
    onClose();
  };

  const actions: QuickAction[] = [
    {
      id: 'like',
      label: 'Like',
      icon: <HeartIcon width={24} height={24} color={SwipeColors.like} />,
      color: SwipeColors.like,
      onPress: () => handleAction(() => onLike?.()),
    },
    {
      id: 'superlike',
      label: 'Super Like',
      icon: <StarIcon width={24} height={24} color={SwipeColors.superLike} />,
      color: SwipeColors.superLike,
      onPress: () => handleAction(() => onSuperLike?.()),
    },
    {
      id: 'details',
      label: 'View Details',
      icon: <InformationCircleIcon width={24} height={24} color={SwipeColors.accentBlue} />,
      color: SwipeColors.accentBlue,
      onPress: () => handleAction(() => onViewDetails?.()),
    },
    {
      id: 'skip',
      label: 'Skip',
      icon: <XMarkIcon width={24} height={24} color={SwipeColors.nope} />,
      color: SwipeColors.nope,
      onPress: () => handleAction(() => onSkip?.()),
    },
  ];

  if (!course) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        >
          <Animated.View
            style={[
              styles.backdropOverlay,
              { opacity: fadeAnim },
            ]}
          />
        </TouchableOpacity>

        {/* Actions Menu */}
        <Animated.View
          style={[
            styles.menu,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Course Info */}
          <View style={styles.courseInfo}>
            <Text style={styles.courseCode}>{course.courseCode}</Text>
            <Text style={styles.courseTitle} numberOfLines={1}>
              {course.title}
            </Text>
          </View>

          {/* Actions Grid */}
          <View style={styles.actionsGrid}>
            {actions.map((action, index) => (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.actionButton,
                  index % 2 === 0 && styles.actionButtonLeft,
                ]}
                onPress={action.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
                  {action.icon}
                </View>
                <Text style={[styles.actionLabel, { color: action.color }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menu: {
    backgroundColor: SwipeColors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: SwipeColors.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.3,
  },
  courseInfo: {
    marginBottom: 24,
    alignItems: 'center',
  },
  courseCode: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: SwipeColors.textPrimary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12,
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  actionButtonLeft: {
    marginRight: '4%',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SwipeColors.highlightBorder,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: SwipeColors.textSecondary,
  },
});
