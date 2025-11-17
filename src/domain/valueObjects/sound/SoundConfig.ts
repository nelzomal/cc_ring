import { Volume } from './Volume';
import { SoundValidationError } from '../../errors/SoundValidationError';

/**
 * Sound configuration value object
 * Immutable configuration for sound playback
 */
export class SoundConfig {
  private constructor(
    private readonly soundPath: string,
    private readonly volume: Volume,
    private readonly isCustom: boolean
  ) {
    this.validate();
  }

  /**
   * Create sound config for bundled sound
   */
  static create(soundPath: string, volumePercent: number): SoundConfig {
    const volume = Volume.fromPercent(volumePercent);
    const isCustom = !soundPath.includes('/sounds/');
    return new SoundConfig(soundPath, volume, isCustom);
  }

  /**
   * Create sound config for custom sound file
   */
  static createCustom(customPath: string, volumePercent: number): SoundConfig {
    const volume = Volume.fromPercent(volumePercent);
    return new SoundConfig(customPath, volume, true);
  }

  /**
   * Get sound file path
   */
  getPath(): string {
    return this.soundPath;
  }

  /**
   * Get volume value object
   */
  getVolume(): Volume {
    return this.volume;
  }

  /**
   * Get volume as decimal for playback
   */
  getVolumeDecimal(): number {
    return this.volume.toDecimal();
  }

  /**
   * Check if this is a custom sound
   */
  isCustomSound(): boolean {
    return this.isCustom;
  }

  /**
   * Validate sound configuration
   */
  isValid(): boolean {
    try {
      this.validate();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Business rule: sound file must have valid path and extension
   */
  private validate(): void {
    if (!this.soundPath) {
      throw new SoundValidationError('Sound path cannot be empty');
    }

    const validExtensions = ['.wav', '.mp3', '.m4a', '.aiff', '.flac'];
    const hasValidExtension = validExtensions.some(ext =>
      this.soundPath.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      throw new SoundValidationError(
        `Sound file must have one of: ${validExtensions.join(', ')}`
      );
    }
  }

  /**
   * Value object equality
   */
  equals(other: SoundConfig): boolean {
    return this.soundPath === other.soundPath &&
           this.volume.equals(other.volume);
  }
}
