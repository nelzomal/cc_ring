/**
 * Instantiation Validator
 *
 * Validates that services/repositories/use cases are not instantiated
 * with 'new' keyword outside the DI container.
 *
 * Uses AST-based detection for accuracy.
 */

import { ASTParser, NewExpressionInfo } from '../core/ASTParser';
import { FileScanner } from '../core/FileScanner';
import { ValidationResult } from '../types';
import * as path from 'path';

export interface InstantiationViolation {
  filePath: string;
  className: string;
  line: number;
  text: string;
}

export class InstantiationValidator {
  // Patterns that indicate a class should be created via DI
  private readonly SERVICE_PATTERNS = [
    /UseCase$/,
    /Repository$/,
    /Service$/,
    /Player$/,
    /Provider$/,
    /Command$/,
    /View$/,
    /Adapter$/,
    /Writer$/,
    /Mapper$/,
    /Generator$/,
    /Validator$/,
  ];

  // Files where instantiation is allowed
  private readonly ALLOWED_FILES = [
    'container.ts',
    'container.test.ts',
    '.spec.ts',
    '.test.ts',
  ];

  constructor(
    private parser: ASTParser,
    private scanner: FileScanner
  ) {}

  /**
   * Validate that services are not instantiated outside container
   */
  validate(): ValidationResult {
    const violations: InstantiationViolation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const sourceFiles = this.parser.getAllSourceFiles();

    for (const filePath of sourceFiles) {
      // Skip allowed files
      if (this.isAllowedFile(filePath)) {
        continue;
      }

      // Find all 'new' expressions matching service patterns
      const servicePattern = new RegExp(
        this.SERVICE_PATTERNS.map(p => p.source).join('|')
      );

      const newExpressions = this.parser.findNewExpressions(filePath, servicePattern);

      for (const expr of newExpressions) {
        violations.push({
          filePath: expr.filePath,
          className: expr.className,
          line: expr.line,
          text: expr.text,
        });

        errors.push(
          `❌ ${this.getRelativePath(expr.filePath)}:${expr.line} - Service instantiation with 'new' outside container: ${expr.className}`
        );
      }
    }

    return {
      passed: violations.length === 0,
      warnings,
      errors,
      items: violations,
    };
  }

  /**
   * Check if a file is allowed to instantiate services
   */
  private isAllowedFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    return this.ALLOWED_FILES.some(pattern => fileName.includes(pattern));
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
