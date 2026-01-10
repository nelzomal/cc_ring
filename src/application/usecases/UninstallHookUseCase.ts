import { HookInstallationError } from '@application/errors/HookInstallationError';
import { HookRepositoryError } from '@application/errors/HookRepositoryError';
import { HookInstallationOrchestrator } from '@application/services/HookInstallationOrchestrator';

/**
 * Use case: Uninstall hook script and unregister all hooks from Claude Code settings
 *
 * Responsibilities:
 * - Delegate to orchestrator for atomic multi-file cleanup
 * - Orchestrator handles all file operations and locking
 */
export class UninstallHookUseCase {
  constructor(
    private readonly orchestrator: HookInstallationOrchestrator,
    private readonly scriptPath: string,
    private readonly configPath: string
  ) {}

  async execute(): Promise<void> {
    try {
      // Delegate to orchestrator for atomic multi-file cleanup
      // Orchestrator handles:
      // 1. Remove hooks from settings.json
      // 2. Delete cc-ring-config.json
      // 3. Delete cc-ring-hook.sh
      // All operations are atomic under coordination lock
      await this.orchestrator.uninstall({
        scriptPath: this.scriptPath,
        configPath: this.configPath
      });

    } catch (error) {
      if (error instanceof HookInstallationError) {
        throw error;
      }
      if (error instanceof HookRepositoryError) {
        throw new HookInstallationError(
          `Cannot uninstall: ${error.message}`,
          error
        );
      }
      throw new HookInstallationError(
        'Failed to uninstall hooks',
        error as Error
      );
    }
  }
}
