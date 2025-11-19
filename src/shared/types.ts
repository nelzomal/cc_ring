/**
 * InversifyJS type symbols for dependency injection
 *
 * This file is layer-agnostic and can be imported by any layer without
 * creating upward dependencies. It defines unique symbols for all injectable
 * types in the application.
 *
 * Symbols ensure type-safe dependency injection across the entire codebase.
 *
 * Import from: import { TYPES } from '../shared/types' (or '../../shared/types')
 */

export const TYPES = {
  // ============================================================================
  // RUNTIME VALUES
  // ============================================================================

  // Script paths
  // ScriptAbsolutePath: For file system operations (write, delete, chmod)
  // Example: /Users/username/.claude/cc-ring-hook-UUID.sh
  ScriptAbsolutePath: Symbol.for('ScriptAbsolutePath'),
  // ScriptRelativePath: For settings.json (portable ~ format)
  // Example: ~/.claude/cc-ring-hook-UUID.sh
  ScriptRelativePath: Symbol.for('ScriptRelativePath'),
  ScriptContent: Symbol.for('ScriptContent'),

  // Directory paths
  BundledSoundsDir: Symbol.for('BundledSoundsDir'),
  ExtensionPath: Symbol.for('ExtensionPath'),
  ClaudeDir: Symbol.for('ClaudeDir'),

  // Configuration paths
  ConfigPath: Symbol.for('ConfigPath'),
  ErrorLogPath: Symbol.for('ErrorLogPath'),
  HookLogPath: Symbol.for('HookLogPath'),
  SettingsPath: Symbol.for('SettingsPath'),
  CoordinationLockPath: Symbol.for('CoordinationLockPath'),

  // Configuration values
  HookTimeout: Symbol.for('HookTimeout'),

  // VSCode API objects
  StatusBarItem: Symbol.for('StatusBarItem'),

  // ============================================================================
  // DOMAIN LAYER
  // ============================================================================

  // (No domain singletons - domain objects created as needed)

  // ============================================================================
  // APPLICATION LAYER
  // ============================================================================

  // Services
  HookInstallationOrchestrator: Symbol.for('HookInstallationOrchestrator'),

  // Use Cases
  InstallHookUseCase: Symbol.for('InstallHookUseCase'),
  UninstallHookUseCase: Symbol.for('UninstallHookUseCase'),
  CheckHookStatusUseCase: Symbol.for('CheckHookStatusUseCase'),
  PlaySoundUseCase: Symbol.for('PlaySoundUseCase'),

  // Port Interfaces (Outbound Dependencies)
  IHookRepository: Symbol.for('IHookRepository'),
  IFileSystem: Symbol.for('IFileSystem'),
  ISoundPlayer: Symbol.for('ISoundPlayer'),
  IConfigProvider: Symbol.for('IConfigProvider'),
  ILockManager: Symbol.for('ILockManager'),

  // ============================================================================
  // INFRASTRUCTURE LAYER
  // ============================================================================

  // Repositories (Concrete Implementations)
  ClaudeCodeHookRepository: Symbol.for('ClaudeCodeHookRepository'),
  FileSystem: Symbol.for('FileSystem'),

  // Services (Concrete Implementations)
  AfplaySoundPlayer: Symbol.for('AfplaySoundPlayer'),
  VSCodeConfigProvider: Symbol.for('VSCodeConfigProvider'),

  // Helpers
  HookScriptGenerator: Symbol.for('HookScriptGenerator'),

  // ============================================================================
  // PRESENTATION LAYER
  // ============================================================================

  // Commands
  InstallHookCommand: Symbol.for('InstallHookCommand'),
  UninstallHookCommand: Symbol.for('UninstallHookCommand'),
  TestSoundCommand: Symbol.for('TestSoundCommand'),

  // Views
  StatusBarView: Symbol.for('StatusBarView'),
};
