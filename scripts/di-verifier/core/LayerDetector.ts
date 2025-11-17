/**
 * Utility for detecting architectural layers
 */

import { Layer } from '../types';
import { PATTERNS } from '../constants';

export class LayerDetector {
  /**
   * Determine the layer of a class based on its import path in container content
   */
  getLayerFromClassName(className: string, containerContent: string): Layer {
    const importRegex = PATTERNS.CLASS_IMPORT(className);
    const match = containerContent.match(importRegex);

    if (!match) {
      return 'unknown';
    }

    return this.getLayerFromPath(match[1]);
  }

  /**
   * Determine layer from a file path
   */
  getLayerFromPath(filePath: string): Layer {
    if (filePath.includes('/infrastructure/')) return 'infrastructure';
    if (filePath.includes('/application/')) return 'application';
    if (filePath.includes('/domain/')) return 'domain';
    if (filePath.includes('/presentation/')) return 'presentation';
    if (filePath.includes('/shared/')) return 'shared';
    return 'unknown';
  }

  /**
   * Extract layer from an import statement
   */
  extractLayerFromImport(importPath: string): Layer | null {
    if (importPath.includes('/domain/')) return 'domain';
    if (importPath.includes('/application/')) return 'application';
    if (importPath.includes('/infrastructure/')) return 'infrastructure';
    if (importPath.includes('/presentation/')) return 'presentation';
    if (importPath.includes('/shared/')) return 'shared';
    return null;
  }
}
