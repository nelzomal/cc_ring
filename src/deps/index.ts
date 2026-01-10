/**
 * Typed Dependency Injection System
 *
 * This module provides compile-time type-safe dependency injection
 * using plain TypeScript factory functions instead of a DI container.
 *
 * Benefits over Inversify:
 * - Full compile-time type safety (no runtime Symbol matching)
 * - Zero runtime overhead (no reflection, no decorators)
 * - Explicit dependency graph (visible in code)
 * - Easier testing (pass mocks directly to factories)
 * - Smaller bundle size (no DI library)
 */

export type {
  AppDeps,
  RuntimeConfig,
  VSCodeRuntime,
  InfraDeps,
  AppLayerDeps,
  PresentationDeps,
} from "./AppDeps";

export { buildAppDeps } from "./buildAppDeps";
