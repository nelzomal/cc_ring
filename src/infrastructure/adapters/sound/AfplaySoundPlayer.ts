import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { ISoundPlayer } from '../../../application/ports/ISoundPlayer';
import { SoundConfig } from '../../../domain/valueObjects/sound/SoundConfig';
import { TYPES } from '../../../shared/types';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/** Valid sound file extensions */
const VALID_SOUND_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.aiff', '.flac'];

/**
 * macOS sound player using afplay command
 * Implements ISoundPlayer from application layer
 */
@injectable()
export class AfplaySoundPlayer implements ISoundPlayer {
  constructor(
    @inject(TYPES.BundledSoundsDir) private readonly bundledSoundsDir: string
  ) {}

  /**
   * Play a sound with the given configuration
   * @throws Error if sound file doesn't exist
   */
  async play(config: SoundConfig): Promise<void> {
    const soundPath = this.resolveSoundPath(config);

    // Fail fast if sound file doesn't exist
    // TODO: Show system notification to user when sound playback fails
    if (!fs.existsSync(soundPath)) {
      throw new Error(
        `Sound file not found: ${soundPath}. ` +
        `Please check your sound configuration.`
      );
    }

    await this.playSound(soundPath, config.getVolumeDecimal());
  }

  /**
   * Get list of available bundled sounds
   */
  getAvailableSounds(): string[] {
    if (!fs.existsSync(this.bundledSoundsDir)) {
      return [];
    }

    return fs.readdirSync(this.bundledSoundsDir)
      .filter(file => this.isValidSoundFile(file))
      .map(file => path.basename(file, path.extname(file)));
  }

  /**
   * Validate that a sound file exists and has valid extension
   */
  validateSoundFile(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const ext = path.extname(filePath).toLowerCase();
    return VALID_SOUND_EXTENSIONS.includes(ext);
  }

  /**
   * Private: Resolve sound path from config
   * Returns the path as-is without fallback logic
   */
  private resolveSoundPath(config: SoundConfig): string {
    return config.getPath();
  }

  /**
   * Private: Play sound using afplay (macOS)
   */
  private async playSound(soundPath: string, volume: number): Promise<void> {
    try {
      // macOS - use afplay with volume
      await execAsync(`afplay -v ${volume.toFixed(2)} "${soundPath}"`);
    } catch (error) {
      throw new Error(`Failed to play sound: ${error}`);
    }
  }

  /**
   * Private: Check if file has valid sound extension
   */
  private isValidSoundFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return VALID_SOUND_EXTENSIONS.includes(ext);
  }
}
