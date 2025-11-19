/**
 * E2E Tests for CheckHookStatusUseCase
 *
 * These tests run in a real VS Code Extension Host
 * Testing the complete flow: Extension Activation → CheckHookStatusUseCase → StatusBarView
 *
 * IMPORTANT: Uses Mocha (TDD style), NOT Vitest
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import '@test/e2e/setup'; // Sets up CLAUDE_HOME for test isolation
import { TYPES } from '@shared/types';

suite('E2E: CheckHookStatusUseCase Integration', () => {
  let extension: vscode.Extension<any> | undefined;
  let api: any;

  suiteSetup(async () => {
    // Get the extension
    extension = vscode.extensions.getExtension('nelzomal.cc-ring');
    assert.ok(extension, 'Extension should be found');

    // Activate the extension
    api = await extension.activate();
    assert.ok(api, 'Extension should activate and return API');
  });

  // ==========================================================================
  // Test 1: Extension Activation and Initial Status Check
  // ==========================================================================

  test('Extension should activate and check hook status on startup', async () => {
    // Given: Extension has been activated (in suiteSetup)
    // Ensure clean state by uninstalling any existing hooks first
    await vscode.commands.executeCommand('cc-ring.uninstallHook');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // When: Extension activation completes
    // (CheckHookStatusUseCase.execute() is called during activation)

    // Then: Status bar should be visible and show not-installed state
    assert.ok(api.statusBarItem, 'Status bar item should exist');
    assert.ok(
      api.statusBarItem.text.includes('CC Ring'),
      'Status bar should show CC Ring'
    );

    // Initial state should be not installed (no hooks exist yet)
    const status = await api.container
      .get(TYPES.CheckHookStatusUseCase)
      .execute();

    assert.strictEqual(
      status.isInstalled,
      false,
      'Initial state should be not installed'
    );
    assert.strictEqual(status.scriptExists, false, 'Script should not exist');
    assert.strictEqual(
      status.hooksRegistered,
      false,
      'Hooks should not be registered'
    );
  });

  // ==========================================================================
  // Test 2: Install Command Flow
  // ==========================================================================

  test('Install command should create hooks and update status', async () => {
    // Given: Extension is activated and not installed

    // When: User executes install command
    await vscode.commands.executeCommand('cc-ring.installHook');

    // Wait for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Then: CheckHookStatusUseCase should report installed
    const status = await api.container
      .get(TYPES.CheckHookStatusUseCase)
      .execute();

    assert.strictEqual(
      status.isInstalled,
      true,
      'Status should be installed after install command'
    );
    assert.strictEqual(
      status.scriptExists,
      true,
      'Script file should exist after install'
    );
    assert.strictEqual(
      status.hooksRegistered,
      true,
      'Hooks should be registered in settings.json'
    );

    // And: Status bar should update to show installed state
    // Status bar text format: "$(bell) CC Ring (7)"
    assert.ok(
      api.statusBarItem.text.includes('CC Ring'),
      'Status bar should still show CC Ring'
    );
    assert.ok(
      api.statusBarItem.text.includes('7'),
      'Status bar should show hook count (7)'
    );
  });

  // ==========================================================================
  // Test 3: Show Status Command
  // ==========================================================================

  test('Show status command should display correct hook information', async () => {
    // Given: Hooks are installed (from previous test)

    // Capture the information message shown
    let capturedMessage = '';
    const originalShowInfo = vscode.window.showInformationMessage;
    (vscode.window as any).showInformationMessage = async (msg: string) => {
      capturedMessage = msg;
      return undefined;
    };

    try {
      // When: User executes showStatus command
      await vscode.commands.executeCommand('cc-ring.showStatus');

      // Wait for async message
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Then: Message should show hooks are installed
      assert.ok(
        capturedMessage.length > 0,
        'Should display an information message'
      );
      assert.ok(
        capturedMessage.includes('Installed Hooks') ||
          capturedMessage.includes('enabled') ||
          capturedMessage.includes('7'),
        'Message should mention installed hooks or hook count'
      );
    } finally {
      // Restore original function
      (vscode.window as any).showInformationMessage = originalShowInfo;
    }
  });

  // ==========================================================================
  // Test 4: Uninstall Command Flow
  // ==========================================================================

  test('Uninstall command should remove hooks and update status', async () => {
    // Given: Hooks are installed (from previous test)

    // When: User executes uninstall command
    await vscode.commands.executeCommand('cc-ring.uninstallHook');

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Then: CheckHookStatusUseCase should report not installed
    const status = await api.container
      .get(TYPES.CheckHookStatusUseCase)
      .execute();

    assert.strictEqual(
      status.isInstalled,
      false,
      'Status should be not installed after uninstall'
    );
    assert.strictEqual(
      status.scriptExists,
      false,
      'Script file should be deleted'
    );
    assert.strictEqual(
      status.hooksRegistered,
      false,
      'Hooks should be removed from settings.json'
    );

    // And: Status bar should update to show not-installed state
    assert.ok(
      api.statusBarItem.text.includes('CC Ring'),
      'Status bar should still show CC Ring'
    );
    // May show warning icon or different state
  });

  // ==========================================================================
  // Test 5: Real File System Integration
  // ==========================================================================

  test('Should correctly interact with real settings.json file', async () => {
    // Given: Clean state (uninstalled from previous test)

    // When: Installing hooks
    await vscode.commands.executeCommand('cc-ring.installHook');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Then: settings.json file should exist in CLAUDE_HOME
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.join(
      process.env.CLAUDE_HOME!,
      'settings.json'
    );

    assert.ok(
      fs.existsSync(settingsPath),
      'settings.json should be created'
    );

    // And: File should contain valid JSON with hooks
    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);

    assert.ok(settings.hooks, 'Settings should have hooks property');
    assert.ok(settings.hooks.Stop, 'Should have Stop hooks');
    assert.ok(settings.hooks.Notification, 'Should have Notification hooks');
    assert.ok(settings.hooks.PreToolUse, 'Should have PreToolUse hooks');

    // Verify we have 7 hooks total (1 Stop + 4 Notification + 2 PreToolUse)
    const totalHooks =
      (settings.hooks.Stop?.length || 0) +
      (settings.hooks.Notification?.length || 0) +
      (settings.hooks.PreToolUse?.length || 0);

    assert.strictEqual(totalHooks, 7, 'Should have exactly 7 hooks');

    // Cleanup for next test
    await vscode.commands.executeCommand('cc-ring.uninstallHook');
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  // ==========================================================================
  // Test Cleanup
  // ==========================================================================

  suiteTeardown(() => {
    // Note: Cleanup is handled by test runner after ALL tests complete
  });
});
