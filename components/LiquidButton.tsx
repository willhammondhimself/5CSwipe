import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { SwipeColors } from '@/contexts/constants/Colors';

interface LiquidButtonProps {
  type: 'like' | 'nope' | 'superlike';
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const BUTTON_CONFIG = {
  like: {
    icon: 'heart' as const,
    color: SwipeColors.like,
    glowColor: 'rgba(79, 195, 247, 0.6)',
    gradient: ['rgba(79, 195, 247, 0.2)', 'rgba(79, 195, 247, 0.05)'],
  },
  nope: {
    icon: 'close' as const,
    color: SwipeColors.nope,
    glowColor: 'rgba(255, 107, 107, 0.6)',
    gradient: ['rgba(255, 107, 107, 0.2)', 'rgba(255, 107, 107, 0.05)'],
  },
  superlike: {
    icon: 'star' as const,
    color: SwipeColors.superLike,
    glowColor: 'rgba(255, 215, 0, 0.6)',
    gradient: ['rgba(255, 215, 0, 0.2)', 'rgba(255, 215, 0, 0.05)'],
  },
};

const SIZE_CONFIG = {
  small: { size: 52, iconSize: 22, borderRadius: 26 },
  medium: { size: 64, iconSize: 28, borderRadius: 32 },
  large: { size: 72, iconSize: 32, borderRadius: 36 },
};

export default function LiquidButton({ 
  type, 
  onPress, 
  size = 'medium', 
  disabled = false 
}: LiquidButtonProps) {
  const config = BUTTON_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];
  
  // Animation values
  const scale = useSharedValue(1);
  const breathe = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const ripple = useSharedValue(0);
  const pressed = useSharedValue(0);

  // Start breathing animation on mount
  useEffect(() => {
    breathe.value = withRepeat(
      withTiming(1.02, { duration: 2000 }),
      -1,
      true
    );
  }, []);

  const handlePress = () => {
    if (disabled) return;

    // Trigger haptic feedback
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);

    // Press animation
    pressed.value = withTiming(1, { duration: 100 });
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    glowOpacity.value = withTiming(1, { duration: 150 });
    ripple.value = withTiming(1, { duration: 600 });

    // Reset animations
    setTimeout(() => {
      scale.value = withSpring(1, { damping: 12, stiffness: 200 });
      glowOpacity.value = withTiming(0, { duration: 300 });
      ripple.value = withTiming(0, { duration: 200 });
      pressed.value = withTiming(0, { duration: 200 });
    }, 150);

    onPress();
  };

  // Button container animation
  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scale.value * breathe.value * (disabled ? 0.9 : 1) },
      ],
    };
  });

  // Glow effect animation
  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: glowOpacity.value * (disabled ? 0.3 : 1),
      transform: [
        { scale: 1 + glowOpacity.value * 0.2 },
      ],
    };
  });

  // Ripple effect animation
  const rippleAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: (1 - ripple.value) * 0.6,
      transform: [
        { scale: 1 + ripple.value * 1.5 },
      ],
    };
  });

  // Background blur intensity based on press state
  const backgroundAnimatedStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      pressed.value,
      [0, 1],
      ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.15)']
    );
    
    return {
      backgroundColor,
    };
  });

  const buttonStyle: ViewStyle = {
    width: sizeConfig.size,
    height: sizeConfig.size,
    borderRadius: sizeConfig.borderRadius,
  };

  return (
    <Animated.View style={[buttonStyle, buttonAnimatedStyle]}>
      {/* Outer glow effect */}
      <Animated.View 
        style={[
          styles.glow, 
          buttonStyle,
          { 
            shadowColor: config.color,
            backgroundColor: config.glowColor,
          },
          glowAnimatedStyle
        ]} 
      />
      
      {/* Ripple effect */}
      <Animated.View 
        style={[
          styles.ripple, 
          buttonStyle,
          { 
            borderColor: config.color,
          },
          rippleAnimatedStyle
        ]} 
      />

      {/* Main button */}
      <TouchableOpacity
        style={[styles.button, buttonStyle]}
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={1}
      >
        {/* Glass background with blur */}
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={disabled ? 60 : 80}
            tint="dark"
            style={[styles.blurContainer, buttonStyle]}
          >
            <Animated.View style={[styles.backgroundOverlay, backgroundAnimatedStyle]} />
          </BlurView>
        ) : (
          <Animated.View 
            style={[
              styles.androidBackground, 
              buttonStyle,
              backgroundAnimatedStyle
            ]} 
          />
        )}

        {/* Border gradient */}
        <Animated.View 
          style={[
            styles.border, 
            buttonStyle,
            { borderColor: disabled ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' }
          ]} 
        />

        {/* Icon */}
        <Ionicons
          name={config.icon}
          size={sizeConfig.iconSize}
          color={disabled ? 'rgba(255, 255, 255, 0.3)' : config.color}
          style={styles.icon}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  androidBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
  },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 0,
  },
  ripple: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  icon: {
    zIndex: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});