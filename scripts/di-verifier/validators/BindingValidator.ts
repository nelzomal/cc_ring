/**
 * Validates container bindings based on architectural rules
 */

import { IValidator, DetailedValidationResult, BindingInfo } from '../types';
import { ContainerParser } from '../core/ContainerParser';
import { LayerDetector } from '../core/LayerDetector';
import { INFRASTRUCTURE_TYPES_REQUIRING_INTERFACES } from '../constants';

export class BindingValidator implements IValidator {
  private parser: ContainerParser;
  private layerDetector: LayerDetector;

  constructor(parser: ContainerParser, layerDetector: LayerDetector) {
    this.parser = parser;
    this.layerDetector = layerDetector;
  }

  validate(): DetailedValidationResult {
    const bindings = this.parser.parseBindings();
    const containerContent = this.parser.getContent();
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const binding of bindings) {
      const layer = this.layerDetector.getLayerFromClassName(binding.concreteType, containerContent);

      // Rule 1: Infrastructure layer SHOULD use interfaces
      if (layer === 'infrastructure' && !binding.hasInterface) {
        if (this.requiresInterface(binding.concreteType)) {
          errors.push(
            `❌ ${binding.concreteType} (${layer}) should implement an interface (line ${binding.line})`
          );
        } else {
          warnings.push(
            `⚠️  ${binding.concreteType} (${layer}) could benefit from an interface (line ${binding.line})`
          );
        }
      }

      // Rule 2: Application use cases - acceptable to be concrete, but warn
      if (layer === 'application' && !binding.hasInterface && binding.concreteType.includes('UseCase')) {
        warnings.push(
          `ℹ️  ${binding.concreteType} is concrete (typically OK for use cases) (line ${binding.line})`
        );
      }

      // Rule 3: Commands and Views - should be concrete (good as-is)
      if (layer === 'presentation' && binding.hasInterface) {
        warnings.push(
          `ℹ️  ${binding.concreteType} uses interface (typically not needed for commands/views) (line ${binding.line})`
        );
      }
    }

    return {
      passed: errors.length === 0,
      warnings,
      errors,
      bindings,
    };
  }

  /**
   * Check if a concrete type requires an interface based on naming conventions
   */
  private requiresInterface(concreteType: string): boolean {
    return INFRASTRUCTURE_TYPES_REQUIRING_INTERFACES.some(suffix =>
      concreteType.includes(suffix)
    );
  }
}
