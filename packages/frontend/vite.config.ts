/* eslint-disable unicorn/no-process-exit */
// import { spawn } from 'node:child_process';
import { livestoreDevtoolsPlugin } from '@livestore/devtools-vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
	server: {
		port: process.env.PORT ? Number(process.env.PORT) : 5173,
	},
	worker: { format: 'es' },
	plugins: [
		react(),
		livestoreDevtoolsPlugin({ schemaPath: './src/livestore/schema.ts' }),
		// Running `wrangler dev` as part of `vite dev` needed for `@livestore/sync-cf`
		// Temporarily disabled to test LiveStore without sync
		/*
		{
			name: 'wrangler-dev',
			configureServer: async (server) => {
				const wrangler = spawn('./node_modules/.bin/wrangler', ['dev', '--config', 'wrangler-sync.toml', '--port', '8788'], {
					stdio: ['ignore', 'inherit', 'inherit'],
				});
				const shutdown = () => {
					if (wrangler.killed === false) {
						wrangler.kill();
					}
					process.exit(0);
				};
				server.httpServer?.on('close', shutdown);
				process.on('SIGTERM', shutdown);
				process.on('SIGINT', shutdown);
				wrangler.on('exit', (code) => console.error(`wrangler dev exited with code ${code}`));
			},
		},
		*/
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
		rollupOptions: {
			input: 'src/main.tsx',
		},
	},
});
