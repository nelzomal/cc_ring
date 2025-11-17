/**
 * Error thrown when hook installation or uninstallation operations fail.
 * This represents application-level operation failures.
 */
export class HookInstallationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'HookInstallationError';
    Object.setPrototypeOf(this, HookInstallationError.prototype);
  }
}
