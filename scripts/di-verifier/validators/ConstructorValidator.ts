/**
 * Constructor Validator
 *
 * Validates that domain value objects and entities use private constructors
 * with factory methods, enforcing immutability and controlled instantiation.
 */

import { ASTParser } from '../core/ASTParser';
import { ValidationResult } from '../types';
import * as path from 'path';

export interface ConstructorViolation {
  filePath: string;
  className: string;
  issue: 'missing-private-constructor' | 'missing-factory-method';
  description: string;
}

export class ConstructorValidator {
  // Directories where private constructors are expected
  // Note: entities/ directory is excluded because aggregates may need DI
  private readonly DOMAIN_DIRS = [
    '/domain/valueObjects/',
  ];

  constructor(private parser: ASTParser) {}

  /**
   * Validate constructor visibility in domain classes
   */
  validate(): ValidationResult {
    const violations: ConstructorViolation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const sourceFiles = this.parser.getAllSourceFiles();

    for (const filePath of sourceFiles) {
      // Only check domain value objects and entities
      if (!this.isDomainClass(filePath)) {
        continue;
      }

      const classes = this.parser.parseFile(filePath);

      for (const classInfo of classes) {
        // Check for private constructor
        if (!classInfo.hasPrivateConstructor) {
          violations.push({
            filePath,
            className: classInfo.name,
            issue: 'missing-private-constructor',
            description: `${classInfo.name} should use private constructor`,
          });

          errors.push(
            `❌ ${this.getRelativePath(filePath)} - ${classInfo.name} should use private constructor`
          );
        }

        // Check for static factory methods
        if (classInfo.hasPrivateConstructor && classInfo.staticMethods.length === 0) {
          violations.push({
            filePath,
            className: classInfo.name,
            issue: 'missing-factory-method',
            description: `${classInfo.name} has private constructor but no static factory methods`,
          });

          warnings.push(
            `⚠️  ${this.getRelativePath(filePath)} - ${classInfo.name} has private constructor but no static factory methods`
          );
        }
      }
    }

    return {
      passed: violations.filter(v => v.issue === 'missing-private-constructor').length === 0,
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
