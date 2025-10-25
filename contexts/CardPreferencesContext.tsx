/**
 * CardPreferencesContext.tsx
 * ==========================
 * Context for managing card display preferences
 *
 * Features:
 * - View mode: compact/standard/detailed
 * - Card scaling preference
 * - Persistent storage
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CardViewMode = 'compact' | 'standard' | 'detailed';

interface CardPreferences {
  viewMode: CardViewMode;
  cardScale: number; // 0.8 to 1.2
}

interface CardPreferencesContextType {
  preferences: CardPreferences;
  setViewMode: (mode: CardViewMode) => Promise<void>;
  setCardScale: (scale: number) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const defaultPreferences: CardPreferences = {
  viewMode: 'standard',
  cardScale: 1.0,
};

const CardPreferencesContext = createContext<CardPreferencesContextType | undefined>(undefined);

const STORAGE_KEY = '@5cswipe_card_preferences';

interface CardPreferencesProviderProps {
  children: ReactNode;
}

export function CardPreferencesProvider({ children }: CardPreferencesProviderProps) {
  const [preferences, setPreferences] = useState<CardPreferences>(defaultPreferences);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      }
    } catch (error) {
      console.error('Failed to load card preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const savePreferences = async (newPreferences: CardPreferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error('Failed to save card preferences:', error);
    }
  };

  const setViewMode = async (mode: CardViewMode) => {
    await savePreferences({ ...preferences, viewMode: mode });
  };

  const setCardScale = async (scale: number) => {
    // Clamp scale between 0.8 and 1.2
    const clampedScale = Math.max(0.8, Math.min(1.2, scale));
    await savePreferences({ ...preferences, cardScale: clampedScale });
  };

  const resetPreferences = async () => {
    await savePreferences(defaultPreferences);
  };

  // Don't render children until preferences are loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <CardPreferencesContext.Provider
      value={{
        preferences,
        setViewMode,
        setCardScale,
        resetPreferences,
      }}
    >
      {children}
    </CardPreferencesContext.Provider>
  );
}

export function useCardPreferences() {
  const context = useContext(CardPreferencesContext);
  if (!context) {
    throw new Error('useCardPreferences must be used within a CardPreferencesProvider');
  }
  return context;
}
