import { HookInstallationError } from "@application/errors/HookInstallationError";
import { IFileSystem } from "@application/ports/IFileSystem";
import { IHookRepository } from "@application/ports/IHookRepository";
import { ILockManager } from "@application/ports/ILockManager";

/**
 * Parameters for hook installation operation.
 */
export interface InstallParams {
  /** Script file content to write */
  scriptContent: string;
  /** Path to the hook script file */
  scriptPath: string;
  /** Path to the configuration file */
  configPath: string;
  /** Configuration object to write to config file */
  configContent: object;
}

/**
 * Parameters for hook uninstallation operation.
 */
export interface UninstallParams {
  /** Path to the hook script file */
  scriptPath: string;
  /** Path to the configuration file */
  configPath: string;
}

/**
 * Application service that orchestrates atomic multi-file operations
 * for hook installation and uninstallation.
 *
 * Responsibilities:
 * - Coordinate atomic writes to 3 files: config.json, script.sh, settings.json
 * - Acquire coordination lock to prevent concurrent operations
 * - Detect conflicts with external modifications (Claude Code CLI, manual edits)
 * - Cleanup on failure (delete files written before failure)
 * - Provide clear error messages for different failure scenarios
 *
 * Design: Write settings.json LAST
 * - If settings.json write fails, we just cleanup other files and user retries
 * - No complex rollback of settings.json needed
 * - Simpler failure recovery
 */
export class HookInstallationOrchestrator {
  constructor(
    private readonly lockManager: ILockManager,
    private readonly fileWriter: IFileSystem,
    private readonly hookRepository: IHookRepository,
    private readonly settingsPath: string,
    private readonly coordinationLockPath: string,
    private readonly scriptRelativePath: string
  ) {}

  /**
   * Install hooks atomically across 3 files.
   *
   * Operation order (settings.json LAST):
   * 1. Acquire coordination lock
   * 2. Record settings.json mtime (for conflict detection)
   * 3. Write cc-ring-config.json
   * 4. Write cc-ring-hook.sh (on failure: delete config.json)
   * 5. Check settings.json mtime (detect external modifications)
   * 6. Write settings.json (on failure: delete script + config)
   * 7. Release lock
   *
   * @param params - Installation parameters
   * @throws HookInstallationError on failure (including external modification conflicts)
   */
  async install(params: InstallParams): Promise<void> {
    return this.lockManager.withLock(this.coordinationLockPath, async () => {
      // Record mtime before any operations for conflict detection
      const beforeMtime = await this.getSettingsMtimeSafe();

      let configWritten = false;
      let scriptWritten = false;

      try {
        // Step 1: Write config file atomically
        await this.fileWriter.writeFileAtomic(
          params.configPath,
          JSON.stringify(params.configContent, null, 2),
          { createIfMissing: true, overwrite: true }
        );
        configWritten = true;

        // Step 2: Write script file atomically with executable permissions
        await this.fileWriter.writeFileAtomic(
          params.scriptPath,
          params.scriptContent,
          { createIfMissing: true, overwrite: true, mode: 0o755 }
        );
        scriptWritten = true;

        // Step 3: Detect conflicts before writing settings.json
        const currentMtime = await this.getSettingsMtimeSafe();
        if (
          beforeMtime !== null &&
          currentMtime !== null &&
          currentMtime !== beforeMtime
        ) {
          throw new HookInstallationError(
            "settings.json was modified by another process during the operation. " +
              "This may be Claude Code CLI or manual edits. " +
              "Please retry the operation."
          );
        }

        // Step 4: Write settings.json (uses repository's own lock)
        // Repository will generate hook groups for all SUPPORTED_HOOKS using scriptRelativePath
        // Use relative path (~/...) for portability in settings.json
        // This is the final step - if it fails, we cleanup and user retries
        await this.hookRepository.install(this.scriptRelativePath);
      } catch (error) {
        // Cleanup files written before failure
        await this.cleanupInstallation(
          configWritten,
          scriptWritten,
          params.configPath,
          params.scriptPath
        );

        throw error;
      }
    });
  }

  /**
   * Uninstall hooks atomically across 3 files.
   *
   * Operation order:
   * 1. Acquire coordination lock
   * 2. Write settings.json (remove hooks)
   * 3. Delete cc-ring-config.json (ignore if missing)
   * 4. Delete cc-ring-hook.sh (ignore if missing)
   * 5. Release lock
   *
   * @param params - Uninstallation parameters
   * @throws HookInstallationError on failure
   */
  async uninstall(params: UninstallParams): Promise<void> {
    return this.lockManager.withLock(this.coordinationLockPath, async () => {
      // Remove all CC Ring hooks from settings.json
      await this.hookRepository.uninstall();

      // Then cleanup files (best-effort, ignore errors)
      await this.deleteFileSafe(params.configPath);
      await this.deleteFileSafe(params.scriptPath);
    });
  }

  /**
   * Get settings.json modification time safely.
   * Returns null if file doesn't exist.
   */
  private async getSettingsMtimeSafe(): Promise<number | null> {
    return this.fileWriter.getFileMtime(this.settingsPath);
  }

  /**
   * Cleanup files written during failed installation.
   * Best-effort cleanup - logs errors but doesn't throw.
   */
  private async cleanupInstallation(
    configWritten: boolean,
    scriptWritten: boolean,
    configPath: string,
    scriptPath: string
  ): Promise<void> {
    const errors: Error[] = [];

    if (configWritten) {
      try {
        await this.fileWriter.deleteFile(configPath);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (scriptWritten) {
      try {
        await this.fileWriter.deleteFile(scriptPath);
      } catch (error) {
        errors.push(error as Error);
      }
    }

    if (errors.length > 0) {
      console.error("Cleanup failed (some files may remain):", errors);
    }
  }

  /**
   * Delete file safely - doesn't throw if file doesn't exist.
   */
  private async deleteFileSafe(filePath: string): Promise<void> {
    try {
      await this.fileWriter.deleteFile(filePath);
    } catch (error) {
      // Ignore - file may not exist or already deleted
    }
  }
}
