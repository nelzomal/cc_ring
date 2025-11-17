import { Container } from "inversify";
import * as os from "os";
import * as path from "path";
import "reflect-metadata";
import * as vscode from "vscode";
import { TYPES } from "../../shared/types";

// Application Layer
import { IFileSystem } from "../../application/ports/IFileSystem";
import { IHookRepository } from "../../application/ports/IHookRepository";
import { IConfigProvider } from "../../application/ports/IConfigProvider";
import { ISoundPlayer } from "../../application/ports/ISoundPlayer";
import { ILockManager } from "../../application/ports/ILockManager";
import { CheckHookStatusUseCase } from "../../application/usecases/CheckHookStatusUseCase";
import { InstallHookUseCase } from "../../application/usecases/InstallHookUseCase";
import { PlaySoundUseCase } from "../../application/usecases/PlaySoundUseCase";
import { UninstallHookUseCase } from "../../application/usecases/UninstallHookUseCase";
import { HookInstallationOrchestrator } from "../../application/services/HookInstallationOrchestrator";

// Infrastructure Layer
import { LockManager } from "../../infrastructure/adapters/utilities/LockManager";
import { HookScriptGenerator } from "../../infrastructure/services/HookScriptGenerator";
import { ClaudeCodeHookRepository } from "../../infrastructure/persistence/claude-settings/ClaudeCodeHookRepository";
import { FileSystem } from "../../infrastructure/adapters/file-system/FileSystem";
import { AfplaySoundPlayer } from "../../infrastructure/adapters/sound/AfplaySoundPlayer";
import { VSCodeConfigProvider } from "../../infrastructure/adapters/config/VSCodeConfigProvider";

// Presentation Layer
import { InstallHookCommand } from "../vscode/commands/InstallHookCommand";
import { TestSoundCommand } from "../vscode/commands/TestSoundCommand";
import { UninstallHookCommand } from "../vscode/commands/UninstallHookCommand";
import { StatusBarView } from "../vscode/views/StatusBarView";

/**
 * Create and configure the InversifyJS container
 *
 * This is the composition root of the application - the only place where we
 * instantiate concrete classes and wire dependencies together.
 *
 * @param context - VSCode extension context
 * @param statusBarItem - VSCode status bar item instance
 * @returns Configured InversifyJS container
 */
export function createContainer(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem
): Container {
  const container = new Container();

  // ============================================================================
  // RUNTIME VALUES
  // ============================================================================

  const claudeDir = path.join(os.homedir(), ".claude");
  const hookScriptPath = path.join(claudeDir, "cc-ring-hook.sh");
  const soundsDir = path.join(context.extensionPath, "sounds");
  const configPath = path.join(claudeDir, "cc-ring-config.json");
  const errorLogPath = path.join(claudeDir, "cc-ring-error.log");
  const hookLogPath = path.join(claudeDir, "cc-ring-hook.log");
  const settingsPath = path.join(claudeDir, "settings.json");
  const coordinationLockPath = path.join(claudeDir, "cc-ring.lock");

  // Bind constant values
  container.bind<string>(TYPES.ScriptPath).toConstantValue(hookScriptPath);
  container.bind<string>(TYPES.BundledSoundsDir).toConstantValue(soundsDir);
  container
    .bind<string>(TYPES.ExtensionPath)
    .toConstantValue(context.extensionPath);
  container
    .bind<vscode.StatusBarItem>(TYPES.StatusBarItem)
    .toConstantValue(statusBarItem);
  container.bind<string>(TYPES.ConfigPath).toConstantValue(configPath);
  container.bind<string>(TYPES.ErrorLogPath).toConstantValue(errorLogPath);
  container.bind<string>(TYPES.HookLogPath).toConstantValue(hookLogPath);
  container.bind<string>(TYPES.SettingsPath).toConstantValue(settingsPath);
  container
    .bind<string>(TYPES.CoordinationLockPath)
    .toConstantValue(coordinationLockPath);

  // ============================================================================
  // DOMAIN LAYER
  // ============================================================================

  // (No domain singletons - domain objects created as needed)

  // ============================================================================
  // APPLICATION LAYER
  // ============================================================================

  // Services
  container
    .bind<HookInstallationOrchestrator>(TYPES.HookInstallationOrchestrator)
    .to(HookInstallationOrchestrator)
    .inSingletonScope();

  // Use Cases
  container
    .bind<InstallHookUseCase>(TYPES.InstallHookUseCase)
    .to(InstallHookUseCase)
    .inSingletonScope();

  container
    .bind<UninstallHookUseCase>(TYPES.UninstallHookUseCase)
    .to(UninstallHookUseCase)
    .inSingletonScope();

  container
    .bind<CheckHookStatusUseCase>(TYPES.CheckHookStatusUseCase)
    .to(CheckHookStatusUseCase)
    .inSingletonScope();

  container
    .bind<PlaySoundUseCase>(TYPES.PlaySoundUseCase)
    .to(PlaySoundUseCase)
    .inSingletonScope();

  // ============================================================================
  // INFRASTRUCTURE LAYER
  // ============================================================================

  // Repositories
  container
    .bind<IFileSystem>(TYPES.IFileSystem)
    .to(FileSystem)
    .inSingletonScope();

  container
    .bind<IHookRepository>(TYPES.IHookRepository)
    .to(ClaudeCodeHookRepository)
    .inSingletonScope();

  // Services
  container
    .bind<ISoundPlayer>(TYPES.ISoundPlayer)
    .to(AfplaySoundPlayer)
    .inSingletonScope();

  container
    .bind<IConfigProvider>(TYPES.IConfigProvider)
    .to(VSCodeConfigProvider)
    .inSingletonScope();

  // Lock Manager
  container
    .bind<ILockManager>(TYPES.ILockManager)
    .to(LockManager)
    .inSingletonScope();

  // Helpers
  container
    .bind<HookScriptGenerator>(TYPES.HookScriptGenerator)
    .to(HookScriptGenerator)
    .inSingletonScope();

  // Script Content (Dynamic Value)
  // Script content depends on HookScriptGenerator, so we use toDynamicValue
  container
    .bind<string>(TYPES.ScriptContent)
    .toDynamicValue((ctx) => {
      const generator = ctx.container.get<HookScriptGenerator>(
        TYPES.HookScriptGenerator
      );
      // Resolve runtime values from container (not closures)
      const configPath = ctx.container.get<string>(TYPES.ConfigPath);
      const soundsDir = ctx.container.get<string>(TYPES.BundledSoundsDir);
      const errorLogPath = ctx.container.get<string>(TYPES.ErrorLogPath);
      const hookLogPath = ctx.container.get<string>(TYPES.HookLogPath);

      return generator.generate({
        configPath,
        defaultSoundPath: path.join(soundsDir, "complete.wav"),
        errorLogPath,
        hookLogPath,
      });
    })
    .inSingletonScope();

  // ============================================================================
  // PRESENTATION LAYER
  // ============================================================================

  // Commands
  container
    .bind<InstallHookCommand>(TYPES.InstallHookCommand)
    .to(InstallHookCommand)
    .inSingletonScope();

  container
    .bind<UninstallHookCommand>(TYPES.UninstallHookCommand)
    .to(UninstallHookCommand)
    .inSingletonScope();

  container
    .bind<TestSoundCommand>(TYPES.TestSoundCommand)
    .to(TestSoundCommand)
    .inSingletonScope();

  // Views
  container
    .bind<StatusBarView>(TYPES.StatusBarView)
    .to(StatusBarView)
    .inSingletonScope();

  return container;
}
