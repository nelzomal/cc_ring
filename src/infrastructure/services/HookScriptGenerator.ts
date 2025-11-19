import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import * as path from 'path';
import { IFileSystem } from '@application/ports/IFileSystem';
import { TYPES } from '@shared/types';
import {
    DEFAULT_VOLUME_DECIMAL,
    LOG_ROTATION_LINES
} from '@shared/constants';

export interface HookScriptConfig {
    configPath: string;
    defaultSoundPath: string;
    errorLogPath: string;
    hookLogPath: string;
}

/**
 * Generates bash hook script from template with variable substitution
 */
@injectable()
export class HookScriptGenerator {
    private templatePath: string;

    constructor(
        @inject(TYPES.IFileSystem) private fileWriter: IFileSystem,
        @inject(TYPES.ExtensionPath) extensionPath: string
    ) {
        this.templatePath = path.join(extensionPath, 'src', 'templates', 'hook-script.sh.template');
    }

    /**
     * Generate hook script content from template
     */
    generate(config: HookScriptConfig): string {
        const template = this.loadTemplate();
        return this.substituteVariables(template, config);
    }

    /**
     * Load the template file
     */
    private loadTemplate(): string {
        if (!this.fileWriter.fileExists(this.templatePath)) {
            throw new Error(`Template file not found: ${this.templatePath}`);
        }
        return this.fileWriter.readFileSync(this.templatePath, 'utf8');
    }

    /**
     * Substitute template variables with actual values
     */
    private substituteVariables(template: string, config: HookScriptConfig): string {
        const substitutions: Record<string, string> = {
            '{{CONFIG_PATH}}': config.configPath,
            '{{DEFAULT_SOUND_PATH}}': config.defaultSoundPath,
            '{{DEFAULT_VOLUME}}': DEFAULT_VOLUME_DECIMAL,
            '{{ERROR_LOG_PATH}}': config.errorLogPath,
            '{{HOOK_LOG_PATH}}': config.hookLogPath,
            '{{LOG_ROTATION_LINES}}': LOG_ROTATION_LINES.toString()
        };

        let result = template;
        for (const [placeholder, value] of Object.entries(substitutions)) {
            result = result.replace(new RegExp(placeholder, 'g'), value);
        }

        return result;
    }
}
