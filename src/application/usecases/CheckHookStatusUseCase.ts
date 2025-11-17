import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { IHookRepository } from '../ports/IHookRepository';
import { IFileSystem } from '../ports/IFileSystem';
import { TYPES } from '../../shared/types';

/**
 * Hook status information
 */
export interface HookStatus {
  isInstalled: boolean;
  scriptExists: boolean;
  hooksRegistered: boolean;
}

/**
 * Use case: Check if hooks are currently installed
 */
@injectable()
export class CheckHookStatusUseCase {
  constructor(
    @inject(TYPES.IHookRepository) private readonly hookRepository: IHookRepository,
    @inject(TYPES.IFileSystem) private readonly fileWriter: IFileSystem,
    @inject(TYPES.ScriptPath) private readonly scriptPath: string
  ) {}

  async execute(): Promise<HookStatus> {
    // Check if hook script file exists
    const scriptExists = this.fileWriter.fileExists(this.scriptPath);

    // Check if hooks are registered in settings.json
    const hooksRegistered = await this.hookRepository.isInstalled();

    return {
      isInstalled: scriptExists && hooksRegistered,
      scriptExists,
      hooksRegistered
    };
  }
}
