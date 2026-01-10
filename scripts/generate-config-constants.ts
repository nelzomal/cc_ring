#!/usr/bin/env tsx

/**
 * Generate TypeScript constants from package.json configuration
 *
 * This script ensures package.json is the single source of truth for:
 * - Configuration default values
 * - Command IDs
 *
 * Run: npm run generate
 */

import * as fs from "fs";
import * as path from "path";

const PACKAGE_JSON_PATH = path.join(__dirname, "..", "package.json");
const OUTPUT_PATH = path.join(__dirname, "..", "src", "shared", "generated-config.ts");

interface ConfigProperty {
  type: string;
  default: unknown;
  minimum?: number;
  maximum?: number;
  enum?: string[];
}

interface Command {
  command: string;
  title: string;
  category?: string;
}

interface PackageJson {
  contributes: {
    configuration: {
      properties: Record<string, ConfigProperty>;
    };
    commands: Command[];
  };
}

/**
 * Convert camelCase or kebab-case to SCREAMING_SNAKE_CASE
 * Examples:
 *   "customSoundPath" -> "CUSTOM_SOUND_PATH"
 *   "volume" -> "VOLUME"
 *   "select-custom" -> "SELECT_CUSTOM"
 */
function toScreamingSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2") // Insert underscore before uppercase letters
    .replace(/-/g, "_") // Replace hyphens with underscores
    .toUpperCase();
}

function main() {
  console.log("🔧 Generating TypeScript constants from package.json...\n");

  // Read package.json
  let packageJson: PackageJson;
  try {
    const content = fs.readFileSync(PACKAGE_JSON_PATH, "utf8");
    packageJson = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Failed to read package.json: ${(error as Error).message}`);
    process.exit(1);
  }

  // Extract config defaults
  const properties = packageJson.contributes.configuration.properties;
  const propertyKeys = Object.keys(properties);

  // Validate properties exist
  if (propertyKeys.length === 0) {
    console.error("❌ No configuration properties found in package.json");
    process.exit(1);
  }

  // Derive namespace from first config key: "cc-ring.enabled" -> "cc-ring"
  const namespace = propertyKeys[0].split(".")[0];
  const namespacePrefix = `${namespace}.`;

  // Validate all config keys use the same namespace
  const invalidConfigKeys = propertyKeys.filter(key => !key.startsWith(namespacePrefix));
  if (invalidConfigKeys.length > 0) {
    console.error(`❌ Mixed namespaces detected. Expected all keys to start with "${namespacePrefix}"`);
    console.error(`   Invalid keys: ${invalidConfigKeys.join(", ")}`);
    process.exit(1);
  }

  const defaults: Record<string, unknown> = {};
  for (const [key, prop] of Object.entries(properties)) {
    // "cc-ring.customSoundPath" -> "CUSTOM_SOUND_PATH"
    const configKey = key.replace(namespacePrefix, "");
    const constName = toScreamingSnakeCase(configKey);
    defaults[constName] = prop.default;
  }

  // Extract command IDs (commands use same namespace)
  const commands = packageJson.contributes.commands;

  // Validate all commands use the same namespace
  const invalidCommands = commands.filter(cmd => !cmd.command.startsWith(namespacePrefix));
  if (invalidCommands.length > 0) {
    console.error(`❌ Commands with different namespace detected. Expected "${namespacePrefix}"`);
    console.error(`   Invalid: ${invalidCommands.map(c => c.command).join(", ")}`);
    process.exit(1);
  }
  const commandIds: Record<string, string> = {};
  for (const cmd of commands) {
    // "cc-ring.selectCustomSound" -> "SELECT_CUSTOM_SOUND"
    const commandKey = cmd.command.replace(namespacePrefix, "");
    const constName = toScreamingSnakeCase(commandKey);
    commandIds[constName] = cmd.command;
  }

  // Generate TypeScript content
  const tsContent = `// AUTO-GENERATED from package.json - Do not edit manually
// Run \`npm run generate\` to regenerate

export const CONFIG_DEFAULTS = {
${Object.entries(defaults)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
  .join("\n")}
} as const;

export const COMMAND_IDS = {
${Object.entries(commandIds)
  .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
  .join("\n")}
} as const;

export type ConfigDefaults = typeof CONFIG_DEFAULTS;
export type CommandIds = typeof COMMAND_IDS;
`;

  // Write generated file
  try {
    fs.writeFileSync(OUTPUT_PATH, tsContent);
  } catch (error) {
    console.error(`❌ Failed to write generated file: ${(error as Error).message}`);
    process.exit(1);
  }

  console.log("✅ Successfully generated src/shared/generated-config.ts!");
  console.log(`   - ${Object.keys(defaults).length} config defaults`);
  console.log(`   - ${Object.keys(commandIds).length} command IDs`);
}

main();
