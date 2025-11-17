import { SoundValidationError } from '../../errors/SoundValidationError';

/**
 * Volume value object
 * Represents audio volume with validation and conversion
 */
export class Volume {
  private constructor(private readonly percent: number) {
    this.validate();
  }

  /**
   * Create Volume from percentage (0-100)
   */
  static fromPercent(percent: number): Volume {
    return new Volume(percent);
  }

  /**
   * Create Volume from decimal (0.0-1.0)
   */
  static fromDecimal(decimal: number): Volume {
    return new Volume(decimal * 100);
  }

  /**
   * Get volume as percentage (0-100)
   */
  toPercent(): number {
    return this.percent;
  }

  /**
   * Get volume as decimal (0.0-1.0)
   */
  toDecimal(): number {
    return this.percent / 100;
  }

  /**
   * Business rule: volume must be between 0 and 100
   */
  private validate(): void {
    if (this.percent < 0 || this.percent > 100) {
      throw new SoundValidationError(
        `Volume must be between 0 and 100, got ${this.percent}`
      );
    }
  }

  /**
   * Value object equality
   */
  equals(other: Volume): boolean {
    return this.percent === other.percent;
  }
}
