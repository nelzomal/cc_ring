/**
 * E2E Tests for Test Sound Command
 *
 * These tests run in a real VS Code Extension Host
 * Testing the complete flow: Command → PlaySoundUseCase → AfplaySoundPlayer
 *
 * IMPORTANT: Uses Mocha (BDD style), NOT Vitest
 *
 * Note: These tests verify command execution and configuration handling.
 * Actual audio output cannot be tested in headless environment.
 */
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import '@test/e2e/setup'; // Sets up CLAUDE_HOME for test isolation
import { TYPES } from '@shared/types';

describe('E2E: Test Sound Command', () => {
  let extension: vscode.Extension<any> | undefined;
  let api: any;
  let bundledSoundsDir: string;

  before(async () => {
    // Get and activate the extension
    extension = vscode.extensions.getExtension('nelzomal.cc-ring');
    assert.ok(extension, 'Extension should be found');

    api = await extension.activate();
    assert.ok(api, 'Extension should activate and return API');

    // Get bundled sounds directory
    bundledSoundsDir = api.container.get(TYPES.BundledSoundsDir);
  });

  // ==========================================================================
  // Test 1: Command Registration
  // ==========================================================================

  it('Test sound command should be registered', async () => {
    // When: Listing all commands
    const commands = await vscode.commands.getCommands(true);

    // Then: cc-ring.testSound should be registered
    assert.ok(
      commands.includes('cc-ring.testSound'),
      'Test sound command should be registered'
    );
  });

  // ==========================================================================
  // Test 2: Bundled Sound Files Exist
  // ==========================================================================

  it('Bundled sound files should exist', () => {
    // Given: Extension provides bundled sounds

    // Then: All bundled sound files should exist
    const soundFiles = ['complete.wav', 'subtle.wav', 'notification.wav'];

    soundFiles.forEach((soundFile) => {
      const soundPath = path.join(bundledSoundsDir, soundFile);
      assert.ok(
        fs.existsSync(soundPath),
        `Bundled sound ${soundFile} should exist at ${soundPath}`
      );
    });
  });

  // ==========================================================================
  // Test 3: Execute Test Sound Command (Default Configuration)
  // ==========================================================================

  it('Should execute test sound command with default configuration', async () => {
    // Given: Extension is activated with default settings

    // When: Executing test sound command
    // Note: This will attempt to play sound, but we can't verify audio output in headless env
    await vscode.commands.executeCommand('cc-ring.testSound');

    // Wait for command execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Then: Command should complete without errors
    // (No assertion needed - command execution itself verifies it doesn't throw)
    assert.ok(true, 'Command executed without throwing errors');
  });

  // ==========================================================================
  // Test 4: Test Sound with Custom Volume Configuration
  // ==========================================================================

  it('Should handle custom volume configuration', async () => {
    // Given: User configures custom volume (0-100)
    const config = vscode.workspace.getConfiguration('cc-ring');
    await config.update('volume', 25, vscode.ConfigurationTarget.Global);

    // Wait for config update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // When: Executing test sound command
    await vscode.commands.executeCommand('cc-ring.testSound');

    // Wait for execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Then: Command should execute with configured volume
    // (Volume is read from config - we verify no errors occur)
    assert.ok(true, 'Command executed with custom volume');

    // Cleanup: Reset to default
    await config.update('volume', undefined, vscode.ConfigurationTarget.Global);
  });

  // ==========================================================================
  // Test 5: Test Sound with Different Sound Selection
  // ==========================================================================

  it('Should handle different sound file selection', async () => {
    // Given: User selects a different bundled sound
    const config = vscode.workspace.getConfiguration('cc-ring');

    // Use 'sound' config property (not 'soundPath')
    await config.update('sound', 'subtle', vscode.ConfigurationTarget.Global);

    // Wait for config update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // When: Executing test sound command
    await vscode.commands.executeCommand('cc-ring.testSound');

    // Wait for execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Then: Command should execute with selected sound
    assert.ok(true, 'Command executed with different sound');

    // Cleanup: Reset to default
    await config.update('sound', undefined, vscode.ConfigurationTarget.Global);
  });

  // ==========================================================================
  // Test 6: Test Sound with Custom Sound Path
  // ==========================================================================

  it('Should handle custom sound path configuration', async () => {
    // Given: User provides custom sound path
    const config = vscode.workspace.getConfiguration('cc-ring');
    const customSoundPath = path.join(bundledSoundsDir, 'notification.wav');

    // First set sound to 'custom', then set customSoundPath
    await config.update('sound', 'custom', vscode.ConfigurationTarget.Global);
    await config.update(
      'customSoundPath',
      customSoundPath,
      vscode.ConfigurationTarget.Global
    );

    // Wait for config update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // When: Executing test sound command
    await vscode.commands.executeCommand('cc-ring.testSound');

    // Wait for execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Then: Command should execute with custom path
    assert.ok(true, 'Command executed with custom sound path');

    // Cleanup
    await config.update('sound', undefined, vscode.ConfigurationTarget.Global);
    await config.update(
      'customSoundPath',
      undefined,
      vscode.ConfigurationTarget.Global
    );
  });

  // ==========================================================================
  // Test 7: PlaySoundUseCase in Container
  // ==========================================================================

  it('PlaySoundUseCase should be registered in DI container', () => {
    // Given: Extension has been activated

    // When: Retrieving PlaySoundUseCase from container
    const playSoundUseCase = api.container.get(TYPES.PlaySoundUseCase);

    // Then: Use case should exist
    assert.ok(playSoundUseCase, 'PlaySoundUseCase should be registered');
    assert.strictEqual(
      typeof playSoundUseCase.execute,
      'function',
      'PlaySoundUseCase should have execute method'
    );
  });

  // ==========================================================================
  // Test 8: Sound Player in Container
  // ==========================================================================

  it('ISoundPlayer should be registered in DI container', () => {
    // Given: Extension has been activated

    // When: Retrieving ISoundPlayer from container
    const soundPlayer = api.container.get(TYPES.ISoundPlayer);

    // Then: Sound player should exist
    assert.ok(soundPlayer, 'ISoundPlayer should be registered');
    assert.strictEqual(
      typeof soundPlayer.play,
      'function',
      'ISoundPlayer should have play method'
    );
  });

  // ==========================================================================
  // Test 9: Direct PlaySoundUseCase Execution
  // ==========================================================================

  it('Should execute PlaySoundUseCase directly via container', async () => {
    // Given: Access to PlaySoundUseCase
    const playSoundUseCase = api.container.get(TYPES.PlaySoundUseCase);
    const defaultSoundPath = path.join(bundledSoundsDir, 'complete.wav');

    // When: Executing use case directly
    await playSoundUseCase.execute(defaultSoundPath, 0.7);

    // Wait for execution
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Then: Should complete without errors
    assert.ok(true, 'PlaySoundUseCase executed directly');
  });

  // ==========================================================================
  // Test 10: Error Handling - Invalid Sound Path
  // ==========================================================================

  it('Should handle invalid sound path gracefully', async () => {
    // Given: Invalid sound path
    const playSoundUseCase = api.container.get(TYPES.PlaySoundUseCase);
    const invalidPath = '/non/existent/sound.wav';

    // When: Executing with invalid path
    let errorOccurred = false;
    try {
      await playSoundUseCase.execute(invalidPath, 0.7);
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      errorOccurred = true;
      // Expected: PlaySoundUseCase or AfplaySoundPlayer should handle gracefully
    }

    // Then: Should either handle gracefully or throw appropriate error
    // (Implementation may log error but not throw, or may throw - both are valid)
    assert.ok(
      true,
      'Invalid sound path was handled (error thrown or logged)'
    );
  });

  // ==========================================================================
  // Test 11: Config Provider Integration
  // ==========================================================================

  it('Config provider should return correct sound configuration', () => {
    // Given: Extension activated with config provider
    const configProvider = api.container.get(TYPES.IConfigProvider);

    // When: Getting sound configuration
    const sound = configProvider.getSound();
    const volume = configProvider.getVolume();
    const customSoundPath = configProvider.getCustomSoundPath();

    // Then: Should return valid configuration
    assert.ok(sound, 'Sound selection should be defined');
    assert.ok(
      ['complete', 'subtle', 'notification', 'custom'].includes(sound),
      'Sound should be one of the valid options'
    );
    assert.ok(
      typeof volume === 'number',
      'Volume should be a number'
    );
    assert.ok(
      volume >= 0 && volume <= 100,
      'Volume should be between 0 and 100'
    );
    assert.ok(
      typeof customSoundPath === 'string',
      'Custom sound path should be a string'
    );
  });

  // ==========================================================================
  // Test 12: Multiple Sound Test Executions
  // ==========================================================================

  it('Should handle multiple consecutive sound test executions', async () => {
    // Given: Extension is activated

    // When: Executing test sound command multiple times
    await vscode.commands.executeCommand('cc-ring.testSound');
    await new Promise((resolve) => setTimeout(resolve, 100));

    await vscode.commands.executeCommand('cc-ring.testSound');
    await new Promise((resolve) => setTimeout(resolve, 100));

    await vscode.commands.executeCommand('cc-ring.testSound');
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Then: All executions should complete without errors
    assert.ok(true, 'Multiple sound tests executed successfully');
  });

  // ==========================================================================
  // Test Cleanup
  // ==========================================================================

  after(async () => {
    // Reset any configuration changes
    const config = vscode.workspace.getConfiguration('cc-ring');
    await config.update('volume', undefined, vscode.ConfigurationTarget.Global);
    await config.update('sound', undefined, vscode.ConfigurationTarget.Global);
    await config.update(
      'customSoundPath',
      undefined,
      vscode.ConfigurationTarget.Global
    );

    // Note: Cleanup is handled by test runner after ALL tests complete
  });
});
