import * as vscode from "vscode";
import { IFileSystem } from "@application/ports/IFileSystem";
import { IHookRepository } from "@application/ports/IHookRepository";
import { IConfigProvider } from "@application/ports/IConfigProvider";
import { ISoundPlayer } from "@application/ports/ISoundPlayer";
import { ILockManager } from "@application/ports/ILockManager";
import { HookScriptGenerator } from "@infrastructure/services/HookScriptGenerator";
import { HookInstallationOrchestrator } from "@application/services/HookInstallationOrchestrator";
import { InstallHookUseCase } from "@application/usecases/InstallHookUseCase";
import { UninstallHookUseCase } from "@application/usecases/UninstallHookUseCase";
import { PlaySoundUseCase } from "@application/usecases/PlaySoundUseCase";
import { InstallHookCommand } from "@presentation/vscode/commands/InstallHookCommand";
import { UninstallHookCommand } from "@presentation/vscode/commands/UninstallHookCommand";

/**
 * Runtime configuration - paths and constants computed from extension context
 */
export interface RuntimeConfig {
  readonly scriptAbsolutePath: string;
  readonly scriptRelativePath: string;
  readonly bundledSoundsDir: string;
  readonly extensionPath: string;
  readonly claudeDir: string;
  readonly configPath: string;
  readonly errorLogPath: string;
  readonly hookLogPath: string;
  readonly settingsPath: string;
  readonly coordinationLockPath: string;
  readonly hookTimeout: number;
}

/**
 * VSCode runtime objects - provided by VSCode, cannot be constructed
 */
export interface VSCodeRuntime {
  readonly context: vscode.ExtensionContext;
}

/**
 * Infrastructure layer dependencies - port implementations (adapters)
 */
export interface InfraDeps {
  readonly fileSystem: IFileSystem;
  readonly hookRepository: IHookRepository;
  readonly soundPlayer: ISoundPlayer;
  readonly configProvider: IConfigProvider;
  readonly lockManager: ILockManager;
  readonly hookScriptGenerator: HookScriptGenerator;
}

/**
 * Application layer dependencies - services and use cases
 */
export interface AppLayerDeps {
  readonly hookInstallationOrchestrator: HookInstallationOrchestrator;
  readonly installHookUseCase: InstallHookUseCase;
  readonly uninstallHookUseCase: UninstallHookUseCase;
  readonly playSoundUseCase: PlaySoundUseCase;
}

/**
 * Presentation layer dependencies - commands
 */
export interface PresentationDeps {
  readonly installHookCommand: InstallHookCommand;
  readonly uninstallHookCommand: UninstallHookCommand;
}

/**
 * Complete application dependency graph
 */
export interface AppDeps {
  readonly runtime: RuntimeConfig;
  readonly vscode: VSCodeRuntime;
  readonly infra: InfraDeps;
  readonly app: AppLayerDeps;
  readonly presentation: PresentationDeps;
}
