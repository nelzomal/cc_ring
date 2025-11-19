import typescriptEslint from "typescript-eslint";
import noRelativeImportPaths from "eslint-plugin-no-relative-import-paths";

export default [{
    files: ["**/*.ts"],
}, {
    plugins: {
        "@typescript-eslint": typescriptEslint.plugin,
        "no-relative-import-paths": noRelativeImportPaths,
    },

    languageOptions: {
        parser: typescriptEslint.parser,
        ecmaVersion: 2022,
        sourceType: "module",
    },

    rules: {
        "@typescript-eslint/naming-convention": ["warn", {
            selector: "import",
            format: ["camelCase", "PascalCase"],
        }],

        curly: "warn",
        eqeqeq: "warn",
        "no-throw-literal": "warn",
        semi: "warn",
        "no-relative-import-paths/no-relative-import-paths": [
            "error",
            { "allowSameFolder": true }
        ],
    },
}];
