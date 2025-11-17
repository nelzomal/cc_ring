import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { PlaySoundUseCase } from '../../../application/usecases/PlaySoundUseCase';
import { SoundValidationError } from '../../../domain/errors/SoundValidationError';
import { TYPES } from '../../../shared/types';

/**
 * Command controller for testing sound playback
 * Thin wrapper around PlaySoundUseCase that handles VSCode UI
 */
@injectable()
export class TestSoundCommand {
  constructor(
    @inject(TYPES.PlaySoundUseCase) private readonly useCase: PlaySoundUseCase
  ) {}

  async execute(): Promise<void> {
    try {
      // Execute use case
      await this.useCase.execute();

      // Show success message
      vscode.window.showInformationMessage(
        vscode.l10n.t('Sound test completed!')
      );
    } catch (error) {
      // Handle errors
      if (error instanceof SoundValidationError) {
        vscode.window.showErrorMessage(
          vscode.l10n.t('Invalid sound configuration: {0}', error.message)
        );
      } else {
        vscode.window.showErrorMessage(
          vscode.l10n.t('Failed to play sound: {0}', String(error))
        );
      }
      throw error;
    }
  }
}
