/**
 * Shared type definitions for DI verification
 */

export interface BindingInfo {
  line: number;
  interfaceType: string | null;
  concreteType: string;
  scope: string;
  hasInterface: boolean;
}

export interface ValidationResult {
  passed: boolean;
  warnings: string[];
  errors: string[];
}

export interface DetailedValidationResult extends ValidationResult {
  bindings?: BindingInfo[];
  items?: string[];
}

export type Layer = 'domain' | 'application' | 'infrastructure' | 'presentation' | 'shared' | 'unknown';

export interface IValidator {
  validate(): ValidationResult;
}
