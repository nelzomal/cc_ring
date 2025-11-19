import { vi } from 'vitest';
import type { IHookRepository } from '@application/ports/IHookRepository';

/**
 * Mock implementation of IHookRepository for testing
 * Uses Vitest's vi.fn() for automatic spy tracking
 */
export class MockHookRepository implements IHookRepository {
  public isInstalled = vi.fn<[], Promise<boolean>>();
  public install = vi.fn<[string], Promise<void>>();
  public uninstall = vi.fn<[], Promise<void>>();

  /**
   * Reset all mock function calls and implementations
   */
  reset(): void {
    this.isInstalled.mockReset();
    this.install.mockReset();
    this.uninstall.mockReset();
  }

  /**
   * Configure the mock to return that hooks are installed
   */
  mockInstalled(): void {
    this.isInstalled.mockResolvedValue(true);
  }

  /**
   * Configure the mock to return that hooks are not installed
   */
  mockNotInstalled(): void {
    this.isInstalled.mockResolvedValue(false);
  }

  /**
   * Configure the mock to throw an error on isInstalled
   */
  mockIsInstalledError(error: Error): void {
    this.isInstalled.mockRejectedValue(error);
  }
}
