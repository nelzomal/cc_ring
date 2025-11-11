VS Code Extension Test Runner
This is a VS Code extension for other extension authors, that runs tests as you develop extensions. It requires use of the new extension test API and configuration file. For more information, see our testing guide for extension authors.

Getting Started
Please follow the testing guide for extension authors to initially set up tests using the command line. Then, install this extension.

This extension automatically discovers and works with the .vscode-test.js/mjs/cjs files found in your workspace. It requires minimal to no extra configuration. It works by looking at test files in your JavaScript code. If you write tests in TypeScript, you will want to:

Modify your tsconfig.json and add "sourceMap": true
Add \*_/_.js.map to your .vscodeignore file to avoid bloating the published extension.
Configuration
extension-test-runner.extractSettings: configures how tests get extracted. You can configure:

The extractWith mode, that specifies if tests are extracted via evaluation or syntax-tree parsing. Evaluation is likely to lead to better results, but may have side-effects. Defaults to evaluation.
The test and suite identifiers the process extracts. Defaults to ["it", "test"] and ["describe", "suite"] respectively, covering Mocha's common interfaces.
extension-test-runner.debugOptions: options, normally found in the launch.json, to pass when debugging the extension. See the docs for a complete list of options.

extension-test-runner.wrapper: a wrapper script to use when running VS Code outside of debug mode. When running tests, arguments will be passed to this script, and it should spawn the first argument as a child process.

A common use case for this is to set it to xvfb-run for use in remotes which lack a display to avoid a "missing display" error.
