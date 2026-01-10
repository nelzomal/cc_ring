import * as vscode from 'vscode';
import { HookInstallationError } from '@application/errors/HookInstallationError';
import { UninstallHookUseCase } from '@application/usecases/UninstallHookUseCase';

/**
 * Command controller for uninstalling hooks
 * Thin wrapper around UninstallHookUseCase that handles VSCode UI
 */
export class UninstallHookCommand {
  constructor(private readonly useCase: UninstallHookUseCase) {}

  async execute(): Promise<void> {
    try {
      // Execute use case
      await this.useCase.execute();

      // Show success message
      vscode.window.showInformationMessage(
        vscode.l10n.t('CC Ring hooks uninstalled successfully!')
      );
    } catch (error) {
      // Handle errors - some errors are warnings (e.g., corrupted settings)
      if (error instanceof HookInstallationError) {
        vscode.window.showWarningMessage(
          vscode.l10n.t('Warning: {0}', error.message)
        );
      } else {
        vscode.window.showErrorMessage(
          vscode.l10n.t('Failed to uninstall hooks: {0}', String(error))
        );
        throw error;
      }
    }
  }
}
