/**
 * Factory Validator
 *
 * Validates that domain classes with private constructors provide
 * appropriate static factory methods following naming conventions.
 */

import { ASTParser } from '../core/ASTParser';
import { ValidationResult } from '../types';
import * as path from 'path';

export interface FactoryViolation {
  filePath: string;
  className: string;
  staticMethods: string[];
  suggestion: string;
}

export class FactoryValidator {
  // Common factory method naming patterns
  private readonly FACTORY_PATTERNS = [
    /^create/,
    /^from/,
    /^of/,
    /^build/,
    /^make/,
  ];

  private readonly DOMAIN_DIRS = [
    '/domain/valueObjects/',
    // entities/ excluded - aggregates may need DI
  ];

  constructor(private parser: ASTParser) {}

  /**
   * Validate factory method patterns
   */
  validate(): ValidationResult {
    const violations: FactoryViolation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const sourceFiles = this.parser.getAllSourceFiles();

    for (const filePath of sourceFiles) {
      if (!this.isDomainClass(filePath)) {
        continue;
      }

      const classes = this.parser.parseFile(filePath);

      for (const classInfo of classes) {
        // Only check classes with private constructors
        if (!classInfo.hasPrivateConstructor) {
          continue;
        }

        // Check if factory methods follow conventions
        const hasFactoryMethod = classInfo.staticMethods.some(method =>
          this.FACTORY_PATTERNS.some(pattern => pattern.test(method))
        );

        if (!hasFactoryMethod && classInfo.staticMethods.length > 0) {
          violations.push({
            filePath,
            className: classInfo.name,
            staticMethods: classInfo.staticMethods,
            suggestion: `Consider renaming static methods to follow factory conventions (create*, from*, of*, etc.)`,
          });

          warnings.push(
            `⚠️  ${this.getRelativePath(filePath)} - ${classInfo.name} has static methods ${classInfo.staticMethods.join(', ')} but they don't follow factory naming conventions`
          );
        }
      }
    }

    return {
      passed: true, // Warnings only, not errors
      warnings,
      errors,
      items: violations,
    };
  }

  /**
   * Check if file is in domain layer
   */
  private isDomainClass(filePath: string): boolean {
    const normalized = filePath.replace(/\\/g, '/');
    return this.DOMAIN_DIRS.some(dir => normalized.includes(dir));
  }

  /**
   * Get relative path from src directory
   */
  private getRelativePath(filePath: string): string {
    const srcIndex = filePath.indexOf('/src/');
    if (srcIndex !== -1) {
      return filePath.substring(srcIndex + 1);
    }
    return path.basename(filePath);
  }
}
