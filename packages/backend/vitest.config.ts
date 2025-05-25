import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig(async () => {
	// Read all migrations in the migrations directory
	// const migrationsPath = path.join(__dirname, 'migrations');
	// const migrations = await readD1Migrations(migrationsPath);

	return {
		test: {
			include: ['src/**/*.spec.ts'],
			poolOptions: {
				workers: {
					miniflare: {
						// Add a test-only binding for migrations
						// bindings: { TEST_MIGRATIONS: migrations },
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
