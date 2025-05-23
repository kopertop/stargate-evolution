#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

function getMigrationFiles(): string[] {
	if (!fs.existsSync(MIGRATIONS_DIR)) {
		console.log('No migrations directory found.');
		return [];
	}

	return fs.readdirSync(MIGRATIONS_DIR)
		.filter(f => f.endsWith('.sql'))
		.sort();
}

function applyMigrations(database: string) {
	const migrationFiles = getMigrationFiles();

	if (migrationFiles.length === 0) {
		console.log('No migration files found.');
		return;
	}

	console.log(`Applying ${migrationFiles.length} migrations to database: ${database}`);

	migrationFiles.forEach((file, index) => {
		const migrationPath = path.join(MIGRATIONS_DIR, file);
		console.log(`${index + 1}/${migrationFiles.length}: Applying ${file}...`);

		try {
			execSync(`wrangler d1 execute ${database} --file=${migrationPath}`, {
				stdio: 'inherit',
			});
			console.log(`  ✅ Applied: ${file}`);
		} catch (error) {
			console.error(`  ❌ Failed to apply: ${file}`);
			console.error(error);
			process.exit(1);
		}
	});

	console.log('✅ All migrations applied successfully!');
}

function main() {
	const args = process.argv.slice(2);
	const database = args[0] || 'stargate-game';

	console.log(`Initializing D1 database: ${database}`);
	applyMigrations(database);
}

if (require.main === module) {
	main();
}
