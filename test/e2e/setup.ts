import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

/**
 * E2E Test Setup
 *
 * Sets up test environment before running E2E tests
 * This ensures tests don't modify the user's actual Claude settings
 */

// Create a unique temporary directory for this test run
const testRunId = `cc-ring-e2e-${Date.now()}`;
const tempClaudeDir = path.join(os.tmpdir(), testRunId);

// Create the temporary directory
if (!fs.existsSync(tempClaudeDir)) {
  fs.mkdirSync(tempClaudeDir, { recursive: true });
}

// Set CLAUDE_HOME to the temporary directory
// This will be picked up by container.ts
process.env.CLAUDE_HOME = tempClaudeDir;

console.log(`E2E Test Environment Setup:`);
console.log(`  CLAUDE_HOME: ${tempClaudeDir}`);

// Clean up function (called after all tests complete)
export function cleanup() {
  if (fs.existsSync(tempClaudeDir)) {
    fs.rmSync(tempClaudeDir, { recursive: true, force: true });
    console.log(`\nE2E Test Cleanup: Removed ${tempClaudeDir}`);
  }
}

// Note: Cleanup must be called manually in test suite teardown
// VS Code test runner doesn't provide automatic cleanup hooks
