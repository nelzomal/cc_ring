import { HookInstallationError } from '@application/errors/HookInstallationError';
import { HookRepositoryError } from '@application/errors/HookRepositoryError';
import { IConfigProvider } from '@application/ports/IConfigProvider';
import { HookInstallationOrchestrator } from '@application/services/HookInstallationOrchestrator';

/**
 * Use case: Install hook script and register hooks in Claude Code settings
 *
 * Responsibilities:
 * - Prepare configuration data (sound path, volume)
 * - Delegate to orchestrator for atomic multi-file write
 * - Orchestrator uses repository to install hooks for all SUPPORTED_HOOKS
 */
export class InstallHookUseCase {
  constructor(
    private readonly orchestrator: HookInstallationOrchestrator,
    private readonly configProvider: IConfigProvider,
    private readonly scriptPath: string,
    private readonly configPath: string,
    private readonly scriptContent: string
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
