/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

// Swipe-specific colors
export const SwipeColors = {
  like: '#4FC3F7',  // Bright blue for likes
  nope: '#FF6B6B',  // Soft red for nopes
  superLike: '#FFD700',  // Gold for super likes
  cardBackground: '#1C1C1E',  // Slightly lighter dark card background
  cardBorder: '#2C2C2E',  // Subtle border
  cardGradientStart: '#242426',  // Gradient start color
  cardGradientEnd: '#1A1A1C',  // Gradient end color
  
  // School-specific accent colors
  schools: {
    'HMC': '#FFB800',     // Harvey Mudd Gold
    'Pomona': '#1E4D8D',  // Pomona Blue
    'CMC': '#8B0000',     // CMC Maroon
    'Scripps': '#3A7F71', // Scripps Green
    'Pitzer': '#F37021',  // Pitzer Orange
    '5C': '#666666',      // Generic gray for cross-registration
  },
  
  // UI Elements
  buttonBackground: '#2C2C2E',
  buttonBorder: '#3C3C3E',
  textSecondary: '#8E8E93',
  textPrimary: '#FFFFFF',
  textTertiary: '#636366',
  textPrimaryPrimary: '#FFFFFF',
  textPrimaryTertiary: '#636366',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  error: '#FF3B30',
  backgroundPrimary: '#1C1C1E',
  backgroundSecondary: '#242426',
  
  // New modern colors
  accentBlue: '#007AFF',
  accentPurple: '#5856D6',
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  highlightBorder: 'rgba(255, 255, 255, 0.1)',

  // Semantic color aliases for auth screens and components
  primary: '#007AFF',        // Brand accent color (iOS blue)
  background: '#000000',     // Main app background (true black)
  border: '#3C3C3E',        // Default border color (subtle gray)
  card: '#2C2C2E',          // Card/elevated surface background (dark gray)
};
