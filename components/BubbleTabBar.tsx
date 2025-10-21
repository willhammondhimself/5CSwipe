import React, { useEffect } from 'react';
import { 
  View, 
  TouchableOpacity, 
  StyleSheet, 
  Platform, 
  Dimensions,
  Text 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SwipeColors } from '@/contexts/constants/Colors';

const { width: screenWidth } = Dimensions.get('window');

interface TabItem {
  key: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap | React.ComponentType<any>;
  activeIcon: keyof typeof Ionicons.glyphMap | React.ComponentType<any>;
}

interface BubbleTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export default function BubbleTabBar({ tabs, activeTab, onTabPress }: BubbleTabBarProps) {
  const insets = useSafeAreaInsets();
  
  // Animation values
  const floatingOffset = useSharedValue(0);
  const scaleValue = useSharedValue(1);
  
  // Start floating animation
  useEffect(() => {
    floatingOffset.value = withTiming(
      Math.sin(Date.now() / 1000) * 2,
      { duration: 3000 }
    );
  }, []);

  // Container animation styles
  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatingOffset.value },
        { scale: scaleValue.value },
      ],
    };
  });

  const handleTabPress = (key: string) => {
    if (key === activeTab) return;

    // Haptic feedback
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
    
    // Micro animation
    scaleValue.value = withTiming(0.98, { duration: 100 }, () => {
      scaleValue.value = withSpring(1, { damping: 15, stiffness: 300 });
    });

    onTabPress(key);
  };

  const TabButton = ({ item, isActive }: { item: TabItem; isActive: boolean }) => {
    const buttonScale = useSharedValue(1);
    const bubbleWidth = useSharedValue(isActive ? 110 : 55);
    const iconScale = useSharedValue(1);

    useEffect(() => {
      bubbleWidth.value = withSpring(isActive ? 110 : 55, {
        damping: 18,
        stiffness: 200,
      });
      
      iconScale.value = withSpring(isActive ? 1.1 : 1, {
        damping: 15,
        stiffness: 300,
      });
    }, [isActive]);

    const buttonAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ scale: buttonScale.value * iconScale.value }],
      };
    });

    const bubbleAnimatedStyle = useAnimatedStyle(() => {
      const backgroundColor = interpolateColor(
        isActive ? 1 : 0,
        [0, 1],
        ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.15)']
      );

      return {
        width: bubbleWidth.value,
        backgroundColor,
      };
    });

        const handlePress = () => {
      buttonScale.value = withTiming(0.9, { duration: 100 }, () => {
        buttonScale.value = withSpring(1, { damping: 12, stiffness: 300 });
      });

      handleTabPress(item.key);
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={1}
        style={styles.tabButton}
      >
        <Animated.View style={[styles.bubble, bubbleAnimatedStyle]}>
          {/* iOS blur effect */}
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={isActive ? 90 : 70}
              tint="dark"
              style={styles.bubbleBlur}
            >
              <View style={styles.bubbleContent}>
                <Animated.View style={buttonAnimatedStyle}>
                  {typeof (isActive ? item.activeIcon : item.icon) === 'string' ? (
                    <Ionicons
                      name={isActive ? item.activeIcon as keyof typeof Ionicons.glyphMap : item.icon as keyof typeof Ionicons.glyphMap}
                      size={isActive ? 24 : 22}
                      color={isActive ? SwipeColors.accentBlue : SwipeColors.textTertiary}
                    />
                  ) : (
                    React.createElement(
                      isActive ? item.activeIcon as React.ComponentType<any> : item.icon as React.ComponentType<any>,
                      {
                        size: isActive ? 24 : 22,
                        color: isActive ? SwipeColors.accentBlue : SwipeColors.textTertiary,
                      }
                    )
                  )}
                </Animated.View>
                {isActive && (
                  <Text style={styles.tabLabel}>{item.title}</Text>
                )}
              </View>
            </BlurView>
          ) : (
            <View style={[styles.bubbleContent, styles.androidBubble]}>
              <Animated.View style={buttonAnimatedStyle}>
                {typeof (isActive ? item.activeIcon : item.icon) === 'string' ? (
                  <Ionicons
                    name={isActive ? item.activeIcon as keyof typeof Ionicons.glyphMap : item.icon as keyof typeof Ionicons.glyphMap}
                    size={isActive ? 24 : 22}
                    color={isActive ? SwipeColors.accentBlue : SwipeColors.textTertiary}
                  />
                ) : (
                  React.createElement(
                    isActive ? item.activeIcon as React.ComponentType<any> : item.icon as React.ComponentType<any>,
                    {
                      size: isActive ? 24 : 22,
                      color: isActive ? SwipeColors.accentBlue : SwipeColors.textTertiary,
                    }
                  )
                )}
              </Animated.View>
              {isActive && (
                <Text style={styles.tabLabel}>{item.title}</Text>
              )}
            </View>
          )}
          
          {/* Glow effect for active tab */}
          {isActive && (
            <View 
              style={[
                styles.glow,
                { 
                  shadowColor: SwipeColors.accentBlue,
                }
              ]} 
            />
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };



  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      <Animated.View style={[styles.tabBarContainer, containerAnimatedStyle]}>
        {/* Main tab bar */}
        {Platform.OS === 'ios' ? (
          <BlurView
            intensity={95}
            tint="dark"
            style={styles.tabBar}
          >
            <View style={styles.tabBarContent}>
              {tabs.map((item) => (
                <TabButton
                  key={item.key}
                  item={item}
                  isActive={item.key === activeTab}
                />
              ))}
            </View>
          </BlurView>
        ) : (
          <View style={[styles.tabBar, styles.androidTabBar]}>
            <View style={styles.tabBarContent}>
              {tabs.map((item) => (
                <TabButton
                  key={item.key}
                  item={item}
                  isActive={item.key === activeTab}
                />
              ))}
            </View>
          </View>
        )}

        {/* Outer glow */}
        <View style={styles.outerGlow} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1000,
    elevation: 1000,
  },
  tabBarContainer: {
    width: screenWidth * 0.85,
    maxWidth: 350,
    position: 'relative',
  },
  tabBar: {
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 1001,
    elevation: 1001,
  },
  androidTabBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1002,
    elevation: 1002,
  },
  bubble: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  bubbleBlur: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleContent: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  androidBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: SwipeColors.accentBlue,
  },
  glow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 0,
  },
  outerGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 42,
    backgroundColor: 'transparent',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 20,
  },
});