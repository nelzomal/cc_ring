import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { HookManager, HOOK_ID } from "../hookManager";

suite("HookManager Unit Tests", () => {
  let tempDir: string;
  let tempSettingsPath: string;
  let mockContext: any;
  let hookManager: HookManager;

  setup(() => {
    // Create temporary directory for test settings
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-ring-test-"));
    tempSettingsPath = path.join(tempDir, "settings.json");

    // Mock VS Code ExtensionContext
    mockContext = {
      subscriptions: [],
      globalState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
        keys: () => [],
      },
      workspaceState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
        keys: () => [],
      },
      extensionPath: tempDir,
      storagePath: tempDir,
      globalStoragePath: tempDir,
      logPath: tempDir,
      extensionUri: undefined as any,
      environmentVariableCollection: undefined as any,
      extensionMode: 3, // ExtensionMode.Test
      storageUri: undefined as any,
      globalStorageUri: undefined as any,
      logUri: undefined as any,
      extension: undefined as any,
      secrets: undefined as any,
      languageModelAccessInformation: undefined as any,
    };

    // Create HookManager instance
    hookManager = new HookManager(mockContext);

    // Override getSettingsPath to use temp settings
    (hookManager as any).getSettingsPath = () => tempSettingsPath;

    // Override getHooksDirectory to use temp directory
    (hookManager as any).getHooksDirectory = () => tempDir;
  });

  teardown(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  suite("registerHook", () => {
    test("Should register hook in empty settings", async () => {
      // Setup: No settings file exists
      assert.ok(!fs.existsSync(tempSettingsPath));

      // Action: Register hook
      await hookManager.installHook();

      // Verify: Settings file created with hook
      assert.ok(fs.existsSync(tempSettingsPath));
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(settings.hooks);
      assert.ok(settings.hooks.Stop);
      assert.strictEqual(settings.hooks.Stop.length, 1);

      const hookCommand = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      assert.ok(
        settings.hooks.Stop[0].hooks[0].command.includes(
          `play-sound-cc-ring-${HOOK_ID}.sh`
        )
      );
    });

    test("Should preserve existing Stop hooks", async () => {
      // Setup: Create settings with another hook
      const existingHook = {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: "command",
                  command: "/some/other/hook.sh",
                  timeout: 10,
                },
              ],
            },
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(existingHook, null, 2)
      );

      // Action: Register CC Ring hook
      await hookManager.installHook();

      // Verify: Both hooks should be present
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));

      assert.ok(settings.hooks.Stop);
      assert.strictEqual(
        settings.hooks.Stop.length,
        2,
        "Should have 2 Stop hook groups (existing + CC Ring)"
      );

      // Verify existing hook is still there
      const hasExistingHook = settings.hooks.Stop.some((group: any) =>
        group.hooks?.some((hook: any) => hook.command === "/some/other/hook.sh")
      );
      assert.ok(hasExistingHook, "Existing hook should be preserved");

      // Verify CC Ring hook was added
      const hasCCRingHook = settings.hooks.Stop.some((group: any) =>
        group.hooks?.some((hook: any) =>
          hook.command.includes(`play-sound-cc-ring-${HOOK_ID}.sh`)
        )
      );
      assert.ok(hasCCRingHook, "CC Ring hook should be added");
    });

    test("Should not create duplicate hooks", async () => {
      // Action: Register hook twice
      await hookManager.installHook();
      await hookManager.installHook();

      // Verify: Only one hook exists
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      const ccRingHooks = settings.hooks.Stop.filter((group: any) =>
        group.hooks?.some((hook: any) =>
          hook.command.includes(`play-sound-cc-ring-${HOOK_ID}.sh`)
        )
      );

      assert.strictEqual(
        ccRingHooks.length,
        1,
        "Should not create duplicate hooks"
      );
    });
  });

  suite("unregisterHook", () => {
    test("Should remove only CC Ring hook", async () => {
      // Setup: Create settings with CC Ring + another hook
      const hookCommand = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
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
                  command: "/some/other/hook.sh",
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

      // Action: Unregister CC Ring hook
      await hookManager.uninstallHook();

      // Verify: Only other hook remains
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));

      assert.ok(settings.hooks, "hooks object should still exist");
      assert.ok(settings.hooks.Stop, "Stop array should still exist");
      assert.strictEqual(
        settings.hooks.Stop.length,
        1,
        "Should have 1 Stop hook remaining"
      );

      // Verify CC Ring hook is gone
      const hasCCRingHook = settings.hooks.Stop.some((group: any) =>
        group.hooks?.some((hook: any) =>
          hook.command.includes(`play-sound-cc-ring-${HOOK_ID}.sh`)
        )
      );
      assert.ok(!hasCCRingHook, "CC Ring hook should be removed");

      // Verify other hook is still there
      const hasOtherHook = settings.hooks.Stop.some((group: any) =>
        group.hooks?.some((hook: any) => hook.command === "/some/other/hook.sh")
      );
      assert.ok(hasOtherHook, "Other hook should be preserved");
    });

    test("Should clean up empty structures when removing last hook", async () => {
      // Setup: Create settings with only CC Ring hook
      const hookCommand = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const settingsWithOnlyCC = {
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
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(settingsWithOnlyCC, null, 2)
      );

      // Action: Unregister CC Ring hook
      await hookManager.uninstallHook();

      // Verify: hooks.Stop is removed (or hooks object is removed)
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));

      assert.ok(
        !settings.hooks?.Stop || settings.hooks.Stop.length === 0,
        "Stop array should be removed when empty"
      );
    });

    test("Should handle missing settings file gracefully", async () => {
      // Setup: No settings file
      assert.ok(!fs.existsSync(tempSettingsPath));

      // Action: Should not throw
      await assert.doesNotReject(async () => {
        await hookManager.uninstallHook();
      });
    });

    test("Should not affect other hook types (Start, etc.)", async () => {
      // Setup: Create settings with Start hook and CC Ring Stop hook
      const hookCommand = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const settingsWithStartHook = {
        hooks: {
          Start: [
            {
              hooks: [
                {
                  type: "command",
                  command: "/some/start/hook.sh",
                  timeout: 5,
                },
              ],
            },
          ],
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
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(settingsWithStartHook, null, 2)
      );

      // Action: Unregister CC Ring hook
      await hookManager.uninstallHook();

      // Verify: Start hook is preserved
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(settings.hooks, "hooks object should still exist");
      assert.ok(settings.hooks.Start, "Start array should still exist");
      assert.strictEqual(settings.hooks.Start.length, 1, "Start hook should be preserved");
      assert.strictEqual(
        settings.hooks.Start[0].hooks[0].command,
        "/some/start/hook.sh",
        "Start hook command should be unchanged"
      );
    });
  });

  suite("Invalid settings.json handling", () => {
    test("Should abort install when settings.json is corrupted", async () => {
      // Setup: Create invalid JSON file
      const corruptedContent = "{ this is not valid json }";
      fs.writeFileSync(tempSettingsPath, corruptedContent);

      // Action: Should reject with error about corrupted settings
      await assert.rejects(
        async () => await hookManager.installHook(),
        /settings\.json is corrupted/,
        "Should throw error about corrupted settings.json"
      );

      // Verify: Nothing was created
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const configPath = path.join(
        tempDir,
        `cc-ring-config-${HOOK_ID}.json`
      );
      assert.ok(
        !fs.existsSync(hookPath),
        "Hook script should NOT be created"
      );
      assert.ok(
        !fs.existsSync(configPath),
        "Config file should NOT be created"
      );

      // Verify: settings.json left untouched
      const stillCorrupted = fs.readFileSync(tempSettingsPath, "utf-8");
      assert.strictEqual(
        stillCorrupted,
        corruptedContent,
        "Corrupted settings.json should be left untouched"
      );
    });

    test("Should abort install when settings.json is empty", async () => {
      // Setup: Create empty file (invalid JSON)
      fs.writeFileSync(tempSettingsPath, "");

      // Action: Should reject since empty string is invalid JSON
      await assert.rejects(
        async () => await hookManager.installHook(),
        /settings\.json is corrupted/,
        "Should throw error for empty settings.json"
      );

      // Verify: Nothing created
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      assert.ok(!fs.existsSync(hookPath), "Hook script should NOT be created");
    });

    test("Should handle settings.json with malformed hooks object (non-object)", async () => {
      // Setup: hooks is a string instead of object
      const malformedSettings = {
        hooks: "this should be an object",
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Install should fix the structure
      await hookManager.installHook();

      // Verify: hooks should now be a proper object with Stop array
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.strictEqual(typeof settings.hooks, "object");
      assert.ok(Array.isArray(settings.hooks.Stop));
    });

    test("Should convert non-array Stop to array", async () => {
      // Setup: Stop is a string instead of array
      const malformedSettings = {
        hooks: {
          Stop: "this should be an array",
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Install should fix Stop structure
      await hookManager.installHook();

      // Verify: Stop should now be an array
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(Array.isArray(settings.hooks.Stop));
      assert.strictEqual(settings.hooks.Stop.length, 1);
    });

    test("Should convert non-array Stop (number) to array", async () => {
      // Setup: Stop is a number
      const malformedSettings = {
        hooks: {
          Stop: 42,
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Install should fix Stop structure
      await hookManager.installHook();

      // Verify: Stop should now be an array
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(Array.isArray(settings.hooks.Stop));
    });

    test("Should convert non-array Stop (null) to array", async () => {
      // Setup: Stop is null
      const malformedSettings = {
        hooks: {
          Stop: null,
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Install should fix Stop structure
      await hookManager.installHook();

      // Verify: Stop should now be an array
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(Array.isArray(settings.hooks.Stop));
    });
  });

  suite("Malformed Stop group structures", () => {
    test("Should handle Stop groups without hooks property", async () => {
      // Setup: Stop group is an object without hooks property
      const malformedSettings = {
        hooks: {
          Stop: [
            { type: "something" }, // Missing hooks property
            {
              hooks: [
                {
                  type: "command",
                  command: "/other/hook.sh",
                  timeout: 5,
                },
              ],
            },
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Should not throw when uninstalling
      await assert.doesNotReject(async () => {
        await hookManager.uninstallHook();
      });

      // Verify: Valid group is preserved, malformed one should be kept as-is
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(settings.hooks.Stop);
      // The valid hook should remain
      const validHooks = settings.hooks.Stop.filter((g: any) =>
        g.hooks?.some?.((h: any) => h.command === "/other/hook.sh")
      );
      assert.strictEqual(validHooks.length, 1);
    });

    test("Should handle Stop groups with hooks as non-array", async () => {
      // Setup: hooks property is not an array
      const malformedSettings = {
        hooks: {
          Stop: [
            { hooks: "not an array" }, // hooks is a string
            {
              hooks: [
                {
                  type: "command",
                  command: "/other/hook.sh",
                  timeout: 5,
                },
              ],
            },
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Should not throw
      await assert.doesNotReject(async () => {
        await hookManager.uninstallHook();
      });

      // Verify: Settings are processed without error
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(settings.hooks);
    });

    test("Should handle mixed valid and invalid hooks in Stop group", async () => {
      // Setup: Stop group has mix of valid and invalid hooks
      const malformedSettings = {
        hooks: {
          Stop: [
            {
              hooks: [
                { command: "/valid/hook.sh", type: "command", timeout: 5 },
                { type: "invalid" }, // Missing command
                null, // null entry
                { command: "/another/valid.sh", type: "command", timeout: 3 },
              ],
            },
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(malformedSettings, null, 2)
      );

      // Action: Install CC Ring hook
      await hookManager.installHook();

      // Verify: CC Ring hook added, existing structure preserved
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      assert.ok(settings.hooks.Stop);
      // Should have original group + CC Ring group
      assert.ok(settings.hooks.Stop.length >= 2);
    });
  });

  suite("Duplicate detection edge cases", () => {
    test("Should detect duplicate across multiple Stop groups", async () => {
      // Setup: Create CC Ring hook in two different Stop groups
      const hookCommand = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const settingsWithDuplicates = {
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
                  command: hookCommand, // Duplicate in different group
                  timeout: 5,
                },
              ],
            },
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(settingsWithDuplicates, null, 2)
      );

      // Action: Try to install again
      await hookManager.installHook();

      // Verify: Should not add a third one (should detect existing)
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      const ccRingGroups = settings.hooks.Stop.filter((group: any) =>
        group.hooks?.some((hook: any) => hook.command === hookCommand)
      );

      // Should still have the 2 existing ones, not add a third
      assert.strictEqual(
        ccRingGroups.length,
        2,
        "Should not add duplicate when it exists in multiple groups"
      );
    });

    test("Should remove all duplicates when uninstalling", async () => {
      // Setup: Create CC Ring hook in two different Stop groups (duplicates)
      const hookCommand = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const settingsWithDuplicates = {
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
                  command: "/other/hook.sh",
                  timeout: 5,
                },
                {
                  type: "command",
                  command: hookCommand, // Duplicate CC Ring hook
                  timeout: 5,
                },
              ],
            },
            {
              hooks: [
                {
                  type: "command",
                  command: hookCommand, // Another duplicate
                  timeout: 5,
                },
              ],
            },
          ],
        },
      };
      fs.writeFileSync(
        tempSettingsPath,
        JSON.stringify(settingsWithDuplicates, null, 2)
      );

      // Action: Uninstall
      await hookManager.uninstallHook();

      // Verify: ALL CC Ring hooks should be removed from all groups
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));

      // Check that no CC Ring hooks remain
      const remainingCCRing = settings.hooks.Stop?.flatMap((group: any) =>
        group.hooks?.filter((hook: any) => hook.command === hookCommand) || []
      ) || [];

      assert.strictEqual(
        remainingCCRing.length,
        0,
        "All CC Ring duplicates should be removed"
      );

      // Verify other hook is preserved
      const hasOtherHook = settings.hooks.Stop?.some((group: any) =>
        group.hooks?.some((hook: any) => hook.command === "/other/hook.sh")
      );
      assert.ok(hasOtherHook, "Other hooks should be preserved");
    });
  });

  suite("File system edge cases", () => {
    test("Should handle uninstall when hook script already deleted", async () => {
      // Setup: Install hook first
      await hookManager.installHook();

      // Manually delete the hook script file
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      fs.unlinkSync(hookPath);

      // Action: Uninstall should not throw
      await assert.doesNotReject(async () => {
        await hookManager.uninstallHook();
      });

      // Verify: Settings should be cleaned up
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      const hasCCRing = settings.hooks?.Stop?.some((group: any) =>
        group.hooks?.some((hook: any) =>
          hook.command.includes(`play-sound-cc-ring-${HOOK_ID}.sh`)
        )
      );
      assert.ok(!hasCCRing, "Hook should be removed from settings");
    });

    test("Should handle uninstall when config file already deleted", async () => {
      // Setup: Install hook first
      await hookManager.installHook();

      // Manually delete the config file
      const configPath = path.join(tempDir, `cc-ring-config-${HOOK_ID}.json`);
      fs.unlinkSync(configPath);

      // Action: Uninstall should not throw
      await assert.doesNotReject(async () => {
        await hookManager.uninstallHook();
      });

      // Verify: Script and settings should be cleaned up
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      assert.ok(!fs.existsSync(hookPath), "Hook script should be removed");
    });

    test("Should handle uninstall when both files already deleted but settings remain", async () => {
      // Setup: Install hook first
      await hookManager.installHook();

      // Manually delete both files
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const configPath = path.join(tempDir, `cc-ring-config-${HOOK_ID}.json`);
      fs.unlinkSync(hookPath);
      fs.unlinkSync(configPath);

      // Action: Uninstall should still clean up settings
      await assert.doesNotReject(async () => {
        await hookManager.uninstallHook();
      });

      // Verify: Settings should be cleaned
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      const hasCCRing = settings.hooks?.Stop?.some((group: any) =>
        group.hooks?.some((hook: any) =>
          hook.command.includes(`play-sound-cc-ring-${HOOK_ID}.sh`)
        )
      );
      assert.ok(!hasCCRing, "Hook should be removed from settings");
    });

    test("Should remove files but warn about corrupted settings.json on uninstall", async () => {
      // Setup: Install hook first
      await hookManager.installHook();

      // Corrupt settings.json
      const corruptedContent = "{ corrupted json }";
      fs.writeFileSync(tempSettingsPath, corruptedContent);

      // Action: Uninstall should throw SETTINGS_CORRUPTED error
      await assert.rejects(
        async () => {
          await hookManager.uninstallHook();
        },
        /SETTINGS_CORRUPTED:/,
        "Should throw SETTINGS_CORRUPTED error"
      );

      // Verify: Hook and config files should be deleted despite the error
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      const configPath = path.join(
        tempDir,
        `cc-ring-config-${HOOK_ID}.json`
      );
      assert.ok(!fs.existsSync(hookPath), "Hook script should be deleted");
      assert.ok(!fs.existsSync(configPath), "Config file should be deleted");

      // Verify: settings.json left untouched (still corrupted)
      const stillCorrupted = fs.readFileSync(tempSettingsPath, "utf-8");
      assert.strictEqual(
        stillCorrupted,
        corruptedContent,
        "Corrupted settings.json should be left untouched"
      );
    });
  });

  suite("isHookInstalled()", () => {
    test("Should return false when never installed", () => {
      // No installation performed
      const isInstalled = hookManager.isHookInstalled();
      assert.strictEqual(isInstalled, false);
    });

    test("Should return true after successful install", async () => {
      // Action: Install hook
      await hookManager.installHook();

      // Verify: Should return true
      const isInstalled = hookManager.isHookInstalled();
      assert.strictEqual(isInstalled, true);
    });

    test("Should return false after uninstall", async () => {
      // Setup: Install then uninstall
      await hookManager.installHook();
      await hookManager.uninstallHook();

      // Verify: Should return false
      const isInstalled = hookManager.isHookInstalled();
      assert.strictEqual(isInstalled, false);
    });

    test("Should return false when hook script manually deleted", async () => {
      // Setup: Install then manually delete script
      await hookManager.installHook();
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      fs.unlinkSync(hookPath);

      // Verify: Should return false
      const isInstalled = hookManager.isHookInstalled();
      assert.strictEqual(isInstalled, false);
    });

    test("Should return true even if settings.json not registered", async () => {
      // Setup: Create hook script manually without registering
      const hookPath = path.join(tempDir, `play-sound-cc-ring-${HOOK_ID}.sh`);
      fs.writeFileSync(hookPath, "#!/bin/bash\necho test");

      // Verify: Should return true (only checks file existence)
      const isInstalled = hookManager.isHookInstalled();
      assert.strictEqual(isInstalled, true);
    });
  });

  suite("Paths with spaces and special characters", () => {
    test("Should handle config with sound path containing spaces", async () => {
      // Setup: Create a sound file with spaces in path
      const soundsDir = path.join(tempDir, "sounds with spaces");
      fs.mkdirSync(soundsDir, { recursive: true });
      const soundPath = path.join(soundsDir, "test sound.wav");
      fs.writeFileSync(soundPath, "fake audio data");

      // Override extension path to use temp dir with spaces
      mockContext.extensionPath = soundsDir;
      const hookManagerWithSpaces = new HookManager(mockContext);
      (hookManagerWithSpaces as any).getSettingsPath = () => tempSettingsPath;
      (hookManagerWithSpaces as any).getHooksDirectory = () => tempDir;

      // Action: Install hook
      await hookManagerWithSpaces.installHook();

      // Verify: Config file created with escaped path
      const configPath = path.join(
        tempDir,
        `cc-ring-config-${HOOK_ID}.json`
      );
      assert.ok(fs.existsSync(configPath), "Config file should exist");

      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      assert.ok(config.soundPath, "Sound path should be set");
      // Path with spaces should be preserved in JSON
      assert.ok(config.soundPath.includes("spaces"));
    });

    test("Should handle hook script generation with paths containing special chars", async () => {
      // Setup: Create directory with special characters
      const specialDir = path.join(tempDir, "dir-with-special_chars");
      fs.mkdirSync(specialDir, { recursive: true });

      mockContext.extensionPath = specialDir;
      const hookManagerSpecial = new HookManager(mockContext);
      (hookManagerSpecial as any).getSettingsPath = () => tempSettingsPath;
      (hookManagerSpecial as any).getHooksDirectory = () => specialDir;

      // Action: Install hook
      await hookManagerSpecial.installHook();

      // Verify: Hook script created and executable
      const hookPath = path.join(
        specialDir,
        `play-sound-cc-ring-${HOOK_ID}.sh`
      );
      assert.ok(fs.existsSync(hookPath), "Hook script should exist");

      // Verify script contains proper path references
      const scriptContent = fs.readFileSync(hookPath, "utf-8");
      assert.ok(
        scriptContent.includes("CONFIG_FILE="),
        "Script should define CONFIG_FILE"
      );
      assert.ok(
        scriptContent.includes("DEFAULT_SOUND="),
        "Script should define DEFAULT_SOUND"
      );
    });

    test("Should handle custom sound path with quotes in filename", async () => {
      // Setup: Create a directory and simulate config with special filename
      const soundsDir = path.join(tempDir, "sounds");
      fs.mkdirSync(soundsDir, { recursive: true });
      // Note: Most filesystems don't allow actual quotes in filenames,
      // but we can test the path is preserved in config
      const soundPath = path.join(soundsDir, "sound-file.wav");
      fs.writeFileSync(soundPath, "fake audio data");

      // Action: Install hook
      await hookManager.installHook();

      // Verify: Config created successfully
      const configPath = path.join(
        tempDir,
        `cc-ring-config-${HOOK_ID}.json`
      );
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

      // Config should be valid JSON even with special paths
      assert.ok(config.soundPath, "Sound path should exist");
      assert.ok(config.volume, "Volume should exist");
    });

    test("Should handle hook command path with spaces in settings.json", async () => {
      // Setup: Create hooks directory with spaces
      const hooksWithSpaces = path.join(tempDir, "hooks with spaces");
      fs.mkdirSync(hooksWithSpaces, { recursive: true });

      const hookManagerSpaces = new HookManager(mockContext);
      (hookManagerSpaces as any).getSettingsPath = () => tempSettingsPath;
      (hookManagerSpaces as any).getHooksDirectory = () => hooksWithSpaces;

      // Action: Install hook
      await hookManagerSpaces.installHook();

      // Verify: Settings.json contains path with spaces
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      const hookCommand = settings.hooks.Stop[0].hooks[0].command;

      assert.ok(
        hookCommand.includes("hooks with spaces"),
        "Path with spaces should be preserved in settings"
      );

      // Verify file actually exists at that path
      assert.ok(
        fs.existsSync(hookCommand),
        "Hook file should exist at path with spaces"
      );
    });

    test("Should handle uninstall with paths containing special characters", async () => {
      // Setup: Install with special path then uninstall
      const specialDir = path.join(tempDir, "dir_with-special.chars");
      fs.mkdirSync(specialDir, { recursive: true });

      const hookManagerSpecial = new HookManager(mockContext);
      (hookManagerSpecial as any).getSettingsPath = () => tempSettingsPath;
      (hookManagerSpecial as any).getHooksDirectory = () => specialDir;

      await hookManagerSpecial.installHook();

      // Action: Uninstall
      await assert.doesNotReject(async () => {
        await hookManagerSpecial.uninstallHook();
      });

      // Verify: Files deleted successfully
      const hookPath = path.join(
        specialDir,
        `play-sound-cc-ring-${HOOK_ID}.sh`
      );
      const configPath = path.join(
        specialDir,
        `cc-ring-config-${HOOK_ID}.json`
      );

      assert.ok(!fs.existsSync(hookPath), "Hook script should be deleted");
      assert.ok(!fs.existsSync(configPath), "Config file should be deleted");

      // Verify settings cleaned up
      const settings = JSON.parse(fs.readFileSync(tempSettingsPath, "utf-8"));
      const hasCCRing = settings.hooks?.Stop?.some((group: any) =>
        group.hooks?.some((hook: any) =>
          hook.command.includes(`play-sound-cc-ring-${HOOK_ID}.sh`)
        )
      );
      assert.ok(!hasCCRing, "Hook should be removed from settings");
    });
  });
});
