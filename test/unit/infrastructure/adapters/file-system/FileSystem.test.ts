import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileSystem } from '@infrastructure/adapters/file-system/FileSystem';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Unit tests for FileSystem adapter
 *
 * Tests the infrastructure layer implementation that wraps Node.js fs module
 * Uses real temporary directories for realistic testing
 */
describe('Feature: File system operations', () => {
  let fileSystem: FileSystem;
  let tempDir: string;
  let testFilePath: string;

  beforeEach(() => {
    // Given a FileSystem instance
    fileSystem = new FileSystem();

    // And a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-ring-fs-test-'));
    testFilePath = path.join(tempDir, 'test-file.txt');
  });

  afterEach(() => {
    // Clean up temporary directory after each test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // readFile() Tests
  // ==========================================================================

  describe('Scenario: Reading file content', () => {
    describe('When file exists with content', () => {
      it('should return file content', async () => {
        // Given a file with content
        const content = 'Hello, World!';
        fs.writeFileSync(testFilePath, content);

        // When reading the file
        const result = await fileSystem.readFile(testFilePath);

        // Then it should return the content
        expect(result).toBe(content);
      });
    });

    describe('When file is empty', () => {
      it('should return empty string', async () => {
        // Given an empty file
        fs.writeFileSync(testFilePath, '');

        // When reading the file
        const result = await fileSystem.readFile(testFilePath);

        // Then it should return empty string
        expect(result).toBe('');
      });
    });

    describe('When file contains UTF-8 characters', () => {
      it('should read UTF-8 content correctly', async () => {
        // Given a file with UTF-8 content
        const content = 'Hello 你好 こんにちは 🎉';
        fs.writeFileSync(testFilePath, content, 'utf-8');

        // When reading the file
        const result = await fileSystem.readFile(testFilePath);

        // Then it should return the UTF-8 content correctly
        expect(result).toBe(content);
      });
    });

    describe('When file does not exist', () => {
      it('should return null', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When reading the file
        const result = await fileSystem.readFile(testFilePath);

        // Then it should return null
        expect(result).toBeNull();
      });
    });

    describe('When using different encoding', () => {
      it('should read with specified encoding', async () => {
        // Given a file with ASCII content
        const content = 'ASCII content';
        fs.writeFileSync(testFilePath, content, 'ascii');

        // When reading with ASCII encoding
        const result = await fileSystem.readFile(testFilePath, 'ascii');

        // Then it should return the content
        expect(result).toBe(content);
      });
    });
  });

  // ==========================================================================
  // writeFileAtomic() Tests
  // ==========================================================================

  describe('Scenario: Writing file atomically', () => {
    describe('When writing string to new file', () => {
      it('should create file with content', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        const content = 'New file content';

        // When writing atomically
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true, overwrite: true });

        // Then file should exist
        expect(fs.existsSync(testFilePath)).toBe(true);

        // And content should match
        const writtenContent = fs.readFileSync(testFilePath, 'utf-8');
        expect(writtenContent).toBe(content);
      });
    });

    describe('When overwriting existing file', () => {
      it('should replace content atomically', async () => {
        // Given a file exists with old content
        const oldContent = 'Old content';
        fs.writeFileSync(testFilePath, oldContent);

        const newContent = 'New content';

        // When writing atomically
        await fileSystem.writeFileAtomic(testFilePath, newContent, { createIfMissing: true, overwrite: true });

        // Then content should be updated
        const writtenContent = fs.readFileSync(testFilePath, 'utf-8');
        expect(writtenContent).toBe(newContent);
        expect(writtenContent).not.toBe(oldContent);
      });
    });

    describe('When parent directory does not exist', () => {
      it('should create parent directory and write file', async () => {
        // Given parent directory does not exist
        const nestedPath = path.join(tempDir, 'nested', 'deep', 'file.txt');

        const content = 'Nested file content';

        // When writing atomically
        await fileSystem.writeFileAtomic(nestedPath, content, { createIfMissing: true, overwrite: true });

        // Then parent directories should be created
        expect(fs.existsSync(path.dirname(nestedPath))).toBe(true);

        // And file should exist with content
        expect(fs.existsSync(nestedPath)).toBe(true);
        const writtenContent = fs.readFileSync(nestedPath, 'utf-8');
        expect(writtenContent).toBe(content);
      });
    });

    describe('When writing with specific file mode', () => {
      it('should set file permissions correctly', async () => {
        // Given a file does not exist
        const content = 'File with permissions';

        // When writing with mode 0o755 (rwxr-xr-x)
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true, overwrite: true, mode: 0o755 });

        // Then file should have correct permissions
        const stats = fs.statSync(testFilePath);
        // On Unix systems, check if executable bit is set
        // Note: On some systems, umask may affect final permissions
        expect(stats.mode & 0o111).toBeGreaterThan(0); // At least some execute bits set
      });
    });

    describe('When writing UTF-8 content', () => {
      it('should write UTF-8 characters correctly', async () => {
        // Given UTF-8 content
        const content = 'UTF-8: 你好 こんにちは 🎉';

        // When writing atomically
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true, overwrite: true });

        // Then content should be preserved correctly
        const writtenContent = fs.readFileSync(testFilePath, 'utf-8');
        expect(writtenContent).toBe(content);
      });
    });

    describe('When writing large content', () => {
      it('should handle large files', async () => {
        // Given large content (1MB)
        const content = 'x'.repeat(1024 * 1024);

        // When writing atomically
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true, overwrite: true });

        // Then content should be written correctly
        const writtenContent = fs.readFileSync(testFilePath, 'utf-8');
        expect(writtenContent).toBe(content);
        expect(writtenContent.length).toBe(1024 * 1024);
      });
    });

    describe('When multiple atomic writes occur', () => {
      it('should ensure data integrity', async () => {
        // Given multiple writes to the same file
        const writes = Array(10)
          .fill(null)
          .map((_, i) => fileSystem.writeFileAtomic(testFilePath, `Write ${i}`, { createIfMissing: true, overwrite: true }));

        // When all writes complete
        await Promise.all(writes);

        // Then file should contain valid content (one of the writes)
        const content = fs.readFileSync(testFilePath, 'utf-8');
        expect(content).toMatch(/^Write \d$/);
      });
    });
  });

  // ==========================================================================
  // deleteFile() Tests
  // ==========================================================================

  describe('Scenario: Deleting files', () => {
    describe('When file exists', () => {
      it('should delete the file', async () => {
        // Given a file exists
        fs.writeFileSync(testFilePath, 'Content to delete');

        // When deleting the file
        await fileSystem.deleteFile(testFilePath);

        // Then file should no longer exist
        expect(fs.existsSync(testFilePath)).toBe(false);
      });
    });

    describe('When file does not exist', () => {
      it('should complete without error', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When deleting the file
        // Then it should not throw
        await expect(fileSystem.deleteFile(testFilePath)).resolves.toBeUndefined();
      });
    });

    describe('When deleting multiple times', () => {
      it('should be idempotent', async () => {
        // Given a file exists
        fs.writeFileSync(testFilePath, 'Content');

        // When deleting multiple times
        await fileSystem.deleteFile(testFilePath);
        await fileSystem.deleteFile(testFilePath);
        await fileSystem.deleteFile(testFilePath);

        // Then it should not throw and file should not exist
        expect(fs.existsSync(testFilePath)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // getFileMtime() Tests
  // ==========================================================================

  describe('Scenario: Getting file modification time', () => {
    describe('When file exists', () => {
      it('should return modification time in milliseconds', async () => {
        // Given a file exists
        fs.writeFileSync(testFilePath, 'content');
        const beforeTime = Date.now();

        // When getting modification time
        const mtime = await fileSystem.getFileMtime(testFilePath);

        const afterTime = Date.now();

        // Then it should return a valid timestamp
        expect(mtime).not.toBeNull();
        expect(mtime).toBeGreaterThan(0);
        expect(mtime).toBeGreaterThanOrEqual(beforeTime - 1000); // Allow 1s clock skew
        expect(mtime).toBeLessThanOrEqual(afterTime + 1000);
      });
    });

    describe('When file is modified', () => {
      it('should return updated modification time', async () => {
        // Given a file exists
        fs.writeFileSync(testFilePath, 'original');
        const originalMtime = await fileSystem.getFileMtime(testFilePath);

        // Wait a bit to ensure time difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        // When file is modified
        fs.writeFileSync(testFilePath, 'modified');
        const newMtime = await fileSystem.getFileMtime(testFilePath);

        // Then modification time should be updated
        expect(newMtime).toBeGreaterThan(originalMtime!);
      });
    });

    describe('When file does not exist', () => {
      it('should return null', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When getting modification time
        const result = await fileSystem.getFileMtime(testFilePath);

        // Then it should return null
        expect(result).toBeNull();
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Scenario: Handling file system errors', () => {
    describe('When reading file with permission denied', () => {
      it('should throw error', async () => {
        // Given a file with restricted permissions (Unix only)
        if (process.platform !== 'win32') {
          fs.writeFileSync(testFilePath, 'content');
          fs.chmodSync(testFilePath, 0o000); // No permissions

          // When reading the file
          // Then it should throw an error (not return null - permission denied is not ENOENT)
          await expect(fileSystem.readFile(testFilePath)).rejects.toThrow();

          // Cleanup: restore permissions for deletion
          fs.chmodSync(testFilePath, 0o644);
        }
      });
    });

    describe('When writing to read-only directory', () => {
      it('should throw error', async () => {
        // Given a read-only directory (Unix only)
        if (process.platform !== 'win32') {
          const readOnlyDir = path.join(tempDir, 'readonly');
          fs.mkdirSync(readOnlyDir);
          fs.chmodSync(readOnlyDir, 0o444); // Read-only

          const filePath = path.join(readOnlyDir, 'file.txt');

          // When writing to read-only directory
          // Then it should throw an error
          await expect(fileSystem.writeFileAtomic(filePath, 'content', { createIfMissing: true, overwrite: true })).rejects.toThrow();

          // Cleanup: restore permissions
          fs.chmodSync(readOnlyDir, 0o755);
        }
      });
    });
  });
});
