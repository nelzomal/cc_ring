#!/usr/bin/env tsx
/**
 * Verify that all injectable classes follow interface-based DI rules
 *
 * Rules:
 * 1. Infrastructure layer classes MUST implement interfaces
 * 2. Application layer services/use cases MAY be concrete (no interface needed)
 * 3. Domain entities should be concrete (no interface needed)
 * 4. Presentation layer (commands/views) should be concrete (no interface needed)
 * 5. Runtime values bound in container MUST be used (via @inject or container.get())
 * 6. Inner layers MUST NOT depend on outer layers (Clean Architecture)
 */

import { FileScanner } from './di-verifier/core/FileScanner';
import { ContainerParser } from './di-verifier/core/ContainerParser';
import { LayerDetector } from './di-verifier/core/LayerDetector';
import { ASTParser } from './di-verifier/core/ASTParser';
import { DependencyGraph } from './di-verifier/core/DependencyGraph';
import { BindingValidator } from './di-verifier/validators/BindingValidator';
import { InjectableValidator } from './di-verifier/validators/InjectableValidator';
import { UsageValidator } from './di-verifier/validators/UsageValidator';
import { LayerDependencyValidator } from './di-verifier/validators/LayerDependencyValidator';
import { InterfaceValidator } from './di-verifier/validators/InterfaceValidator';
import { InstantiationValidator } from './di-verifier/validators/InstantiationValidator';
import { ConstructorValidator } from './di-verifier/validators/ConstructorValidator';
import { FactoryValidator } from './di-verifier/validators/FactoryValidator';
import { CircularDependencyValidator } from './di-verifier/validators/CircularDependencyValidator';
import { BranchAnalysisValidator } from './di-verifier/validators/BranchAnalysisValidator';
import { DynamicPatternDetector } from './di-verifier/validators/DynamicPatternDetector';
import { ValidationReporter } from './di-verifier/reporters/ValidationReporter';
import { ValidationResult } from './di-verifier/types';
import * as path from 'path';

// TODO: AI-based anti-pattern detection
//
// Future enhancement: Use AI to detect manual path construction that should use DI.
//
// Patterns to detect:
// 1. os.homedir() usage outside container.ts
//    ❌ const p = path.join(os.homedir(), '.claude', 'hook.sh')
//    ✅ @inject(TYPES.ScriptPath) private scriptPath: string
//
// 2. context.extensionPath usage outside container.ts/extension.ts
//    ❌ const sounds = path.join(context.extensionPath, 'sounds')
//    ✅ @inject(TYPES.BundledSoundsDir) private soundsDir: string
//
// 3. Hardcoded .claude paths
//    ❌ const log = '/Users/me/.claude/error.log'
//    ✅ @inject(TYPES.ErrorLogPath) private errorLog: string
//
// 4. Manual path.join() constructing runtime paths
//    ❌ path.join(os.homedir(), '.claude', 'config.json')
//    ✅ @inject(TYPES.ConfigPath) private configPath: string
//
// Implementation approach:
// - Use LLM to analyze code patterns with context awareness
// - Exclude test files and mock objects (legitimate manual construction)
// - Provide specific fix suggestions for each violation
// - Severity levels: ERROR (hardcoded paths) vs WARNING (suspicious patterns)

/**
 * Main validation orchestrator
 */
function main() {
  const reporter = new ValidationReporter();
  reporter.printHeader();

  // Initialize core components
  const parser = new ContainerParser();
  const scanner = new FileScanner();
  const layerDetector = new LayerDetector();

  // Initialize AST-based components
  const srcDir = path.join(__dirname, '..', 'src');
  const tsConfigPath = path.join(__dirname, '..', 'tsconfig.json');
  const astParser = new ASTParser(tsConfigPath, srcDir);

  // Build dependency graph
  const dependencyGraph = new DependencyGraph(astParser);
  const sourceFiles = astParser.getAllSourceFiles();
  dependencyGraph.build(sourceFiles);

  // Run all validations
  const allResults: ValidationResult[] = [];

  // 1. Validate container bindings
  const bindingValidator = new BindingValidator(parser, layerDetector);
  const bindingResult = bindingValidator.validate();
  allResults.push(bindingResult);
  reporter.reportBindings(bindingResult.bindings || []);

  // 2. Check for unregistered injectable classes
  const injectableValidator = new InjectableValidator(scanner, bindingResult.bindings || []);
  const injectableResult = injectableValidator.validate();
  allResults.push(injectableResult);
  reporter.reportUnregistered(injectableResult.items || []);

  // 3. Check for unused bindings
  const usageValidator = new UsageValidator(parser, scanner);
  const usageResult = usageValidator.validate();
  allResults.push(usageResult);
  reporter.reportUnusedBindings(usageResult.items || []);

  // 4. Check for layer dependency violations (AST-based)
  const layerValidator = new LayerDependencyValidator(layerDetector, dependencyGraph);
  const layerResult = layerValidator.validate();
  allResults.push(layerResult);
  reporter.reportLayerDependencies(layerResult);

  // 5. Check for unused interfaces
  const interfaceValidator = new InterfaceValidator(scanner, parser);
  const interfaceResult = interfaceValidator.validate();
  allResults.push(interfaceResult);
  reporter.reportUnusedInterfaces(interfaceResult.items || []);

  // 6. Check for service instantiation violations (AST-based)
  const instantiationValidator = new InstantiationValidator(astParser, scanner);
  const instantiationResult = instantiationValidator.validate();
  allResults.push(instantiationResult);
  reporter.reportInstantiationViolations(instantiationResult);

  // 7. Check value object constructor patterns (AST-based)
  const constructorValidator = new ConstructorValidator(astParser);
  const constructorResult = constructorValidator.validate();
  allResults.push(constructorResult);
  reporter.reportConstructorViolations(constructorResult);

  // 8. Check factory method naming conventions (AST-based)
  const factoryValidator = new FactoryValidator(astParser);
  const factoryResult = factoryValidator.validate();
  allResults.push(factoryResult);
  reporter.reportFactoryPatterns(factoryResult);

  // 9. Check for circular dependencies (AST-based)
  const circularValidator = new CircularDependencyValidator(dependencyGraph);
  const circularResult = circularValidator.validate();
  allResults.push(circularResult);
  reporter.reportCircularDependencies(circularResult);

  // 10. Check conditional service instantiation (Branch Analysis)
  const branchValidator = new BranchAnalysisValidator(astParser);
  const branchResult = branchValidator.validate();
  allResults.push(branchResult);
  reporter.reportBranchAnalysis(branchResult);

  // 11. Detect dynamic patterns for AI review (AI-TODO Detection)
  const dynamicDetector = new DynamicPatternDetector(astParser);
  const dynamicResult = dynamicDetector.validate();
  allResults.push(dynamicResult);
  reporter.reportDynamicPatterns(dynamicResult);

  // 12. Report summary
  reporter.reportSummary(allResults);

  // Exit with appropriate code
  const passed = allResults.every(r => r.passed);
  process.exit(passed ? 0 : 1);
}

main();
