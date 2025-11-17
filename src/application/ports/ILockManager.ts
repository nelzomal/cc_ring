/**
 * Lock manager port for coordinating file access.
 *
 * IMPORTANT: This provides COOPERATIVE locking only.
 * It prevents conflicts between processes that check for locks,
 * but CANNOT prevent:
 * - Manual edits with text editors
 * - Direct writes via Claude Code CLI (unless it cooperates)
 * - Other processes that don't check for locks
 *
 * The lock prevents corruption from simultaneous writes,
 * not all concurrent access.
 */
export interface ILockManager {
  /**
   * Executes an operation while holding an exclusive lock.
   *
   * @param lockPath - Path to the lock file (e.g., ~/.claude/cc-ring.lock)
   * @param operation - Async operation to execute while locked
   * @returns Result of the operation
   * @throws Error if lock cannot be acquired or operation fails
   */
  withLock<T>(lockPath: string, operation: () => Promise<T>): Promise<T>;
}
