import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { HOOK_ID } from "@shared/constants";
import { AppDeps, RuntimeConfig, VSCodeRuntime } from "./AppDeps";
import { buildInfraDeps } from "./buildInfraDeps";
import { buildAppLayerDeps } from "./buildAppLayerDeps";
import { buildPresentationDeps } from "./buildPresentationDeps";

/**
 * Build runtime configuration from VSCode extension context
 *
 * Computes all paths and constants needed by the application.
 * Supports CLAUDE_HOME override for testing.
 */
function buildRuntimeConfig(context: vscode.ExtensionContext): RuntimeConfig {
  // Allow CLAUDE_HOME override for testing (defaults to ~/.claude)
  const claudeDir =
    process.env.CLAUDE_HOME || path.join(os.homedir(), ".claude");

  return {
    // Script paths
    scriptAbsolutePath: path.join(claudeDir, `cc-ring-hook-${HOOK_ID}.sh`),
    scriptRelativePath: `~/.claude/cc-ring-hook-${HOOK_ID}.sh`,

    // Directory paths
    bundledSoundsDir: path.join(context.extensionPath, "sounds"),
    extensionPath: context.extensionPath,
    claudeDir,

    // Configuration paths
    configPath: path.join(claudeDir, "cc-ring-config.json"),
    errorLogPath: path.join(claudeDir, "cc-ring-error.log"),
    hookLogPath: path.join(claudeDir, "cc-ring-hook.log"),
    settingsPath: path.join(claudeDir, "settings.json"),
    coordinationLockPath: path.join(claudeDir, "cc-ring.lock"),

    // Configuration values
    hookTimeout: 60,
  };
}

/**
 * Build the complete application dependency graph
 *
 * This is the composition root - the only place where we instantiate
 * concrete classes and wire dependencies together.
 *
 * Layer construction order enforces clean architecture:
 * 1. RuntimeConfig (pure values)
 * 2. InfraDeps (adapters - depends on runtime)
 * 3. AppLayerDeps (use cases - depends on runtime + infra)
 * 4. PresentationDeps (commands - depends on app)
 */
export function buildAppDeps(context: vscode.ExtensionContext): AppDeps {
  // Step 1: Build runtime config (pure computation, no I/O)
  const runtime = buildRuntimeConfig(context);

  // Step 2: Capture VSCode runtime objects
  const vscodeRuntime: VSCodeRuntime = { context };

  // Step 3: Build layers in dependency order
  const infra = buildInfraDeps(runtime);
  const app = buildAppLayerDeps(runtime, infra);
  const presentation = buildPresentationDeps(app);

  return {
    runtime,
    vscode: vscodeRuntime,
    infra,
    app,
    presentation,
  };
}
