/**
 * Validates Clean Architecture layer dependency rules
 *
 * Enhanced with AST-based dependency graph analysis for accuracy
 */

import * as fs from 'fs';
import * as path from 'path';
import { IValidator, ValidationResult, Layer } from '../types';
import { LayerDetector } from '../core/LayerDetector';
import { LAYER_RULES, PATTERNS, SRC_DIR, TEST_FILE_SUFFIX, TS_FILE_EXTENSION } from '../constants';
import { DependencyGraph, LayerViolation } from '../core/DependencyGraph';

export class LayerDependencyValidator implements IValidator {
  private layerDetector: LayerDetector;
  private dependencyGraph?: DependencyGraph;

  constructor(layerDetector: LayerDetector, dependencyGraph?: DependencyGraph) {
    this.layerDetector = layerDetector;
    this.dependencyGraph = dependencyGraph;
  }

  validate(): ValidationResult {
    const errors: string[] = [];

    // If dependency graph is available, use AST-based validation (more accurate)
    if (this.dependencyGraph) {
      const violations = this.dependencyGraph.validateLayerDependencies();

      if (violations.length > 0) {
        errors.push(`\n❌ Found ${violations.length} layer dependency ${violations.length === 1 ? 'violation' : 'violations'}:`);

        violations.forEach((violation, index) => {
          errors.push(`\n   ${index + 1}. ${violation.description}`);
        });
      }
    } else {
      // Fallback to regex-based validation
      this.scanDirectory(SRC_DIR, errors);
    }

    return {
      passed: errors.length === 0,
      warnings: [],
      errors,
    };
  }

  /**
   * Scan directory for layer dependency violations
   */
  private scanDirectory(dir: string, errors: string[]): void {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.scanDirectory(filePath, errors);
      } else if (file.endsWith(TS_FILE_EXTENSION) && !file.endsWith(TEST_FILE_SUFFIX)) {
        this.checkFileImports(filePath, errors);
      }
    }
  }

  /**
   * Check imports in a single file for violations
   */
  private checkFileImports(filePath: string, errors: string[]): void {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileLayer = this.layerDetector.getLayerFromPath(filePath);

    if (fileLayer === 'unknown') {
      return;
    }

    const importMatches = content.matchAll(PATTERNS.IMPORT);

    for (const match of importMatches) {
      const importPath = match[1];
      const importedLayer = this.layerDetector.extractLayerFromImport(importPath);

      if (!importedLayer) {
        continue;
      }

      // Check if this import is allowed
      const allowedLayers = LAYER_RULES[fileLayer];
      if (!allowedLayers.includes(importedLayer)) {
        const relativePath = path.relative(SRC_DIR, filePath);
        errors.push(
          `❌ ${relativePath}: ${fileLayer} layer importing from ${importedLayer} layer (${importPath})`
        );
      }
    }
  }
}
