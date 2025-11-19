import { vi } from 'vitest';
import type { IFileSystem } from '@application/ports/IFileSystem';

/**
 * Mock implementation of IFileSystem for testing
 * Uses Vitest's vi.fn() for automatic spy tracking
 */
export class MockFileSystem implements IFileSystem {
  public writeFileAtomic = vi.fn<[string, string, { createIfMissing: true; mode?: number }], Promise<void>>();
  public deleteFile = vi.fn<[string], Promise<void>>();
  public fileExists = vi.fn<[string], boolean>();
  public readFile = vi.fn<[string, BufferEncoding?], Promise<string>>();
  public readFileSync = vi.fn<[string, BufferEncoding?], string>();
  public ensureDir = vi.fn<[string], Promise<void>>();
  public writeConfigFile = vi.fn<[string, object], Promise<void>>();
  public getFileMtime = vi.fn<[string], Promise<number>>();

  /**
   * Reset all mock function calls and implementations
   */
  reset(): void {
    this.writeFileAtomic.mockReset();
    this.deleteFile.mockReset();
    this.fileExists.mockReset();
    this.readFile.mockReset();
    this.readFileSync.mockReset();
    this.ensureDir.mockReset();
    this.writeConfigFile.mockReset();
    this.getFileMtime.mockReset();
  }

  /**
   * Configure the mock to return that a file exists
   */
  mockFileExists(path: string, exists: boolean): void {
    this.fileExists.mockImplementation((p: string) => p === path ? exists : false);
  }

  /**
   * Configure the mock to throw an error on fileExists
   */
  mockFileExistsError(error: Error): void {
    this.fileExists.mockImplementation(() => {
      throw error;
    });
  }
}
