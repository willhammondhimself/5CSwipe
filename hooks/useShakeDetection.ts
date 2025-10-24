/**
 * useShakeDetection.ts
 * Custom hook for detecting shake gestures using device accelerometer
 *
 * Features:
 * - Detects rapid device shaking
 * - Configurable sensitivity threshold
 * - Automatic cleanup
 * - Haptic feedback on detection
 */

import { useEffect, useRef, useState } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

interface ShakeDetectionOptions {
  threshold?: number; // Shake force threshold (default: 2.5)
  timeout?: number; // Cooldown between shakes in ms (default: 1000)
  onShake?: () => void; // Callback when shake detected
}

export function useShakeDetection({
  threshold = 2.5,
  timeout = 1000,
  onShake,
}: ShakeDetectionOptions = {}) {
  const [isEnabled, setIsEnabled] = useState(true);
  const lastShakeTime = useRef<number>(0);
  const subscription = useRef<any>(null);

  useEffect(() => {
    if (!isEnabled) return;

    // Set accelerometer update interval
    Accelerometer.setUpdateInterval(100);

    // Subscribe to accelerometer updates
    subscription.current = Accelerometer.addListener(({ x, y, z }) => {
      // Calculate total acceleration magnitude
      const acceleration = Math.sqrt(x * x + y * y + z * z);

      // Check if acceleration exceeds threshold
      if (acceleration > threshold) {
        const now = Date.now();

        // Check cooldown period to prevent multiple triggers
        if (now - lastShakeTime.current > timeout) {
          lastShakeTime.current = now;

          // Trigger haptic feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          // Call callback if provided
          if (onShake) {
            onShake();
          }
        }
      }
    });

    // Cleanup on unmount
    return () => {
      subscription.current?.remove();
    };
  }, [isEnabled, threshold, timeout, onShake]);

  return {
    isEnabled,
    setIsEnabled,
  };
}
