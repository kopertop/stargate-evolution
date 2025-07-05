import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkersConfig(async () => {
	// Read all migrations in the migrations directory
	const migrationsPath = path.join(__dirname, 'migrations');
	const migrations = await readD1Migrations(migrationsPath);

	return {
		plugins: [tsconfigPaths()],
		test: {
			include: ['__tests__/**/*.spec.ts'],
			setupFiles: ['./__tests__/apply-migrations.ts'],
			poolOptions: {
				workers: {
					miniflare: {
						// Add a test-only binding for migrations
						bindings: { TEST_MIGRATIONS: migrations },
					},
					wrangler: {
						configPath: './wrangler.toml',
						environment: 'test',
					},
				},
			},
		},
	};
});
