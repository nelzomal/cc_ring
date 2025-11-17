import { HookValidationError } from '../../errors/HookValidationError';
import { HookCommandType } from './types';

/**
 * Hook Command value object
 * Represents a single command hook configuration
 *
 * Value object characteristics:
 * - Immutable after creation (private constructor + factory method)
 * - Equality based on value, not identity
 * - No lifecycle or identity tracking
 * - Validates business rules on creation
 */
export class HookCommand {
  private constructor(
    private readonly type: HookCommandType,
    private readonly commandPath: string,
    private readonly timeout: number
  ) {
    this.validate();
  }

  /**
   * Factory method: Create a hook command with validation
   * @param commandPath - Path to the command to execute
   * @param timeout - Timeout in seconds (default: 5)
   * @param type - Hook command type (default: Command)
   */
  static create(
    commandPath: string,
    timeout: number = 5,
    type: HookCommandType = HookCommandType.Command
  ): HookCommand {
    return new HookCommand(type, commandPath, timeout);
  }

  /**
   * Query: Get hook command type
   */
  getType(): HookCommandType {
    return this.type;
  }

  /**
   * Query: Get command path
   */
  getCommandPath(): string {
    return this.commandPath;
  }

  /**
   * Query: Get timeout in seconds
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Business rule: Validate hook command invariants
   */
  private validate(): void {
    // Rule 1: Type must be valid
    if (!Object.values(HookCommandType).includes(this.type)) {
      throw new HookValidationError(`Invalid hook command type: ${this.type}`);
    }

    // Rule 2: Command path cannot be empty
    if (!this.commandPath || this.commandPath.trim() === '') {
      throw new HookValidationError('Command path cannot be empty');
    }

    // Rule 3: Timeout must be positive and reasonable
    if (this.timeout <= 0 || this.timeout > 300) {
      throw new HookValidationError('Timeout must be between 1 and 300 seconds');
    }
  }

  /**
   * Value equality: Compare by type, command path, and timeout
   */
  equals(other: HookCommand): boolean {
    return (
      this.type === other.type &&
      this.commandPath === other.commandPath &&
      this.timeout === other.timeout
    );
  }

  /**
   * Check if this command matches a specific path
   */
  hasPath(pathPattern: string): boolean {
    return this.commandPath.includes(pathPattern);
  }
}
