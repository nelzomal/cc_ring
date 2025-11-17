import 'reflect-metadata'; // MUST be imported first for InversifyJS
import * as vscode from 'vscode';
import { Container } from 'inversify';
import { createContainer } from './presentation/composition/container';
import { TYPES } from './shared/types';
import { InstallHookCommand } from './presentation/vscode/commands/InstallHookCommand';
import { UninstallHookCommand } from './presentation/vscode/commands/UninstallHookCommand';
import { TestSoundCommand } from './presentation/vscode/commands/TestSoundCommand';
import { StatusBarView } from './presentation/vscode/views/StatusBarView';
import { CheckHookStatusUseCase } from './application/usecases/CheckHookStatusUseCase';

let statusBarView: StatusBarView;
let container: Container;
let installCommand: InstallHookCommand;
let uninstallCommand: UninstallHookCommand;
let testSoundCommand: TestSoundCommand;

export async function activate(context: vscode.ExtensionContext) {
    console.log('CC Ring is now active');

    // Create status bar (VSCode API object, must be created before container)
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.command = 'cc-ring.showStatus';
    context.subscriptions.push(statusBarItem);

    // Initialize InversifyJS container (composition root)
    container = createContainer(context, statusBarItem);

    // Resolve dependencies from container
    statusBarView = container.get<StatusBarView>(TYPES.StatusBarView);
    await statusBarView.update();

    // Resolve command controllers from container
    installCommand = container.get<InstallHookCommand>(TYPES.InstallHookCommand);
    uninstallCommand = container.get<UninstallHookCommand>(TYPES.UninstallHookCommand);
    testSoundCommand = container.get<TestSoundCommand>(TYPES.TestSoundCommand);

    // Install hook on activation if enabled
    const config = vscode.workspace.getConfiguration('cc-ring');

    if (config.get('enabled')) {
        // Validate custom sound configuration
        const sound = config.get<string>('sound', 'complete');
        const customSoundPath = config.get<string>('customSoundPath', '');

        if (sound === 'custom' && !customSoundPath) {
            vscode.window.showWarningMessage(
                vscode.l10n.t('CC Ring: Custom sound selected but no file path specified. Use "CC Ring: Select Custom Sound File" command to configure.')
            );
        }

        // Check if hook is already installed before showing notification
        const checkStatusUseCase = container.get<CheckHookStatusUseCase>(TYPES.CheckHookStatusUseCase);
        const status = await checkStatusUseCase.execute();
        const wasInstalled = status.isInstalled;

        try {
            await installCommand.execute();
            await statusBarView.update();

            // Only show notification if this was a fresh installation
            if (!wasInstalled) {
                // Success message already shown by command
            }
        } catch (error) {
            // Error already shown by command
            console.error('Failed to install hook on activation:', error);
        }
    }

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.testSound', async () => {
            await testSoundCommand.execute();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.selectCustomSound', async () => {
            const uri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    [vscode.l10n.t('Audio Files')]: ['wav', 'mp3', 'm4a']
                },
                title: vscode.l10n.t('Select Custom Sound File')
            });

            if (uri && uri[0]) {
                const config = vscode.workspace.getConfiguration('cc-ring');
                await config.update('customSoundPath', uri[0].fsPath, vscode.ConfigurationTarget.Global);
                await config.update('sound', 'custom', vscode.ConfigurationTarget.Global);
                vscode.window.showInformationMessage(vscode.l10n.t('Custom sound selected: {0}', uri[0].fsPath));
            }
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.installHook', async () => {
            await installCommand.execute();
            await statusBarView.update();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.uninstallHook', async () => {
            await uninstallCommand.execute();
            await statusBarView.update();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('cc-ring.showStatus', async () => {
            const config = vscode.workspace.getConfiguration('cc-ring');
            const enabled = config.get('enabled');
            const volume = config.get('volume');
            const sound = config.get('sound');

            const checkStatusUseCase = container.get<CheckHookStatusUseCase>(TYPES.CheckHookStatusUseCase);
            const status = await checkStatusUseCase.execute();
            const statusText = enabled ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled');

            // Show total hooks installed (always SUPPORTED_HOOKS.length when installed)
            const hookCount = status.hooksRegistered ? '7' : '0';

            vscode.window.showInformationMessage(
                vscode.l10n.t(
                    'CC Ring\nStatus: {0}\nVolume: {1}%\nSound: {2}\nInstalled Hooks: {3}\nHook Location: Global (~/.claude/)',
                    statusText,
                    String(volume),
                    String(sound),
                    hookCount
                )
            );
        })
    );

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (event) => {
            if (event.affectsConfiguration('cc-ring')) {
                await statusBarView.update();

                const config = vscode.workspace.getConfiguration('cc-ring');

                // Validate custom sound path
                const sound = config.get<string>('sound', 'complete');
                const customSoundPath = config.get<string>('customSoundPath', '');

                if (sound === 'custom' && !customSoundPath) {
                    const choice = await vscode.window.showWarningMessage(
                        vscode.l10n.t('Custom sound selected but no file path specified.'),
                        vscode.l10n.t('Select Sound File'),
                        vscode.l10n.t('Dismiss')
                    );

                    if (choice === vscode.l10n.t('Select Sound File')) {
                        await vscode.commands.executeCommand('cc-ring.selectCustomSound');
                    }
                }

                // Handle different types of setting changes
                const enabledChanged = event.affectsConfiguration('cc-ring.enabled');
                const soundChanged = event.affectsConfiguration('cc-ring.sound');
                const volumeChanged = event.affectsConfiguration('cc-ring.volume');
                const customPathChanged = event.affectsConfiguration('cc-ring.customSoundPath');
                const hooksChanged = event.affectsConfiguration('cc-ring.hooks');

                // If sound or volume changed, reinstall to update config file
                if ((soundChanged || volumeChanged || customPathChanged || hooksChanged) && config.get('enabled')) {
                    try {
                        await installCommand.execute();
                        await statusBarView.update();
                    } catch (error) {
                        console.error('Failed to update config file:', error);
                    }
                }

                // If enabled setting changed, install/uninstall hook
                if (enabledChanged) {
                    if (config.get('enabled')) {
                        try {
                            await installCommand.execute();
                            await statusBarView.update();
                        } catch (error) {
                            console.error('Failed to reinstall hook:', error);
                        }
                    } else {
                        try {
                            await uninstallCommand.execute();
                            await statusBarView.update();
                        } catch (error) {
                            console.error('Failed to uninstall hook:', error);
                        }
                    }
                }
            }
        })
    );

    // Return API for extension exports (used in testing)
    return getAPI();
}

export function deactivate() {
    // Clean up on deactivation (optional - user might want to keep hooks)
    if (statusBarView) {
        statusBarView.dispose();
    }
}

// Export API for testing
export function getAPI() {
    return {
        container,
        installCommand,
        uninstallCommand,
        testSoundCommand,
        statusBarView
    };
}
