/**
 * Error thrown when sound configuration is invalid
 */
export class SoundValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SoundValidationError';
    Object.setPrototypeOf(this, SoundValidationError.prototype);
  }
}
