#!/usr/bin/env tsx

/**
 * Sync Data from Remote D1 Database to Local Database
 *
 * This script downloads data from the production D1 database and imports it into
 * the local database for testing and development purposes.
 *
 * Usage:
 *   pnpm run sync:from-remote
 *   pnpm run sync:from-remote --tables users,rooms  # sync specific tables
 *   pnpm run sync:from-remote --dry-run             # preview what would be synced
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface SyncOptions {
	tables?: string[];
	dryRun?: boolean;
	verbose?: boolean;
}

// Define tables in dependency order (dependencies first)
const TABLE_ORDER = [
	// Core user and authentication tables
	'users',

	// Template tables (base definitions)
	'race_templates',
	'technology_templates',
	'furniture_templates',
	'galaxy_templates',
	'star_system_templates',
	'planet_templates',
	'room_templates',

	// Junction tables for room templates
	'room_template_furniture',
	'room_template_technology',

	// Game instance tables (depend on templates)
	'rooms',
	'doors',
	'room_furniture',
	'room_technology',
	'person_templates',
	'characters',

	// Game state tables
	'saved_games',
];

const TEMP_DIR = join(process.cwd(), '.temp-sync');

function log(message: string, verbose = false): void {
	if (!verbose || process.argv.includes('--verbose')) {
		console.log(`[SYNC] ${message}`);
	}
}

function execCommand(command: string, description: string): string {
	log(`${description}...`);
	try {
		return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
	} catch (error: any) {
		console.error(`❌ Failed to ${description.toLowerCase()}: ${error.message}`);
		throw error;
	}
}

function parseArgs(): SyncOptions {
	const args = process.argv.slice(2);
	const options: SyncOptions = {};

	if (args.includes('--dry-run')) {
		options.dryRun = true;
	}

	if (args.includes('--verbose')) {
		options.verbose = true;
	}

	const tablesIndex = args.findIndex(arg => arg.startsWith('--tables'));
	if (tablesIndex !== -1) {
		const tablesArg = args[tablesIndex];
		if (tablesArg.includes('=')) {
			options.tables = tablesArg.split('=')[1].split(',');
		} else if (args[tablesIndex + 1] && !args[tablesIndex + 1].startsWith('--')) {
			options.tables = args[tablesIndex + 1].split(',');
		}
	}

	return options;
}

function ensureTempDir(): void {
	if (!existsSync(TEMP_DIR)) {
		mkdirSync(TEMP_DIR, { recursive: true });
		log(`Created temp directory: ${TEMP_DIR}`, true);
	}
}

function cleanupTempDir(): void {
	try {
		execSync(`rm -rf "${TEMP_DIR}"`, { stdio: 'pipe' });
		log(`Cleaned up temp directory: ${TEMP_DIR}`, true);
	} catch (error) {
		log(`Warning: Could not clean up temp directory: ${error}`, true);
	}
}

function getTableRowCount(tableName: string, isRemote = false): number {
	try {
		const command = isRemote
			? `wrangler d1 execute stargate-game --remote --command "SELECT COUNT(*) as count FROM ${tableName}" --json`
			: `wrangler d1 execute stargate-game --local --command "SELECT COUNT(*) as count FROM ${tableName}" --json`;

		const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
		const parsed = JSON.parse(output);

		// Handle wrangler JSON response format
		if (Array.isArray(parsed) && parsed[0] && Array.isArray(parsed[0].results) && parsed[0].results[0]) {
			return parseInt(parsed[0].results[0].count) || 0;
		}

		return 0;
	} catch (error) {
		log(`Warning: Could not get row count for ${tableName}: ${error}`, true);
		return 0;
	}
}

function exportTableData(tableName: string): string | null {
	const outputFile = join(TEMP_DIR, `${tableName}.sql`);

	try {
		// Export data from remote database using remote table name
		const command = `wrangler d1 execute stargate-game --remote --command "SELECT * FROM ${tableName}" --json`;
		const output = execCommand(command, `Exporting ${tableName} from remote`);

		// Parse JSON output and convert to SQL INSERT statements
		const parsed = JSON.parse(output);

		// Handle wrangler response format: array of response objects with results arrays
		let rows: any[] = [];
		if (Array.isArray(parsed)) {
			// Take the first response object and extract its results
			if (parsed[0] && Array.isArray(parsed[0].results)) {
				rows = parsed[0].results;
			}
		} else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.results)) {
			rows = parsed.results;
		}

		if (!Array.isArray(rows) || rows.length === 0) {
			log(`  ⚠️  No data found in ${tableName}`);
			return '';
		}

		// Get column names from first row
		const columns = Object.keys(rows[0]);
		const columnList = columns.map(col => `"${col}"`).join(', ');

		// Generate INSERT statements using local table name
		const insertStatements = rows.map(row => {
			const values = columns.map(col => {
				const value = row[col];
				if (value === null || value === undefined) return 'NULL';
				if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
				if (typeof value === 'boolean') return value ? '1' : '0';
				return String(value);
			}).join(', ');

			return `INSERT OR REPLACE INTO "${tableName}" (${columnList}) VALUES (${values});`;
		}).join('\n');

		if (rows.length === 0) {
			log(`  ⚠️  No data found in ${tableName}`);
			return null;
		}

		const sqlContent = `-- Data export for ${tableName} (${rows.length} rows)\n${insertStatements}\n`;
		writeFileSync(outputFile, sqlContent);

		log(`  ✅ Exported ${rows.length} rows from ${tableName}`);
		return outputFile;

	} catch (error: any) {
		log(`  ❌ Failed to export ${tableName}: ${error.message}`);
		return '';
	}
}

function importTableData(sqlFile: string, tableName: string): void {

	if (!existsSync(sqlFile)) {
		log(`  ⚠️  No data file found for ${tableName}`, true);
		return;
	}

	try {
		const sqlContent = readFileSync(sqlFile, 'utf8');
		if (!sqlContent.trim()) {
			log(`  ⚠️  Empty data file for ${tableName}`);
			return;
		}

		// Fix schema differences for room_templates
		let processedSqlContent = sqlContent;
		if (tableName === 'room_templates') {
			// Remove width and height columns from INSERT statements since they're generated in local schema
			processedSqlContent = processedSqlContent.replace(/, "width", "height"/g, '');
			// Remove the corresponding values (last two values in the INSERT)
			processedSqlContent = processedSqlContent.replace(/, (\d+), (\d+)\);/g, ');');
		}

		// Create a single SQL script that disables FK constraints, clears table, imports data, and re-enables constraints
		const combinedSql = `
			PRAGMA foreign_keys = OFF;
			DELETE FROM ${tableName};
			${processedSqlContent}
			PRAGMA foreign_keys = ON;
		`;

		// Write combined content to temp file
		const processedFile = sqlFile.replace('.sql', '_processed.sql');
		writeFileSync(processedFile, combinedSql);

		// Execute the combined script
		execCommand(
			`wrangler d1 execute stargate-game --local --file "${processedFile}"`,
			`Importing ${tableName} data to local database`,
		);

		log(`  ✅ Imported ${tableName} data successfully`);

	} catch (error: any) {
		log(`  ❌ Failed to import ${tableName}: ${error.message}`);
	}
}

function validateSync(tableName: string): boolean {
	try {
		const remoteCount = getTableRowCount(tableName, true);
		const localCount = getTableRowCount(tableName, false);

		if (remoteCount === localCount) {
			log(`  ✅ ${tableName}: ${localCount} rows (matched)`);
			return true;
		} else {
			log(`  ⚠️  ${tableName}: remote=${remoteCount}, local=${localCount} (mismatch)`);
			return false;
		}
	} catch (error) {
		log(`  ❌ Could not validate ${tableName}: ${error}`);
		return false;
	}
}

async function main(): Promise<void> {
	console.log('🔄 Stargate Evolution - Remote to Local Database Sync\n');

	const options = parseArgs();
	const tablesToSync = options.tables || TABLE_ORDER;

	if (options.dryRun) {
		console.log('🔍 DRY RUN MODE - No changes will be made\n');
	}

	log(`Tables to sync: ${tablesToSync.join(', ')}`);

	// Ensure temp directory exists
	ensureTempDir();

	try {
		// Step 1: Export data from remote
		console.log('\n📤 Exporting data from remote database...');
		const exportedFiles: { table: string; file: string }[] = [];

		for (const tableName of tablesToSync) {
			const sqlFile = exportTableData(tableName);
			if (sqlFile) {
				exportedFiles.push({ table: tableName, file: sqlFile });
			}
		}

		if (exportedFiles.length === 0) {
			console.log('❌ No data was exported. Exiting.');
			return;
		}

		// Step 2: Import data to local (if not dry run)
		if (!options.dryRun) {
			console.log('\n📥 Importing data to local database...');

			for (const { table, file } of exportedFiles) {
				importTableData(file, table);
			}

			// Step 3: Validate sync
			console.log('\n✅ Validating sync results...');
			const validationResults = tablesToSync.map(table => ({
				table,
				valid: validateSync(table),
			}));

			const successCount = validationResults.filter(r => r.valid).length;
			const totalCount = validationResults.length;

			console.log(`\n📊 Sync Summary: ${successCount}/${totalCount} tables synced successfully`);

			if (successCount === totalCount) {
				console.log('🎉 All tables synced successfully!');
			} else {
				console.log('⚠️  Some tables had sync issues. Check the logs above.');
			}
		} else {
			console.log('\n🔍 DRY RUN COMPLETE - Review exported files in .temp-sync/');
			console.log('   Run without --dry-run to perform actual sync');
		}

	} catch (error: any) {
		console.error(`\n❌ Sync failed: ${error.message}`);
		process.exit(1);
	} finally {
		// Cleanup temp files (unless dry run for inspection)
		if (!options.dryRun) {
			cleanupTempDir();
		}
	}
}

// Handle cleanup on exit
process.on('SIGINT', () => {
	console.log('\n🛑 Sync cancelled by user');
	cleanupTempDir();
	process.exit(0);
});

process.on('SIGTERM', () => {
	cleanupTempDir();
	process.exit(0);
});

if (require.main === module) {
	main().catch(error => {
		console.error('💥 Unexpected error:', error);
		cleanupTempDir();
		process.exit(1);
	});
}
