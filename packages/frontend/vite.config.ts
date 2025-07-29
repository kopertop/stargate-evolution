/* eslint-disable unicorn/no-process-exit */
// import { spawn } from 'node:child_process';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
	// Load env file based on `mode` in the current working directory.
	// Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
	const env = loadEnv(mode, process.cwd(), '');

	return {
		server: {
			port: process.env.PORT ? Number(process.env.PORT) : 5173,
		},
		worker: { format: 'es' },
		define: {
			'import.meta.env.VITE_PUBLIC_API_URL': JSON.stringify(env.VITE_PUBLIC_API_URL || 'http://localhost:8787'),
		},
	plugins: [
		react(),

	],
	root: '.',
	publicDir: 'public',
	resolve: {
		alias: {
			'@stargate/common': path.resolve(__dirname, '../common'),
		},
	},
		esbuild: {
			target: 'es2022',
		},
		build: {
			outDir: 'dist',
			target: 'es2022',
		},
	};
});
