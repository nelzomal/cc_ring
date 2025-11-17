/**
 * Constants and configuration for DI verification
 */

import * as path from 'path';

// Paths
export const SRC_DIR = path.join(__dirname, '..', '..', 'src');
export const CONTAINER_PATH = path.join(SRC_DIR, 'presentation', 'composition', 'container.ts');

// File patterns
export const TS_FILE_EXTENSION = '.ts';
export const TEST_FILE_SUFFIX = '.test.ts';

// Regex patterns
export const PATTERNS = {
  BIND: /\.bind<(\w+)>\(TYPES\.(\w+)\)/,
  TO: /\.to\((\w+)\)/,
  SINGLETON_SCOPE: /inSingletonScope/,
  INJECTABLE_CLASS: /@injectable\(\)\s*export\s+class\s+(\w+)/g,
  EXPORTED_INTERFACE: /export\s+interface\s+(I[A-Z]\w+)/g,
  IMPORT: /import.*from\s+['"](\.\.?\/.+)['"]/g,
  CLASS_IMPORT: (className: string) => new RegExp(`import.*${className}.*from ['"](.+)['"]`),
  CONTAINER_GET: (symbol: string) => new RegExp(`container\\.get<[^>]+>\\([\\s\\n]*TYPES\\.${symbol}[\\s\\n]*\\)`, 's'),
  TYPES_USAGE: /TYPES\.(\w+)/g,
};

// Layer dependency rules (Clean Architecture)
export const LAYER_RULES: Record<string, string[]> = {
  'domain': ['domain', 'shared'],
  'application': ['domain', 'application', 'shared'],
  'infrastructure': ['domain', 'application', 'infrastructure', 'shared'],
  'presentation': ['domain', 'application', 'infrastructure', 'presentation', 'shared'],
  'shared': ['shared']  // Shared can only import from shared
};

// Infrastructure class type suffixes that MUST have interfaces
export const INFRASTRUCTURE_TYPES_REQUIRING_INTERFACES = [
  'Repository',
  'Service',
  'Player',
  'Provider',
  'Adapter',
  'Writer'
];

// Scopes
export const SCOPE_SINGLETON = 'singleton';
export const SCOPE_TRANSIENT = 'transient';
