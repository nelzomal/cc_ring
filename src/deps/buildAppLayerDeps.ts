import * as path from "path";
import { RuntimeConfig, InfraDeps, AppLayerDeps } from "./AppDeps";
import { HookInstallationOrchestrator } from "@application/services/HookInstallationOrchestrator";
import { InstallHookUseCase } from "@application/usecases/InstallHookUseCase";
import { UninstallHookUseCase } from "@application/usecases/UninstallHookUseCase";

/**
 * Build application layer dependencies
 *
 * This layer contains use cases and application services.
 * Dependencies: RuntimeConfig + InfraDeps
 */
export async function buildAppLayerDeps(
  runtime: RuntimeConfig,
  infra: InfraDeps
): Promise<AppLayerDeps> {
  // HookInstallationOrchestrator - coordinates atomic multi-file operations
  const hookInstallationOrchestrator = new HookInstallationOrchestrator(
    infra.lockManager,
    infra.fileSystem,
    infra.hookRepository,
    runtime.settingsPath,
    runtime.coordinationLockPath,
    runtime.scriptRelativePath
  );

  // Generate script content for InstallHookUseCase
  const scriptContent = await infra.hookScriptGenerator.generate({
    configPath: runtime.configPath,
    defaultSoundPath: path.join(runtime.bundledSoundsDir, "complete.wav"),
    errorLogPath: runtime.errorLogPath,
    hookLogPath: runtime.hookLogPath,
  });

  // InstallHookUseCase
  const installHookUseCase = new InstallHookUseCase(
    hookInstallationOrchestrator,
    infra.configProvider,
    runtime.scriptAbsolutePath,
    runtime.configPath,
    scriptContent
  );

  // UninstallHookUseCase
  const uninstallHookUseCase = new UninstallHookUseCase(
    hookInstallationOrchestrator,
    runtime.scriptAbsolutePath,
    runtime.configPath
  );

  return {
    hookInstallationOrchestrator,
    installHookUseCase,
    uninstallHookUseCase,
  };
}
