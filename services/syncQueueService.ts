/**
 * syncQueueService.ts
 * ====================
 * Mutation queue for offline operations
 *
 * Features:
 * - Queue mutations when offline
 * - Auto-sync when connection restored
 * - Retry logic with exponential backoff
 * - Deduplication
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Course } from '@/data/mockCourses';

export type MutationType =
  | 'LIKE_COURSE'
  | 'UNLIKE_COURSE'
  | 'ADD_TO_SCHEDULE'
  | 'REMOVE_FROM_SCHEDULE'
  | 'CREATE_PLAN'
  | 'UPDATE_PLAN'
  | 'DELETE_PLAN';

export interface QueuedMutation {
  id: string;
  type: MutationType;
  payload: any;
  timestamp: number;
  retries: number;
  userId: string;
}

interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ mutation: QueuedMutation; error: any }>;
}

class SyncQueueService {
  private readonly QUEUE_KEY = '@5cswipe:syncQueue';
  private readonly MAX_RETRIES = 3;
  private readonly BASE_RETRY_DELAY = 1000; // 1 second

  /**
   * Add mutation to queue
   */
  async addToQueue(mutation: Omit<QueuedMutation, 'id' | 'retries'>): Promise<void> {
    try {
      const queue = await this.getQueue();

      // Deduplication: Remove same type + payload combos
      const filtered = queue.filter(m => !this.isDuplicate(m, mutation));

      const newMutation: QueuedMutation = {
        ...mutation,
        id: this.generateId(),
        retries: 0,
      };

      filtered.push(newMutation);

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
      console.log(`📝 Added ${mutation.type} to sync queue (${filtered.length} total)`);
    } catch (error) {
      console.error('❌ Error adding to sync queue:', error);
      throw error;
    }
  }

  /**
   * Get all queued mutations
   */
  async getQueue(): Promise<QueuedMutation[]> {
    try {
      const queue = await AsyncStorage.getItem(this.QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('❌ Error reading sync queue:', error);
      return [];
    }
  }

  /**
   * Get queue count
   */
  async getQueueCount(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Remove mutation from queue
   */
  async removeFromQueue(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const filtered = queue.filter(m => m.id !== id);

      await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(filtered));
      console.log(`✅ Removed mutation ${id} from queue`);
    } catch (error) {
      console.error('❌ Error removing from sync queue:', error);
      throw error;
    }
  }

  /**
   * Process all mutations in queue
   */
  async processQueue(
    onMutation: (mutation: QueuedMutation) => Promise<void>
  ): Promise<SyncResult> {
    const queue = await this.getQueue();

    if (queue.length === 0) {
      console.log('📭 Sync queue is empty');
      return { success: 0, failed: 0, errors: [] };
    }

    console.log(`🔄 Processing ${queue.length} queued mutations...`);

    let success = 0;
    let failed = 0;
    const errors: Array<{ mutation: QueuedMutation; error: any }> = [];

    for (const mutation of queue) {
      try {
        // Check retry limit
        if (mutation.retries >= this.MAX_RETRIES) {
          console.warn(`⚠️ Max retries reached for ${mutation.type}, skipping`);
          await this.removeFromQueue(mutation.id);
          failed++;
          continue;
        }

        // Exponential backoff delay
        if (mutation.retries > 0) {
          const delay = this.BASE_RETRY_DELAY * Math.pow(2, mutation.retries - 1);
          await this.sleep(delay);
        }

        // Process mutation
        await onMutation(mutation);

        // Success - remove from queue
        await this.removeFromQueue(mutation.id);
        success++;

        console.log(`✅ Synced ${mutation.type} (${success}/${queue.length})`);
      } catch (error) {
        console.error(`❌ Failed to sync ${mutation.type}:`, error);

        // Increment retry count
        await this.incrementRetries(mutation.id);
        failed++;
        errors.push({ mutation, error });
      }
    }

    console.log(`🎉 Sync complete: ${success} success, ${failed} failed`);

    return { success, failed, errors };
  }

  /**
   * Increment retry count for a mutation
   */
  private async incrementRetries(id: string): Promise<void> {
    try {
      const queue = await this.getQueue();
      const mutation = queue.find(m => m.id === id);

      if (mutation) {
        mutation.retries++;
        await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
      }
    } catch (error) {
      console.error('❌ Error incrementing retries:', error);
    }
  }

  /**
   * Clear entire queue
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.QUEUE_KEY);
      console.log('🗑️ Cleared sync queue');
    } catch (error) {
      console.error('❌ Error clearing sync queue:', error);
      throw error;
    }
  }

  /**
   * Check if two mutations are duplicates
   */
  private isDuplicate(
    m1: Omit<QueuedMutation, 'id' | 'retries'>,
    m2: Omit<QueuedMutation, 'id' | 'retries'>
  ): boolean {
    if (m1.type !== m2.type) return false;

    // For like/unlike, check course ID
    if (m1.type === 'LIKE_COURSE' || m1.type === 'UNLIKE_COURSE') {
      return m1.payload?.courseId === m2.payload?.courseId;
    }

    // For schedule operations, check plan ID + course ID
    if (m1.type === 'ADD_TO_SCHEDULE' || m1.type === 'REMOVE_FROM_SCHEDULE') {
      return (
        m1.payload?.planId === m2.payload?.planId &&
        m1.payload?.courseId === m2.payload?.courseId
      );
    }

    // For plan operations, check plan ID
    if (m1.type === 'UPDATE_PLAN' || m1.type === 'DELETE_PLAN') {
      return m1.payload?.planId === m2.payload?.planId;
    }

    return false;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    total: number;
    byType: Record<MutationType, number>;
    retrying: number;
  }> {
    const queue = await this.getQueue();

    const byType: Record<string, number> = {};
    let retrying = 0;

    for (const mutation of queue) {
      byType[mutation.type] = (byType[mutation.type] || 0) + 1;
      if (mutation.retries > 0) retrying++;
    }

    return {
      total: queue.length,
      byType: byType as Record<MutationType, number>,
      retrying,
    };
  }
}

export const syncQueueService = new SyncQueueService();
