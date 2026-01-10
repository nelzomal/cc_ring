import { IConfigProvider } from '@application/ports/IConfigProvider';
import { SoundConfig } from '@domain/valueObjects/sound/SoundConfig';
import * as vscode from 'vscode';
import * as path from 'path';
import {
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  DEFAULT_SOUND,
  DEFAULT_VOLUME_PERCENT,
} from '@shared/constants';

/**
 * VSCode configuration provider
 * Implements IConfigProvider from application layer
 */
export class VSCodeConfigProvider implements IConfigProvider {
  constructor(private readonly extensionPath: string) {}

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
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<number>(CONFIG_KEYS.VOLUME, DEFAULT_VOLUME_PERCENT);
  }

  /**
   * Check if CC Ring is enabled
   */
  isEnabled(): boolean {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<boolean>(CONFIG_KEYS.ENABLED, false);
  }

  /**
   * Get custom sound path if configured
   */
  getCustomSoundPath(): string {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<string>(CONFIG_KEYS.CUSTOM_SOUND_PATH, '');
  }

  /**
   * Get selected sound name
   */
  getSound(): string {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<string>(CONFIG_KEYS.SOUND, DEFAULT_SOUND);
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
