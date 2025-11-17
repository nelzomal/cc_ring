/**
 * Type definitions for the Hook trigger system
 *
 * This file contains all enum types related to hook configuration:
 * - Event types that trigger hooks
 * - Matchers that filter specific events
 * - Command types for hook execution
 */

/**
 * All supported hook event types in Claude Code
 */
export enum HookEventType {
  /**
   * Fires when Claude Code completes a task
   * No matcher required
   */
  Stop = "Stop",

  /**
   * Fires when Claude Code sends notifications
   * Requires a NotificationMatcher to filter specific notification types
   */
  Notification = "Notification",

  /**
   * Fires after a tool is used by Claude Code
   * Requires a tool name matcher to filter specific tools
   */
  PreToolUse = "PreToolUse",
}

/**
 * Hook Command Types supported by Claude Code
 *
 * Currently Claude Code only supports command-based hooks,
 * but this enum future-proofs for potential new types.
 */
export enum HookCommandType {
  /**
   * Command hook - executes a shell command
   * This is currently the only type supported by Claude Code
   */
  Command = "command",
}

/**
 * Matchers for Notification hook type
 * These filter which notifications trigger the hook
 */
export enum NotificationMatcher {
  /**
   * Fires when Claude Code requests permission from the user
   * Example: "Allow Claude to write file X?"
   */
  PermissionPrompt = "permission_prompt",

  /**
   * Fires when Claude Code has been idle for 60+ seconds waiting for user input
   * Example: User hasn't responded to a question
   */
  IdlePrompt = "idle_prompt",

  /**
   * Fires when an MCP tool needs additional input (elicitation dialog)
   * Example: MCP tool asking for additional parameters
   */
  ElicitationDialog = "elicitation_dialog",

  /**
   * Fires on authentication success notifications
   * Informational only, no user input required
   */
  AuthSuccess = "auth_success",
}

/**
 * Matchers for PreToolUse hook type
 * These specify which tool invocations trigger the hook
 */
export enum PreToolUseMatcher {
  /**
   * Fires after ExitPlanMode tool is used
   * Claude is presenting a plan and waiting for user approval
   */
  ExitPlanMode = "ExitPlanMode",

  /**
   * Fires after AskUserQuestion tool is used
   * Claude is asking a question and waiting for user response
   */
  AskUserQuestion = "AskUserQuestion",
}

/**
 * Union type of all hook matchers
 */
export type HookMatcher = NotificationMatcher | PreToolUseMatcher;
