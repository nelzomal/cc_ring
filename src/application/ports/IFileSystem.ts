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
   * Atomically write content to a file.
   *
   * @param options.createIfMissing Must be true - documents that file will be created if missing
   * @param options.overwrite Must be true - documents that existing file will be replaced
   * @param options.mode Optional file mode (permissions) to set, e.g., 0o755 for executable
   */
  writeFileAtomic(
    path: string,
    content: string,
    options: { createIfMissing: true; overwrite: true; mode?: number }
  ): Promise<void>;

  /**
   * Delete a file
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Read file contents.
   * Returns null if file does not exist.
   */
  readFile(path: string, encoding?: BufferEncoding): Promise<string | null>;

  /**
   * Get file modification time in milliseconds since epoch.
   * Returns null if file does not exist.
   * Used for conflict detection.
   */
  getFileMtime(path: string): Promise<number | null>;
}
