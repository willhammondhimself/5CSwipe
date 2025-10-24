/**
 * hapticPatterns.ts
 * Standardized haptic feedback patterns for different user actions
 *
 * Provides distinct tactile feedback for various interactions to improve UX
 */

import * as Haptics from 'expo-haptics';

export const HapticPatterns = {
  /**
   * Light tap for dislike/skip actions
   */
  swipeLeft: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium tap for like actions
   */
  swipeRight: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Double heavy tap for super-like (special action)
   */
  superLike: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 100);
  },

  /**
   * Warning notification for conflicts
   */
  conflict: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  },

  /**
   * Success notification for successful operations
   */
  success: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },

  /**
   * Error notification for failed operations
   */
  error: () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  /**
   * Double medium tap for undo action
   */
  undo: async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 50);
  },

  /**
   * Gentle tap for button presses
   */
  buttonPress: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium tap for selection changes
   */
  selection: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Light tap for card tap/interaction
   */
  cardTap: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  /**
   * Medium tap for long-press detected
   */
  longPress: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  /**
   * Heavy tap for modal open
   */
  modalOpen: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  /**
   * Light tap for modal close
   */
  modalClose: () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
};
