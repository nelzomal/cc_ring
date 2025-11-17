/**
 * Reporter for formatting and displaying validation results
 */

import { BindingInfo, DetailedValidationResult, ValidationResult } from '../types';

export class ValidationReporter {
  private static readonly SEPARATOR = '─'.repeat(80);

  /**
   * Report container bindings analysis
   */
  reportBindings(bindings: BindingInfo[]): void {
    console.log('📊 Container Bindings Analysis:');
    console.log(ValidationReporter.SEPARATOR);

    const withInterface = bindings.filter(b => b.hasInterface);
    const withoutInterface = bindings.filter(b => !b.hasInterface);

    console.log(`\n✅ Bindings with interfaces (${withInterface.length}):`);
    withInterface.forEach(b => {
      console.log(`   ${b.interfaceType} → ${b.concreteType} (${b.scope})`);
    });

    console.log(`\n📦 Bindings without interfaces (${withoutInterface.length}):`);
    withoutInterface.forEach(b => {
      console.log(`   ${b.concreteType} (${b.scope})`);
    });
  }

  /**
   * Report unregistered injectable classes
   */
  reportUnregistered(items: string[]): void {
    console.log('\n\n🔍 Checking for unregistered @injectable classes...');
    console.log(ValidationReporter.SEPARATOR);

    if (items.length > 0) {
      console.log(`\n⚠️  Found ${items.length} @injectable classes not registered in container:`);
      items.forEach(item => console.log(`   ${item}`));
    } else {
      console.log('\n✅ All @injectable classes are registered in the container');
    }
  }

  /**
   * Report unused bindings
   */
  reportUnusedBindings(items: string[]): void {
    console.log('\n\n🔍 Checking for unused runtime value bindings...');
    console.log(ValidationReporter.SEPARATOR);

    if (items.length > 0) {
      console.log(`\n⚠️  Found ${items.length} bound symbols that are never used:`);
      items.forEach(item => console.log(`   ${item}`));
      console.log('\n💡 These bindings can likely be removed or need to be used via @inject() or container.get()');
    } else {
      console.log('\n✅ All bound runtime values are used in the codebase');
    }
  }

  /**
   * Report layer dependency violations
   */
  reportLayerDependencies(result: ValidationResult): void {
    console.log('\n\n🔍 Checking for layer dependency violations...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.errors.length > 0) {
      console.log(`\n❌ Found ${result.errors.length} layer dependency violations:`);
      result.errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ All layers follow Clean Architecture dependency rules');
    }
  }

  /**
   * Report unused interfaces
   */
  reportUnusedInterfaces(items: string[]): void {
    console.log('\n\n🔍 Checking for unused interfaces...');
    console.log(ValidationReporter.SEPARATOR);

    if (items.length > 0) {
      console.log(`\nℹ️  Found ${items.length} interfaces not used in container (may be DTOs/value objects):`);
      items.forEach(item => console.log(`   ${item}`));
    } else {
      console.log('\n✅ All interfaces are referenced in the container');
    }
  }

  /**
   * Report service instantiation violations
   */
  reportInstantiationViolations(result: ValidationResult): void {
    console.log('\n\n🔍 Checking for service instantiation violations (AST-based)...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ No services instantiated with "new" outside container');
    }
  }

  /**
   * Report constructor visibility violations
   */
  reportConstructorViolations(result: ValidationResult): void {
    console.log('\n\n🔍 Checking value object constructor patterns (AST-based)...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(err));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(warn));
    }

    if (result.errors.length === 0 && result.warnings.length === 0) {
      console.log('\n✅ All value objects use private constructors with factory methods');
    }
  }

  /**
   * Report factory method pattern adherence
   */
  reportFactoryPatterns(result: ValidationResult): void {
    console.log('\n\n🔍 Checking factory method naming conventions (AST-based)...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(warn));
    } else {
      console.log('\n✅ All factory methods follow naming conventions');
    }
  }

  /**
   * Report circular dependencies
   */
  reportCircularDependencies(result: ValidationResult): void {
    console.log('\n\n🔍 Checking for circular dependencies (AST-based)...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ No circular dependencies detected');
    }
  }

  /**
   * Report branch analysis results
   */
  reportBranchAnalysis(result: ValidationResult): void {
    console.log('\n\n🔍 Checking conditional service instantiation (Branch Analysis)...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(err));
    } else {
      console.log('\n✅ No conditional service instantiation detected');
    }
  }

  /**
   * Report dynamic patterns that need AI review
   */
  reportDynamicPatterns(result: ValidationResult): void {
    console.log('\n\n🔍 Detecting patterns that need manual review (AI-TODO Detection)...');
    console.log(ValidationReporter.SEPARATOR);

    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(warn));
    } else {
      console.log('\n✅ No dynamic patterns detected');
    }
  }

  /**
   * Report validation summary
   */
  reportSummary(allResults: ValidationResult[]): void {
    console.log('\n\n📋 Validation Results:');
    console.log(ValidationReporter.SEPARATOR);

    const allErrors = allResults.flatMap(r => r.errors);
    const allWarnings = allResults.flatMap(r => r.warnings);
    const passed = allResults.every(r => r.passed);

    if (allErrors.length > 0) {
      console.log('\n❌ ERRORS:');
      allErrors.forEach(err => console.log(err));
    }

    if (allWarnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      allWarnings.forEach(warn => console.log(warn));
    }

    if (passed && allWarnings.length === 0) {
      console.log('\n✅ All dependency injection rules are followed!');
    }

    console.log('\n' + ValidationReporter.SEPARATOR);
    console.log(`\nStatus: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Errors: ${allErrors.length}`);
    console.log(`Warnings: ${allWarnings.length}`);
  }

  /**
   * Print header
   */
  printHeader(): void {
    console.log('🔍 Verifying Dependency Injection Interface Usage...\n');
  }
}
