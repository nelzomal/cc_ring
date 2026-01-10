/**
 * Constants used throughout the CC Ring extension
 */

import { CONFIG_DEFAULTS, COMMAND_IDS } from "./generated-config";

// Re-export COMMAND_IDS from generated config (source: package.json)
export { COMMAND_IDS };

/** Fixed UUID for consistent hook file naming */
export const HOOK_ID = "cc4e8b3a-9f1d-4c2a-b5e7-3d8f6a2c1b9e";

/** Default volume percentage (0-100) - from package.json */
export const DEFAULT_VOLUME_PERCENT = CONFIG_DEFAULTS.VOLUME;

/** Default volume as decimal string for bash script */
export const DEFAULT_VOLUME_DECIMAL = (CONFIG_DEFAULTS.VOLUME / 100).toFixed(2);

/** Number of lines to keep in log files (rotation) */
export const LOG_ROTATION_LINES = 2000;

/** Hook timeout in seconds */
export const HOOK_TIMEOUT_SECONDS = 5;

/** Error log filename */
export const ERROR_LOG_FILENAME = "cc-ring-error.log";

/** Hook execution log filename */
export const HOOK_LOG_FILENAME = "cc-ring-hook.log";

/** Coordination lock filename */
export const LOCK_FILENAME = "cc-ring.lock";

/** Hook script filename prefix */
export const HOOK_SCRIPT_PREFIX = "cc-ring-hook";

/** Config filename prefix */
export const CONFIG_FILE_PREFIX = "cc-ring-config";

/** Claude Code hooks directory name for this extension */
export const HOOKS_DIR_NAME = "cc_ring";

/** Default sound name - from package.json */
export const DEFAULT_SOUND = CONFIG_DEFAULTS.SOUND;

/** Hook type identifier */
export const HOOK_TYPE_COMMAND = "command" as const;

// ============================================================================
// VSCode Extension Constants
// ============================================================================

/** Configuration namespace for VSCode settings */
export const CONFIG_NAMESPACE = "cc-ring";

/** Configuration key names */
export const CONFIG_KEYS = {
  ENABLED: "enabled",
  VOLUME: "volume",
  SOUND: "sound",
  CUSTOM_SOUND_PATH: "customSoundPath",
  HOOKS: "hooks",
} as const;
