/**
 * Constants used throughout the CC Ring extension
 */

/** Fixed UUID for consistent hook file naming */
export const HOOK_ID = "cc4e8b3a-9f1d-4c2a-b5e7-3d8f6a2c1b9e";

/** Default volume percentage (0-100) */
export const DEFAULT_VOLUME_PERCENT = 50;

/** Default volume as decimal string for bash script */
export const DEFAULT_VOLUME_DECIMAL = "0.50";

/** Number of lines to keep in log files (rotation) */
export const LOG_ROTATION_LINES = 2000;

/** Hook timeout in seconds */
export const HOOK_TIMEOUT_SECONDS = 5;

/** Error log filename */
export const ERROR_LOG_FILENAME = "error.log";

/** Hook execution log filename */
export const HOOK_LOG_FILENAME = "hook.log";

/** Hook script filename prefix */
export const HOOK_SCRIPT_PREFIX = "cc-ring-hook";

/** Config filename prefix */
export const CONFIG_FILE_PREFIX = "cc-ring-config";

/** Claude Code hooks directory name for this extension */
export const HOOKS_DIR_NAME = "cc_ring";

/** Default sound name */
export const DEFAULT_SOUND = "complete";

/** Hook type identifier */
// TODO make it source of truth across the codebase
export const HOOK_TYPE_COMMAND = "command" as const;
