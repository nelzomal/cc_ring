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
                'CC Ring: Custom sound selected but no file path specified. Use "CC Ring: Select Custom Sound File" command to configure.'
            );
        }

        try {
            await hookManager.installHook();
            vscode.window.showInformationMessage(
                'CC Ring: Hook installed successfully!'
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `CC Ring: Failed to install hook - ${error}`
            );
        }
    }

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.testSound', async () => {
            try {
                await soundManager.playSound();
                vscode.window.showInformationMessage('Sound test completed!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to play sound: ${error}`);
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
                    'Audio Files': ['wav', 'mp3', 'm4a']
                },
                title: 'Select Custom Sound File'
            });

            if (uri && uri[0]) {
                const config = vscode.workspace.getConfiguration('cc-ring');
                await config.update('customSoundPath', uri[0].fsPath, vscode.ConfigurationTarget.Global);
                await config.update('sound', 'custom', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(`Custom sound selected: ${uri[0].fsPath}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.installHook', async () => {
            try {
                await hookManager.installHook();
                vscode.window.showInformationMessage('Hook installed successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to install hook: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.uninstallHook', async () => {
            try {
                await hookManager.uninstallHook();
                vscode.window.showInformationMessage('Hook uninstalled successfully!');
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to uninstall hook: ${error}`);
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.showStatus', () => {
            const config = vscode.workspace.getConfiguration('cc-ring');
            const enabled = config.get('enabled');
            const volume = config.get('volume');
            const sound = config.get('sound');

            vscode.window.showInformationMessage(
                `CC Ring\n` +
                `Status: ${enabled ? 'Enabled' : 'Disabled'}\n` +
                `Volume: ${volume}%\n` +
                `Sound: ${sound}\n` +
                `Hook Location: Global (~/.claude/)`
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
                        'Custom sound selected but no file path specified.',
                        'Select Sound File',
                        'Dismiss'
                    );

                    if (choice === 'Select Sound File') {
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
                        vscode.window.showErrorMessage(`CC Ring: Failed to update config file - ${error}`);
                    }
                }

                // If enabled setting changed, install/uninstall hook
                if (enabledChanged) {
                    if (config.get('enabled')) {
                        try {
                            await hookManager.installHook();
                        } catch (error) {
                            console.error('Failed to reinstall hook:', error);
                        }
                    } else {
                        try {
                            await hookManager.uninstallHook();
                        } catch (error) {
                            console.error('Failed to uninstall hook:', error);
                        }
                    }
                }
            }
        })
    );
}

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('cc-ring');
    const enabled = config.get('enabled');

    if (enabled) {
        statusBarItem.text = '$(unmute) CC Ring';
        statusBarItem.tooltip = 'CC Ring - Claude Code Sound Notifier (Enabled)';
    } else {
        statusBarItem.text = '$(mute) CC Ring';
        statusBarItem.tooltip = 'CC Ring - Claude Code Sound Notifier (Disabled)';
    }

    statusBarItem.show();
}

export function deactivate() {
    // Clean up on deactivation (optional - user might want to keep hooks)
    if (statusBarItem) {
        statusBarItem.dispose();
    }
}
