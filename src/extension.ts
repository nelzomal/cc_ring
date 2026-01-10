import * as vscode from "vscode";
import { buildAppDeps, AppDeps } from "./deps";
import { InstallHookCommand } from "./presentation/vscode/commands/InstallHookCommand";
import { UninstallHookCommand } from "./presentation/vscode/commands/UninstallHookCommand";
import {
  COMMAND_IDS,
  CONFIG_NAMESPACE,
  CONFIG_KEYS,
  DEFAULT_SOUND,
} from "./shared/constants";

let appDeps: AppDeps;
let installCommand: InstallHookCommand;
let uninstallCommand: UninstallHookCommand;

export async function activate(context: vscode.ExtensionContext) {
  console.log("CC Ring is now active");

  // Build typed dependency graph (composition root)
  appDeps = buildAppDeps(context);

  // Get command controllers from dependency graph
  installCommand = appDeps.presentation.installHookCommand;
  uninstallCommand = appDeps.presentation.uninstallHookCommand;

  // Install hook on activation if enabled
  const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

  if (config.get(CONFIG_KEYS.ENABLED)) {
    // Validate custom sound configuration
    const sound = config.get<string>(CONFIG_KEYS.SOUND, DEFAULT_SOUND);
    const customSoundPath = config.get<string>(CONFIG_KEYS.CUSTOM_SOUND_PATH, "");

    if (sound === "custom" && !customSoundPath) {
      vscode.window.showWarningMessage(
        vscode.l10n.t(
          'CC Ring: Custom sound selected but no file path specified. Use "CC Ring: Select Custom Sound File" command to configure.'
        )
      );
    }

    try {
      await installCommand.execute();
      // Success message already shown by command if fresh installation
    } catch (error) {
      // Error already shown by command
      console.error("Failed to install hook on activation:", error);
    }
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.SELECT_CUSTOM_SOUND, async () => {
      const uri = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          [vscode.l10n.t("Audio Files")]: ["wav", "mp3", "m4a"],
        },
        title: vscode.l10n.t("Select Custom Sound File"),
      });

      if (uri && uri[0]) {
        // TODO should use ConfigProvider to update settings
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
        await config.update(
          CONFIG_KEYS.CUSTOM_SOUND_PATH,
          uri[0].fsPath,
          vscode.ConfigurationTarget.Global
        );
        await config.update(
          CONFIG_KEYS.SOUND,
          "custom",
          vscode.ConfigurationTarget.Global
        );
        vscode.window.showInformationMessage(
          vscode.l10n.t("Custom sound selected: {0}", uri[0].fsPath)
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.INSTALL_HOOK, async () => {
      await installCommand.execute();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.UNINSTALL_HOOK, async () => {
      await uninstallCommand.execute();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_IDS.SHOW_STATUS, async () => {
      const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
      const enabled = config.get(CONFIG_KEYS.ENABLED);
      const volume = config.get(CONFIG_KEYS.VOLUME);
      const sound = config.get(CONFIG_KEYS.SOUND);

      const status = await appDeps.app.checkHookStatusUseCase.execute();
      const statusText = enabled
        ? vscode.l10n.t("Enabled")
        : vscode.l10n.t("Disabled");

      // Show total hooks installed (always SUPPORTED_HOOKS.length when installed)
      const hookCount = status.hooksRegistered ? "7" : "0";

      vscode.window.showInformationMessage(
        vscode.l10n.t(
          "CC Ring\nStatus: {0}\nVolume: {1}%\nSound: {2}\nInstalled Hooks: {3}\nHook Location: Global (~/.claude/)",
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
      if (event.affectsConfiguration(CONFIG_NAMESPACE)) {
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

        // Validate custom sound path
        const sound = config.get<string>(CONFIG_KEYS.SOUND, DEFAULT_SOUND);
        const customSoundPath = config.get<string>(CONFIG_KEYS.CUSTOM_SOUND_PATH, "");

        if (sound === "custom" && !customSoundPath) {
          const choice = await vscode.window.showWarningMessage(
            vscode.l10n.t("Custom sound selected but no file path specified."),
            vscode.l10n.t("Select Sound File"),
            vscode.l10n.t("Dismiss")
          );

          if (choice === vscode.l10n.t("Select Sound File")) {
            await vscode.commands.executeCommand(COMMAND_IDS.SELECT_CUSTOM_SOUND);
          }
        }

        // Handle different types of setting changes
        const enabledChanged = event.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.ENABLED}`);
        const soundChanged = event.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.SOUND}`);
        const volumeChanged = event.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.VOLUME}`);
        const customPathChanged = event.affectsConfiguration(
          `${CONFIG_NAMESPACE}.${CONFIG_KEYS.CUSTOM_SOUND_PATH}`
        );
        const hooksChanged = event.affectsConfiguration(`${CONFIG_NAMESPACE}.${CONFIG_KEYS.HOOKS}`);

        // If sound or volume changed, reinstall to update config file
        if (
          (soundChanged ||
            volumeChanged ||
            customPathChanged ||
            hooksChanged) &&
          config.get(CONFIG_KEYS.ENABLED)
        ) {
          try {
            await installCommand.execute();
          } catch (error) {
            console.error("Failed to update config file:", error);
          }
        }

        // If enabled setting changed, install/uninstall hook
        if (enabledChanged) {
          if (config.get(CONFIG_KEYS.ENABLED)) {
            try {
              await installCommand.execute();
            } catch (error) {
              console.error("Failed to reinstall hook:", error);
            }
          } else {
            try {
              await uninstallCommand.execute();
            } catch (error) {
              console.error("Failed to uninstall hook:", error);
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
}

// Export API for testing
export function getAPI() {
  return {
    appDeps,
    installCommand,
    uninstallCommand,
  };
}
