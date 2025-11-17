/**
 * Error thrown when a hook fails validation
 */
export class HookValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HookValidationError';
    Object.setPrototypeOf(this, HookValidationError.prototype);
  }
}
