import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HookRepositoryError } from "@application/errors/HookRepositoryError";
import { FileSystem } from "@infrastructure/adapters/file-system/FileSystem";
import { LockManager } from "@infrastructure/adapters/utilities/LockManager";
import { ClaudeCodeHookRepository } from "@infrastructure/persistence/claude-settings/ClaudeCodeHookRepository";
import { HOOK_ID } from "@shared/constants";

/**
 * Unit tests for ClaudeCodeHookRepository
 *
 * Tests the infrastructure layer implementation that manages hooks in settings.json
 * Uses real FileSystem with temporary directories for realistic testing
 */
describe("Feature: Managing CC Ring hooks in Claude Code settings.json", () => {
  let repository: ClaudeCodeHookRepository;
  let fileSystem: FileSystem;
  let lockManager: LockManager;
  let tempDir: string;
  let settingsPath: string;
  let coordinationLockPath: string;
  const scriptPath = "/path/to/cc-ring-hook.sh";
  const scriptRelativePath = `~/.claude/cc-ring-hook-${HOOK_ID}.sh`;

  beforeEach(() => {
    // Given a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cc-ring-test-"));
    settingsPath = path.join(tempDir, "settings.json");
    coordinationLockPath = path.join(tempDir, "cc-ring.lock");

    // And a real FileSystem instance
    fileSystem = new FileSystem();

    // And a real LockManager instance
    lockManager = new LockManager();

    // And a ClaudeCodeHookRepository instance
    repository = new ClaudeCodeHookRepository(
      fileSystem,
      settingsPath,
      scriptRelativePath,
      lockManager,
      coordinationLockPath,
      60 // hookTimeout
    );
  });

  afterEach(() => {
    // Clean up temporary directory after each test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // isInstalled() Tests
  // ==========================================================================
  describe("Scenario: Checking hook installation status", () => {
    describe("When settings.json does not exist", () => {
      it("should return false", async () => {
        // Given settings.json does not exist
        // (no file created in beforeEach)

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe("When settings.json is empty", () => {
      it("should return false", async () => {
        // Given settings.json exists but is empty
        await fileSystem.writeFileAtomic(settingsPath, "{}", { createIfMissing: true, overwrite: true });

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe("When settings.json has no hooks property", () => {
      it("should return false", async () => {
        // Given settings.json exists with other properties but no hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            someOtherSetting: "value",
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe("When only Stop hooks are present", () => {
      it("should return true if CC Ring Stop hooks exist", async () => {
        // Given settings.json has CC Ring Stop hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/cc-ring-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return true
        expect(result).toBe(true);
      });

      it("should return false if only non-CC Ring Stop hooks exist", async () => {
        // Given settings.json has only non-CC Ring Stop hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/other-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe("When only Notification hooks are present", () => {
      it("should return true if CC Ring Notification hooks exist", async () => {
        // Given settings.json has CC Ring Notification hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Notification: [
                {
                  matcher: "permission_prompt",
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/cc-ring-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return true
        expect(result).toBe(true);
      });

      it("should return false if only non-CC Ring Notification hooks exist", async () => {
        // Given settings.json has only non-CC Ring Notification hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Notification: [
                {
                  matcher: "permission_prompt",
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/other-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe("When only PreToolUse hooks are present", () => {
      it("should return true if CC Ring PreToolUse hooks exist", async () => {
        // Given settings.json has CC Ring PreToolUse hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              PreToolUse: [
                {
                  matcher: "ExitPlanMode",
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/cc-ring-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return true
        expect(result).toBe(true);
      });

      it("should return false if only non-CC Ring PreToolUse hooks exist", async () => {
        // Given settings.json has only non-CC Ring PreToolUse hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              PreToolUse: [
                {
                  matcher: "ExitPlanMode",
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/other-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });

    describe("When mix of CC Ring and non-CC Ring hooks exist", () => {
      it("should return true", async () => {
        // Given settings.json has both CC Ring and non-CC Ring hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/cc-ring-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
              Notification: [
                {
                  matcher: "permission_prompt",
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/other-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return true
        expect(result).toBe(true);
      });
    });

    describe("When all CC Ring hooks are removed", () => {
      it("should return false", async () => {
        // Given settings.json previously had CC Ring hooks but they were removed
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Notification: [
                {
                  matcher: "permission_prompt",
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/other-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // install() Tests
  // ==========================================================================

  describe("Scenario: Installing CC Ring hooks", () => {
    describe("When settings.json does not exist", () => {
      it("should create file and install all 7 hooks", async () => {
        // Given settings.json does not exist
        // (no file created in beforeEach)

        // When installing hooks
        await repository.install(scriptPath);

        // Then settings.json should be created
        expect(fs.existsSync(settingsPath)).toBe(true);

        // And it should contain all 7 SUPPORTED_HOOKS
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        // 1 Stop hook
        expect(settings.hooks.Stop).toHaveLength(1);
        expect(settings.hooks.Stop[0].hooks[0].command).toBe(scriptPath);

        // 4 Notification hooks
        expect(settings.hooks.Notification).toHaveLength(4);
        const notificationMatchers = settings.hooks.Notification.map(
          (g: any) => g.matcher
        );
        expect(notificationMatchers).toContain("permission_prompt");
        expect(notificationMatchers).toContain("idle_prompt");
        expect(notificationMatchers).toContain("elicitation_dialog");
        expect(notificationMatchers).toContain("auth_success");

        // 2 PreToolUse hooks
        expect(settings.hooks.PreToolUse).toHaveLength(2);
        const preToolUseMatchers = settings.hooks.PreToolUse.map(
          (g: any) => g.matcher
        );
        expect(preToolUseMatchers).toContain("ExitPlanMode");
        expect(preToolUseMatchers).toContain("AskUserQuestion");

        // And all hooks should have correct structure
        [
          ...settings.hooks.Stop,
          ...settings.hooks.Notification,
          ...settings.hooks.PreToolUse,
        ].forEach((group: any) => {
          expect(group.hooks).toHaveLength(1);
          expect(group.hooks[0]).toEqual({
            type: "command",
            command: scriptPath,
            timeout: 60,
          });
        });
      });
    });

    describe("When settings.json is empty", () => {
      it("should install all 7 hooks", async () => {
        // Given settings.json exists but is empty
        await fileSystem.writeFileAtomic(settingsPath, "{}", { createIfMissing: true, overwrite: true });

        // When installing hooks
        await repository.install(scriptPath);

        // Then it should contain all 7 hooks
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        expect(settings.hooks.Stop).toHaveLength(1);
        expect(settings.hooks.Notification).toHaveLength(4);
        expect(settings.hooks.PreToolUse).toHaveLength(2);
      });
    });

    describe("When non-CC Ring hooks already exist", () => {
      it("should preserve existing hooks and add CC Ring hooks", async () => {
        // Given settings.json has non-CC Ring hooks
        const existingHook = {
          type: "command",
          command: "/path/to/other-hook.sh",
          timeout: 10,
        };
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [{ hooks: [existingHook] }],
              Notification: [
                {
                  matcher: "custom_event",
                  hooks: [existingHook],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When installing CC Ring hooks
        await repository.install(scriptPath);

        // Then existing hooks should be preserved
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        // Should have both existing and CC Ring Stop hooks
        expect(settings.hooks.Stop.length).toBeGreaterThan(1);
        const hasExistingStopHook = settings.hooks.Stop.some((group: any) =>
          group.hooks.some((h: any) => h.command === "/path/to/other-hook.sh")
        );
        expect(hasExistingStopHook).toBe(true);

        // Should have both existing and CC Ring Notification hooks
        expect(settings.hooks.Notification.length).toBeGreaterThan(4);
        const hasExistingNotificationHook = settings.hooks.Notification.some(
          (group: any) =>
            group.matcher === "custom_event" &&
            group.hooks.some((h: any) => h.command === "/path/to/other-hook.sh")
        );
        expect(hasExistingNotificationHook).toBe(true);
      });
    });

    describe("When CC Ring hooks already exist (idempotency)", () => {
      it("should replace old CC Ring hooks without duplication", async () => {
        // Given CC Ring hooks are already installed
        await repository.install("/old/path/cc-ring-hook.sh");

        // When installing again with new path
        await repository.install(scriptPath);

        // Then there should be no duplicates
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        // Should still have exactly 7 hooks total
        expect(settings.hooks.Stop).toHaveLength(1);
        expect(settings.hooks.Notification).toHaveLength(4);
        expect(settings.hooks.PreToolUse).toHaveLength(2);

        // And all should use the new path
        const allGroups = [
          ...settings.hooks.Stop,
          ...settings.hooks.Notification,
          ...settings.hooks.PreToolUse,
        ];
        allGroups.forEach((group: any) => {
          expect(group.hooks[0].command).toBe(scriptPath);
          expect(group.hooks[0].command).not.toBe("/old/path/cc-ring-hook.sh");
        });
      });
    });

    describe("When settings.json has other Claude Code settings", () => {
      it("should preserve other settings", async () => {
        // Given settings.json has other Claude Code settings
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            someOtherSetting: "important value",
            anotherSetting: {
              nested: true,
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When installing hooks
        await repository.install(scriptPath);

        // Then other settings should be preserved
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        expect(settings.someOtherSetting).toBe("important value");
        expect(settings.anotherSetting).toEqual({ nested: true });
        expect(settings.hooks).toBeDefined();
      });
    });
  });

  // ==========================================================================
  // uninstall() Tests
  // ==========================================================================

  describe("Scenario: Uninstalling CC Ring hooks", () => {
    describe("When settings.json does not exist", () => {
      it("should complete without error", async () => {
        // Given settings.json does not exist
        // (no file created in beforeEach)

        // When uninstalling hooks
        // Then it should not throw
        await expect(repository.uninstall()).resolves.toBeUndefined();
      });
    });

    describe("When settings.json has no hooks", () => {
      it("should complete without error", async () => {
        // Given settings.json has no hooks
        await fileSystem.writeFileAtomic(settingsPath, "{}", { createIfMissing: true, overwrite: true });

        // When uninstalling hooks
        // Then it should not throw
        await expect(repository.uninstall()).resolves.toBeUndefined();

        // And file should still be valid JSON
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);
        expect(settings).toEqual({});
      });
    });

    describe("When only CC Ring hooks exist", () => {
      it("should remove all hooks and clean up empty structures", async () => {
        // Given only CC Ring hooks exist
        await repository.install(scriptPath);

        // When uninstalling
        await repository.uninstall();

        // Then hooks property should be removed (cleanup empty structures)
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);
        expect(settings.hooks).toBeUndefined();
      });
    });

    describe("When both CC Ring and non-CC Ring hooks exist", () => {
      it("should remove only CC Ring hooks and preserve others", async () => {
        // Given both CC Ring and non-CC Ring hooks exist
        await repository.install(scriptPath);

        const existingHook = {
          type: "command",
          command: "/path/to/other-hook.sh",
          timeout: 10,
        };

        // Add non-CC Ring hooks manually
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);
        settings.hooks.Stop.push({ hooks: [existingHook] });
        settings.hooks.Notification.push({
          matcher: "custom_event",
          hooks: [existingHook],
        });
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify(settings, null, 2),
          { createIfMissing: true, overwrite: true }
        );

        // When uninstalling CC Ring hooks
        await repository.uninstall();

        // Then only non-CC Ring hooks should remain
        const updatedContent = await fileSystem.readFile(settingsPath);
        const updatedSettings = JSON.parse(updatedContent!);

        // Should have only the non-CC Ring hooks
        expect(updatedSettings.hooks.Stop).toHaveLength(1);
        expect(updatedSettings.hooks.Stop[0].hooks[0].command).toBe(
          "/path/to/other-hook.sh"
        );
        expect(updatedSettings.hooks.Notification).toHaveLength(1);
        expect(updatedSettings.hooks.Notification[0].matcher).toBe(
          "custom_event"
        );

        // CC Ring hooks should be gone
        expect(updatedSettings.hooks.PreToolUse).toBeUndefined();
      });
    });

    describe("When hooks arrays become empty after uninstall", () => {
      it("should clean up empty arrays", async () => {
        // Given only CC Ring hooks in each event type
        await repository.install(scriptPath);

        // When uninstalling
        await repository.uninstall();

        // Then empty arrays should be cleaned up
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        expect(settings.hooks).toBeUndefined();
      });
    });

    describe("When other Claude Code settings exist", () => {
      it("should preserve other settings", async () => {
        // Given hooks installed with other settings
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            someOtherSetting: "important value",
          }),
          { createIfMissing: true, overwrite: true }
        );
        await repository.install(scriptPath);

        // When uninstalling
        await repository.uninstall();

        // Then other settings should be preserved
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        expect(settings.someOtherSetting).toBe("important value");
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe("Scenario: Handling malformed settings.json", () => {
    describe("When settings.json contains invalid JSON", () => {
      it("should throw HookRepositoryError", async () => {
        // Given settings.json contains invalid JSON
        await fileSystem.writeFileAtomic(
          settingsPath,
          "{ invalid json content }",
          { createIfMissing: true, overwrite: true }
        );

        // When checking installation status
        // Then it should throw HookRepositoryError
        await expect(repository.isInstalled()).rejects.toThrow(
          HookRepositoryError
        );
        await expect(repository.isInstalled()).rejects.toThrow(
          "Hook storage file corrupted"
        );
      });
    });

    describe("When settings.json contains duplicate keys", () => {
      it("should throw HookRepositoryError", async () => {
        // Given settings.json contains duplicate keys
        await fileSystem.writeFileAtomic(
          settingsPath,
          '{"hooks": {}, "hooks": {}}',
          { createIfMissing: true, overwrite: true }
        );

        // When checking installation status
        // Then it should throw HookRepositoryError
        await expect(repository.isInstalled()).rejects.toThrow(
          HookRepositoryError
        );
      });
    });

    describe("When settings.json fails schema validation", () => {
      it("should throw HookRepositoryError for invalid hook structure", async () => {
        // Given settings.json has invalid hook structure
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  // Missing required 'hooks' array
                  invalid: "structure",
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking installation status
        // Then it should throw HookRepositoryError
        await expect(repository.isInstalled()).rejects.toThrow(
          HookRepositoryError
        );
      });

      it("should throw HookRepositoryError for empty hook command", async () => {
        // Given settings.json has empty command
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "", // Empty command
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking installation status
        // Then it should throw HookRepositoryError
        await expect(repository.isInstalled()).rejects.toThrow(
          HookRepositoryError
        );
      });

      it("should throw HookRepositoryError for invalid timeout", async () => {
        // Given settings.json has invalid timeout
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/hook.sh",
                      timeout: -1, // Invalid timeout
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking installation status
        // Then it should throw HookRepositoryError
        await expect(repository.isInstalled()).rejects.toThrow(
          HookRepositoryError
        );
      });

      it("should allow unknown hook event types due to passthrough schema", async () => {
        // Given settings.json has unknown event type
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              UnknownEventType: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking installation status
        // Then it should return false (no CC Ring hooks installed)
        // Note: Schema uses .passthrough() to allow other Claude Code hook types
        await expect(repository.isInstalled()).resolves.toBe(false);
      });
    });
  });

  // ==========================================================================
  // File Locking Tests
  // ==========================================================================

  describe("Scenario: Concurrent access with file locking", () => {
    it("should handle concurrent isInstalled calls", async () => {
      // Given settings.json exists
      await fileSystem.writeFileAtomic(settingsPath, "{}", { createIfMissing: true, overwrite: true });

      // When multiple concurrent isInstalled calls are made
      const promises = Array(5)
        .fill(null)
        .map(() => repository.isInstalled());

      // Then all should complete successfully
      const results = await Promise.all(promises);
      expect(results).toEqual([false, false, false, false, false]);
    });

    it("should handle concurrent install calls", async () => {
      // Given settings.json does not exist

      // When multiple concurrent install calls are made
      const promises = Array(3)
        .fill(null)
        .map(() => repository.install(scriptPath));

      // Then all should complete successfully (last one wins due to locking)
      await expect(Promise.all(promises)).resolves.toBeDefined();

      // And hooks should be installed correctly (no corruption)
      const isInstalled = await repository.isInstalled();
      expect(isInstalled).toBe(true);

      // And there should be no duplicate hooks
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content!);
      expect(settings.hooks.Stop).toHaveLength(1);
      expect(settings.hooks.Notification).toHaveLength(4);
      expect(settings.hooks.PreToolUse).toHaveLength(2);
    });

    it("should handle concurrent install and uninstall calls", async () => {
      // Given settings.json does not exist

      // When concurrent install and uninstall calls are made
      const installPromises = Array(2)
        .fill(null)
        .map(() => repository.install(scriptPath));
      const uninstallPromises = Array(2)
        .fill(null)
        .map(() => repository.uninstall());

      // Then all should complete successfully (locking prevents corruption)
      await expect(
        Promise.all([...installPromises, ...uninstallPromises])
      ).resolves.toBeDefined();

      // And settings.json should be in a consistent state (either installed or not)
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content!);

      // File should be valid JSON (not corrupted)
      expect(settings).toBeDefined();
    });
  });

  // ==========================================================================
  // HOOK_ID UUID Detection Tests
  // ==========================================================================

  describe("Scenario: Hook detection with HOOK_ID UUID", () => {
    describe("When detecting CC Ring hooks by command path", () => {
      it("should detect exact match with HOOK_ID format", async () => {
        // Given settings.json has hook with exact HOOK_ID format
        const expectedPath = `~/.claude/cc-ring-hook-${HOOK_ID}.sh`;
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: expectedPath,
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return true (exact HOOK_ID match)
        expect(result).toBe(true);
      });

      it("should detect legacy format without HOOK_ID", async () => {
        // Given settings.json has hook with legacy format (no UUID)
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/old/path/cc-ring-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return true (backward compatibility)
        expect(result).toBe(true);
      });

      it("should not detect unrelated hooks", async () => {
        // Given settings.json has only unrelated hooks
        await fileSystem.writeFileAtomic(
          settingsPath,
          JSON.stringify({
            hooks: {
              Stop: [
                {
                  hooks: [
                    {
                      type: "command",
                      command: "/path/to/other-hook.sh",
                      timeout: 60,
                    },
                  ],
                },
              ],
            },
          }),
          { createIfMissing: true, overwrite: true }
        );

        // When checking if hooks are installed
        const result = await repository.isInstalled();

        // Then it should return false
        expect(result).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Script Path Storage Tests
  // ==========================================================================

  describe("Scenario: Storing script path in settings.json", () => {
    describe("When installing hooks with relative path", () => {
      it("should store command with the exact path provided", async () => {
        // Given a relative path with tilde format
        const relativePath = `~/.claude/cc-ring-hook-${HOOK_ID}.sh`;

        // When installing hooks
        await repository.install(relativePath);

        // Then the command should be stored exactly as provided
        const content = await fileSystem.readFile(settingsPath);
        const settings = JSON.parse(content!);

        expect(settings.hooks.Stop[0].hooks[0].command).toBe(relativePath);
      });
    });
  });
});
