import * as vscode from 'vscode';

/**
 * L10n test helper to mock vscode.l10n.t() during tests.
 * This ensures that l10n keys are properly translated even when
 * running in a test environment where l10n bundles may not be loaded.
 */

// Store the original l10n.t function
let originalL10nT: typeof vscode.l10n.t;

// Translation map matching bundle.l10n.json
const translations: Record<string, string> = {
    'hookInstalledOnActivation': 'CC Ring: Hook installed successfully!',
    'failedToInstallHookOnActivation': 'CC Ring: Failed to install hook - {0}',
    'customSoundNoPathWarning': 'CC Ring: Custom sound selected but no file path specified. Use "CC Ring: Select Custom Sound File" command to configure.',
    'soundTestCompleted': 'Sound test completed!',
    'failedToPlaySound': 'Failed to play sound: {0}',
    'selectCustomSoundTitle': 'Select Custom Sound File',
    'audioFilesFilter': 'Audio Files',
    'customSoundSelected': 'Custom sound selected: {0}',
    'hookInstalledSuccess': 'Hook installed successfully!',
    'failedToInstallHook': 'Failed to install hook: {0}',
    'hookUninstalledSuccess': 'Hook uninstalled successfully!',
    'failedToUninstallHook': 'Failed to uninstall hook: {0}',
    'statusMessage': 'CC Ring\nStatus: {0}\nVolume: {1}%\nSound: {2}\nHook Location: Global (~/.claude/)',
    'statusEnabled': 'Enabled',
    'statusDisabled': 'Disabled',
    'customSoundNoPathDialog': 'Custom sound selected but no file path specified.',
    'selectSoundFileButton': 'Select Sound File',
    'dismissButton': 'Dismiss',
    'failedToUpdateConfig': 'CC Ring: Failed to update config file - {0}',
    'failedToReinstallHook': 'CC Ring: {0}',
    'failedToUninstallOnDisable': 'CC Ring: Failed to uninstall - {0}',
    'statusBarEnabledText': '$(unmute) CC Ring',
    'statusBarEnabledTooltip': 'CC Ring - Claude Code Sound Notifier (Enabled)',
    'statusBarDisabledText': '$(mute) CC Ring',
    'statusBarDisabledTooltip': 'CC Ring - Claude Code Sound Notifier (Disabled)',
    'failedToWriteConfig': 'Failed to write config file: {0}',
    'cannotInstallCorruptedSettings': 'Cannot install: settings.json is corrupted. Please fix or delete ~/.claude/settings.json manually.',
    'settingsCorruptedWarning': 'SETTINGS_CORRUPTED: Hook files removed successfully, but settings.json appears corrupted and was left untouched. You may need to manually edit ~/.claude/settings.json',
    'failedToInstallHookManager': 'Failed to install hook: {0}',
    'failedToUninstallHookManager': 'Failed to uninstall hook: {0}',
    'soundFileNotFound': 'Sound file not found: {0}',
    'failedToPlaySoundManager': 'Failed to play sound: {0}'
};

/**
 * Mock vscode.l10n.t() to return translations from our map.
 * Should be called in test setup (before/beforeEach).
 */
export function mockL10n(): void {
    // Save original function
    originalL10nT = vscode.l10n.t;

    // Mock the function
    (vscode.l10n as any).t = (key: string, ...args: any[]): string => {
        let translation = translations[key] || key;

        // Handle placeholders like {0}, {1}, etc.
        args.forEach((arg, index) => {
            translation = translation.replace(`{${index}}`, String(arg));
        });

        return translation;
    };
}

/**
 * Restore the original vscode.l10n.t() function.
 * Should be called in test teardown (after/afterEach).
 */
export function restoreL10n(): void {
    if (originalL10nT) {
        (vscode.l10n as any).t = originalL10nT;
    }
}
