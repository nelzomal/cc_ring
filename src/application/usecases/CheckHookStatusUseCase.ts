import { IHookRepository } from '@application/ports/IHookRepository';
import { IFileSystem } from '@application/ports/IFileSystem';

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
export class CheckHookStatusUseCase {
  constructor(
    private readonly hookRepository: IHookRepository,
    private readonly fileWriter: IFileSystem,
    private readonly scriptPath: string
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
