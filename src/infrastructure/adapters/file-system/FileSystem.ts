import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import { IFileSystem } from "@application/ports/IFileSystem";
import writeFileAtomicLib from "write-file-atomic";

/**
 * File system implementation
 * Adapts Node.js fs module to application layer interface
 */
export class FileSystem implements IFileSystem {
  async writeFileAtomic(
    filePath: string,
    content: string,
    options: { createIfMissing: true; overwrite: true; mode?: number }
  ): Promise<void> {
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);

    const writeOptions: writeFileAtomicLib.Options = {
      encoding: "utf-8",
      ...(options?.mode !== undefined && { mode: options.mode }),
    };

    await writeFileAtomicLib(filePath, content, writeOptions);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (this.fileExists(filePath)) {
      await fsPromises.unlink(filePath);
    }
  }

  async readFile(
    filePath: string,
    encoding: BufferEncoding = "utf-8"
  ): Promise<string | null> {
    try {
      return await fsPromises.readFile(filePath, encoding);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async getFileMtime(filePath: string): Promise<number | null> {
    try {
      const stats = await fsPromises.stat(filePath);
      return stats.mtimeMs;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private fileExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  private async ensureDir(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }
}
