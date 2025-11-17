import { SoundConfig } from '../../domain/valueObjects/sound/SoundConfig';

/**
 * Configuration provider port
 *
 * This is an outbound port (Hexagonal Architecture) that defines the contract
 * for configuration access. Infrastructure adapters implement this interface.
 *
 * Location: src/application/ports/
 */
export interface IConfigProvider {
  /**
   * Get the current sound configuration
   */
  getSoundConfig(): SoundConfig;

  /**
   * Get the volume setting (0-100)
   */
  getVolume(): number;

  /**
   * Check if CC Ring is enabled
   */
  isEnabled(): boolean;

  /**
   * Get custom sound path if configured
   */
  getCustomSoundPath(): string;

  /**
   * Get selected sound name
   */
  getSound(): string;
}
