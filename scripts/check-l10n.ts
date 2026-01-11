#!/usr/bin/env ts-node

/**
 * Script to validate that all l10n strings used in source code
 * are defined in the Chinese bundle file (bundle.l10n.zh-cn.json)
 *
 * Uses TypeScript compiler API for accurate parsing
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const BUNDLE_PATH = path.join(__dirname, '../l10n/bundle.l10n.zh-cn.json');

interface StringLocation {
    file: string;
    line: number;
    column: number;
}

// Read the bundle file
async function loadBundle(): Promise<Record<string, string>> {
    try {
        const content = await fsPromises.readFile(BUNDLE_PATH, 'utf8');
        return JSON.parse(content);
    } catch (error) {
        console.error(`❌ Failed to load bundle file: ${(error as Error).message}`);
        process.exit(1);
    }
}

// Get all TypeScript files in a directory recursively
function getSourceFiles(dir: string): string[] {
    const files: string[] = [];

    function scan(currentDir: string) {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                // Skip test directories
                if (entry.name === 'test' || entry.name === 'node_modules') {
                    continue;
                }
                scan(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.ts')) {
                files.push(fullPath);
            }
        }
    }

    scan(dir);
    return files;
}

// Extract l10n strings from a TypeScript file
async function extractL10nStrings(filePath: string): Promise<Map<string, StringLocation>> {
    const strings = new Map<string, StringLocation>();
    const sourceCode = await fsPromises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
        filePath,
        sourceCode,
        ts.ScriptTarget.Latest,
        true
    );

    function visit(node: ts.Node) {
        // Check if this is a call expression
        if (ts.isCallExpression(node)) {
            const expression = node.expression;

            // Check if it's vscode.l10n.t()
            if (ts.isPropertyAccessExpression(expression)) {
                const obj = expression.expression;
                const prop = expression.name;

                // Check if it's l10n.t
                if (prop.text === 't' && ts.isPropertyAccessExpression(obj)) {
                    const vscode = obj.expression;
                    const l10n = obj.name;

                    // Check if it's vscode.l10n
                    if (ts.isIdentifier(vscode) && vscode.text === 'vscode' && l10n.text === 'l10n') {
                        // Extract the first argument (the message string)
                        if (node.arguments.length > 0) {
                            const firstArg = node.arguments[0];

                            if (ts.isStringLiteral(firstArg)) {
                                const text = firstArg.text;
                                const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                                const relativePath = path.relative(path.join(__dirname, '..'), filePath);

                                strings.set(text, {
                                    file: relativePath,
                                    line: line + 1,
                                    column: character + 1
                                });
                            }
                        }
                    }
                }
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    return strings;
}

// Main validation
async function main() {
    console.log('🔍 Checking l10n string coverage using TypeScript compiler API...\n');

    const bundle = await loadBundle();
    const bundleKeys = new Set(Object.keys(bundle));
    const allStrings = new Map<string, StringLocation>();

    // Collect all l10n strings from source files
    const sourceFiles = getSourceFiles(SRC_DIR);
    for (const file of sourceFiles) {
        const fileStrings = await extractL10nStrings(file);
        for (const [string, location] of fileStrings.entries()) {
            // Use first occurrence for reporting
            if (!allStrings.has(string)) {
                allStrings.set(string, location);
            }
        }
    }

    console.log(`📦 Bundle contains ${bundleKeys.size} translations`);
    console.log(`📝 Source code uses ${allStrings.size} unique strings`);
    console.log(`📄 Scanned ${sourceFiles.length} source files\n`);

    // Check for missing translations
    const missing: Array<{ string: string; location: StringLocation }> = [];
    for (const [string, location] of allStrings.entries()) {
        if (!bundleKeys.has(string)) {
            missing.push({ string, location });
        }
    }

    // Check for unused translations
    const unused: string[] = [];
    for (const key of bundleKeys) {
        if (!allStrings.has(key)) {
            unused.push(key);
        }
    }

    // Report results
    let hasErrors = false;

    if (missing.length > 0) {
        hasErrors = true;
        console.log(`❌ Missing translations in bundle.l10n.zh-cn.json (${missing.length}):`);
        console.log('='.repeat(80));
        for (const { string, location } of missing) {
            console.log(`\n📍 ${location.file}:${location.line}:${location.column}`);
            console.log(`   String: "${string}"`);
        }
        console.log('\n');
    }

    if (unused.length > 0) {
        console.log(`⚠️  Unused translations in bundle.l10n.zh-cn.json (${unused.length}):`);
        console.log('='.repeat(80));
        for (const key of unused) {
            console.log(`   "${key}"`);
        }
        console.log('\n');
    }

    if (!hasErrors && unused.length === 0) {
        console.log('✅ All l10n strings are properly defined!');
        console.log('✅ No unused translations found!');
        process.exit(0);
    } else if (!hasErrors) {
        console.log('✅ All l10n strings are properly defined!');
        console.log('💡 Consider removing unused translations to keep the bundle clean.');
        process.exit(0);
    } else {
        console.log('❌ Validation failed! Please add missing translations to bundle.l10n.zh-cn.json');
        process.exit(1);
    }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
