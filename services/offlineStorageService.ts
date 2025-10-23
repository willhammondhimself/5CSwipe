/**
 * offlineStorageService.ts
 * =========================
 * Offline storage layer using AsyncStorage
 *
 * Features:
 * - Cache course data
 * - Cache user data (liked courses, schedules)
 * - Sync timestamps
 * - Cache invalidation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '@/data/mockCourses';

export interface SchedulePlan {
  id: string;
  name: string;
  courseIds: string[];
  semester: string;
  totalCredits: number;
  courseCount: number;
  color: string;
  createdAt: string;
}

interface CacheMetadata {
  timestamp: number;
  version: string;
}

class OfflineStorageService {
  private readonly CACHE_VERSION = '1.0';
  private readonly CACHE_PREFIX = '@5cswipe:';

  /**
   * Generate cache key with prefix
   */
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Cache courses for a semester
   */
  async cacheCourses(semester: string, courses: Course[]): Promise<void> {
    try {
      const key = this.getCacheKey(`courses:${semester}`);
      const data = {
        courses,
        metadata: {
          timestamp: Date.now(),
          version: this.CACHE_VERSION,
        } as CacheMetadata,
      };

      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Cached ${courses.length} courses for ${semester}`);
    } catch (error) {
      console.error('❌ Error caching courses:', error);
      throw error;
    }
  }

  /**
   * Get cached courses for a semester
   */
  async getCachedCourses(semester: string): Promise<{ courses: Course[]; fromCache: boolean } | null> {
    try {
      const key = this.getCacheKey(`courses:${semester}`);
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        console.log('📭 No cached courses found');
        return null;
      }

      const data = JSON.parse(cached);

      // Version check
      if (data.metadata?.version !== this.CACHE_VERSION) {
        console.log('⚠️ Cache version mismatch, invalidating');
        await this.clearCourseCache(semester);
        return null;
      }

      console.log(`✅ Loaded ${data.courses.length} courses from cache`);
      return {
        courses: data.courses,
        fromCache: true,
      };
    } catch (error) {
      console.error('❌ Error reading cached courses:', error);
      return null;
    }
  }

  /**
   * Cache liked courses for a user
   */
  async cacheLikedCourses(userId: string, courses: Course[]): Promise<void> {
    try {
      const key = this.getCacheKey(`likedCourses:${userId}`);
      const data = {
        courses,
        metadata: {
          timestamp: Date.now(),
          version: this.CACHE_VERSION,
        } as CacheMetadata,
      };

      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Cached ${courses.length} liked courses`);
    } catch (error) {
      console.error('❌ Error caching liked courses:', error);
      throw error;
    }
  }

  /**
   * Get cached liked courses for a user
   */
  async getCachedLikedCourses(userId: string): Promise<Course[] | null> {
    try {
      const key = this.getCacheKey(`likedCourses:${userId}`);
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);

      // Version check
      if (data.metadata?.version !== this.CACHE_VERSION) {
        console.log('⚠️ Liked courses cache version mismatch');
        await this.clearLikedCoursesCache(userId);
        return null;
      }

      console.log(`✅ Loaded ${data.courses.length} liked courses from cache`);
      return data.courses;
    } catch (error) {
      console.error('❌ Error reading cached liked courses:', error);
      return null;
    }
  }

  /**
   * Cache schedule plans for a user
   */
  async cacheSchedulePlans(userId: string, plans: SchedulePlan[]): Promise<void> {
    try {
      const key = this.getCacheKey(`schedulePlans:${userId}`);
      const data = {
        plans,
        metadata: {
          timestamp: Date.now(),
          version: this.CACHE_VERSION,
        } as CacheMetadata,
      };

      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Cached ${plans.length} schedule plans`);
    } catch (error) {
      console.error('❌ Error caching schedule plans:', error);
      throw error;
    }
  }

  /**
   * Get cached schedule plans for a user
   */
  async getCachedSchedulePlans(userId: string): Promise<SchedulePlan[] | null> {
    try {
      const key = this.getCacheKey(`schedulePlans:${userId}`);
      const cached = await AsyncStorage.getItem(key);

      if (!cached) {
        return null;
      }

      const data = JSON.parse(cached);

      // Version check
      if (data.metadata?.version !== this.CACHE_VERSION) {
        console.log('⚠️ Schedule plans cache version mismatch');
        await this.clearSchedulePlansCache(userId);
        return null;
      }

      console.log(`✅ Loaded ${data.plans.length} schedule plans from cache`);
      return data.plans;
    } catch (error) {
      console.error('❌ Error reading cached schedule plans:', error);
      return null;
    }
  }

  /**
   * Get last sync timestamp for a key
   */
  async getLastSyncTime(key: string): Promise<number | null> {
    try {
      const cacheKey = this.getCacheKey(`lastSync:${key}`);
      const timestamp = await AsyncStorage.getItem(cacheKey);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      console.error('❌ Error reading last sync time:', error);
      return null;
    }
  }

  /**
   * Set last sync timestamp for a key
   */
  async setLastSyncTime(key: string, timestamp: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(`lastSync:${key}`);
      await AsyncStorage.setItem(cacheKey, timestamp.toString());
    } catch (error) {
      console.error('❌ Error setting last sync time:', error);
      throw error;
    }
  }

  /**
   * Check if cache is stale (older than maxAge in milliseconds)
   */
  async isCacheStale(key: string, maxAge: number): Promise<boolean> {
    const lastSync = await this.getLastSyncTime(key);
    if (!lastSync) return true;

    return Date.now() - lastSync > maxAge;
  }

  /**
   * Clear course cache for a semester
   */
  async clearCourseCache(semester: string): Promise<void> {
    try {
      const key = this.getCacheKey(`courses:${semester}`);
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Cleared course cache for ${semester}`);
    } catch (error) {
      console.error('❌ Error clearing course cache:', error);
    }
  }

  /**
   * Clear liked courses cache
   */
  async clearLikedCoursesCache(userId: string): Promise<void> {
    try {
      const key = this.getCacheKey(`likedCourses:${userId}`);
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Cleared liked courses cache');
    } catch (error) {
      console.error('❌ Error clearing liked courses cache:', error);
    }
  }

  /**
   * Clear schedule plans cache
   */
  async clearSchedulePlansCache(userId: string): Promise<void> {
    try {
      const key = this.getCacheKey(`schedulePlans:${userId}`);
      await AsyncStorage.removeItem(key);
      console.log('🗑️ Cleared schedule plans cache');
    } catch (error) {
      console.error('❌ Error clearing schedule plans cache:', error);
    }
  }

  /**
   * Clear all cache data
   */
  async clearAllCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`🗑️ Cleared all cache (${cacheKeys.length} items)`);
    } catch (error) {
      console.error('❌ Error clearing all cache:', error);
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalItems: number;
    totalSize: number;
    items: { key: string; size: number }[];
  }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

      const items: { key: string; size: number }[] = [];
      let totalSize = 0;

      for (const key of cacheKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const size = new Blob([value]).size;
          items.push({ key: key.replace(this.CACHE_PREFIX, ''), size });
          totalSize += size;
        }
      }

      return {
        totalItems: cacheKeys.length,
        totalSize,
        items,
      };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return { totalItems: 0, totalSize: 0, items: [] };
    }
  }
}

export const offlineStorageService = new OfflineStorageService();
