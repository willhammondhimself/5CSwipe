import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { LikedCoursesProvider } from '@/contexts/LikedCoursesContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { CreditSystemProvider } from '@/contexts/CreditSystemContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { AcademicProfileProvider } from '@/contexts/AcademicProfileContext';
import { ScheduleVariantsProvider } from '@/contexts/ScheduleVariantsContext';
import AuthGuard from '@/components/AuthGuard';

function ScheduleVariantsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ScheduleVariantsProvider>
      {children}
    </ScheduleVariantsProvider>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <AcademicProfileProvider>
          <PremiumProvider>
            <CreditSystemProvider>
              <FilterProvider>
                <LikedCoursesProvider>
                  <ScheduleVariantsWrapper>
                    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                      <AuthGuard>
                        <Stack>
                          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                          <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
                          <Stack.Screen name="auth/welcome" options={{ headerShown: false }} />
                          <Stack.Screen name="auth/onboarding" options={{ headerShown: false }} />
                          <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
                          <Stack.Screen name="auth/email-verification" options={{ headerShown: false }} />
                          <Stack.Screen name="+not-found" />
                        </Stack>
                      </AuthGuard>
                      <StatusBar style="auto" />
                    </ThemeProvider>
                  </ScheduleVariantsWrapper>
                </LikedCoursesProvider>
              </FilterProvider>
            </CreditSystemProvider>
          </PremiumProvider>
        </AcademicProfileProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
