import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { LikedCoursesProvider } from '@/contexts/LikedCoursesContext';
import { ScheduleVariantsProvider } from '@/contexts/ScheduleVariantsContext';
import { FilterProvider } from '@/contexts/FilterContext';
import { CreditSystemProvider } from '@/contexts/CreditSystemContext';
import { AcademicProfileProvider } from '@/contexts/AcademicProfileContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { CardPreferencesProvider } from '@/contexts/CardPreferencesContext';

/**
 * Custom render function that wraps components with all necessary providers
 * for testing components that depend on context.
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <AcademicProfileProvider>
        <PremiumProvider>
          <CreditSystemProvider>
            <FilterProvider>
              <LikedCoursesProvider>
                <CardPreferencesProvider>
                  <ScheduleVariantsProvider>
                    {children}
                  </ScheduleVariantsProvider>
                </CardPreferencesProvider>
              </LikedCoursesProvider>
            </FilterProvider>
          </CreditSystemProvider>
        </PremiumProvider>
      </AcademicProfileProvider>
    </AuthProvider>
  );
};

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

/**
 * Custom render that includes all context providers
 */
const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  return render(ui, {
    wrapper: options?.wrapper || AllTheProviders,
    ...options,
  });
};

/**
 * Wait for async operations to complete
 */
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Create a mock event object
 */
export const createMockEvent = (overrides = {}) => ({
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  ...overrides,
});

// Re-export everything from React Native Testing Library
export * from '@testing-library/react-native';

// Override render with our custom render
export { customRender as render };
