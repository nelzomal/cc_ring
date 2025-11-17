/**
 * Error thrown when repository operations fail.
 * This represents failures in hook storage/retrieval operations.
 */
export class HookRepositoryError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'HookRepositoryError';
    Object.setPrototypeOf(this, HookRepositoryError.prototype);
  }
}
