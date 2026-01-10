import { AppLayerDeps, PresentationDeps } from "./AppDeps";
import { InstallHookCommand } from "@presentation/vscode/commands/InstallHookCommand";
import { UninstallHookCommand } from "@presentation/vscode/commands/UninstallHookCommand";

/**
 * Build presentation layer dependencies
 *
 * This layer contains commands that orchestrate UI and use cases.
 * Dependencies: AppLayerDeps only
 */
export function buildPresentationDeps(app: AppLayerDeps): PresentationDeps {
  // InstallHookCommand - wraps InstallHookUseCase with VSCode UI
  const installHookCommand = new InstallHookCommand(app.installHookUseCase);

  // UninstallHookCommand - wraps UninstallHookUseCase with VSCode UI
  const uninstallHookCommand = new UninstallHookCommand(
    app.uninstallHookUseCase
  );

  return {
    installHookCommand,
    uninstallHookCommand,
  };
}
