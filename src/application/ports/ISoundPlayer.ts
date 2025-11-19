import { SoundConfig } from '@domain/valueObjects/sound/SoundConfig';

/**
 * Sound playback port
 *
 * This is an outbound port (Hexagonal Architecture) that defines the contract
 * for sound playback. Infrastructure adapters implement this interface.
 *
 * Location: src/application/ports/
 */
export interface ISoundPlayer {
  /**
   * Play a sound with the given configuration
   */
  play(config: SoundConfig): Promise<void>;

  /**
   * Get list of available bundled sounds
   */
  getAvailableSounds(): string[];

  /**
   * Validate that a sound file exists and is playable
   */
  validateSoundFile(path: string): boolean;
}
