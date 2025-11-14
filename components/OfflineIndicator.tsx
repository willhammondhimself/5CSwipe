/**
 * OfflineIndicator.tsx
 * =====================
 * Shows offline status and pending sync count
 *
 * Features:
 * - Yellow banner when offline
 * - Shows pending mutation count
 * - Auto-hide after 3 seconds
 * - Dismissible
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { XMarkIcon } from 'react-native-heroicons/outline';
import { SwipeColors } from '@/contexts/constants/Colors';
import { syncQueueService } from '@/services/syncQueueService';

interface OfflineIndicatorProps {
  isOffline?: boolean; // Optional - will use NetInfo if not provided
  onDismiss?: () => void;
}

export default function OfflineIndicator({ isOffline: isOfflineProp, onDismiss }: OfflineIndicatorProps) {
  // Use prop if provided, otherwise detect network state
  const [isOffline, setIsOffline] = useState(isOfflineProp ?? false);
  const [queueCount, setQueueCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isOffline) {
      setVisible(true);
      loadQueueCount();

      // Fade in
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Auto-hide after 5 seconds (but keep visible if queue not empty)
      const timer = setTimeout(async () => {
        const count = await syncQueueService.getQueueCount();
        if (count === 0) {
          handleDismiss();
        }
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [isOffline]);

  const loadQueueCount = async () => {
    const count = await syncQueueService.getQueueCount();
    setQueueCount(count);
  };

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      onDismiss?.();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.banner}>
        <View style={styles.content}>
          <Text style={styles.icon}>⚡</Text>
          <View style={styles.textContainer}>
            <Text style={styles.title}>Offline Mode</Text>
            <Text style={styles.subtitle}>
              {queueCount > 0
                ? `${queueCount} change${queueCount > 1 ? 's' : ''} will sync when connected`
                : 'Changes will sync when connected'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <XMarkIcon size={18} color="#000000" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  banner: {
    backgroundColor: SwipeColors.accentYellow,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#000000',
    opacity: 0.7,
  },
  closeButton: {
    padding: 4,
  },
});
