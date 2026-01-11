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
   * @param options.createIfMissing Must be true - documents that file will be created if missing
   * @param options.mode Optional file mode (permissions) to set, e.g., 0o755 for executable
   */
  writeFileAtomic(
    path: string,
    content: string,
    options: { createIfMissing: true; mode?: number }
  ): Promise<void>;

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
