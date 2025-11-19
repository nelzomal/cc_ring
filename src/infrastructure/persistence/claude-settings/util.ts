import { HookRepositoryError } from "@application/errors/HookRepositoryError";
import { IFileSystem } from "@application/ports/IFileSystem";
import { HookEventType } from "@domain/valueObjects/hook";
import { parse as jsonlintParse } from "@prantlf/jsonlint";
import {
  ClaudeCodeSettingsDTO,
  ClaudeCodeSettingsDTOSchema,
  HookCommandDTO as HookCommandInfraDTO,
  HookGroupDTO as HookGroupInfraDTO,
  MatcherHookGroupDTO as MatcherHookGroupInfraDTO,
} from "./dto";

/**
 * Mapping from HookEventType to DTO property keys
 */
export const HOOK_EVENT_TYPE_TO_KEY: Record<
  HookEventType,
  keyof NonNullable<ClaudeCodeSettingsDTO["hooks"]>
> = {
  [HookEventType.Stop]: "Stop",
  [HookEventType.Notification]: "Notification",
  [HookEventType.PreToolUse]: "PreToolUse",
};

export type HookGroup = HookGroupInfraDTO | MatcherHookGroupInfraDTO;

/**
 * Check if a HookCommandInfraDTO belongs to CC Ring
 *
 * Supports both formats for backward compatibility:
 * - New format: exact match with ~/.claude/cc-ring-hook-{HOOK_ID}.sh
 * - Legacy format: any path containing "cc-ring-hook"
 */
export function isCCRingCommand(
  cmd: HookCommandInfraDTO,
  scriptRelativePath: string
): boolean {
  if (!cmd.command) {
    return false;
  }

  // Check for exact match with new format (including HOOK_ID)
  if (cmd.command === scriptRelativePath) {
    return true;
  }

  // Backward compatibility: check for legacy format (any path with "cc-ring-hook")
  return cmd.command.includes("cc-ring-hook");
}

/**
 * Check if a hook group contains any CC Ring hooks
 */
export function isCCRingGroup(
  group: HookGroup,
  scriptRelativePath: string
): boolean {
  return group.hooks.some((hook) => isCCRingCommand(hook, scriptRelativePath));
}

/**
 * Remove all CC Ring hooks from all event types
 */
export function removeAllCCRingHooks(
  infraDTO: ClaudeCodeSettingsDTO,
  scriptRelativePath: string
): void {
  if (!infraDTO.hooks) {
    return;
  }

  for (const eventType of Object.values(HookEventType)) {
    const key = HOOK_EVENT_TYPE_TO_KEY[eventType];
    const groups = infraDTO.hooks[key] as HookGroup[] | undefined;
    if (groups) {
      (infraDTO.hooks[key] as HookGroup[]) = groups.filter(
        (group) => !isCCRingGroup(group, scriptRelativePath)
      );
    }
  }
}

/**
 * JSON Convention: Remove duplicate groups
 * Ensures idempotent saves (saving twice = same result)
 */
export function removeDuplicates(infraDTO: ClaudeCodeSettingsDTO): void {
  if (!infraDTO.hooks) {
    return;
  }

  // Helper to check if two hook commands are equal
  const commandsEqual = (a: HookCommandInfraDTO, b: HookCommandInfraDTO) =>
    a.type === b.type && a.command === b.command && a.timeout === b.timeout;

  // Helper to check if two arrays of commands are equal
  const commandArraysEqual = (
    a: HookCommandInfraDTO[],
    b: HookCommandInfraDTO[]
  ) => {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((cmd, i) => commandsEqual(cmd, b[i]));
  };

  // Helper to check if two groups are equal
  const groupsEqual = (a: HookGroup, b: HookGroup) => {
    const matcherA = "matcher" in a ? a.matcher : undefined;
    const matcherB = "matcher" in b ? b.matcher : undefined;
    return matcherA === matcherB && commandArraysEqual(a.hooks, b.hooks);
  };

  // Remove duplicates from all hook types
  for (const eventType of Object.values(HookEventType)) {
    const key = HOOK_EVENT_TYPE_TO_KEY[eventType];
    const groups = infraDTO.hooks[key] as HookGroup[] | undefined;
    if (groups) {
      (infraDTO.hooks[key] as HookGroup[]) = groups.filter(
        (group, index, self) =>
          index === self.findIndex((g) => groupsEqual(g, group))
      );
    }
  }
}

/**
 * JSON Convention: Clean up empty structures
 * Keeps settings.json clean and readable
 */
export function cleanupEmptyStructures(infraDTO: ClaudeCodeSettingsDTO): void {
  if (!infraDTO.hooks) {
    return;
  }

  // Remove empty arrays for all event types
  for (const eventType of Object.values(HookEventType)) {
    const key = HOOK_EVENT_TYPE_TO_KEY[eventType];
    const groups = infraDTO.hooks[key] as HookGroup[] | undefined;
    if (groups && groups.length === 0) {
      delete infraDTO.hooks[key];
    }
  }

  // Remove empty hooks object
  if (Object.keys(infraDTO.hooks).length === 0) {
    delete infraDTO.hooks;
  }
}

/**
 * Combined helper: Remove all CC Ring hooks and cleanup empty structures
 */
export function removeAllCCRingHooksAndCleanup(
  infraDTO: ClaudeCodeSettingsDTO,
  scriptRelativePath: string
): void {
  removeAllCCRingHooks(infraDTO, scriptRelativePath);
  cleanupEmptyStructures(infraDTO);
}

/**
 * Check if CC Ring hooks exist in the settings DTO
 */
export function hasCCRingHooks(
  infraDTO: ClaudeCodeSettingsDTO,
  scriptRelativePath: string
): boolean {
  if (!infraDTO.hooks || Object.keys(infraDTO.hooks).length === 0) {
    return false;
  }

  return Object.values(HookEventType).some((eventType) => {
    const key = HOOK_EVENT_TYPE_TO_KEY[eventType];
    const groups = infraDTO.hooks?.[key] as HookGroup[] | undefined;
    return (
      groups?.some((group) => isCCRingGroup(group, scriptRelativePath)) ?? false
    );
  });
}

/**
 * Event types that require a matcher
 */
const MATCHER_EVENT_TYPES = new Set([
  HookEventType.Notification,
  HookEventType.PreToolUse,
]);

/**
 * Install CC Ring hooks into the settings DTO
 * Handles:
 * - Ensuring hooks structure exists
 * - Merging with existing hooks (avoiding duplicates)
 * - Creating hook groups for all supported hooks
 */
export function installCCRingHooks(
  infraDTO: ClaudeCodeSettingsDTO,
  scriptPath: string,
  timeout: number,
  supportedHooks: readonly {
    eventType: HookEventType;
    matcher: string | null;
  }[]
): void {
  // Ensure hooks structure exists
  if (!infraDTO.hooks) {
    infraDTO.hooks = {};
  }

  // Create hook command
  const hookCommand: HookCommandInfraDTO = {
    type: "command",
    command: scriptPath,
    timeout,
  };

  // Add hooks for each supported hook type
  for (const supportedHook of supportedHooks) {
    const key = HOOK_EVENT_TYPE_TO_KEY[supportedHook.eventType];

    // Ensure array exists
    if (!infraDTO.hooks[key]) {
      infraDTO.hooks[key] = [];
    }

    // Create hook group
    const hookGroup = MATCHER_EVENT_TYPES.has(supportedHook.eventType)
      ? { matcher: supportedHook.matcher as string, hooks: [hookCommand] }
      : { hooks: [hookCommand] };

    // Check if equivalent group already exists
    const groups = infraDTO.hooks[key] as HookGroup[];
    const existingIndex = groups.findIndex((g) => groupsEqual(g, hookGroup));

    if (existingIndex === -1) {
      // Add new group
      groups.push(hookGroup);
    }
    // If exists, no need to add (already have it)
  }
}

/**
 * Check if two hook groups are equal
 */
function groupsEqual(a: HookGroup, b: HookGroup): boolean {
  const matcherA = "matcher" in a ? a.matcher : undefined;
  const matcherB = "matcher" in b ? b.matcher : undefined;
  if (matcherA !== matcherB) {
    return false;
  }

  if (a.hooks.length !== b.hooks.length) {
    return false;
  }

  return a.hooks.every(
    (cmd, i) =>
      cmd.type === b.hooks[i].type &&
      cmd.command === b.hooks[i].command &&
      cmd.timeout === b.hooks[i].timeout
  );
}

/**
 * Read and validate settings.json as ClaudeCodeSettingsDTO
 */
// AI_FIXME: rename to read
export async function readSettingsInfraDTO(
  fileSystem: IFileSystem,
  settingsPath: string
): Promise<ClaudeCodeSettingsDTO> {
  if (!fileSystem.fileExists(settingsPath)) {
    return {};
  }

  const content = await fileSystem.readFile(settingsPath, "utf8");

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
// AI_FIXME: rename to write
export async function writeSettingsInfraDTO(
  fileSystem: IFileSystem,
  settingsPath: string,
  infraDTO: ClaudeCodeSettingsDTO
): Promise<void> {
  // Validate before writing
  ClaudeCodeSettingsDTOSchema.parse(infraDTO);

  const content = JSON.stringify(infraDTO, null, 2);
  await fileSystem.writeFileAtomic(settingsPath, content, {
    createIfMissing: true,
  });
}
