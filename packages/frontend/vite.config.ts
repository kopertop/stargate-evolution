import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';
import babel from 'vite-plugin-babel';

export default defineConfig({
	plugins: [
		babel({
			babelConfig: {
				babelrc: false,
				configFile: false,
				presets: [
					['@babel/preset-typescript', { allowNamespaces: true }],
				],
				plugins: [
					['@babel/plugin-proposal-decorators', { legacy: true }],
					['@babel/plugin-proposal-class-properties', { loose: true }],
				],
			},
			filter: (id: string) => {
				// Only apply babel to WatermelonDB model files and service files
				return id.includes('packages/db/src') && /\.(ts|tsx)$/.test(id);
			},
		}),
		react(),
	],
	root: '.',
	publicDir: 'public',
	resolve: {
		alias: {
			'@stargate/db': path.resolve(__dirname, '../db/src'),
			'@stargate/common': path.resolve(__dirname, '../common'),
		},
	},
	esbuild: {
		target: 'es2022',
	},
	build: {
		outDir: 'dist',
		target: 'es2022',
		rollupOptions: {
			input: 'src/main.tsx',
		},
	},
});
