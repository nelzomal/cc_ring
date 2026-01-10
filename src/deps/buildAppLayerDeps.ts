import * as path from "path";
import { RuntimeConfig, InfraDeps, AppLayerDeps } from "./AppDeps";
import { HookInstallationOrchestrator } from "@application/services/HookInstallationOrchestrator";
import { CheckHookStatusUseCase } from "@application/usecases/CheckHookStatusUseCase";
import { InstallHookUseCase } from "@application/usecases/InstallHookUseCase";
import { UninstallHookUseCase } from "@application/usecases/UninstallHookUseCase";
import { PlaySoundUseCase } from "@application/usecases/PlaySoundUseCase";

/**
 * Build application layer dependencies
 *
 * This layer contains use cases and application services.
 * Dependencies: RuntimeConfig + InfraDeps
 */
export function buildAppLayerDeps(
  runtime: RuntimeConfig,
  infra: InfraDeps
): AppLayerDeps {
  // HookInstallationOrchestrator - coordinates atomic multi-file operations
  const hookInstallationOrchestrator = new HookInstallationOrchestrator(
    infra.lockManager,
    infra.fileSystem,
    infra.hookRepository,
    runtime.settingsPath,
    runtime.coordinationLockPath,
    runtime.scriptRelativePath
  );

  // CheckHookStatusUseCase
  const checkHookStatusUseCase = new CheckHookStatusUseCase(
    infra.hookRepository,
    infra.fileSystem,
    runtime.scriptAbsolutePath
  );

  // Generate script content for InstallHookUseCase
  const scriptContent = infra.hookScriptGenerator.generate({
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

  // PlaySoundUseCase
  const playSoundUseCase = new PlaySoundUseCase(
    infra.soundPlayer,
    infra.configProvider
  );

  return {
    hookInstallationOrchestrator,
    checkHookStatusUseCase,
    installHookUseCase,
    uninstallHookUseCase,
    playSoundUseCase,
  };
}
