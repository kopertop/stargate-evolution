#!/usr/bin/env tsx
import { execSync } from 'child_process';

import { Command } from 'commander';

const program = new Command();

program
	.description('Reset database by dropping all tables and clearing migration history')
	.option('--remote', 'Reset the production database instead of local')
	.parse(process.argv);

const options = program.opts();
const isRemote = options.remote ?? false;
const databaseBinding = 'DB'; // Assumed binding name from wrangler.toml

async function resetDatabase() {
	console.log(`Starting database reset ${isRemote ? 'in production' : 'locally'}...`);

	try {
		// Base command for wrangler
		const wranglerBaseCommand = `npx wrangler d1 execute ${databaseBinding}${isRemote ? ' --remote' : ''}`;

		// 1. Get all table names except d1_migrations
		console.log('Fetching table names...');
		const tablesOutput = execSync(
			`${wranglerBaseCommand} --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations';" --json`,
			{ encoding: 'utf-8' },
		);
		const tablesResult = JSON.parse(tablesOutput);

		// Ensure the structure is as expected
		if (!tablesResult || !Array.isArray(tablesResult) || !tablesResult[0]?.results) {
			console.error('Unexpected format for table names:', tablesResult);
			throw new Error('Failed to parse table names from wrangler output.');
		}

		const tableNames = tablesResult[0].results.map((row: { name: string }) => row.name);

		if (tableNames.length === 0) {
			console.log('No tables found to drop (excluding d1_migrations).');
		} else {
			console.log(`Found tables to drop: ${tableNames.join(', ')}`);

			// 2. Drop each table
			for (const tableName of tableNames) {
				console.log(`Dropping table: ${tableName}...`);
				try {
					execSync(
						`${wranglerBaseCommand} --command "DROP TABLE IF EXISTS ${tableName};"`,
						{ encoding: 'utf-8' },
					);
					console.log(` -> Table ${tableName} dropped successfully.`);
				} catch (error) {
					console.error(`Error dropping table ${tableName}:`, error);
					// Continue with other tables even if one fails
				}
			}
		}

		// 3. Clear migration history (delete all rows from d1_migrations)
		console.log('Clearing migration history...');
		try {
			execSync(
				`${wranglerBaseCommand} --command "DELETE FROM d1_migrations;"`,
				{ encoding: 'utf-8' },
			);
			console.log(' -> Migration history cleared successfully.');
		} catch (error) {
			console.error('Error clearing migration history:', error);
			throw error;
		}

		console.log('Database reset completed successfully!');
		console.log('You can now run migrations to recreate the database schema.');

	} catch (error) {
		console.error('Database reset failed:');
		if (error instanceof Error) {
			console.error(error.message);
			// If the error contains stdout/stderr from execSync, print it
			if ('stdout' in error) console.error('STDOUT:', (error as any).stdout?.toString());
			if ('stderr' in error) console.error('STDERR:', (error as any).stderr?.toString());
		} else {
			console.error(error);
		}
		process.exit(1); // Exit with error code
	}
}

resetDatabase();
