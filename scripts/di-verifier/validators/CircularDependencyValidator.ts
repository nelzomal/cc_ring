/**
 * Circular Dependency Validator
 *
 * Detects circular dependencies in the codebase using Tarjan's algorithm
 * implemented in the DependencyGraph module.
 */

import { DependencyGraph, DependencyCycle } from '../core/DependencyGraph';
import { ValidationResult } from '../types';

export class CircularDependencyValidator {
  constructor(private dependencyGraph: DependencyGraph) {}

  /**
   * Validate that there are no circular dependencies
   */
  validate(): ValidationResult {
    const cycles = this.dependencyGraph.findCircularDependencies();
    const warnings: string[] = [];
    const errors: string[] = [];

    if (cycles.length > 0) {
      errors.push(`\n❌ Found ${cycles.length} circular ${cycles.length === 1 ? 'dependency' : 'dependencies'}:`);

      for (const cycle of cycles) {
        errors.push(`\n   Cycle: ${cycle.description}`);
        errors.push(`   Files involved (${cycle.files.length}):`);

        cycle.files.forEach((file, index) => {
          const shortPath = this.getRelativePath(file);
          errors.push(`     ${index + 1}. ${shortPath}`);
        });

        errors.push('');
      }
    }

    return {
      passed: cycles.length === 0,
      warnings,
      errors,
      items: cycles,
    };
  }

  /**
   * Get relative path from src directory
   */
  private getRelativePath(filePath: string): string {
    const srcIndex = filePath.indexOf('/src/');
    if (srcIndex !== -1) {
      return filePath.substring(srcIndex + 1);
    }
    return filePath.split('/').slice(-3).join('/'); // Last 3 segments
  }
}
