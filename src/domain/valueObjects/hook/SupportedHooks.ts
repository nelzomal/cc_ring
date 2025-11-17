import {
  HookEventType,
  HookMatcher,
  NotificationMatcher,
  PreToolUseMatcher,
} from './types';

/**
 * Supported Hook Metadata
 * Represents a hook that CC Ring supports
 *
 * This is domain knowledge: which hooks exist and their characteristics
 */
export interface SupportedHook {
  eventType: HookEventType;
  matcher: HookMatcher | null;
}

/**
 * Complete list of hooks supported by CC Ring
 *
 * Domain knowledge: These are the hooks we know how to install and manage.
 * This constant defines what hooks are available in the system.
 */
export const SUPPORTED_HOOKS: ReadonlyArray<SupportedHook> = Object.freeze([
  // Stop hook - triggered when Claude Code stops execution
  {
    eventType: HookEventType.Stop,
    matcher: null,
  },

  // Notification hooks - triggered on various user-facing events
  {
    eventType: HookEventType.Notification,
    matcher: NotificationMatcher.PermissionPrompt,
  },
  {
    eventType: HookEventType.Notification,
    matcher: NotificationMatcher.IdlePrompt,
  },
  {
    eventType: HookEventType.Notification,
    matcher: NotificationMatcher.ElicitationDialog,
  },
  {
    eventType: HookEventType.Notification,
    matcher: NotificationMatcher.AuthSuccess,
  },

  // PreToolUse hooks - triggered before specific tool executions
  {
    eventType: HookEventType.PreToolUse,
    matcher: PreToolUseMatcher.ExitPlanMode,
  },
  {
    eventType: HookEventType.PreToolUse,
    matcher: PreToolUseMatcher.AskUserQuestion,
  },
]);
