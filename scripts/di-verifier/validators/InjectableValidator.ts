/**
 * Validates that all @injectable classes are registered in the container
 */

import { IValidator, DetailedValidationResult, BindingInfo } from '../types';
import { FileScanner } from '../core/FileScanner';

export class InjectableValidator implements IValidator {
  private scanner: FileScanner;
  private registeredClasses: Set<string>;

  constructor(scanner: FileScanner, bindings: BindingInfo[]) {
    this.scanner = scanner;
    this.registeredClasses = new Set(bindings.map(b => b.concreteType));
  }

  validate(): DetailedValidationResult {
    const injectableClasses = this.scanner.scanForInjectableClasses();
    const unregistered: string[] = [];

    for (const [className, filePath] of injectableClasses) {
      if (!this.registeredClasses.has(className)) {
        unregistered.push(`${className} (${filePath})`);
      }
    }

    const warnings = unregistered.length > 0
      ? unregistered.map(item => `⚠️  ${item}`)
      : [];

    return {
      passed: true, // This is a warning, not an error
      warnings,
      errors: [],
      items: unregistered,
    };
  }
}
