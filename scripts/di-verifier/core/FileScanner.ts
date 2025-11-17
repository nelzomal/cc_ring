/**
 * Unified file scanning utility for directory traversal
 */

import * as fs from 'fs';
import * as path from 'path';
import { PATTERNS, SRC_DIR, TEST_FILE_SUFFIX, TS_FILE_EXTENSION } from '../constants';

export class FileScanner {
  /**
   * Scan for classes decorated with @injectable()
   */
  scanForInjectableClasses(baseDir: string = SRC_DIR): Map<string, string> {
    const injectableClasses = new Map<string, string>();

    this.scanDirectory(baseDir, (filePath, content) => {
      const classMatches = content.matchAll(PATTERNS.INJECTABLE_CLASS);
      for (const match of classMatches) {
        const className = match[1];
        const relativePath = path.relative(SRC_DIR, filePath);
        injectableClasses.set(className, relativePath);
      }
    });

    return injectableClasses;
  }

  /**
   * Scan for exported interfaces starting with I
   */
  scanForInterfaces(baseDir: string = SRC_DIR): Map<string, string> {
    const interfaces = new Map<string, string>();

    this.scanDirectory(baseDir, (filePath, content) => {
      const interfaceMatches = content.matchAll(PATTERNS.EXPORTED_INTERFACE);
      for (const match of interfaceMatches) {
        const interfaceName = match[1];
        const relativePath = path.relative(SRC_DIR, filePath);
        interfaces.set(interfaceName, relativePath);
      }
    });

    return interfaces;
  }

  /**
   * Search for usage of a specific symbol in the codebase
   */
  searchForSymbolUsage(symbol: string, excludePath?: string, baseDir: string = SRC_DIR): boolean {
    let found = false;

    this.scanDirectory(baseDir, (filePath, content) => {
      if (excludePath && filePath === excludePath) {
        return;
      }

      if (content.includes(`TYPES.${symbol}`)) {
        if (content.includes(`@inject(TYPES.${symbol})`) ||
            content.includes(`container.get`) ||
            content.includes(`.get<`)) {
          found = true;
        }
      }
    });

    return found;
  }

  /**
   * Get all TypeScript files (excluding tests) in a directory
   */
  getAllTypeScriptFiles(baseDir: string = SRC_DIR): string[] {
    const files: string[] = [];

    this.scanDirectory(baseDir, (filePath) => {
      files.push(filePath);
    });

    return files;
  }

  /**
   * Generic directory scanner with callback
   */
  private scanDirectory(
    dir: string,
    callback: (filePath: string, content: string) => void
  ): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.scanDirectory(filePath, callback);
      } else if (this.isValidTypeScriptFile(file)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        callback(filePath, content);
      }
    }
  }

  /**
   * Check if file is a valid TypeScript file (not a test)
   */
  private isValidTypeScriptFile(filename: string): boolean {
    return filename.endsWith(TS_FILE_EXTENSION) && !filename.endsWith(TEST_FILE_SUFFIX);
  }
}
