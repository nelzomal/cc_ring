import * as vscode from 'vscode';
import { HookManager } from './hookManager';
import { SoundManager } from './soundManager';

let statusBarItem: vscode.StatusBarItem;
let hookManager: HookManager;
let soundManager: SoundManager;

export async function activate(context: vscode.ExtensionContext) {
    console.log('CC Ring is now active');

    // Initialize managers
    hookManager = new HookManager(context);
    soundManager = new SoundManager(context);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'cc-ring.showStatus';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();

    // Install hook on activation if enabled
    const config = vscode.workspace.getConfiguration('cc-ring');

    if (config.get('enabled')) {
        // Validate custom sound configuration
        const sound = config.get<string>('sound', 'complete');
        const customSoundPath = config.get<string>('customSoundPath', '');

        if (sound === 'custom' && !customSoundPath) {
            vscode.window.showWarningMessage(
                vscode.l10n.t('customSoundNoPathWarning')
            );
        }

        try {
            await hookManager.installHook();
            vscode.window.showInformationMessage(
                vscode.l10n.t('hookInstalledOnActivation')
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                vscode.l10n.t('failedToInstallHookOnActivation', String(error))
            );
        }
    }

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.testSound', async () => {
            try {
                await soundManager.playSound();
                vscode.window.showInformationMessage(vscode.l10n.t('soundTestCompleted'));
            } catch (error) {
                vscode.window.showErrorMessage(vscode.l10n.t('failedToPlaySound', String(error)));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.selectCustomSound', async () => {
            const uri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    [vscode.l10n.t('audioFilesFilter')]: ['wav', 'mp3', 'm4a']
                },
                title: vscode.l10n.t('selectCustomSoundTitle')
            });

            if (uri && uri[0]) {
                const config = vscode.workspace.getConfiguration('cc-ring');
                await config.update('customSoundPath', uri[0].fsPath, vscode.ConfigurationTarget.Global);
                await config.update('sound', 'custom', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(vscode.l10n.t('customSoundSelected', uri[0].fsPath));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.installHook', async () => {
            try {
                await hookManager.installHook();
                vscode.window.showInformationMessage(vscode.l10n.t('hookInstalledSuccess'));
            } catch (error) {
                vscode.window.showErrorMessage(vscode.l10n.t('failedToInstallHook', String(error)));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.uninstallHook', async () => {
            try {
                await hookManager.uninstallHook();
                vscode.window.showInformationMessage(vscode.l10n.t('hookUninstalledSuccess'));
            } catch (error) {
                // Check if this is a settings corruption warning
                if (error instanceof Error && error.message.startsWith('SETTINGS_CORRUPTED:')) {
                    // Show warning instead of error - files were deleted successfully
                    const message = error.message.replace('SETTINGS_CORRUPTED: ', '');
                    vscode.window.showWarningMessage(message);
                } else {
                    vscode.window.showErrorMessage(vscode.l10n.t('failedToUninstallHook', String(error)));
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.showStatus', () => {
            const config = vscode.workspace.getConfiguration('cc-ring');
            const enabled = config.get('enabled');
            const volume = config.get('volume');
            const sound = config.get('sound');

            const statusText = enabled ? vscode.l10n.t('statusEnabled') : vscode.l10n.t('statusDisabled');

            vscode.window.showInformationMessage(
                vscode.l10n.t('statusMessage', statusText, String(volume), String(sound))
            );
        })
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('cc-ring')) {
                updateStatusBar();

                const config = vscode.workspace.getConfiguration('cc-ring');

                // Validate custom sound path
                const sound = config.get<string>('sound', 'complete');
                const customSoundPath = config.get<string>('customSoundPath', '');

                if (sound === 'custom' && !customSoundPath) {
                    const choice = await vscode.window.showWarningMessage(
                        vscode.l10n.t('customSoundNoPathDialog'),
                        vscode.l10n.t('selectSoundFileButton'),
                        vscode.l10n.t('dismissButton')
                    );

                    if (choice === vscode.l10n.t('selectSoundFileButton')) {
                        await vscode.commands.executeCommand('cc-ring.selectCustomSound');
                    }
                }

                // Handle different types of setting changes
                const enabledChanged = event.affectsConfiguration('cc-ring.enabled');
                const soundChanged = event.affectsConfiguration('cc-ring.sound');
                const volumeChanged = event.affectsConfiguration('cc-ring.volume');
                const customPathChanged = event.affectsConfiguration('cc-ring.customSoundPath');

                // If sound or volume changed, just update config file (no hook reinstall needed)
                if (soundChanged || volumeChanged || customPathChanged) {
                    try {
                        await hookManager.writeConfigFile();
                    } catch (error) {
                        console.error('Failed to update config file:', error);
                        vscode.window.showErrorMessage(vscode.l10n.t('failedToUpdateConfig', String(error)));
                    }
                }

                // If enabled setting changed, install/uninstall hook
                if (enabledChanged) {
                    if (config.get('enabled')) {
                        try {
                            await hookManager.installHook();
                        } catch (error) {
                            console.error('Failed to reinstall hook:', error);
                            vscode.window.showErrorMessage(vscode.l10n.t('failedToReinstallHook', String(error)));
                        }
                    } else {
                        try {
                            await hookManager.uninstallHook();
                        } catch (error) {
                            console.error('Failed to uninstall hook:', error);
                            // Check if this is a settings corruption warning
                            if (error instanceof Error && error.message.startsWith('SETTINGS_CORRUPTED:')) {
                                const message = error.message.replace('SETTINGS_CORRUPTED: ', '');
                                vscode.window.showWarningMessage(`CC Ring: ${message}`);
                            } else {
                                vscode.window.showErrorMessage(vscode.l10n.t('failedToUninstallOnDisable', String(error)));
                            }
                        }
                    }
                }
            }
        })
    );

    // Return API for extension exports (used in testing)
    return getAPI();
}

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('cc-ring');
    const enabled = config.get('enabled');

    if (enabled) {
        statusBarItem.text = vscode.l10n.t('statusBarEnabledText');
        statusBarItem.tooltip = vscode.l10n.t('statusBarEnabledTooltip');
    } else {
        statusBarItem.text = vscode.l10n.t('statusBarDisabledText');
        statusBarItem.tooltip = vscode.l10n.t('statusBarDisabledTooltip');
    }

    statusBarItem.show();
}

export function deactivate() {
    // Clean up on deactivation (optional - user might want to keep hooks)
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}

// Export API for testing
export function getAPI() {
    return {
        hookManager,
        soundManager
    };
}
