/**
 * Repository port for managing hooks configuration persistence
 *
 * This is an outbound port (Hexagonal Architecture) that defines the contract
 * for hooks configuration persistence. Infrastructure adapters implement this interface.
 *
 * Design Philosophy:
 * - Application layer works with simple concepts: script path
 * - Infrastructure layer uses SUPPORTED_HOOKS to generate hook groups for settings.json
 * - Repository handles all conversion between script path and settings.json structure
 *
 * Responsibility:
 * - Check if CC Ring hooks are installed in Claude Code settings
 * - Install: Register script path for ALL hooks in SUPPORTED_HOOKS
 * - Uninstall: Remove all CC Ring hooks from settings
 * - Merge CC Ring hooks with existing non-CC-Ring hooks
 *
 * Location: src/application/ports/
 */
export interface IHookRepository {
  /**
   * Check if CC Ring hooks are installed in Claude Code settings
   * @returns true if CC Ring hooks exist in settings.json
   */
  isInstalled(): Promise<boolean>;

  /**
   * Install CC Ring hooks to Claude Code settings
   * Registers the script path for all hooks defined in SUPPORTED_HOOKS
   * Merges with existing non-CC-Ring hooks in the settings file
   * @param scriptPath - Path to the hook script that should be registered for all hooks
   */
  install(scriptPath: string): Promise<void>;

  /**
   * Remove all CC Ring hooks from Claude Code settings
   * Preserves existing non-CC-Ring hooks in the settings file
   */
  uninstall(): Promise<void>;
}
