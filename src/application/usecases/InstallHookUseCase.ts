import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { HookInstallationError } from '../errors/HookInstallationError';
import { HookRepositoryError } from '../errors/HookRepositoryError';
import { IConfigProvider } from '../ports/IConfigProvider';
import { HookInstallationOrchestrator } from '../services/HookInstallationOrchestrator';
import { TYPES } from '../../shared/types';

/**
 * Use case: Install hook script and register hooks in Claude Code settings
 *
 * Responsibilities:
 * - Prepare configuration data (sound path, volume)
 * - Delegate to orchestrator for atomic multi-file write
 * - Orchestrator uses repository to install hooks for all SUPPORTED_HOOKS
 */
@injectable()
export class InstallHookUseCase {
  constructor(
    @inject(TYPES.HookInstallationOrchestrator) private readonly orchestrator: HookInstallationOrchestrator,
    @inject(TYPES.IConfigProvider) private readonly configProvider: IConfigProvider,
    @inject(TYPES.ScriptPath) private readonly scriptPath: string,
    @inject(TYPES.ConfigPath) private readonly configPath: string,
    @inject(TYPES.ScriptContent) private readonly scriptContent: string
  ) {}

  async execute(): Promise<void> {
    try {
      // Step 1: Prepare configuration file content
      const soundConfig = this.configProvider.getSoundConfig();
      const configContent = {
        soundPath: soundConfig.getPath(),
        volume: soundConfig.getVolumeDecimal().toString()
      };

      // Step 2: Delegate to orchestrator for atomic multi-file write
      // Orchestrator handles: config.json → script.sh → settings.json (in that order)
      // Repository will automatically install all SUPPORTED_HOOKS with scriptPath
      // If any step fails, orchestrator cleans up files written so far
      await this.orchestrator.install({
        scriptContent: this.scriptContent,
        scriptPath: this.scriptPath,
        configPath: this.configPath,
        configContent: configContent
      });

    } catch (error) {
      if (error instanceof HookInstallationError) {
        throw error;
      }
      if (error instanceof HookRepositoryError) {
        throw new HookInstallationError(
          `Cannot install: ${error.message}`,
          error
        );
      }
      throw new HookInstallationError(
        'Failed to install hooks',
        error as Error
      );
    }
  }
}
