import path from 'node:path';

import { defineWorkersProject, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersProject(async () => {
	const migrationsPath = path.join(__dirname, 'migrations');
	const migrations = await readD1Migrations(migrationsPath);

	return {
		test: {
			include: ['src/**/*.spec.ts'],
			poolOptions: {
				workers: {
					wrangler: { configPath: './wrangler.toml' },
					miniflare: {
						bindings: {
							TEST_MIGRATIONS: migrations,
						},
					},
				},
			},
		},
	};
});
