/**
 * Dynamic Pattern Detector
 *
 * Detects code patterns that cannot be statically analyzed and would
 * require AI/manual review. Instead of calling AI, generates TODO comments
 * for manual verification.
 *
 * Patterns detected:
 * - Dynamic imports (require with variable)
 * - Constructor maps (objects containing class references)
 * - Variable instantiation (new with variable class name)
 * - eval() and Function() calls
 * - Generic instantiation
 */

import * as ts from 'typescript';
import { ASTParser } from '../core/ASTParser';
import { ValidationResult } from '../types';
import * as path from 'path';

export interface DynamicPattern {
  filePath: string;
  line: number;
  column: number;
  patternType: 'dynamic-import' | 'constructor-map' | 'variable-new' | 'eval' | 'generic';
  code: string;
  todoComment: string;
  context: string;
}

export class DynamicPatternDetector {
  constructor(private parser: ASTParser) {}

  /**
   * Detect all dynamic patterns that need manual review
   */
  validate(): ValidationResult {
    const patterns: DynamicPattern[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const sourceFiles = this.parser.getAllSourceFiles();

    for (const filePath of sourceFiles) {
      const program = this.parser.getProgram();
      if (!program) continue;

      const sourceFile = program.getSourceFile(filePath);
      if (!sourceFile) continue;

      const filePatterns = this.detectPatterns(sourceFile, filePath);
      patterns.push(...filePatterns);
    }

    // Generate warnings with TODO suggestions
    if (patterns.length > 0) {
      warnings.push(`\n📝 Found ${patterns.length} pattern(s) that need manual AI review:\n`);

      for (const pattern of patterns) {
        warnings.push(
          `   ${this.getRelativePath(pattern.filePath)}:${pattern.line} - ${pattern.patternType}\n` +
          `   Code: ${pattern.code}\n` +
          `   ${pattern.todoComment}\n`
        );
      }

      warnings.push(
        `\n💡 Add these TODO comments above the flagged code:\n` +
        `   // @ai-review: [pattern-type] - Verify this doesn't violate DI rules\n` +
        `   // Context: [brief explanation]\n`
      );
    }

    return {
      passed: true, // Warnings only, not errors
      warnings,
      errors,
      items: patterns,
    };
  }

  /**
   * Detect all patterns in a source file
   */
  private detectPatterns(sourceFile: ts.SourceFile, filePath: string): DynamicPattern[] {
    const patterns: DynamicPattern[] = [];

    const visit = (node: ts.Node) => {
      // 1. Dynamic imports
      const dynamicImport = this.checkDynamicImport(node, sourceFile, filePath);
      if (dynamicImport) {
        patterns.push(dynamicImport);
      }

      // 2. Constructor maps
      const constructorMap = this.checkConstructorMap(node, sourceFile, filePath);
      if (constructorMap) {
        patterns.push(constructorMap);
      }

      // 3. Variable instantiation
      const variableNew = this.checkVariableInstantiation(node, sourceFile, filePath);
      if (variableNew) {
        patterns.push(variableNew);
      }

      // 4. eval() calls
      const evalCall = this.checkEval(node, sourceFile, filePath);
      if (evalCall) {
        patterns.push(evalCall);
      }

      // 5. Generic instantiation
      const generic = this.checkGenericInstantiation(node, sourceFile, filePath);
      if (generic) {
        patterns.push(generic);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return patterns;
  }

  /**
   * Check for dynamic imports: require(variable) or import(variable)
   */
  private checkDynamicImport(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DynamicPattern | null {
    // Check for require() with non-literal
    if (ts.isCallExpression(node)) {
      const expr = node.expression;

      if (ts.isIdentifier(expr) && expr.text === 'require') {
        const arg = node.arguments[0];

        // If argument is not a string literal, it's dynamic
        if (arg && !ts.isStringLiteral(arg)) {
          return this.createPattern(
            node,
            sourceFile,
            filePath,
            'dynamic-import',
            `// @ai-review: dynamic-import - Verify this doesn't load services dynamically\n` +
            `// Consider: Use explicit import statements or factory pattern`
          );
        }
      }

      // Check for dynamic import()
      if (expr.kind === ts.SyntaxKind.ImportKeyword) {
        const arg = node.arguments[0];

        if (arg && !ts.isStringLiteral(arg)) {
          return this.createPattern(
            node,
            sourceFile,
            filePath,
            'dynamic-import',
            `// @ai-review: dynamic-import - Verify import path doesn't resolve to services\n` +
            `// Consider: Use static imports with factory pattern`
          );
        }
      }
    }

    return null;
  }

  /**
   * Check for constructor maps: { key: SomeClass }
   */
  private checkConstructorMap(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DynamicPattern | null {
    if (ts.isObjectLiteralExpression(node)) {
      // Check if any property value is an identifier (potential class reference)
      const hasClassReferences = node.properties.some(prop => {
        if (ts.isPropertyAssignment(prop)) {
          const value = prop.initializer;
          // Check if value is an identifier starting with capital letter (likely a class)
          if (ts.isIdentifier(value) && /^[A-Z]/.test(value.text)) {
            return true;
          }
        }
        return false;
      });

      if (hasClassReferences) {
        return this.createPattern(
          node,
          sourceFile,
          filePath,
          'constructor-map',
          `// @ai-review: constructor-map - Verify this map doesn't contain service classes\n` +
          `// If it does, refactor to use service registry with DI`
        );
      }
    }

    return null;
  }

  /**
   * Check for variable instantiation: new someVariable()
   */
  private checkVariableInstantiation(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DynamicPattern | null {
    if (ts.isNewExpression(node) && node.expression) {
      const expr = node.expression;

      // Check if expression is a variable (lowercase first letter or property access)
      if (ts.isIdentifier(expr) && /^[a-z]/.test(expr.text)) {
        return this.createPattern(
          node,
          sourceFile,
          filePath,
          'variable-new',
          `// @ai-review: variable-new - Verify '${expr.text}' is not a service class\n` +
          `// If it is, use factory pattern with explicit DI`
        );
      }

      // Check for property access: obj.SomeClass or obj[key]
      if (ts.isPropertyAccessExpression(expr) || ts.isElementAccessExpression(expr)) {
        return this.createPattern(
          node,
          sourceFile,
          filePath,
          'variable-new',
          `// @ai-review: variable-new - Verify this doesn't instantiate services dynamically\n` +
          `// Consider: Factory pattern with service registry`
        );
      }
    }

    return null;
  }

  /**
   * Check for eval() or Function() calls
   */
  private checkEval(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DynamicPattern | null {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;

      if (ts.isIdentifier(expr) && (expr.text === 'eval' || expr.text === 'Function')) {
        return this.createPattern(
          node,
          sourceFile,
          filePath,
          'eval',
          `// @ai-review: eval - DANGEROUS: This creates code at runtime\n` +
          `// STRONGLY RECOMMEND: Refactor to avoid eval() entirely\n` +
          `// If absolutely necessary, verify no service instantiation`
        );
      }
    }

    // Check for new Function()
    if (ts.isNewExpression(node) && node.expression) {
      if (ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
        return this.createPattern(
          node,
          sourceFile,
          filePath,
          'eval',
          `// @ai-review: eval - DANGEROUS: Function constructor creates code at runtime\n` +
          `// STRONGLY RECOMMEND: Refactor to avoid Function() constructor`
        );
      }
    }

    return null;
  }

  /**
   * Check for generic instantiation: new type<T>()
   */
  private checkGenericInstantiation(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string
  ): DynamicPattern | null {
    if (ts.isNewExpression(node) && node.expression) {
      // Check if the class being instantiated is a type parameter
      if (ts.isIdentifier(node.expression)) {
        const typeName = node.expression.text;

        // Heuristic: single letter or starts with T (e.g., T, TService, Type)
        if (typeName.length === 1 || /^T[A-Z]/.test(typeName)) {
          return this.createPattern(
            node,
            sourceFile,
            filePath,
            'generic',
            `// @ai-review: generic - Generic instantiation with type parameter '${typeName}'\n` +
            `// Verify: Type constraints ensure this isn't a service class\n` +
            `// Consider: Service registry pattern instead of generic instantiation`
          );
        }
      }
    }

    return null;
  }

  /**
   * Create a DynamicPattern object
   */
  private createPattern(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    filePath: string,
    patternType: DynamicPattern['patternType'],
    todoComment: string
  ): DynamicPattern {
    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const code = node.getText(sourceFile).substring(0, 80); // Truncate long code
    const context = this.extractContext(sourceFile, node);

    return {
      filePath,
      line: line + 1,
      column: character + 1,
      patternType,
      code: code.length < 80 ? code : code + '...',
      todoComment,
      context,
    };
  }

  /**
   * Extract surrounding context for the pattern
   */
  private extractContext(sourceFile: ts.SourceFile, node: ts.Node): string {
    const start = Math.max(0, node.getStart() - 200);
    const end = Math.min(sourceFile.getEnd(), node.getEnd() + 200);
    return sourceFile.text.substring(start, end);
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
