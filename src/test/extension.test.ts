import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

suite('Extension Activation Tests', () => {
	let extension: vscode.Extension<any>;
	let api: any;

	setup(async function() {
		this.timeout(10000);
		extension = vscode.extensions.getExtension('nelzomal.cc-ring')!;
		assert.ok(extension, 'Extension should be installed');
		await extension.activate();
		api = extension.exports;
		assert.ok(api, 'Extension should export API');
		assert.ok(api.hookManager, 'API should include hookManager');
	});

	test('HookManager should have isHookInstalled method', () => {
		assert.ok(typeof api.hookManager.isHookInstalled === 'function',
			'hookManager should have isHookInstalled method');
	});

	test('isHookInstalled should return true when hook files exist', async function() {
		this.timeout(10000);

		// Install the hook
		await api.hookManager.installHook();

		// Check if it's detected as installed
		const isInstalled = api.hookManager.isHookInstalled();
		assert.strictEqual(isInstalled, true,
			'isHookInstalled should return true after installation');
	});

	test('isHookInstalled should return false when hook files do not exist', async function() {
		this.timeout(10000);

		// First ensure hook is installed
		await api.hookManager.installHook();

		// Then uninstall it
		await api.hookManager.uninstallHook();

		// Check if it's detected as not installed
		const isInstalled = api.hookManager.isHookInstalled();
		assert.strictEqual(isInstalled, false,
			'isHookInstalled should return false after uninstallation');
	});

	test('Extension should track installation state to avoid duplicate notifications', async function() {
		this.timeout(10000);

		// This test documents the expected behavior:
		// When the hook is already installed, reactivation should NOT show notification

		// 1. Install the hook first time
		const wasInstalledBefore = api.hookManager.isHookInstalled();
		await api.hookManager.installHook();
		const isInstalledAfter = api.hookManager.isHookInstalled();

		// 2. If hook was already installed, no notification should be shown
		// Currently this test documents the bug: the extension doesn't check
		// if hook was already installed before showing the success notification

		// For now, we just verify that isHookInstalled can detect the state
		if (wasInstalledBefore) {
			assert.strictEqual(isInstalledAfter, true,
				'Hook should still be installed after reinstall');
			// TODO: When fix is implemented, verify that NO notification was shown
			console.log('⚠️  BUG: Extension should not show notification when hook is already installed');
		} else {
			assert.strictEqual(isInstalledAfter, true,
				'Hook should be installed after first install');
			// TODO: When fix is implemented, verify that notification WAS shown
		}
	});

	test('installHook should be idempotent', async function() {
		this.timeout(10000);

		// Installing multiple times should not cause errors
		await api.hookManager.installHook();
		await api.hookManager.installHook();
		await api.hookManager.installHook();

		const isInstalled = api.hookManager.isHookInstalled();
		assert.strictEqual(isInstalled, true,
			'Hook should be installed after multiple install calls');
	});
});
