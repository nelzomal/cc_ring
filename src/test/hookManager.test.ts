import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { HookManager, HOOK_ID } from "../hookManager";

suite("HookManager Test Suite", () => {
  let context: vscode.ExtensionContext;
  let hookManager: HookManager;
  let testHooksDir: string;
  let tempSettingsPath: string;
  let originalGetSettingsPath: any;
  let originalGetHooksDirectory: any;

  // Helper function to get the hooks directory
  const getHooksDirectory = (): string => {
    return testHooksDir;
  };

  // Helper functions to get expected file paths
  const getExpectedScriptPath = (): string => {
    return path.join(getHooksDirectory(), `play-sound-cc-ring-${HOOK_ID}.sh`);
  };

  const getExpectedConfigPath = (): string => {
    return path.join(getHooksDirectory(), `cc-ring-config-${HOOK_ID}.json`);
  };

  // Helper function to read settings.json
  const getSettings = (): any => {
    if (!fs.existsSync(tempSettingsPath)) {
      return {};
    }
    const content = fs.readFileSync(tempSettingsPath, "utf-8");
    return JSON.parse(content);
  };

  // Helper function to check if hook is registered in settings
  const isHookRegistered = (): boolean => {
    const settings = getSettings();
    if (!settings.hooks?.Stop) {
      return false;
    }

    const hookScriptName = `play-sound-cc-ring-${HOOK_ID}.sh`;
    return settings.hooks.Stop.some((stopHook: any) =>
      stopHook.hooks?.some((hook: any) =>
        hook.command?.includes(hookScriptName)
      )
    );
  };

  setup(async () => {
    // Create temporary directory for test
    testHooksDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "cc-ring-integration-test-")
    );
    tempSettingsPath = path.join(testHooksDir, "settings.json");

    // Get extension and activate it
    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    if (extension) {
      await extension.activate();
      const exportedApi = extension.exports;
      if (exportedApi?.hookManager) {
        hookManager = exportedApi.hookManager;

        // Override paths to use temp directory
        originalGetSettingsPath = (hookManager as any).getSettingsPath;
        originalGetHooksDirectory = (hookManager as any).getHooksDirectory;

        (hookManager as any).getSettingsPath = () => tempSettingsPath;
        (hookManager as any).getHooksDirectory = () => testHooksDir;
      }
    }
  });

  teardown(async () => {
    // Restore original methods
    if (hookManager && originalGetSettingsPath) {
      (hookManager as any).getSettingsPath = originalGetSettingsPath;
      (hookManager as any).getHooksDirectory = originalGetHooksDirectory;
    }

    // Clean up temporary directory
    if (fs.existsSync(testHooksDir)) {
      fs.rmSync(testHooksDir, { recursive: true, force: true });
    }
  });

  test("Install hook creates hook script file", async function () {
    this.timeout(10000); // Increase timeout for file operations

    // Install the hook
    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension, "Extension should be installed");

    await extension.activate();
    const exportedApi = extension.exports;

    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;
      await hookManager.installHook();

      const scriptPath = getExpectedScriptPath();
      assert.ok(fs.existsSync(scriptPath), "Hook script file should exist");

      // Verify the file is executable
      const stats = fs.statSync(scriptPath);
      const mode = stats.mode;
      const isExecutable = (mode & 0o111) !== 0;
      assert.ok(isExecutable, "Hook script should be executable");
    }
  });

  test("Install hook creates config file", async function () {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension);
    await extension.activate();

    const exportedApi = extension.exports;
    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;
      await hookManager.installHook();

      const configPath = getExpectedConfigPath();
      assert.ok(fs.existsSync(configPath), "Config file should exist");

      // Verify config file contains correct structure
      const configContent = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.ok(configContent.soundPath, "Config should contain soundPath");
      // Volume might be stored as string or number depending on config
      assert.ok(
        configContent.volume !== undefined,
        "Config should contain volume"
      );
    }
  });

  test("Install hook registers in settings.json", async function () {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension);
    await extension.activate();

    const exportedApi = extension.exports;
    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;
      await hookManager.installHook();

      const registered = isHookRegistered();
      assert.ok(registered, "Hook should be registered in settings.json");
    }
  });

  test("Uninstall hook removes hook script file", async function () {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension);
    await extension.activate();

    const exportedApi = extension.exports;
    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;

      // First install
      await hookManager.installHook();
      const scriptPath = getExpectedScriptPath();
      assert.ok(
        fs.existsSync(scriptPath),
        "Hook script should exist after install"
      );

      // Then uninstall
      await hookManager.uninstallHook();

      // Check that the hook script file no longer exists
      assert.ok(
        !fs.existsSync(scriptPath),
        `Hook script should be removed after uninstall`
      );
    }
  });

  test("Uninstall hook removes config file", async function () {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension);
    await extension.activate();

    const exportedApi = extension.exports;
    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;

      // First install
      await hookManager.installHook();
      const configPath = getExpectedConfigPath();
      assert.ok(
        fs.existsSync(configPath),
        "Config file should exist after install"
      );

      // Then uninstall
      await hookManager.uninstallHook();

      // Check that the config file no longer exists
      assert.ok(
        !fs.existsSync(configPath),
        `Config file should be removed after uninstall`
      );
    }
  });

  test("Uninstall hook unregisters from settings.json", async function () {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension);
    await extension.activate();

    const exportedApi = extension.exports;
    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;

      // Save initial hooks state (if any other hooks exist)
      const initialSettings = getSettings();
      const initialStopHooks = initialSettings?.hooks?.Stop || [];
      const initialStopHooksCount = initialStopHooks.length;

      // First install
      await hookManager.installHook();
      assert.ok(isHookRegistered(), "Hook should be registered after install");

      // Verify hooks count increased
      const settingsAfterInstall = getSettings();
      const stopHooksAfterInstall = settingsAfterInstall?.hooks?.Stop || [];

      // Then uninstall
      await hookManager.uninstallHook();
      assert.ok(
        !isHookRegistered(),
        "Hook should be unregistered from settings.json after uninstall"
      );

      // Verify other hooks are not affected
      const settingsAfterUninstall = getSettings();
      const stopHooksAfterUninstall = settingsAfterUninstall?.hooks?.Stop || [];

      // If there were other hooks initially, they should still be there
      if (initialStopHooksCount > 0) {
        assert.strictEqual(
          stopHooksAfterUninstall.length,
          initialStopHooksCount,
          "Other hooks should not be affected by uninstall"
        );
      } else {
        // If CC Ring was the only hook, hooks.Stop should be removed or empty
        assert.ok(
          stopHooksAfterUninstall.length === 0 ||
            !settingsAfterUninstall.hooks?.Stop,
          "hooks.Stop should be cleaned up when last hook is removed"
        );
      }
    }
  });

  test("Uninstall should preserve other Stop hooks", async function () {
    this.timeout(10000);

    // Setup: Create temp settings with CC Ring + another Stop hook
    const hookCommand = path.join(
      testHooksDir,
      `play-sound-cc-ring-${HOOK_ID}.sh`
    );
    const settingsWithBothHooks = {
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: hookCommand,
                timeout: 5,
              },
            ],
          },
          {
            hooks: [
              {
                type: "command",
                command: "/some/other/extension/hook.sh",
                timeout: 10,
              },
            ],
          },
        ],
      },
    };
    fs.writeFileSync(
      tempSettingsPath,
      JSON.stringify(settingsWithBothHooks, null, 2)
    );

    // Action: Uninstall CC Ring hook
    await hookManager.uninstallHook();

    // Verify: Only other hook should remain
    const settings = getSettings();

    assert.ok(settings.hooks, "hooks object should still exist");
    assert.ok(settings.hooks.Stop, "Stop array should still exist");
    assert.strictEqual(
      settings.hooks.Stop.length,
      1,
      "Should have 1 Stop hook remaining (the other one)"
    );

    // Verify CC Ring hook is gone
    assert.ok(!isHookRegistered(), "CC Ring hook should be removed");

    // Verify other hook is still there
    const hasOtherHook = settings.hooks.Stop.some((group: any) =>
      group.hooks?.some(
        (hook: any) => hook.command === "/some/other/extension/hook.sh"
      )
    );
    assert.ok(hasOtherHook, "Other hook should be preserved");
  });

  test("Install should preserve existing Stop hooks", async function () {
    this.timeout(10000);

    // Setup: Create temp settings with an existing Stop hook
    const existingHook = {
      hooks: {
        Stop: [
          {
            hooks: [
              {
                type: "command",
                command: "/some/other/extension/hook.sh",
                timeout: 10,
              },
            ],
          },
        ],
      },
    };
    fs.writeFileSync(tempSettingsPath, JSON.stringify(existingHook, null, 2));

    // Action: Install CC Ring hook
    await hookManager.installHook();

    // Verify: Both hooks should be present
    const settings = getSettings();

    assert.ok(settings.hooks, "hooks object should exist");
    assert.ok(settings.hooks.Stop, "Stop array should exist");
    assert.strictEqual(
      settings.hooks.Stop.length,
      2,
      "Should have 2 Stop hook groups (existing + CC Ring)"
    );

    // Verify existing hook is still there
    const hasExistingHook = settings.hooks.Stop.some((group: any) =>
      group.hooks?.some(
        (hook: any) => hook.command === "/some/other/extension/hook.sh"
      )
    );
    assert.ok(hasExistingHook, "Existing hook should be preserved");

    // Verify CC Ring hook was added
    assert.ok(isHookRegistered(), "CC Ring hook should be registered");
  });

  test("Config file updates without reinstalling hook script", async function () {
    this.timeout(10000);

    const extension = vscode.extensions.getExtension("nelzomal.cc-ring");
    assert.ok(extension);
    await extension.activate();

    const exportedApi = extension.exports;
    if (exportedApi?.hookManager) {
      hookManager = exportedApi.hookManager;

      // Install hook
      await hookManager.installHook();
      const scriptPath = getExpectedScriptPath();
      const configPath = getExpectedConfigPath();
      assert.ok(fs.existsSync(scriptPath) && fs.existsSync(configPath));

      // Get initial modification times
      const scriptStatsBefore = fs.statSync(scriptPath);
      const configStatsBefore = fs.statSync(configPath);

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update config by changing a setting (this would normally be triggered by settings change)
      const config = vscode.workspace.getConfiguration("cc-ring");
      const originalVolume = config.get("volume");

      // Use a different volume value to ensure the config actually changes
      const newVolume = originalVolume === 75 ? 50 : 75;
      await config.update(
        "volume",
        newVolume,
        vscode.ConfigurationTarget.Global
      );

      // Wait longer for config update (async listener takes time)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check modification times
      const scriptStatsAfter = fs.statSync(scriptPath);
      const configStatsAfter = fs.statSync(configPath);

      // Script should NOT be modified
      assert.strictEqual(
        scriptStatsBefore.mtimeMs,
        scriptStatsAfter.mtimeMs,
        "Hook script should not be modified when settings change"
      );

      // Config should be modified
      assert.ok(
        configStatsAfter.mtimeMs > configStatsBefore.mtimeMs,
        "Config file should be updated when settings change"
      );

      // Restore original volume
      await config.update(
        "volume",
        originalVolume,
        vscode.ConfigurationTarget.Global
      );
    }
  });
});
