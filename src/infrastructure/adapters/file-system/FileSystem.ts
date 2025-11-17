import { injectable } from 'inversify';
import 'reflect-metadata';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import writeFileAtomic from 'write-file-atomic';
import { IFileSystem } from '../../../application/ports/IFileSystem';

/**
 * File system implementation
 * Adapts Node.js fs module to application layer interface
 */
@injectable()
export class FileSystem implements IFileSystem {
  async writeFileAtomic(filePath: string, content: string, options?: { mode?: number }): Promise<void> {
    // Ensure parent directory exists (write-file-atomic doesn't do this)
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);

    // Merge default encoding with optional mode setting
    const writeOptions: writeFileAtomic.Options = {
      encoding: 'utf-8',
      ...(options?.mode !== undefined && { mode: options.mode })
    };

    // Use write-file-atomic package for robust atomic writes
    // Handles temp file creation, fsync, atomic rename, and cleanup
    // If mode is provided, file permissions are set atomically during write
    await writeFileAtomic(filePath, content, writeOptions);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.fileExists(filePath)) {
      await fsPromises.unlink(filePath);
    }
  }

  fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return await fsPromises.readFile(filePath, encoding);
  }

  readFileSync(filePath: string, encoding: BufferEncoding = 'utf-8'): string {
    return fs.readFileSync(filePath, encoding);
  }

  async ensureDir(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }

  async writeConfigFile(filePath: string, content: object): Promise<void> {
    const jsonContent = JSON.stringify(content, null, 2);
    await this.writeFileAtomic(filePath, jsonContent);
  }

  async getFileMtime(filePath: string): Promise<number> {
    const stats = await fsPromises.stat(filePath);
    return stats.mtimeMs;
  }
}
