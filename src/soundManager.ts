import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SoundManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get the sound file path based on current configuration
     */
    private getSoundPath(): string {
        const config = vscode.workspace.getConfiguration('cc-ring');
        const sound = config.get<string>('sound', 'complete');
        const customSoundPath = config.get<string>('customSoundPath', '');

        if (sound === 'custom' && customSoundPath) {
            return customSoundPath;
        }

        // Use bundled sound from extension
        const soundsDir = path.join(this.context.extensionPath, 'sounds');
        const soundPath = path.join(soundsDir, `${sound}.wav`);

        // Fallback to macOS system sound if bundled sound doesn't exist
        if (!fs.existsSync(soundPath)) {
            return '/System/Library/Sounds/Ping.aiff';
        }

        return soundPath;
    }

    /**
     * Play the configured notification sound (macOS only)
     */
    async playSound(): Promise<void> {
        const soundPath = this.getSoundPath();

        // Check if sound file exists
        if (!fs.existsSync(soundPath)) {
            throw new Error(vscode.l10n.t('Sound file not found: {0}', soundPath));
        }

        const config = vscode.workspace.getConfiguration('cc-ring');
        const volume = (config.get('volume', 50) / 100).toFixed(2);

        try {
            // macOS - use afplay
            await execAsync(`afplay -v ${volume} "${soundPath}"`);
        } catch (error) {
            throw new Error(vscode.l10n.t('Failed to play sound: {0}', String(error)));
        }
    }

    /**
     * Get list of available bundled sounds
     */
    getAvailableSounds(): string[] {
        const soundsDir = path.join(this.context.extensionPath, 'sounds');

        if (!fs.existsSync(soundsDir)) {
            return [];
        }

        return fs.readdirSync(soundsDir)
            .filter(file => file.endsWith('.wav') || file.endsWith('.mp3') || file.endsWith('.m4a'))
            .map(file => path.basename(file, path.extname(file)));
    }

    /**
     * Validate that a sound file exists and is playable
     */
    validateSoundFile(filePath: string): boolean {
        if (!fs.existsSync(filePath)) {
            return false;
        }

        const ext = path.extname(filePath).toLowerCase();
        const validExtensions = ['.wav', '.mp3', '.m4a', '.aiff', '.flac'];

        return validExtensions.includes(ext);
    }
}
