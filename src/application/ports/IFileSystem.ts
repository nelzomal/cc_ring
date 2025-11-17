/**
 * File system operations port
 *
 * This is an outbound port (Hexagonal Architecture) that defines the contract
 * for file system operations. Infrastructure adapters implement this interface.
 *
 * Location: src/application/ports/
 */
export interface IFileSystem {
  /**
   * Write content to a file atomically using temp file + rename
   * Prevents corruption from crashes or interruptions
   * Uses write-file-atomic package for robust atomic writes
   * @param options Optional settings for the write operation
   * @param options.mode Optional file mode (permissions) to set, e.g., 0o755 for executable
   */
  writeFileAtomic(path: string, content: string, options?: { mode?: number }): Promise<void>;

  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Check if a file exists
   */
  fileExists(path: string): boolean;

  /**
   * Read file contents
   */
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;

  /**
   * Read file contents synchronously
   */
  readFileSync(path: string, encoding?: BufferEncoding): string;

  /**
   * Ensure directory exists, create if needed
   */
  ensureDir(path: string): Promise<void>;

  /**
   * Write JSON content to a file atomically
   * Serializes object to JSON with proper formatting
   */
  writeConfigFile(path: string, content: object): Promise<void>;

  /**
   * Get file modification time in milliseconds since epoch
   * Used for conflict detection
   */
  getFileMtime(path: string): Promise<number>;
}
