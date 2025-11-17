import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { IConfigProvider } from '../../../application/ports/IConfigProvider';
import { SoundConfig } from '../../../domain/valueObjects/sound/SoundConfig';
import { TYPES } from '../../../shared/types';
import * as vscode from 'vscode';
import * as path from 'path';

const DEFAULT_SOUND = 'complete';
const DEFAULT_VOLUME = 75;

/**
 * VSCode configuration provider
 * Implements IConfigProvider from application layer
 */
@injectable()
export class VSCodeConfigProvider implements IConfigProvider {
  constructor(
    @inject(TYPES.ExtensionPath) private readonly extensionPath: string
  ) {}

  /**
   * Get the current sound configuration
   */
  getSoundConfig(): SoundConfig {
    const sound = this.getSound();
    const customPath = this.getCustomSoundPath();
    const volume = this.getVolume();

    // Custom sound takes precedence
    if (sound === 'custom' && customPath) {
      return SoundConfig.createCustom(customPath, volume);
    }

    // Bundled sound
    const soundPath = this.resolveBundledSoundPath(sound);
    return SoundConfig.create(soundPath, volume);
  }

  /**
   * Get the volume setting (0-100)
   */
  getVolume(): number {
    const config = vscode.workspace.getConfiguration('cc-ring');
    return config.get<number>('volume', DEFAULT_VOLUME);
  }

  /**
   * Check if CC Ring is enabled
   */
  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('cc-ring');
    return config.get<boolean>('enabled', false);
  }

  /**
   * Get custom sound path if configured
   */
  getCustomSoundPath(): string {
    const config = vscode.workspace.getConfiguration('cc-ring');
    return config.get<string>('customSoundPath', '');
  }

  /**
   * Get selected sound name
   */
  getSound(): string {
    const config = vscode.workspace.getConfiguration('cc-ring');
    return config.get<string>('sound', DEFAULT_SOUND);
  }

  /**
   * Private: Resolve bundled sound path
   * @throws Error if bundled sound file doesn't exist
   */
  private resolveBundledSoundPath(sound: string): string {
    const soundPath = path.join(
      this.extensionPath,
      'sounds',
      `${sound}.wav`
    );

    // Fail fast if bundled sound doesn't exist
    // TODO: Show system notification when sound file missing
    const fs = require('fs');
    if (!fs.existsSync(soundPath)) {
      throw new Error(
        `Bundled sound file not found: ${soundPath}. ` +
        `Expected sound '${sound}' to be bundled with the extension.`
      );
    }

    return soundPath;
  }
}
