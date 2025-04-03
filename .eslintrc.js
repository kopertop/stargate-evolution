module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:react-hooks/recommended',
		'plugin:@typescript-eslint/recommended',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: [
		'react',
		'react-hooks',
		'@typescript-eslint',
		'import',
		'react-native',
	],
	rules: {
		// Indentation with tabs
		'indent': ['error', 'tab'],

		// Ban uuid library explicitly
		'no-restricted-imports': ['error', {
			paths: [{
				name: 'uuid',
				message: 'Please use the custom ID generator from "../utils/id-generator" instead of uuid.'
			}],
			patterns: [
				'uuid/*',
				'*/uuid'
			]
		}],

		// Ensure proper React import
		'react/jsx-uses-react': 'error',
		'react/jsx-uses-vars': 'error',

		// Enforce hook rules
		'react-hooks/rules-of-hooks': 'error',
		'react-hooks/exhaustive-deps': 'warn',

		// TypeScript specific rules
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/no-non-null-assertion': 'warn',

		// Enforce import order
		'import/order': ['error', {
			'groups': [
				'builtin',
				'external',
				'internal',
				'parent',
				'sibling',
				'index'
			],
			'newlines-between': 'always',
			'alphabetize': {
				'order': 'asc',
				'caseInsensitive': true
			}
		}],

		// Other style rules
		'no-console': ['warn', { allow: ['warn', 'error'] }],
		'quotes': ['error', 'single', { 'avoidEscape': true }],
		'comma-dangle': ['error', 'always-multiline'],
		'semi': ['error', 'always'],
	},
	settings: {
		react: {
			version: 'detect',
		},
	},
	env: {
		browser: true,
		es6: true,
		node: true,
		'react-native/react-native': true,
	},
	ignorePatterns: [
		'node_modules/',
		'babel.config.js',
		'metro.config.js',
		'.eslintrc.js',
	],
	overrides: [
		{
			files: ['*.ts', '*.tsx'],
			rules: {
				'@typescript-eslint/explicit-function-return-type': ['warn', {
					allowExpressions: true,
					allowTypedFunctionExpressions: true,
				}],
			},
		},
	],
};
