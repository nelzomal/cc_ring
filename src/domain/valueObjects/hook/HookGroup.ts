import { HookValidationError } from '@domain/errors/HookValidationError';
import { HookCommand } from './HookCommand';
import { HookMatcher } from './types';

/**
 * Hook Group value object
 * Represents a group of hook commands for a specific event
 * May include a matcher for filtered event types (Notification, PreToolUse)
 *
 * Value object characteristics:
 * - Immutable after creation (private constructor + factory methods)
 * - Equality based on value, not identity
 * - No lifecycle or identity tracking
 * - Validates business rules on creation
 */
export class HookGroup {
  private constructor(
    private readonly commands: ReadonlyArray<HookCommand>,
    private readonly matcher: HookMatcher | null
  ) {
    this.validate();
  }

  /**
   * Factory method: Create a hook group without matcher (for Stop hooks)
   */
  static createWithoutMatcher(commands: HookCommand[]): HookGroup {
    return new HookGroup(Object.freeze([...commands]), null);
  }

  /**
   * Factory method: Create a hook group with matcher (for Notification/PreToolUse hooks)
   */
  static createWithMatcher(
    matcher: HookMatcher,
    commands: HookCommand[]
  ): HookGroup {
    return new HookGroup(Object.freeze([...commands]), matcher);
  }

  /**
   * Query: Get all commands in this group (returns copy to maintain immutability)
   */
  getCommands(): ReadonlyArray<HookCommand> {
    return this.commands;
  }

  /**
   * Query: Get matcher (if any)
   */
  getMatcher(): HookMatcher | null {
    return this.matcher;
  }

  /**
   * Query: Check if this group has a matcher
   */
  hasMatcher(): boolean {
    return this.matcher !== null;
  }

  /**
   * Query: Check if this group contains a specific command
   */
  hasCommand(command: HookCommand): boolean {
    return this.commands.some((cmd) => cmd.equals(command));
  }

  /**
   * Query: Check if this group contains any command matching a path pattern
   */
  hasCommandWithPath(pathPattern: string): boolean {
    return this.commands.some((cmd) => cmd.hasPath(pathPattern));
  }

  /**
   * Query: Get number of commands in this group
   */
  getCommandCount(): number {
    return this.commands.length;
  }

  /**
   * Business rule: Validate hook group invariants
   */
  private validate(): void {
    // Rule 1: Hook group must have at least one command
    if (this.commands.length === 0) {
      throw new HookValidationError(
        'Hook group must have at least one command'
      );
    }

    // Rule 2: All commands must be valid (validated during HookCommand creation)
    // No additional validation needed here
  }

  /**
   * Value equality: Compare by commands and matcher
   */
  equals(other: HookGroup): boolean {
    // Different matcher means different group
    if (this.matcher !== other.matcher) {
      return false;
    }

    // Different number of commands means different group
    if (this.commands.length !== other.commands.length) {
      return false;
    }

    // All commands must match (order matters)
    return this.commands.every((cmd, index) =>
      cmd.equals(other.commands[index])
    );
  }
}
