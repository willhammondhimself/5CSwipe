import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CreditSystem = 'standard' | 'hmc';

interface CreditSystemContextType {
  creditSystem: CreditSystem;
  setCreditSystem: (system: CreditSystem) => void;
  convertCredits: (credits: number, fromSystem?: CreditSystem) => number;
  getCreditsLabel: (credits: number) => string;
}

const CREDIT_SYSTEM_KEY = '@CourseSwipe:creditSystem';

const CreditSystemContext = createContext<CreditSystemContextType | undefined>(undefined);

export function CreditSystemProvider({ children }: { children: ReactNode }) {
  const [creditSystem, setCreditSystemState] = useState<CreditSystem>('standard');

  // Load saved credit system on mount
  useEffect(() => {
    loadCreditSystem();
  }, []);

  // Save credit system when it changes
  useEffect(() => {
    saveCreditSystem();
  }, [creditSystem]);

  const loadCreditSystem = async () => {
    try {
      const saved = await AsyncStorage.getItem(CREDIT_SYSTEM_KEY);
      if (saved && (saved === 'standard' || saved === 'hmc')) {
        setCreditSystemState(saved);
      }
    } catch (error) {
      console.error('Error loading credit system:', error);
    }
  };

  const saveCreditSystem = async () => {
    try {
      await AsyncStorage.setItem(CREDIT_SYSTEM_KEY, creditSystem);
    } catch (error) {
      console.error('Error saving credit system:', error);
    }
  };

  const setCreditSystem = (system: CreditSystem) => {
    setCreditSystemState(system);
  };

  const convertCredits = (credits: number, fromSystem: CreditSystem = 'standard'): number => {
    if (creditSystem === fromSystem) {
      return credits;
    }
    
    // HMC system: Courses are typically 1 credit (range 1-6, typical load is 4 credits)
    // Standard system: Courses are typically 3-4 credits (typical load is 12-15 credits)
    if (fromSystem === 'standard' && creditSystem === 'hmc') {
      // Standard to HMC: rough equivalence based on typical loads
      // Standard 3-credit course ≈ HMC 1-credit course
      return Math.round(credits / 3);
    } else if (fromSystem === 'hmc' && creditSystem === 'standard') {
      // HMC to Standard: HMC 1-credit course ≈ Standard 3-credit course
      return credits * 3;
    }
    
    return credits;
  };

  const getCreditsLabel = (credits: number): string => {
    const displayCredits = convertCredits(credits);
    const systemLabel = creditSystem === 'hmc' ? 'HMC credits' : 'credits';
    
    if (creditSystem === 'hmc') {
      // Show HMC credits with standard equivalent
      const hmcCredits = convertCredits(credits, 'standard');
      const standardCredits = credits;
      
      return `${hmcCredits} HMC credits (${standardCredits} standard)`;
    }
    
    return `${displayCredits} ${systemLabel}`;
  };

  return (
    <CreditSystemContext.Provider
      value={{
        creditSystem,
        setCreditSystem,
        convertCredits,
        getCreditsLabel,
      }}
    >
      {children}
    </CreditSystemContext.Provider>
  );
}

export function useCreditSystem() {
  const context = useContext(CreditSystemContext);
  if (context === undefined) {
    throw new Error('useCreditSystem must be used within a CreditSystemProvider');
  }
  return context;
}