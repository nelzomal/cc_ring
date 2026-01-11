import { RuntimeConfig, InfraDeps } from "./AppDeps";
import { FileSystem } from "@infrastructure/adapters/file-system/FileSystem";
import { LockManager } from "@infrastructure/adapters/utilities/LockManager";
import { VSCodeConfigProvider } from "@infrastructure/adapters/config/VSCodeConfigProvider";
import { HookScriptGenerator } from "@infrastructure/services/HookScriptGenerator";
import { ClaudeCodeHookRepository } from "@infrastructure/persistence/claude-settings/ClaudeCodeHookRepository";

/**
 * Build infrastructure layer dependencies
 *
 * This layer contains adapters that implement port interfaces.
 * Dependencies: RuntimeConfig only (no application layer dependencies)
 */
export function buildInfraDeps(runtime: RuntimeConfig): InfraDeps {
  // FileSystem has no dependencies
  const fileSystem = new FileSystem();

  // LockManager has no dependencies
  const lockManager = new LockManager();

  // VSCodeConfigProvider needs extensionPath
  const configProvider = new VSCodeConfigProvider(runtime.extensionPath);

  // HookScriptGenerator needs fileSystem and extensionPath
  const hookScriptGenerator = new HookScriptGenerator(
    fileSystem,
    runtime.extensionPath
  );

  // ClaudeCodeHookRepository needs multiple dependencies
  const hookRepository = new ClaudeCodeHookRepository(
    fileSystem,
    runtime.settingsPath,
    runtime.scriptRelativePath,
    lockManager,
    runtime.coordinationLockPath,
    runtime.hookTimeout
  );

  return {
    fileSystem,
    hookRepository,
    configProvider,
    lockManager,
    hookScriptGenerator,
  };
}
