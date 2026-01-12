import { vi } from 'vitest';
import type { IFileSystem } from '@application/ports/IFileSystem';

/**
 * Mock implementation of IFileSystem for testing
 * Uses Vitest's vi.fn() for automatic spy tracking
 */
export class MockFileSystem implements IFileSystem {
  public writeFileAtomic = vi.fn<[string, string, { createIfMissing: true; overwrite: true; mode?: number }], Promise<void>>();
  public deleteFile = vi.fn<[string], Promise<void>>();
  public readFile = vi.fn<[string, BufferEncoding?], Promise<string | null>>();
  public getFileMtime = vi.fn<[string], Promise<number | null>>();

  /**
   * Reset all mock function calls and implementations
   */
  reset(): void {
    this.writeFileAtomic.mockReset();
    this.deleteFile.mockReset();
    this.readFile.mockReset();
    this.getFileMtime.mockReset();
  }
}
