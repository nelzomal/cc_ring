import * as lockfile from 'proper-lockfile';
import { ILockManager } from '@application/ports/ILockManager';

/**
 * Lock manager implementation using proper-lockfile.
 *
 * Uses cooperative locking via lock directories.
 * Provides automatic stale lock detection and retry logic.
 */
export class LockManager implements ILockManager {
  private readonly LOCK_OPTIONS: lockfile.LockOptions = {
    realpath: false, // Don't resolve symlinks - allows locking non-existent coordination files
    retries: {
      retries: 5,
      minTimeout: 100,
      maxTimeout: 1000,
    },
    stale: 10000, // 10 seconds - sufficient for operations that typically take ~200ms
  };

  async withLock<T>(lockPath: string, operation: () => Promise<T>): Promise<T> {
    let release: (() => Promise<void>) | undefined;

    try {
      // Acquire lock with retry logic
      release = await lockfile.lock(lockPath, this.LOCK_OPTIONS);

      // Execute operation while holding lock
      const result = await operation();

      return result;
    } finally {
      // Always release lock, even if operation throws
      if (release) {
        try {
          await release();
        } catch (error) {
          // Log but don't throw - operation may have succeeded
          console.error('Failed to release lock:', error);
        }
      }
    }
  }
}
