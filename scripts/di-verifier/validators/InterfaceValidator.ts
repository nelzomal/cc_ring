/**
 * Validates that interfaces are used in the container
 */

import { IValidator, DetailedValidationResult } from '../types';
import { FileScanner } from '../core/FileScanner';
import { ContainerParser } from '../core/ContainerParser';

export class InterfaceValidator implements IValidator {
  private scanner: FileScanner;
  private parser: ContainerParser;

  constructor(scanner: FileScanner, parser: ContainerParser) {
    this.scanner = scanner;
    this.parser = parser;
  }

  validate(): DetailedValidationResult {
    const allInterfaces = this.scanner.scanForInterfaces();
    const unusedInterfaces: string[] = [];

    for (const [interfaceName, filePath] of allInterfaces) {
      if (!this.parser.includesInterface(interfaceName)) {
        unusedInterfaces.push(`${interfaceName} (${filePath})`);
      }
    }

    const warnings = unusedInterfaces.length > 0
      ? unusedInterfaces.map(item => `ℹ️  ${item}`)
      : [];

    return {
      passed: true, // This is informational, not an error
      warnings,
      errors: [],
      items: unusedInterfaces,
    };
  }
}
