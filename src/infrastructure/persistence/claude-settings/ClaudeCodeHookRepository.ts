import { parse as jsonlintParse } from "@prantlf/jsonlint";
import { inject, injectable } from "inversify";
import { lock } from "proper-lockfile";
import "reflect-metadata";
import { HookRepositoryError } from "../../../application/errors/HookRepositoryError";
import { IFileSystem } from "../../../application/ports/IFileSystem";
import { IHookRepository } from "../../../application/ports/IHookRepository";
import { TYPES } from "../../../shared/types";
import { SUPPORTED_HOOKS, HookEventType } from "../../../domain/valueObjects/hook";
import {
  ClaudeCodeSettingsDTO,
  ClaudeCodeSettingsDTOSchema,
  HookGroupDTO as HookGroupInfraDTO,
  MatcherHookGroupDTO as MatcherHookGroupInfraDTO,
  HookCommandDTO as HookCommandInfraDTO,
} from "./dto";

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
@injectable()
export class ClaudeCodeHookRepository implements IHookRepository {
  private readonly LOCK_OPTIONS = {
    retries: {
      retries: 5,
      minTimeout: 100,
      maxTimeout: 1000,
    },
    stale: 10000,
  };

  constructor(
    @inject(TYPES.IFileSystem) private readonly fileSystem: IFileSystem,
    @inject(TYPES.SettingsPath) private readonly settingsPath: string
  ) {}

  /**
   * Check if CC Ring hooks are installed in settings.json
   */
  async isInstalled(): Promise<boolean> {
    const release = await lock(this.settingsPath, this.LOCK_OPTIONS);

    try {
      const infraDTO = await this.readSettingsInfraDTO();

      if (!infraDTO.hooks) {
        return false;
      }

      // Check if any CC Ring hooks exist in any event type
      const hasStopHooks = infraDTO.hooks.Stop?.some((group) => this.isCCRingGroup(group)) ?? false;
      const hasNotificationHooks = infraDTO.hooks.Notification?.some((group) => this.isCCRingMatcherGroup(group)) ?? false;
      const hasPreToolUseHooks = infraDTO.hooks.PreToolUse?.some((group) => this.isCCRingMatcherGroup(group)) ?? false;

      return hasStopHooks || hasNotificationHooks || hasPreToolUseHooks;
    } finally {
      await release();
    }
  }

  /**
   * Install CC Ring hooks to settings.json
   * Generates hook groups for all SUPPORTED_HOOKS using the provided script path
   */
  async install(scriptPath: string): Promise<void> {
    const release = await lock(this.settingsPath, this.LOCK_OPTIONS);

    try {
      // Read existing settings
      const infraDTO = await this.readSettingsInfraDTO();

      // Ensure hooks structure exists
      if (!infraDTO.hooks) {
        infraDTO.hooks = {};
      }

      // Remove all existing CC Ring hooks
      if (infraDTO.hooks.Stop) {
        infraDTO.hooks.Stop = infraDTO.hooks.Stop.filter((group) => !this.isCCRingGroup(group));
      }
      if (infraDTO.hooks.Notification) {
        infraDTO.hooks.Notification = infraDTO.hooks.Notification.filter(
          (group) => !this.isCCRingMatcherGroup(group)
        );
      }
      if (infraDTO.hooks.PreToolUse) {
        infraDTO.hooks.PreToolUse = infraDTO.hooks.PreToolUse.filter(
          (group) => !this.isCCRingMatcherGroup(group)
        );
      }

      // Generate hook command from script path
      const hookCommand: HookCommandInfraDTO = {
        type: "command",
        command: scriptPath,
        timeout: 5,
      };

      // Add new CC Ring hooks for all SUPPORTED_HOOKS
      for (const supportedHook of SUPPORTED_HOOKS) {
        if (supportedHook.eventType === HookEventType.Stop) {
          // Stop hooks don't have matchers
          if (!infraDTO.hooks.Stop) {
            infraDTO.hooks.Stop = [];
          }
          infraDTO.hooks.Stop.push({
            hooks: [hookCommand],
          });
        } else if (supportedHook.eventType === HookEventType.Notification) {
          // Notification hooks have matchers
          if (!infraDTO.hooks.Notification) {
            infraDTO.hooks.Notification = [];
          }
          infraDTO.hooks.Notification.push({
            matcher: supportedHook.matcher as string,
            hooks: [hookCommand],
          });
        } else if (supportedHook.eventType === HookEventType.PreToolUse) {
          // PreToolUse hooks have matchers
          if (!infraDTO.hooks.PreToolUse) {
            infraDTO.hooks.PreToolUse = [];
          }
          infraDTO.hooks.PreToolUse.push({
            matcher: supportedHook.matcher as string,
            hooks: [hookCommand],
          });
        }
      }

      // Apply JSON conventions (deduplication, cleanup)
      this.removeDuplicates(infraDTO);
      this.cleanupEmptyStructures(infraDTO);

      // Write back to file
      await this.writeSettingsInfraDTO(infraDTO);
    } finally {
      await release();
    }
  }

  /**
   * Remove all CC Ring hooks from settings.json
   */
  async uninstall(): Promise<void> {
    const release = await lock(this.settingsPath, this.LOCK_OPTIONS);

    try {
      const infraDTO = await this.readSettingsInfraDTO();

      if (!infraDTO.hooks) {
        return; // Nothing to uninstall
      }

      // Remove all CC Ring hooks
      if (infraDTO.hooks.Stop) {
        infraDTO.hooks.Stop = infraDTO.hooks.Stop.filter((group) => !this.isCCRingGroup(group));
      }
      if (infraDTO.hooks.Notification) {
        infraDTO.hooks.Notification = infraDTO.hooks.Notification.filter(
          (group) => !this.isCCRingMatcherGroup(group)
        );
      }
      if (infraDTO.hooks.PreToolUse) {
        infraDTO.hooks.PreToolUse = infraDTO.hooks.PreToolUse.filter(
          (group) => !this.isCCRingMatcherGroup(group)
        );
      }

      // Cleanup empty structures
      this.cleanupEmptyStructures(infraDTO);

      // Write back to file
      await this.writeSettingsInfraDTO(infraDTO);
    } finally {
      await release();
    }
  }

  /**
   * Read and validate settings.json as ClaudeCodeSettingsDTO
   */
  private async readSettingsInfraDTO(): Promise<ClaudeCodeSettingsDTO> {
    if (!this.fileSystem.fileExists(this.settingsPath)) {
      return {};
    }

    const content = await this.fileSystem.readFile(this.settingsPath, "utf8");

    // Handle empty file
    if (!content || content.trim() === "") {
      return {};
    }

    try {
      // Parse JSON with duplicate key detection
      const parsed = jsonlintParse(content, {
        allowDuplicateObjectKeys: false,
      });

      // Validate structure with Zod
      const validated = ClaudeCodeSettingsDTOSchema.parse(parsed);

      return validated;
    } catch (error) {
      throw new HookRepositoryError(
        "Hook storage file corrupted at ~/.claude/settings.json. Please fix or delete it manually.",
        error as Error
      );
    }
  }

  /**
   * Write ClaudeCodeSettingsDTO to settings.json
   */
  private async writeSettingsInfraDTO(infraDTO: ClaudeCodeSettingsDTO): Promise<void> {
    // Validate before writing
    ClaudeCodeSettingsDTOSchema.parse(infraDTO);

    const content = JSON.stringify(infraDTO, null, 2);
    await this.fileSystem.writeFileAtomic(this.settingsPath, content);
  }

  /**
   * Check if a HookCommandInfraDTO belongs to CC Ring
   */
  private isCCRingCommand(cmd: HookCommandInfraDTO): boolean {
    return cmd.command?.includes("cc-ring-hook") || false;
  }

  /**
   * Check if a HookGroupInfraDTO contains any CC Ring hooks
   */
  private isCCRingGroup(group: HookGroupInfraDTO): boolean {
    return group.hooks.some((hook) => this.isCCRingCommand(hook));
  }

  /**
   * Check if a MatcherHookGroupInfraDTO contains any CC Ring hooks
   */
  private isCCRingMatcherGroup(group: MatcherHookGroupInfraDTO): boolean {
    return group.hooks.some((hook) => this.isCCRingCommand(hook));
  }

  /**
   * JSON Convention: Remove duplicate groups
   * Ensures idempotent saves (saving twice = same result)
   */
  private removeDuplicates(infraDTO: ClaudeCodeSettingsDTO): void {
    if (!infraDTO.hooks) {
      return;
    }

    // Helper to check if two hook commands are equal
    const commandsEqual = (a: HookCommandInfraDTO, b: HookCommandInfraDTO) =>
      a.type === b.type && a.command === b.command && a.timeout === b.timeout;

    // Helper to check if two arrays of commands are equal
    const commandArraysEqual = (a: HookCommandInfraDTO[], b: HookCommandInfraDTO[]) => {
      if (a.length !== b.length) {
        return false;
      }
      return a.every((cmd, i) => commandsEqual(cmd, b[i]));
    };

    // Remove duplicates from Stop hooks
    if (infraDTO.hooks.Stop) {
      infraDTO.hooks.Stop = infraDTO.hooks.Stop.filter((group, index, self) =>
        index === self.findIndex((g) => commandArraysEqual(g.hooks, group.hooks))
      );
    }

    // Remove duplicates from Notification hooks
    if (infraDTO.hooks.Notification) {
      infraDTO.hooks.Notification = infraDTO.hooks.Notification.filter(
        (group, index, self) =>
          index ===
          self.findIndex(
            (g) => g.matcher === group.matcher && commandArraysEqual(g.hooks, group.hooks)
          )
      );
    }

    // Remove duplicates from PreToolUse hooks
    if (infraDTO.hooks.PreToolUse) {
      infraDTO.hooks.PreToolUse = infraDTO.hooks.PreToolUse.filter(
        (group, index, self) =>
          index ===
          self.findIndex(
            (g) => g.matcher === group.matcher && commandArraysEqual(g.hooks, group.hooks)
          )
      );
    }
  }

  /**
   * JSON Convention: Clean up empty structures
   * Keeps settings.json clean and readable
   */
  private cleanupEmptyStructures(infraDTO: ClaudeCodeSettingsDTO): void {
    if (!infraDTO.hooks) {
      return;
    }

    // Remove empty arrays
    if (infraDTO.hooks.Stop && infraDTO.hooks.Stop.length === 0) {
      delete infraDTO.hooks.Stop;
    }
    if (infraDTO.hooks.Notification && infraDTO.hooks.Notification.length === 0) {
      delete infraDTO.hooks.Notification;
    }
    if (infraDTO.hooks.PreToolUse && infraDTO.hooks.PreToolUse.length === 0) {
      delete infraDTO.hooks.PreToolUse;
    }

    // Remove empty hooks object
    if (Object.keys(infraDTO.hooks).length === 0) {
      delete infraDTO.hooks;
    }
  }
}
