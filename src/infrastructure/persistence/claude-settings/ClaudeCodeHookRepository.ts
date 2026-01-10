import { IFileSystem } from "@application/ports/IFileSystem";
import { IHookRepository } from "@application/ports/IHookRepository";
import { ILockManager } from "@application/ports/ILockManager";
import {
  HookEventType,
  SUPPORTED_HOOKS,
} from "@domain/valueObjects/hook";
import {
  HOOK_EVENT_TYPE_TO_KEY,
  HookGroup,
  hasCCRingHooks,
  installCCRingHooks,
  isCCRingGroup,
  readSettingsInfraDTO,
  removeAllCCRingHooksAndCleanup,
  writeSettingsInfraDTO,
} from "./util";

/**
 * Repository for persisting CC Ring hooks to Claude Code settings.json
 * Implements IHookRepository from application layer
 *
 * Responsibilities:
 * 1. File I/O: Read/write ~/.claude/settings.json
 * 2. DTO Validation: Validate external file format with Zod
 * 3. Hook Generation: Use SUPPORTED_HOOKS to generate hook groups from script path
 * 4. Filtering: Separate CC Ring hooks from other hooks
 * 5. Merging: Combine CC Ring hooks with existing non-CC-Ring hooks
 * 6. JSON Conventions: Deduplication, cleanup empty arrays
 *
 * Data Flow:
 * Application (scriptPath) → Repository (generates hook groups using SUPPORTED_HOOKS) → ClaudeCodeSettingsDTO → File
 */
export class ClaudeCodeHookRepository implements IHookRepository {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly settingsPath: string,
    private readonly scriptRelativePath: string,
    private readonly lockManager: ILockManager,
    private readonly coordinationLockPath: string,
    private readonly hookTimeout: number
  ) {}

  /**
   * Check if CC Ring hooks are installed in settings.json
   */
  async isInstalled(): Promise<boolean> {
    return this.lockManager.withLock(this.coordinationLockPath, async () => {
      const infraDTO = await readSettingsInfraDTO(
        this.fileSystem,
        this.settingsPath
      );

      if (!infraDTO.hooks) {
        return false;
      }

      // AI_FIXME move to util and make sure all EventTypes are installed, if partial installation, then throw error and show user
      // Check if any CC Ring hooks exist in any event type
      return Object.values(HookEventType).some((eventType) => {
        const key = HOOK_EVENT_TYPE_TO_KEY[eventType];
        const groups = infraDTO.hooks?.[key] as HookGroup[] | undefined;
        return (
          groups?.some((group) =>
            isCCRingGroup(group, this.scriptRelativePath)
          ) ?? false
        );
      });
    });
  }

  /**
   * Install CC Ring hooks to settings.json
   * Generates hook groups for all SUPPORTED_HOOKS using the provided script path
   */
  async install(scriptPath: string): Promise<void> {
    // Note: Lock is managed by HookInstallationOrchestrator, not here
    // Read existing settings
    const infraDTO = await readSettingsInfraDTO(
      this.fileSystem,
      this.settingsPath
    );

    // Remove all existing CC Ring hooks and cleanup
    removeAllCCRingHooksAndCleanup(infraDTO, this.scriptRelativePath);

    // Install new CC Ring hooks with merge logic (handles structure and deduplication)
    installCCRingHooks(infraDTO, scriptPath, this.hookTimeout, SUPPORTED_HOOKS);

    // Write back to file
    await writeSettingsInfraDTO(this.fileSystem, this.settingsPath, infraDTO);
  }

  /**
   * Remove all CC Ring hooks from settings.json
   */
  async uninstall(): Promise<void> {
    // Note: Lock is managed by HookInstallationOrchestrator, not here
    const infraDTO = await readSettingsInfraDTO(
      this.fileSystem,
      this.settingsPath
    );

    // Check if there are CC Ring hooks to uninstall
    if (!hasCCRingHooks(infraDTO, this.scriptRelativePath)) {
      return; // Nothing to uninstall
    }

    // Remove all CC Ring hooks and cleanup
    removeAllCCRingHooksAndCleanup(infraDTO, this.scriptRelativePath);

    // Write back to file
    await writeSettingsInfraDTO(this.fileSystem, this.settingsPath, infraDTO);
  }
}
