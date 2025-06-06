#!/usr/bin/env tsx

/**
 * Migration Generator Script
 *
 * This script creates a temporary SQLite database, runs all existing migrations,
 * then scans the codebase to find potentially missing room templates and technologies.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a temporary SQLite database and run all migrations to get current state
 */
function createTempDatabaseWithMigrations(): DatabaseSync {
	const db = new DatabaseSync(':memory:');

	// Get all migration files in order
	const migrationsDir = join(__dirname, '..', 'migrations');
	const migrationFiles = readdirSync(migrationsDir)
		.filter(f => f.endsWith('.sql'))
		.sort(); // Ensure they run in order

	console.log(`   Running ${migrationFiles.length} migration files...`);

	// Run each migration
	for (const file of migrationFiles) {
		const migrationPath = join(migrationsDir, file);
		const migrationSql = readFileSync(migrationPath, 'utf-8');

		try {
			// Split on semicolons and execute each statement
			const statements = migrationSql
				.split(';')
				.map(stmt => stmt.trim())
				.filter(stmt => stmt.length > 0);

			for (const statement of statements) {
				db.exec(statement);
			}
		} catch (error) {
			console.warn(`   Warning: Failed to execute migration ${file}:`, error);
		}
	}

	return db;
}

/**
 * Clean up temporary database
 */
function cleanupTempDatabase(db: DatabaseSync): void {
	try {
		db.close();
	} catch (error) {
		console.warn('   Warning: Could not clean up temporary database:', error);
	}
}

/**
 * Generate the next migration file number
 */
function getNextMigrationNumber(): string {
	const migrationsDir = join(__dirname, '..', 'migrations');
	const migrationFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));

	let maxNumber = 0;
	for (const file of migrationFiles) {
		const match = file.match(/^(\d+)_/);
		if (match) {
			const num = parseInt(match[1], 10);
			if (num > maxNumber) {
				maxNumber = num;
			}
		}
	}

	return String(maxNumber + 1).padStart(3, '0');
}

/**
 * Escape SQL values
 */
function escapeSql(value: any): string {
	if (value === null) {
		return 'NULL';
	}
	if (typeof value === 'boolean') {
		return value ? '1' : '0';
	}
	if (typeof value === 'number') {
		return value.toString();
	}
	if (typeof value !== 'string') {
		return escapeSql(value.toString());
	}
	return `'${value.replace(/'/g, "''")}'`;
}

async function queryWranglerDB<T = any>(table: string): Promise<T[]> {
	const rows = execSync(`npx wrangler d1 execute DB --command "SELECT * FROM ${table};" --json`, { encoding: 'utf-8' });
	return JSON.parse(rows)[0].results as T[];
}

/**
 * Main function to generate migration
 */
async function generateMigration(): Promise<void> {
	console.log('🔍 Creating temporary database and running migrations...');

	// Create temporary database and run all migrations
	const db = createTempDatabaseWithMigrations();

	try {
		const migrationNumber = getNextMigrationNumber();
		const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');

		const migrationContent: string[] = [
			`-- Migration ${migrationNumber}: Add new room templates and technologies`,
			`-- Generated on ${new Date().toISOString()}`,
		];

		for (const table of ['room_templates', 'technology_templates', 'room_technology']) {
			try {
				// Get existing data from the database
				const existingData = await db.prepare(`SELECT * FROM ${table}`).all();
				const wranglerData = await queryWranglerDB(table);

				console.log(`[${table}] Found ${existingData.length} existing records`);
				console.log(`[${table}] Found ${wranglerData.length} records in Wrangler DB`);

				for (const record of wranglerData) {
					const existingRecord = existingData.find(r => r.id === record.id);
					if (!existingRecord) {
						console.log(`[${table}] New record: ${record.id}`);
						migrationContent.push(`INSERT INTO ${table} (${Object.keys(record).join(', ')}) VALUES (${Object.values(record).map(escapeSql).join(', ')});`);
					} else {
						// compare existing and wrangler data
						for (const [key, value] of Object.entries(record)) {
							if (
								value !== existingRecord[key]
								&& String(value) !== String(existingRecord[key])
							) {
								console.log(`[${table}] ${key} changed from ${existingRecord[key]} to ${value}`);
								migrationContent.push(`UPDATE ${table} SET ${key} = ${escapeSql(value)} WHERE id = '${record.id}';`);
							}
						}
					}
				}

			} catch (error) {
				console.error(`[${table}] Error:`, error);
			}
		}
		// Only run the migration if there are changes
		if (migrationContent.length < 3) {
			console.log('No changes found. Skipping migration.');
			return;
		}

		// Write migration file
		const migrationFilename = `${migrationNumber}_add_new_templates_${timestamp}.sql`;
		const migrationPath = join(__dirname, '..', 'migrations', migrationFilename);

		writeFileSync(migrationPath, migrationContent.join('\n'), 'utf-8');

		console.log(`\n✅ Generated migration file: ${migrationFilename}`);
		console.log(`   Location: ${migrationPath}`);
		console.log('\n💡 To apply this migration, run:');
		console.log('   pnpm run migrate');
	} finally {
		// Clean up temporary database
		cleanupTempDatabase(db);
	}
}

generateMigration();
