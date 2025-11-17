/**
 * Validates that bound symbols are actually used in the codebase
 */

import { IValidator, DetailedValidationResult } from '../types';
import { ContainerParser } from '../core/ContainerParser';
import { FileScanner } from '../core/FileScanner';
import { CONTAINER_PATH } from '../constants';

export class UsageValidator implements IValidator {
  private parser: ContainerParser;
  private scanner: FileScanner;

  constructor(parser: ContainerParser, scanner: FileScanner) {
    this.parser = parser;
    this.scanner = scanner;
  }

  validate(): DetailedValidationResult {
    const boundSymbols = this.parser.extractBoundSymbols();
    const unused: string[] = [];

    for (const symbol of boundSymbols) {
      if (!this.isSymbolUsed(symbol)) {
        unused.push(`TYPES.${symbol}`);
      }
    }

    const warnings = unused.length > 0
      ? unused.map(item => `⚠️  ${item} is bound but never used`)
      : [];

    return {
      passed: true, // This is a warning, not an error
      warnings,
      errors: [],
      items: unused,
    };
  }

  /**
   * Check if a symbol is used anywhere in the codebase
   */
  private isSymbolUsed(symbol: string): boolean {
    // First check if used in container.ts via container.get()
    if (this.parser.isSymbolUsedInContainer(symbol)) {
      return true;
    }

    // Then search the rest of the codebase
    return this.scanner.searchForSymbolUsage(symbol, CONTAINER_PATH);
  }
}
