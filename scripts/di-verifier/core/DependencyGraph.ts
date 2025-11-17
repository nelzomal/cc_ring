/**
 * Dependency Graph Builder and Analyzer
 *
 * Builds a graph of file dependencies based on import statements
 * and provides analysis capabilities:
 * - Circular dependency detection (Tarjan's algorithm)
 * - Layer dependency validation
 * - Dependency path finding
 */

import { ASTParser, ImportInfo } from './ASTParser';
import * as path from 'path';

export interface GraphNode {
  filePath: string;
  imports: string[];
  importedBy: string[];
  layer?: string;
}

export interface DependencyCycle {
  files: string[];
  description: string;
}

export interface LayerViolation {
  from: string;
  to: string;
  fromLayer: string;
  toLayer: string;
  description: string;
}

export class DependencyGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: ImportInfo[] = [];

  constructor(private parser: ASTParser) {}

  /**
   * Build the dependency graph from all source files
   */
  build(sourceFiles: string[]): void {
    // Initialize nodes
    for (const filePath of sourceFiles) {
      this.nodes.set(filePath, {
        filePath,
        imports: [],
        importedBy: [],
        layer: this.detectLayer(filePath),
      });
    }

    // Build edges
    for (const filePath of sourceFiles) {
      const imports = this.parser.getImports(filePath);

      for (const importInfo of imports) {
        if (importInfo.isRelative) {
          this.edges.push(importInfo);

          // Update nodes
          const fromNode = this.nodes.get(importInfo.from);
          const toNode = this.nodes.get(importInfo.to);

          if (fromNode && !fromNode.imports.includes(importInfo.to)) {
            fromNode.imports.push(importInfo.to);
          }

          if (toNode && !toNode.importedBy.includes(importInfo.from)) {
            toNode.importedBy.push(importInfo.from);
          }
        }
      }
    }
  }

  /**
   * Detect which architectural layer a file belongs to
   */
  private detectLayer(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');

    if (normalized.includes('/domain/')) return 'domain';
    if (normalized.includes('/application/')) return 'application';
    if (normalized.includes('/infrastructure/')) return 'infrastructure';
    if (normalized.includes('/presentation/')) return 'presentation';

    return 'unknown';
  }

  /**
   * Find circular dependencies using Tarjan's strongly connected components algorithm
   */
  findCircularDependencies(): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const index = new Map<string, number>();
    const lowlink = new Map<string, number>();
    const onStack = new Set<string>();
    const stack: string[] = [];
    let currentIndex = 0;

    const strongConnect = (node: string) => {
      index.set(node, currentIndex);
      lowlink.set(node, currentIndex);
      currentIndex++;
      stack.push(node);
      onStack.add(node);

      const graphNode = this.nodes.get(node);
      if (graphNode) {
        for (const dependency of graphNode.imports) {
          if (!this.nodes.has(dependency)) continue;

          if (!index.has(dependency)) {
            strongConnect(dependency);
            lowlink.set(node, Math.min(lowlink.get(node)!, lowlink.get(dependency)!));
          } else if (onStack.has(dependency)) {
            lowlink.set(node, Math.min(lowlink.get(node)!, index.get(dependency)!));
          }
        }
      }

      // If node is a root node, pop the stack and generate an SCC
      if (lowlink.get(node) === index.get(node)) {
        const component: string[] = [];
        let w: string;

        do {
          w = stack.pop()!;
          onStack.delete(w);
          component.push(w);
        } while (w !== node);

        // Only report cycles with more than one node
        if (component.length > 1) {
          cycles.push({
            files: component.reverse(),
            description: this.formatCycleDescription(component),
          });
        }
      }
    };

    // Run algorithm on all nodes
    for (const node of this.nodes.keys()) {
      if (!index.has(node)) {
        strongConnect(node);
      }
    }

    return cycles;
  }

  /**
   * Format cycle description for readability
   */
  private formatCycleDescription(files: string[]): string {
    const shortNames = files.map(f => this.getShortPath(f));
    return shortNames.join(' → ') + ' → ' + shortNames[0];
  }

  /**
   * Get short relative path for display
   */
  private getShortPath(filePath: string): string {
    const srcIndex = filePath.indexOf('/src/');
    if (srcIndex !== -1) {
      return filePath.substring(srcIndex + 1);
    }
    return path.basename(filePath);
  }

  /**
   * Validate layer dependencies according to Clean Architecture rules
   */
  validateLayerDependencies(): LayerViolation[] {
    const violations: LayerViolation[] = [];

    // Define forbidden dependencies (outer layer → inner layer is forbidden)
    const forbiddenDependencies = new Map<string, Set<string>>([
      ['domain', new Set(['application', 'infrastructure', 'presentation'])],
      ['application', new Set(['infrastructure', 'presentation'])],
      ['infrastructure', new Set(['presentation'])],
    ]);

    for (const edge of this.edges) {
      const fromNode = this.nodes.get(edge.from);
      const toNode = this.nodes.get(edge.to);

      if (!fromNode || !toNode) continue;
      if (fromNode.layer === 'unknown' || toNode.layer === 'unknown') continue;

      const forbidden = forbiddenDependencies.get(fromNode.layer!);
      if (forbidden && forbidden.has(toNode.layer!)) {
        violations.push({
          from: edge.from,
          to: edge.to,
          fromLayer: fromNode.layer!,
          toLayer: toNode.layer!,
          description: `${this.getShortPath(edge.from)} (${fromNode.layer}) should not depend on ${this.getShortPath(edge.to)} (${toNode.layer})`,
        });
      }
    }

    return violations;
  }

  /**
   * Get all nodes in the graph
   */
  getNodes(): Map<string, GraphNode> {
    return this.nodes;
  }

  /**
   * Get all edges in the graph
   */
  getEdges(): ImportInfo[] {
    return this.edges;
  }

  /**
   * Get dependencies of a specific file
   */
  getDependencies(filePath: string): string[] {
    const node = this.nodes.get(filePath);
    return node ? node.imports : [];
  }

  /**
   * Get files that depend on a specific file
   */
  getDependents(filePath: string): string[] {
    const node = this.nodes.get(filePath);
    return node ? node.importedBy : [];
  }
}
