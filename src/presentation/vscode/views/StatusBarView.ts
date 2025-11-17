import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { CheckHookStatusUseCase } from '../../../application/usecases/CheckHookStatusUseCase';
import { TYPES } from '../../../shared/types';

/**
 * Status bar view for hook installation status
 * Manages the VSCode status bar item display
 */
@injectable()
export class StatusBarView {
  constructor(
    @inject(TYPES.StatusBarItem) private readonly statusBarItem: vscode.StatusBarItem,
    @inject(TYPES.CheckHookStatusUseCase) private readonly checkStatusUseCase: CheckHookStatusUseCase
  ) {}

  /**
   * Update status bar based on hook installation status
   */
  async update(): Promise<void> {
    try {
      const status = await this.checkStatusUseCase.execute();

      // We always install all 7 SUPPORTED_HOOKS when installed
      const hookCount = status.hooksRegistered ? 7 : 0;

      if (status.isInstalled) {
        this.statusBarItem.text = `$(bell) CC Ring (${hookCount})`;
        this.statusBarItem.tooltip = vscode.l10n.t(
          '{0} hook(s) installed',
          hookCount
        );
        this.statusBarItem.backgroundColor = undefined;
      } else {
        this.statusBarItem.text = '$(bell-slash) CC Ring';
        this.statusBarItem.tooltip = vscode.l10n.t('No hooks installed');
        this.statusBarItem.backgroundColor = new vscode.ThemeColor(
          'statusBarItem.warningBackground'
        );
      }

      this.statusBarItem.show();
    } catch (error) {
      console.error('Failed to update status bar:', error);
      this.statusBarItem.text = '$(bell-slash) CC Ring';
      this.statusBarItem.tooltip = vscode.l10n.t('Error checking hook status');
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
      this.statusBarItem.show();
    }
  }

  /**
   * Hide the status bar item
   */
  hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Show the status bar item
   */
  show(): void {
    this.statusBarItem.show();
  }

  /**
   * Dispose the status bar item
   */
  dispose(): void {
    this.statusBarItem.dispose();
  }
}
