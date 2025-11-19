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
  // fileExists() Tests
  // ==========================================================================

  describe('Scenario: Checking file existence', () => {
    describe('When file exists', () => {
      it('should return true', () => {
        // Given a file exists
        fs.writeFileSync(testFilePath, 'test content');

        // When checking if file exists
        const result = fileSystem.fileExists(testFilePath);

        // Then it should return true
        expect(result).toBe(true);
      });
    });

    describe('When file does not exist', () => {
      it('should return false', () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When checking if file exists
        const result = fileSystem.fileExists(testFilePath);

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe('When directory exists instead of file', () => {
      it('should return true (directory is considered existing path)', () => {
        // Given a directory exists at the path
        fs.mkdirSync(testFilePath);

        // When checking if path exists
        const result = fileSystem.fileExists(testFilePath);

        // Then it should return true (existsSync returns true for directories)
        expect(result).toBe(true);
      });
    });

    describe('When path is in non-existent directory', () => {
      it('should return false', () => {
        // Given a path in a non-existent directory
        const nonExistentPath = path.join(tempDir, 'nonexistent', 'file.txt');

        // When checking if file exists
        const result = fileSystem.fileExists(nonExistentPath);

        // Then it should return false
        expect(result).toBe(false);
      });
    });
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
      it('should throw error', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When reading the file
        // Then it should throw an error
        await expect(fileSystem.readFile(testFilePath)).rejects.toThrow();
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
  // readFileSync() Tests
  // ==========================================================================

  describe('Scenario: Reading file content synchronously', () => {
    describe('When file exists', () => {
      it('should return file content synchronously', () => {
        // Given a file with content
        const content = 'Synchronous read';
        fs.writeFileSync(testFilePath, content);

        // When reading the file synchronously
        const result = fileSystem.readFileSync(testFilePath);

        // Then it should return the content
        expect(result).toBe(content);
      });
    });

    describe('When file does not exist', () => {
      it('should throw error', () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When reading the file synchronously
        // Then it should throw an error
        expect(() => fileSystem.readFileSync(testFilePath)).toThrow();
      });
    });
  });

  // ==========================================================================
  // writeFileAtomic() Tests
  // ==========================================================================

  describe('Scenario: Writing file atomically', () => {
    describe('When writing to new file', () => {
      it('should create file with content', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        const content = 'New file content';

        // When writing atomically
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true });

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
        await fileSystem.writeFileAtomic(testFilePath, newContent, { createIfMissing: true });

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
        await fileSystem.writeFileAtomic(nestedPath, content, { createIfMissing: true });

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
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true, mode: 0o755 });

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
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true });

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
        await fileSystem.writeFileAtomic(testFilePath, content, { createIfMissing: true });

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
          .map((_, i) => fileSystem.writeFileAtomic(testFilePath, `Write ${i}`, { createIfMissing: true }));

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
  // ensureDir() Tests
  // ==========================================================================

  describe('Scenario: Ensuring directory exists', () => {
    describe('When directory does not exist', () => {
      it('should create the directory', async () => {
        // Given a directory does not exist
        const dirPath = path.join(tempDir, 'new-dir');

        // When ensuring directory exists
        await fileSystem.ensureDir(dirPath);

        // Then directory should exist
        expect(fs.existsSync(dirPath)).toBe(true);
        expect(fs.statSync(dirPath).isDirectory()).toBe(true);
      });
    });

    describe('When directory already exists', () => {
      it('should complete without error', async () => {
        // Given a directory exists
        const dirPath = path.join(tempDir, 'existing-dir');
        fs.mkdirSync(dirPath);

        // When ensuring directory exists
        // Then it should not throw
        await expect(fileSystem.ensureDir(dirPath)).resolves.toBeUndefined();

        // And directory should still exist
        expect(fs.existsSync(dirPath)).toBe(true);
      });
    });

    describe('When creating nested directories', () => {
      it('should create all parent directories', async () => {
        // Given nested directory path does not exist
        const nestedPath = path.join(tempDir, 'level1', 'level2', 'level3');

        // When ensuring nested directory exists
        await fileSystem.ensureDir(nestedPath);

        // Then all directories should be created
        expect(fs.existsSync(nestedPath)).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'level1'))).toBe(true);
        expect(fs.existsSync(path.join(tempDir, 'level1', 'level2'))).toBe(true);
      });
    });
  });

  // ==========================================================================
  // writeConfigFile() Tests
  // ==========================================================================

  describe('Scenario: Writing JSON configuration files', () => {
    describe('When writing object as JSON', () => {
      it('should serialize and write JSON with formatting', async () => {
        // Given a configuration object
        const config = {
          name: 'CC Ring',
          version: '1.0.0',
          settings: {
            enabled: true,
            volume: 100,
          },
        };

        // When writing config file
        await fileSystem.writeConfigFile(testFilePath, config);

        // Then file should exist
        expect(fs.existsSync(testFilePath)).toBe(true);

        // And content should be formatted JSON
        const content = fs.readFileSync(testFilePath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed).toEqual(config);

        // And should have indentation (pretty printed)
        expect(content).toContain('  '); // 2-space indentation
      });
    });

    describe('When writing complex nested object', () => {
      it('should handle nested structures', async () => {
        // Given a complex nested object
        const config = {
          hooks: {
            Stop: [
              {
                hooks: [
                  {
                    type: 'command',
                    command: '/path/to/script.sh',
                    timeout: 5,
                  },
                ],
              },
            ],
          },
        };

        // When writing config file
        await fileSystem.writeConfigFile(testFilePath, config);

        // Then content should be correctly serialized
        const content = fs.readFileSync(testFilePath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed).toEqual(config);
      });
    });

    describe('When writing empty object', () => {
      it('should write empty JSON object', async () => {
        // Given an empty object
        const config = {};

        // When writing config file
        await fileSystem.writeConfigFile(testFilePath, config);

        // Then file should contain empty object
        const content = fs.readFileSync(testFilePath, 'utf-8');
        expect(content.trim()).toBe('{}');
      });
    });

    describe('When parent directory does not exist', () => {
      it('should create directory and write file', async () => {
        // Given parent directory does not exist
        const configPath = path.join(tempDir, 'config', 'settings.json');

        const config = { test: true };

        // When writing config file
        await fileSystem.writeConfigFile(configPath, config);

        // Then directory and file should be created
        expect(fs.existsSync(configPath)).toBe(true);
        const content = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(content);
        expect(parsed).toEqual(config);
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
        expect(newMtime).toBeGreaterThan(originalMtime);
      });
    });

    describe('When file does not exist', () => {
      it('should throw error', async () => {
        // Given a file does not exist
        // (no file created in beforeEach)

        // When getting modification time
        // Then it should throw an error
        await expect(fileSystem.getFileMtime(testFilePath)).rejects.toThrow();
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
          // Then it should throw an error
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
          await expect(fileSystem.writeFileAtomic(filePath, 'content', { createIfMissing: true })).rejects.toThrow();

          // Cleanup: restore permissions
          fs.chmodSync(readOnlyDir, 0o755);
        }
      });
    });
  });
});
