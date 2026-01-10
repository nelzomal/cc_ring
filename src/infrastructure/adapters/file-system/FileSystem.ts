import * as fs from "fs";
import * as fsPromises from "fs/promises";
import * as path from "path";
import writeFileAtomic from "write-file-atomic";
import { IFileSystem } from "@application/ports/IFileSystem";

/**
 * File system implementation
 * Adapts Node.js fs module to application layer interface
 */
export class FileSystem implements IFileSystem {
  async writeFileAtomic(
    filePath: string,
    content: string,
    options: { createIfMissing: true; mode?: number }
  ): Promise<void> {
    // AI_FIXME need to check createIfMissing
    const dir = path.dirname(filePath);
    await this.ensureDir(dir);

    const writeOptions: writeFileAtomic.Options = {
      encoding: "utf-8",
      ...(options?.mode !== undefined && { mode: options.mode }),
    };

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

  // AI_FIXME: do we need both async and sync versions?
  async readFile(
    filePath: string,
    encoding: BufferEncoding = "utf-8"
  ): Promise<string> {
    return await fsPromises.readFile(filePath, encoding);
  }

  readFileSync(filePath: string, encoding: BufferEncoding = "utf-8"): string {
    return fs.readFileSync(filePath, encoding);
  }

  // AI_FIXME do we need to expose this?
  async ensureDir(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await fsPromises.mkdir(dirPath, { recursive: true });
    }
  }

  // AI_FIXME: unify with writeFileAtomic?
  async writeConfigFile(filePath: string, content: object): Promise<void> {
    const jsonContent = JSON.stringify(content, null, 2);
    await this.writeFileAtomic(filePath, jsonContent, {
      createIfMissing: true,
    });
  }

  async getFileMtime(filePath: string): Promise<number> {
    const stats = await fsPromises.stat(filePath);
    return stats.mtimeMs;
  }
}
