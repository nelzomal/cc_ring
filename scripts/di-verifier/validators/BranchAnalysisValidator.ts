/**
 * Branch Analysis Validator
 *
 * Analyzes all branches of conditional expressions to detect
 * service instantiation in ANY possible execution path.
 *
 * Checks: ternary operators, if/else, switch statements
 */

import * as ts from 'typescript';
import { ASTParser } from '../core/ASTParser';
import { ValidationResult } from '../types';
import * as path from 'path';

export interface BranchViolation {
  filePath: string;
  line: number;
  branchType: 'ternary' | 'if-else' | 'switch';
  branches: BranchInfo[];
  allBranchesViolate: boolean;
}

export interface BranchInfo {
  condition: string;
  className: string;
  isService: boolean;
}

export class BranchAnalysisValidator {
  // Service pattern matching
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

  constructor(private parser: ASTParser) {}

  /**
   * Validate conditional service instantiation
   */
  validate(): ValidationResult {
    const violations: BranchViolation[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const sourceFiles = this.parser.getAllSourceFiles();

    for (const filePath of sourceFiles) {
      const program = this.parser.getProgram();
      if (!program) continue;

      const sourceFile = program.getSourceFile(filePath);
      if (!sourceFile) continue;

      // Find all conditional instantiations
      const conditionalViolations = this.findConditionalInstantiations(sourceFile, filePath);
      violations.push(...conditionalViolations);

      // Report each violation
      for (const violation of conditionalViolations) {
        const violatingBranches = violation.branches.filter(b => b.isService);

        if (violatingBranches.length > 0) {
          const branchNames = violatingBranches.map(b => b.className).join(', ');
          const allViolate = violation.allBranchesViolate ? ' (ALL branches)' : '';

          errors.push(
            `❌ ${this.getRelativePath(violation.filePath)}:${violation.line} - ` +
            `Conditional service instantiation${allViolate}\n` +
            `   Branch type: ${violation.branchType}\n` +
            `   Services: ${branchNames}\n` +
            `   💡 Refactor: Use strategy pattern with DI`
          );
        }
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
   * Find all conditional instantiations in a file
   */
  private findConditionalInstantiations(
    sourceFile: ts.SourceFile,
    filePath: string
  ): BranchViolation[] {
    const violations: BranchViolation[] = [];

    const visit = (node: ts.Node) => {
      // Check ternary expressions: condition ? A : B
      if (ts.isConditionalExpression(node)) {
        const violation = this.analyzeTernary(node, sourceFile, filePath);
        if (violation) {
          violations.push(violation);
        }
      }

      // Check if/else statements
      if (ts.isIfStatement(node)) {
        const violation = this.analyzeIfElse(node, sourceFile, filePath);
        if (violation) {
          violations.push(violation);
        }
      }

      // Check switch statements
      if (ts.isSwitchStatement(node)) {
        const violation = this.analyzeSwitch(node, sourceFile, filePath);
        if (violation) {
          violations.push(violation);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return violations;
  }

  /**
   * Analyze ternary expressions
   */
  private analyzeTernary(
    node: ts.ConditionalExpression,
    sourceFile: ts.SourceFile,
    filePath: string
  ): BranchViolation | null {
    const branches: BranchInfo[] = [];

    // Check if either branch is used in a 'new' expression
    const parent = node.parent;
    if (!parent || !ts.isNewExpression(parent)) {
      return null;
    }

    // Analyze true branch
    const trueBranch = node.whenTrue.getText(sourceFile);
    branches.push({
      condition: 'true',
      className: trueBranch,
      isService: this.isServicePattern(trueBranch),
    });

    // Analyze false branch
    const falseBranch = node.whenFalse.getText(sourceFile);
    branches.push({
      condition: 'false',
      className: falseBranch,
      isService: this.isServicePattern(falseBranch),
    });

    // Only report if at least one branch is a service
    const hasViolation = branches.some(b => b.isService);
    if (!hasViolation) {
      return null;
    }

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      filePath,
      line: line + 1,
      branchType: 'ternary',
      branches,
      allBranchesViolate: branches.every(b => b.isService),
    };
  }

  /**
   * Analyze if/else statements
   */
  private analyzeIfElse(
    node: ts.IfStatement,
    sourceFile: ts.SourceFile,
    filePath: string
  ): BranchViolation | null {
    const branches: BranchInfo[] = [];

    // Look for new expressions in then/else blocks
    const thenServices = this.findServicesInBlock(node.thenStatement, sourceFile);
    const elseServices = node.elseStatement
      ? this.findServicesInBlock(node.elseStatement, sourceFile)
      : [];

    if (thenServices.length > 0) {
      thenServices.forEach(service => {
        branches.push({
          condition: 'then',
          className: service,
          isService: true,
        });
      });
    }

    if (elseServices.length > 0) {
      elseServices.forEach(service => {
        branches.push({
          condition: 'else',
          className: service,
          isService: true,
        });
      });
    }

    if (branches.length === 0) {
      return null;
    }

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      filePath,
      line: line + 1,
      branchType: 'if-else',
      branches,
      allBranchesViolate: thenServices.length > 0 && elseServices.length > 0,
    };
  }

  /**
   * Analyze switch statements
   */
  private analyzeSwitch(
    node: ts.SwitchStatement,
    sourceFile: ts.SourceFile,
    filePath: string
  ): BranchViolation | null {
    const branches: BranchInfo[] = [];

    // Check each case clause
    node.caseBlock.clauses.forEach(clause => {
      const services = this.findServicesInBlock(clause, sourceFile);

      const caseLabel = ts.isCaseClause(clause)
        ? clause.expression.getText(sourceFile)
        : 'default';

      services.forEach(service => {
        branches.push({
          condition: `case ${caseLabel}`,
          className: service,
          isService: true,
        });
      });
    });

    if (branches.length === 0) {
      return null;
    }

    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

    return {
      filePath,
      line: line + 1,
      branchType: 'switch',
      branches,
      allBranchesViolate: node.caseBlock.clauses.every(clause =>
        this.findServicesInBlock(clause, sourceFile).length > 0
      ),
    };
  }

  /**
   * Find service instantiations in a block of code
   */
  private findServicesInBlock(node: ts.Node, sourceFile: ts.SourceFile): string[] {
    const services: string[] = [];

    const visit = (n: ts.Node) => {
      if (ts.isNewExpression(n) && n.expression) {
        const className = n.expression.getText(sourceFile);
        if (this.isServicePattern(className)) {
          services.push(className);
        }
      }
      ts.forEachChild(n, visit);
    };

    visit(node);
    return services;
  }

  /**
   * Check if a class name matches service patterns
   */
  private isServicePattern(className: string): boolean {
    return this.SERVICE_PATTERNS.some(pattern => pattern.test(className));
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
