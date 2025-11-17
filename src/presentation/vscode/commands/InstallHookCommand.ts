import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { HookInstallationError } from '../../../application/errors/HookInstallationError';
import { InstallHookUseCase } from '../../../application/usecases/InstallHookUseCase';
import { TYPES } from '../../../shared/types';

/**
 * Command controller for installing hooks
 * Thin wrapper around InstallHookUseCase that handles VSCode UI
 */
@injectable()
export class InstallHookCommand {
  constructor(
    @inject(TYPES.InstallHookUseCase) private readonly installUseCase: InstallHookUseCase
  ) {}

  async execute(): Promise<void> {
    try {
      // Execute use case - installs all supported hooks
      await this.installUseCase.execute();

      // Show success message
      vscode.window.showInformationMessage(
        vscode.l10n.t('CC Ring hooks installed successfully!')
      );
    } catch (error) {
      // Handle errors
      if (error instanceof HookInstallationError) {
        vscode.window.showErrorMessage(
          vscode.l10n.t('Failed to install hooks: {0}', error.message)
        );
      } else {
        vscode.window.showErrorMessage(
          vscode.l10n.t('Unexpected error: {0}', String(error))
        );
      }
      throw error;
    }
  }
}
