import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineWorkersConfig(async () => {
const migrationsPath = path.join(__dirname, '../backend/migrations');
const migrations = await readD1Migrations(migrationsPath);

return {
plugins: [tsconfigPaths()],
test: {
include: ['test/**/*.spec.ts'],
setupFiles: ['./test/apply-migrations.ts'],
poolOptions: {
workers: {
miniflare: {
bindings: { TEST_MIGRATIONS: migrations },
},
wrangler: {
configPath: '../backend/wrangler.toml',
environment: 'test',
},
},
},
},
};
});
