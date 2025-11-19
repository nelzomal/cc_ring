import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

/**
 * E2E Test Runner for VS Code Extension
 *
 * This runs Mocha tests inside a real VS Code Extension Host
 * DO NOT use Vitest - VS Code requires Mocha
 */
export function run(): Promise<void> {
  // Create the mocha test instance
  const mocha = new Mocha({
    ui: 'bdd', // Use BDD style (describe/it)
    color: true,
    timeout: 20000, // E2E tests can be slow
  });

  const testsRoot = path.resolve(__dirname, './suite');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }).then((files) => {
      // Add files to the test suite
      files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run((failures) => {
          // Cleanup test environment after ALL tests complete
          const { cleanup } = require('./setup');
          cleanup();

          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    }).catch((err) => {
      return reject(err);
    });
  });
}
