import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import _import from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
	baseDirectory: __dirname,
	recommendedConfig: js.configs.recommended,
	allConfig: js.configs.all,
});

export default [
	{
		ignores: [
			'**/node_modules/',
			'**/babel.config.js',
			'**/metro.config.js',
			'**/.eslintrc.js',
			'**/build/',
			'**/dist/',
			'**/.expo/',
			'**/.wrangler/',
			'**/*.config.js',
			'**/*.config.ts',
			'**/vite.config.ts',
			'**/vitest.config.ts',
			'**/.eslintcache',
			'**/*.d.ts',
		],
	},
	...fixupConfigRules(compat.extends(
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:@typescript-eslint/recommended',
	)),
	{
		plugins: {
			react: fixupPluginRules(react),
			'react-hooks': fixupPluginRules(reactHooks),
			'@typescript-eslint': fixupPluginRules(typescriptEslint),
			import: fixupPluginRules(_import),
			'react-native': reactNative,
			unicorn,
		},

		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				...reactNative.environments['react-native']['react-native'],
			},

			parser: tsParser,
			ecmaVersion: 'latest',
			sourceType: 'module',

			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
		},

		settings: {
			react: {
				version: 'detect',
			},
		},

		rules: {
			indent: ['error', 'tab'],

			'unicorn/filename-case': ['error', {
				cases: {
					kebabCase: true,
				},
			}],

			'@typescript-eslint/no-unused-vars': 'warn',

			'import/no-default-export': 'off',

			'no-restricted-imports': ['error', {
				paths: [{
					name: 'uuid',
					message: 'Please use the custom ID generator from "../utils/id-generator" instead of uuid.',
				}],

				patterns: ['uuid/*', '*/uuid'],
			}],

			'react/jsx-uses-react': 'error',
			'react/jsx-uses-vars': 'error',
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/no-non-null-assertion': 'warn',

			'import/order': ['error', {
				groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
				'newlines-between': 'always',

				alphabetize: {
					order: 'asc',
					caseInsensitive: true,
				},
			}],

			'no-console': ['warn', {
				allow: ['log', 'warn', 'error'],
			}],

			quotes: ['error', 'single', {
				avoidEscape: true,
			}],

			'comma-dangle': ['error', 'always-multiline'],
			semi: ['error', 'always'],
		},
	},
	{
		files: ['**/*.ts', '**/*.tsx'],

		rules: {
			'@typescript-eslint/explicit-function-return-type': ['warn', {
				allowExpressions: true,
				allowTypedFunctionExpressions: true,
			}],
		},
	},
];
