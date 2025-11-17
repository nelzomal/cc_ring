/**
 * TypeScript AST Parser
 *
 * Uses TypeScript Compiler API to parse source files and extract:
 * - Decorators (@injectable)
 * - Class declarations
 * - Constructor visibility
 * - Import/export statements
 * - New expressions (instantiation)
 * - Static methods
 */

import * as ts from 'typescript';
import * as path from 'path';
import * as fs from 'fs';

export interface ClassInfo {
  name: string;
  decorators: string[];
  hasPrivateConstructor: boolean;
  staticMethods: string[];
  filePath: string;
}

export interface ImportInfo {
  from: string;
  to: string;
  isRelative: boolean;
}

export interface NewExpressionInfo {
  className: string;
  line: number;
  column: number;
  text: string;
  filePath: string;
}

export class ASTParser {
  private program: ts.Program | null = null;
  private typeChecker: ts.TypeChecker | null = null;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();

  /**
   * Initialize the parser with a TypeScript project
   * @param tsConfigPath Path to tsconfig.json (optional)
   * @param sourceRoot Root directory to scan if no tsconfig
   */
  constructor(tsConfigPath?: string, sourceRoot?: string) {
    if (tsConfigPath && fs.existsSync(tsConfigPath)) {
      this.initializeFromTsConfig(tsConfigPath);
    } else if (sourceRoot) {
      this.initializeFromSourceRoot(sourceRoot);
    }
  }

  /**
   * Initialize TypeScript program from tsconfig.json
   */
  private initializeFromTsConfig(tsConfigPath: string): void {
    const configFile = ts.readConfigFile(tsConfigPath, ts.sys.readFile);

    if (configFile.error) {
      console.warn(`Warning: Could not read tsconfig.json: ${configFile.error.messageText}`);
      return;
    }

    const basePath = path.dirname(tsConfigPath);
    const { options, fileNames, errors } = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      basePath
    );

    if (errors.length > 0) {
      console.warn('Warning: TypeScript config parsing errors:', errors.map(e => e.messageText).join(', '));
    }

    this.program = ts.createProgram({
      rootNames: fileNames,
      options: {
        ...options,
        noEmit: true, // We're only analyzing, not emitting
        skipLibCheck: true, // Skip checking declaration files for performance
      }
    });

    this.typeChecker = this.program.getTypeChecker();

    // Cache source files
    this.program.getSourceFiles().forEach(sourceFile => {
      if (!sourceFile.isDeclarationFile) {
        this.sourceFiles.set(sourceFile.fileName, sourceFile);
      }
    });
  }

  /**
   * Initialize by scanning source directory
   */
  private initializeFromSourceRoot(sourceRoot: string): void {
    const fileNames = this.findTypeScriptFiles(sourceRoot);

    this.program = ts.createProgram({
      rootNames: fileNames,
      options: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.CommonJS,
        noEmit: true,
        skipLibCheck: true,
        esModuleInterop: true,
      }
    });

    this.typeChecker = this.program.getTypeChecker();

    this.program.getSourceFiles().forEach(sourceFile => {
      if (!sourceFile.isDeclarationFile) {
        this.sourceFiles.set(sourceFile.fileName, sourceFile);
      }
    });
  }

  /**
   * Recursively find all TypeScript files
   */
  private findTypeScriptFiles(dir: string): string[] {
    const files: string[] = [];

    const scanDir = (directory: string) => {
      if (!fs.existsSync(directory)) return;

      const items = fs.readdirSync(directory);

      for (const item of items) {
        const fullPath = path.join(directory, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && item !== 'node_modules' && item !== 'dist' && item !== 'out') {
          scanDir(fullPath);
        } else if (stat.isFile() && item.endsWith('.ts') && !item.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    };

    scanDir(dir);
    return files;
  }

  /**
   * Parse a single file and extract class information
   */
  parseFile(filePath: string): ClassInfo[] {
    const absolutePath = path.resolve(filePath);
    let sourceFile = this.sourceFiles.get(absolutePath);

    // If not in cache, try to parse directly
    if (!sourceFile && fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      sourceFile = ts.createSourceFile(
        absolutePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
    }

    if (!sourceFile) {
      return [];
    }

    const classes: ClassInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        const className = node.name.text;
        const decorators = this.extractDecorators(node);
        const hasPrivateConstructor = this.checkPrivateConstructor(node);
        const staticMethods = this.extractStaticMethods(node);

        classes.push({
          name: className,
          decorators,
          hasPrivateConstructor,
          staticMethods,
          filePath: absolutePath,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return classes;
  }

  /**
   * Check if a file has a specific decorator
   */
  hasDecorator(filePath: string, decoratorName: string): boolean {
    const classes = this.parseFile(filePath);
    return classes.some(cls => cls.decorators.includes(decoratorName));
  }

  /**
   * Extract all decorators from a class
   */
  private extractDecorators(node: ts.ClassDeclaration): string[] {
    const decorators: string[] = [];

    if (node.modifiers) {
      node.modifiers.forEach(modifier => {
        if (ts.isDecorator(modifier)) {
          // Get decorator name (e.g., @injectable() => injectable)
          const expression = modifier.expression;
          let decoratorName = '';

          if (ts.isCallExpression(expression)) {
            decoratorName = expression.expression.getText();
          } else if (ts.isIdentifier(expression)) {
            decoratorName = expression.text;
          }

          if (decoratorName) {
            decorators.push(decoratorName);
          }
        }
      });
    }

    return decorators;
  }

  /**
   * Check if class has private constructor
   */
  private checkPrivateConstructor(node: ts.ClassDeclaration): boolean {
    for (const member of node.members) {
      if (ts.isConstructorDeclaration(member)) {
        if (member.modifiers) {
          return member.modifiers.some(m => m.kind === ts.SyntaxKind.PrivateKeyword);
        }
      }
    }
    return false;
  }

  /**
   * Extract static method names
   */
  private extractStaticMethods(node: ts.ClassDeclaration): string[] {
    const staticMethods: string[] = [];

    for (const member of node.members) {
      if (ts.isMethodDeclaration(member) && member.name) {
        const isStatic = member.modifiers?.some(m => m.kind === ts.SyntaxKind.StaticKeyword);
        if (isStatic && ts.isIdentifier(member.name)) {
          staticMethods.push(member.name.text);
        }
      }
    }

    return staticMethods;
  }

  /**
   * Find all 'new' expressions in a file
   */
  findNewExpressions(filePath: string, classNamePattern?: RegExp): NewExpressionInfo[] {
    const absolutePath = path.resolve(filePath);
    let sourceFile = this.sourceFiles.get(absolutePath);

    if (!sourceFile && fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      sourceFile = ts.createSourceFile(
        absolutePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
    }

    if (!sourceFile) {
      return [];
    }

    const results: NewExpressionInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isNewExpression(node) && node.expression) {
        const className = node.expression.getText(sourceFile);

        // Filter by pattern if provided
        if (!classNamePattern || classNamePattern.test(className)) {
          const { line, character } = sourceFile!.getLineAndCharacterOfPosition(node.getStart());

          results.push({
            className,
            line: line + 1,
            column: character + 1,
            text: node.getText(sourceFile).substring(0, 50), // Truncate for readability
            filePath: absolutePath,
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return results;
  }

  /**
   * Extract all imports from a file
   */
  getImports(filePath: string): ImportInfo[] {
    const absolutePath = path.resolve(filePath);
    let sourceFile = this.sourceFiles.get(absolutePath);

    if (!sourceFile && fs.existsSync(absolutePath)) {
      const content = fs.readFileSync(absolutePath, 'utf-8');
      sourceFile = ts.createSourceFile(
        absolutePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );
    }

    if (!sourceFile) {
      return [];
    }

    const imports: ImportInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
        const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text;
        const isRelative = moduleSpecifier.startsWith('.') || moduleSpecifier.startsWith('/');

        let resolvedPath = moduleSpecifier;
        if (isRelative) {
          const dir = path.dirname(absolutePath);
          resolvedPath = path.resolve(dir, moduleSpecifier);

          // Try to resolve with .ts extension
          if (!resolvedPath.endsWith('.ts')) {
            if (fs.existsSync(resolvedPath + '.ts')) {
              resolvedPath += '.ts';
            } else if (fs.existsSync(path.join(resolvedPath, 'index.ts'))) {
              resolvedPath = path.join(resolvedPath, 'index.ts');
            }
          }
        }

        imports.push({
          from: absolutePath,
          to: resolvedPath,
          isRelative,
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Get all cached source files
   */
  getAllSourceFiles(): string[] {
    return Array.from(this.sourceFiles.keys());
  }

  /**
   * Get the TypeScript program (if initialized)
   */
  getProgram(): ts.Program | null {
    return this.program;
  }
}
