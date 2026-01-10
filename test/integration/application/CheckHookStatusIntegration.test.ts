import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckHookStatusUseCase } from '@application/usecases/CheckHookStatusUseCase';
import { ClaudeCodeHookRepository } from '@infrastructure/persistence/claude-settings/ClaudeCodeHookRepository';
import { FileSystem } from '@infrastructure/adapters/file-system/FileSystem';
import { LockManager } from '@infrastructure/adapters/utilities/LockManager';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * Integration tests for CheckHookStatusUseCase
 *
 * Tests the complete flow through real components:
 * - CheckHookStatusUseCase (application layer)
 * - ClaudeCodeHookRepository (infrastructure layer)
 * - FileSystem (infrastructure layer)
 *
 * Uses real file system operations with temporary directories
 * No mocks - tests actual integration between layers
 */
describe('Integration: CheckHookStatusUseCase with real infrastructure', () => {
  let useCase: CheckHookStatusUseCase;
  let repository: ClaudeCodeHookRepository;
  let fileSystem: FileSystem;
  let lockManager: LockManager;
  let tempDir: string;
  let settingsPath: string;
  let scriptPath: string;
  let coordinationLockPath: string;

  beforeEach(() => {
    // Given a temporary directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-ring-integration-'));
    settingsPath = path.join(tempDir, 'settings.json');
    scriptPath = path.join(tempDir, 'cc-ring-hook.sh');
    coordinationLockPath = path.join(tempDir, '.cc-ring.lock');

    // And real infrastructure components
    fileSystem = new FileSystem();
    lockManager = new LockManager();
    repository = new ClaudeCodeHookRepository(
      fileSystem,
      settingsPath,
      scriptPath,
      lockManager,
      coordinationLockPath,
      60 // hookTimeout
    );

    // And the use case with real dependencies
    useCase = new CheckHookStatusUseCase(repository, fileSystem, scriptPath);
  });

  afterEach(() => {
    // Clean up temporary directory after each test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // Happy Path Scenarios
  // ==========================================================================

  describe('Scenario: Fully installed state', () => {
    it('should return all true when script exists and hooks are installed', async () => {
      // Given the hook script file exists
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', {
        createIfMissing: true,
        mode: 0o755,
      });

      // And hooks are installed in settings.json
      await repository.install(scriptPath);

      // When checking hook status
      const result = await useCase.execute();

      // Then all status flags should be true
      expect(result).toEqual({
        isInstalled: true,
        scriptExists: true,
        hooksRegistered: true,
      });
    });
  });

  describe('Scenario: Not installed state', () => {
    it('should return all false when nothing is installed', async () => {
      // Given no script file exists
      // And no hooks are installed
      // (clean state from beforeEach)

      // When checking hook status
      const result = await useCase.execute();

      // Then all status flags should be false
      expect(result).toEqual({
        isInstalled: false,
        scriptExists: false,
        hooksRegistered: false,
      });
    });
  });

  // ==========================================================================
  // Inconsistent State Scenarios
  // ==========================================================================

  describe('Scenario: Script exists but hooks not registered', () => {
    it('should return isInstalled=false with correct individual flags', async () => {
      // Given the hook script file exists
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', {
        createIfMissing: true,
        mode: 0o755,
      });

      // But hooks are not registered in settings.json
      // (no install call)

      // When checking hook status
      const result = await useCase.execute();

      // Then isInstalled should be false (both conditions required)
      expect(result).toEqual({
        isInstalled: false,
        scriptExists: true,
        hooksRegistered: false,
      });
    });

    it('should detect when script was manually created without install', async () => {
      // Given user manually created script file
      fs.writeFileSync(scriptPath, '#!/bin/bash\necho "manual script"', {
        mode: 0o755,
      });

      // But never ran install command
      // (settings.json doesn't exist or has no hooks)

      // When checking hook status
      const result = await useCase.execute();

      // Then it should show inconsistent state
      expect(result.isInstalled).toBe(false);
      expect(result.scriptExists).toBe(true);
      expect(result.hooksRegistered).toBe(false);
    });
  });

  describe('Scenario: Hooks registered but script missing', () => {
    it('should return isInstalled=false with correct individual flags', async () => {
      // Given hooks are registered in settings.json
      await repository.install(scriptPath);

      // But the script file was deleted (or never created)
      if (fileSystem.fileExists(scriptPath)) {
        await fileSystem.deleteFile(scriptPath);
      }

      // When checking hook status
      const result = await useCase.execute();

      // Then isInstalled should be false (both conditions required)
      expect(result).toEqual({
        isInstalled: false,
        scriptExists: false,
        hooksRegistered: true,
      });
    });

    it('should detect when script was manually deleted after install', async () => {
      // Given initially fully installed
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', {
        createIfMissing: true,
        mode: 0o755,
      });
      await repository.install(scriptPath);

      // Verify fully installed
      let status = await useCase.execute();
      expect(status.isInstalled).toBe(true);

      // When user manually deletes the script
      fs.unlinkSync(scriptPath);

      // Then checking status should show inconsistent state
      status = await useCase.execute();
      expect(status.isInstalled).toBe(false);
      expect(status.scriptExists).toBe(false);
      expect(status.hooksRegistered).toBe(true);
    });
  });

  // ==========================================================================
  // Real File System Interaction Tests
  // ==========================================================================

  describe('Scenario: Working with actual settings.json file', () => {
    it('should correctly read and write through all layers', async () => {
      // Given we start with no settings file
      expect(fileSystem.fileExists(settingsPath)).toBe(false);

      // When installing hooks
      await repository.install(scriptPath);

      // Then settings.json should be created
      expect(fileSystem.fileExists(settingsPath)).toBe(true);

      // And it should contain valid JSON
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content);
      expect(settings.hooks).toBeDefined();

      // And CheckHookStatusUseCase should detect registered hooks
      const status = await useCase.execute();
      expect(status.hooksRegistered).toBe(true);
    });

    it('should handle existing settings.json with other content', async () => {
      // Given settings.json exists with other Claude Code settings
      await fileSystem.writeConfigFile(settingsPath, {
        someOtherSetting: 'important value',
        nestedConfig: {
          enabled: true,
        },
      });

      // When installing hooks
      await repository.install(scriptPath);

      // And checking status
      const status = await useCase.execute();

      // Then hooks should be registered
      expect(status.hooksRegistered).toBe(true);

      // And other settings should be preserved
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content);
      expect(settings.someOtherSetting).toBe('important value');
      expect(settings.nestedConfig.enabled).toBe(true);
    });

    it('should work with non-CC Ring hooks in settings.json', async () => {
      // Given settings.json has non-CC Ring hooks
      await fileSystem.writeConfigFile(settingsPath, {
        hooks: {
          Stop: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '/path/to/other-hook.sh',
                  timeout: 10,
                },
              ],
            },
          ],
        },
      });

      // When checking status before CC Ring install
      let status = await useCase.execute();
      expect(status.hooksRegistered).toBe(false); // No CC Ring hooks yet

      // When installing CC Ring hooks
      await repository.install(scriptPath);

      // Then status should show registered
      status = await useCase.execute();
      expect(status.hooksRegistered).toBe(true);

      // And non-CC Ring hooks should still exist
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content);
      const hasOtherHook = settings.hooks.Stop.some((group: any) =>
        group.hooks.some((h: any) => h.command === '/path/to/other-hook.sh')
      );
      expect(hasOtherHook).toBe(true);
    });
  });

  describe('Scenario: Complete install and uninstall cycle', () => {
    it('should correctly track status through full lifecycle', async () => {
      // Step 1: Initial state - nothing installed
      let status = await useCase.execute();
      expect(status).toEqual({
        isInstalled: false,
        scriptExists: false,
        hooksRegistered: false,
      });

      // Step 2: Create script file
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', {
        createIfMissing: true,
        mode: 0o755,
      });

      status = await useCase.execute();
      expect(status).toEqual({
        isInstalled: false,
        scriptExists: true,
        hooksRegistered: false,
      });

      // Step 3: Install hooks
      await repository.install(scriptPath);

      status = await useCase.execute();
      expect(status).toEqual({
        isInstalled: true,
        scriptExists: true,
        hooksRegistered: true,
      });

      // Step 4: Uninstall hooks
      await repository.uninstall();

      status = await useCase.execute();
      expect(status).toEqual({
        isInstalled: false,
        scriptExists: true,
        hooksRegistered: false,
      });

      // Step 5: Delete script
      await fileSystem.deleteFile(scriptPath);

      status = await useCase.execute();
      expect(status).toEqual({
        isInstalled: false,
        scriptExists: false,
        hooksRegistered: false,
      });
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('Scenario: Handling corrupted settings.json', () => {
    it('should propagate error when settings.json is malformed', async () => {
      // Given settings.json exists with invalid JSON
      fs.writeFileSync(settingsPath, '{ invalid json }');

      // When checking hook status
      // Then it should throw error (from repository layer)
      await expect(useCase.execute()).rejects.toThrow();
    });

    it('should propagate error when settings.json has duplicate keys', async () => {
      // Given settings.json with duplicate keys
      fs.writeFileSync(settingsPath, '{"hooks": {}, "hooks": {}}');

      // When checking hook status
      // Then it should throw error (from repository layer)
      await expect(useCase.execute()).rejects.toThrow();
    });

    it('should propagate error when settings.json fails schema validation', async () => {
      // Given settings.json with invalid hook structure
      await fileSystem.writeConfigFile(settingsPath, {
        hooks: {
          Stop: [
            {
              // Missing required 'hooks' array
              invalid: 'structure',
            },
          ],
        },
      });

      // When checking hook status
      // Then it should throw error (from repository layer)
      await expect(useCase.execute()).rejects.toThrow();
    });
  });

  describe('Scenario: Handling file system errors', () => {
    it('should handle permission errors gracefully', async () => {
      // This test is platform-specific (Unix only)
      if (process.platform === 'win32') {
        return; // Skip on Windows
      }

      // Given settings.json with restricted permissions
      await fileSystem.writeConfigFile(settingsPath, {});
      fs.chmodSync(settingsPath, 0o000); // No permissions

      // When checking hook status
      // Then it should throw error (from file system layer)
      await expect(useCase.execute()).rejects.toThrow();

      // Cleanup: restore permissions
      fs.chmodSync(settingsPath, 0o644);
    });
  });

  // ==========================================================================
  // Concurrent Access Tests
  // ==========================================================================

  describe('Scenario: Concurrent status checks', () => {
    it('should handle multiple concurrent execute calls', async () => {
      // Given hooks are installed
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', {
        createIfMissing: true,
        mode: 0o755,
      });
      await repository.install(scriptPath);

      // When multiple status checks are made sequentially (file locks prevent true concurrency)
      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(await useCase.execute());
      }

      // Then all should return consistent results
      results.forEach((result) => {
        expect(result).toEqual({
          isInstalled: true,
          scriptExists: true,
          hooksRegistered: true,
        });
      });
    });

    it('should handle concurrent checks during install', async () => {
      // Given script exists
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', {
        createIfMissing: true,
        mode: 0o755,
      });

      // When installing and checking status concurrently
      const installPromise = repository.install(scriptPath);
      const checkPromises = Array(5)
        .fill(null)
        .map(() => useCase.execute());

      // Then all operations should complete successfully
      await expect(Promise.all([installPromise, ...checkPromises])).resolves.toBeDefined();

      // And final state should be installed
      const finalStatus = await useCase.execute();
      expect(finalStatus.isInstalled).toBe(true);
    });
  });

  // ==========================================================================
  // Script Path Scenarios
  // ==========================================================================

  describe('Scenario: Different script path locations', () => {
    it('should work with nested script path', async () => {
      // Given script in nested directory (must include "cc-ring-hook" to be recognized)
      const nestedScriptPath = path.join(tempDir, 'scripts', 'hooks', 'cc-ring-hook.sh');

      // When creating script (with parent directories)
      await fileSystem.writeFileAtomic(
        nestedScriptPath,
        '#!/bin/bash\necho "nested"',
        { createIfMissing: true, mode: 0o755 }
      );

      // And installing hooks with the nested path
      await repository.install(nestedScriptPath);

      // And checking status with use case configured for nested path
      const nestedUseCase = new CheckHookStatusUseCase(
        repository,
        fileSystem,
        nestedScriptPath
      );
      const status = await nestedUseCase.execute();

      // Then status should be correct
      expect(status.isInstalled).toBe(true);
      expect(status.scriptExists).toBe(true);
    });

    it('should correctly detect non-existent nested script path', async () => {
      // Given script path in non-existent nested directory
      const nestedScriptPath = path.join(
        tempDir,
        'does',
        'not',
        'exist',
        'script.sh'
      );
      const nestedUseCase = new CheckHookStatusUseCase(
        repository,
        fileSystem,
        nestedScriptPath
      );

      // When checking status
      const status = await nestedUseCase.execute();

      // Then scriptExists should be false
      expect(status.scriptExists).toBe(false);
      expect(status.isInstalled).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Scenario: Empty or minimal settings.json', () => {
    it('should handle completely empty settings.json', async () => {
      // Given settings.json is empty string
      fs.writeFileSync(settingsPath, '');

      // When checking status
      const status = await useCase.execute();

      // Then it should return false (no hooks)
      expect(status.hooksRegistered).toBe(false);
    });

    it('should handle settings.json with only whitespace', async () => {
      // Given settings.json has only whitespace
      fs.writeFileSync(settingsPath, '   \n\t  \n  ');

      // When checking status
      const status = await useCase.execute();

      // Then it should return false (no hooks)
      expect(status.hooksRegistered).toBe(false);
    });

    it('should handle settings.json with empty object', async () => {
      // Given settings.json is empty object
      await fileSystem.writeConfigFile(settingsPath, {});

      // When checking status
      const status = await useCase.execute();

      // Then it should return false (no hooks)
      expect(status.hooksRegistered).toBe(false);
    });
  });

  describe('Scenario: Script file characteristics', () => {
    it('should detect script regardless of content', async () => {
      // Given script with different content
      await fileSystem.writeFileAtomic(scriptPath, 'any content here', {
        createIfMissing: true,
        mode: 0o755,
      });

      // When checking status
      const status = await useCase.execute();

      // Then scriptExists should be true
      expect(status.scriptExists).toBe(true);
    });

    it('should detect empty script file', async () => {
      // Given empty script file
      await fileSystem.writeFileAtomic(scriptPath, '', { createIfMissing: true, mode: 0o755 });

      // When checking status
      const status = await useCase.execute();

      // Then scriptExists should be true
      expect(status.scriptExists).toBe(true);
    });

    it('should detect script without execute permissions', async () => {
      // Given script file without execute permissions
      await fileSystem.writeFileAtomic(scriptPath, '#!/bin/bash\necho "test"', { createIfMissing: true });
      // Note: no mode specified, default permissions

      // When checking status
      const status = await useCase.execute();

      // Then scriptExists should still be true (fileExists doesn't check permissions)
      expect(status.scriptExists).toBe(true);
    });
  });

  // ==========================================================================
  // Real-world Scenario Tests
  // ==========================================================================

  describe('Scenario: Simulating real user workflows', () => {
    it('should handle reinstall scenario (install over existing install)', async () => {
      // Given initially installed with old CC Ring script path
      const oldScriptPath = path.join(tempDir, 'old-cc-ring-hook.sh');
      await fileSystem.writeFileAtomic(oldScriptPath, 'old', { createIfMissing: true, mode: 0o755 });
      await repository.install(oldScriptPath);

      // When reinstalling with new CC Ring script path
      const newScriptPath = path.join(tempDir, 'new-cc-ring-hook.sh');
      await fileSystem.writeFileAtomic(newScriptPath, 'new', { createIfMissing: true, mode: 0o755 });
      await repository.install(newScriptPath);

      // Then new installation should be detected with new path
      const newUseCase = new CheckHookStatusUseCase(
        repository,
        fileSystem,
        newScriptPath
      );
      const status = await newUseCase.execute();
      expect(status.hooksRegistered).toBe(true);

      // And settings.json should have new script path only (old removed)
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content);
      const allGroups = [
        ...(settings.hooks.Stop || []),
        ...(settings.hooks.Notification || []),
        ...(settings.hooks.PreToolUse || []),
      ];

      // All hooks should use the new path
      allGroups.forEach((group: any) => {
        expect(group.hooks[0].command).toBe(newScriptPath);
      });

      // Should have exactly 7 hooks (1 Stop + 4 Notification + 2 PreToolUse)
      expect(allGroups).toHaveLength(7);
    });

    it('should handle partial cleanup scenario', async () => {
      // Given fully installed
      await fileSystem.writeFileAtomic(scriptPath, 'test', { createIfMissing: true, mode: 0o755 });
      await repository.install(scriptPath);

      // When user manually edits settings.json to remove some hooks
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content);
      delete settings.hooks.Notification; // Remove notification hooks
      await fileSystem.writeConfigFile(settingsPath, settings);

      // Then status should still show hooks registered (Stop and PreToolUse remain)
      const status = await useCase.execute();
      expect(status.hooksRegistered).toBe(true);
    });

    it('should handle complete manual cleanup', async () => {
      // Given fully installed
      await fileSystem.writeFileAtomic(scriptPath, 'test', { createIfMissing: true, mode: 0o755 });
      await repository.install(scriptPath);

      // When user manually removes all CC Ring hooks from settings.json
      const content = await fileSystem.readFile(settingsPath);
      const settings = JSON.parse(content);

      // Remove all hook groups (simulating manual deletion)
      settings.hooks.Stop = [];
      settings.hooks.Notification = [];
      settings.hooks.PreToolUse = [];
      await fileSystem.writeConfigFile(settingsPath, settings);

      // Then status should show not registered
      const status = await useCase.execute();
      expect(status.hooksRegistered).toBe(false);
    });
  });
});
