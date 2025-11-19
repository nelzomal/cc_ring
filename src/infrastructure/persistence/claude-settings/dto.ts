import { z } from 'zod';

/**
 * ClaudeCodeSettingsInfraDTO: Infrastructure ↔ File System Format
 *
 * Represents the exact structure of ~/.claude/settings.json
 * This DTO is defined by the external Claude Code system and validated
 * using Zod schemas to ensure correctness when reading user-edited files.
 *
 * This file contains all Zod schemas for validating the external file format.
 */

/**
 * Individual hook command configuration
 * Represents a single command in the settings.json file
 */
export const HookCommandDTOSchema = z.object({
  type: z.literal('command'),
  command: z.string().min(1, 'Command path cannot be empty'),
  timeout: z
    .number()
    .int('Timeout must be an integer')
    .positive('Timeout must be positive')
    .max(300, 'Timeout cannot exceed 300 seconds')
    .default(5),
});

export type HookCommandDTO = z.infer<typeof HookCommandDTOSchema>;

/**
 * Hook group without matcher
 * Used for Stop hooks which don't filter by specific criteria
 */
export const HookGroupDTOSchema = z.object({
  hooks: z
    .array(HookCommandDTOSchema)
    .min(1, 'Hook group must have at least one hook'),
});

export type HookGroupDTO = z.infer<typeof HookGroupDTOSchema>;

/**
 * Hook group with matcher
 * Used for Notification and PreToolUse hooks which filter by specific patterns
 */
export const MatcherHookGroupDTOSchema = z.object({
  matcher: z.string().min(1, 'Matcher cannot be empty'),
  hooks: z
    .array(HookCommandDTOSchema)
    .min(1, 'Hook group must have at least one hook'),
});

export type MatcherHookGroupDTO = z.infer<typeof MatcherHookGroupDTOSchema>;

/**
 * Hooks section of settings.json
 * Organizes hooks by event type (Stop, Notification, PreToolUse)
 */
export const HooksSectionDTOSchema = z
  .object({
    Stop: z.array(HookGroupDTOSchema).optional(),
    Notification: z.array(MatcherHookGroupDTOSchema).optional(),
    PreToolUse: z.array(MatcherHookGroupDTOSchema).optional(),
  })
  .passthrough(); // Allow other hook types that Claude Code supports

export type HooksSectionDTO = z.infer<typeof HooksSectionDTOSchema>;

/**
 * Complete Claude Code settings.json file structure
 * Uses passthrough() to allow other settings managed by Claude Code
 *
 * This represents the entire settings file, not just hooks.
 * CC Ring only manages the "hooks" section.
 */
export const ClaudeCodeSettingsDTOSchema = z
  .object({
    hooks: HooksSectionDTOSchema.optional(),
  })
  .passthrough(); // Allow other Claude Code settings we don't manage

export type ClaudeCodeSettingsDTO = z.infer<typeof ClaudeCodeSettingsDTOSchema>;
