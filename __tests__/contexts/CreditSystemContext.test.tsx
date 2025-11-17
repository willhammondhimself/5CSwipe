/**
 * Tests for CreditSystemContext
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreditSystemProvider, useCreditSystem } from '@/contexts/CreditSystemContext';

// Wrapper for hooks that need the CreditSystemProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CreditSystemProvider>{children}</CreditSystemProvider>
);

describe('CreditSystemContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should start with standard credit system by default', () => {
      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      expect(result.current.creditSystem).toBe('standard');
    });

    it('should load saved credit system from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      await waitFor(() => {
        expect(result.current.creditSystem).toBe('hmc');
      });

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@CourseSwipe:creditSystem');
    });

    it('should ignore invalid saved values', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('invalid');

      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      await waitFor(() => {
        expect(result.current.creditSystem).toBe('standard');
      });
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      await waitFor(() => {
        expect(result.current.creditSystem).toBe('standard');
      });
    });
  });

  describe('setCreditSystem', () => {
    it('should update credit system to hmc', async () => {
      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      act(() => {
        result.current.setCreditSystem('hmc');
      });

      expect(result.current.creditSystem).toBe('hmc');

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@CourseSwipe:creditSystem', 'hmc');
      });
    });

    it('should update credit system to standard', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      await waitFor(() => {
        expect(result.current.creditSystem).toBe('hmc');
      });

      act(() => {
        result.current.setCreditSystem('standard');
      });

      expect(result.current.creditSystem).toBe('standard');

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@CourseSwipe:creditSystem', 'standard');
      });
    });

    it('should persist changes to AsyncStorage', async () => {
      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      act(() => {
        result.current.setCreditSystem('hmc');
      });

      await waitFor(() => {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith('@CourseSwipe:creditSystem', 'hmc');
      });
    });

    it('should handle AsyncStorage save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Save error'));

      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      act(() => {
        result.current.setCreditSystem('hmc');
      });

      // Should still update state even if save fails
      expect(result.current.creditSystem).toBe('hmc');
    });
  });

  describe('convertCredits', () => {
    describe('standard credit system', () => {
      it('should return credits unchanged when from and to are the same', () => {
        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        expect(result.current.convertCredits(3, 'standard')).toBe(3);
        expect(result.current.convertCredits(12, 'standard')).toBe(12);
      });

      it('should convert from hmc to standard (multiply by 3)', () => {
        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        expect(result.current.convertCredits(1, 'hmc')).toBe(3);
        expect(result.current.convertCredits(4, 'hmc')).toBe(12);
        expect(result.current.convertCredits(5, 'hmc')).toBe(15);
      });

      it('should use standard as default fromSystem', () => {
        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        expect(result.current.convertCredits(3)).toBe(3);
        expect(result.current.convertCredits(12)).toBe(12);
      });
    });

    describe('hmc credit system', () => {
      it('should return credits unchanged when from and to are the same', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        await waitFor(() => {
          expect(result.current.creditSystem).toBe('hmc');
        });

        expect(result.current.convertCredits(1, 'hmc')).toBe(1);
        expect(result.current.convertCredits(4, 'hmc')).toBe(4);
      });

      it('should convert from standard to hmc (divide by 3, rounded)', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        await waitFor(() => {
          expect(result.current.creditSystem).toBe('hmc');
        });

        expect(result.current.convertCredits(3, 'standard')).toBe(1);
        expect(result.current.convertCredits(12, 'standard')).toBe(4);
        expect(result.current.convertCredits(15, 'standard')).toBe(5);
        expect(result.current.convertCredits(4, 'standard')).toBe(1); // 4/3 = 1.33 → 1
        expect(result.current.convertCredits(5, 'standard')).toBe(2); // 5/3 = 1.67 → 2
      });

      it('should use standard as default fromSystem', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        await waitFor(() => {
          expect(result.current.creditSystem).toBe('hmc');
        });

        expect(result.current.convertCredits(3)).toBe(1);
        expect(result.current.convertCredits(12)).toBe(4);
      });
    });
  });

  describe('getCreditsLabel', () => {
    describe('standard credit system', () => {
      it('should return standard credits label', () => {
        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        expect(result.current.getCreditsLabel(3)).toBe('3 credits');
        expect(result.current.getCreditsLabel(12)).toBe('12 credits');
        expect(result.current.getCreditsLabel(1)).toBe('1 credits');
      });
    });

    describe('hmc credit system', () => {
      it('should return hmc credits with standard equivalent', async () => {
        (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

        const { result } = renderHook(() => useCreditSystem(), { wrapper });

        await waitFor(() => {
          expect(result.current.creditSystem).toBe('hmc');
        });

        // When in HMC mode, input is assumed to be standard credits
        // It converts to HMC and shows both
        expect(result.current.getCreditsLabel(3)).toBe('1 HMC credits (3 standard)');
        expect(result.current.getCreditsLabel(12)).toBe('4 HMC credits (12 standard)');
        expect(result.current.getCreditsLabel(15)).toBe('5 HMC credits (15 standard)');
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        renderHook(() => useCreditSystem());
      }).toThrow('useCreditSystem must be used within a CreditSystemProvider');

      console.error = originalError;
    });
  });

  describe('edge cases', () => {
    it('should handle zero credits', () => {
      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      expect(result.current.convertCredits(0, 'standard')).toBe(0);
      expect(result.current.convertCredits(0, 'hmc')).toBe(0);
      expect(result.current.getCreditsLabel(0)).toBe('0 credits');
    });

    it('should handle negative credits', () => {
      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      expect(result.current.convertCredits(-3, 'standard')).toBe(-3);
      expect(result.current.convertCredits(-3, 'hmc')).toBe(-9);
    });

    it('should handle fractional credits with rounding', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('hmc');

      const { result } = renderHook(() => useCreditSystem(), { wrapper });

      await waitFor(() => {
        expect(result.current.creditSystem).toBe('hmc');
      });

      // 2 standard credits / 3 = 0.67 → rounds to 1
      expect(result.current.convertCredits(2, 'standard')).toBe(1);

      // 1 standard credit / 3 = 0.33 → rounds to 0
      expect(result.current.convertCredits(1, 'standard')).toBe(0);
    });
  });
});
