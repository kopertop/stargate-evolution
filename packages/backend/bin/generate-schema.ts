#!/usr/bin/env tsx

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { Parser } from 'node-sql-parser';

interface TableColumn {
	cid: number;
	name: string;
	type: string;
	notnull: number;
	dflt_value: any;
	pk: number;
}

interface TableInfo {
	name: string;
	type: 'table' | 'view';
	sql: string;
	columns: TableColumn[];
	rowCount: number;
}

interface DatabaseSchema {
	tables: TableInfo[];
	generatedAt: string;
	version: string;
}

async function generateSchema() {
	console.log('[SCHEMA-GEN] Starting database schema generation...');

	try {
		// Get all tables and views
		console.log('[SCHEMA-GEN] Fetching tables and views...');
		const tableSchemaQuery = 'SELECT * FROM sqlite_schema WHERE type="table"';
		const tablesResult = execSync(
			`npx wrangler d1 execute DB --command='${tableSchemaQuery}' --json`,
			{ encoding: 'utf8', cwd: process.cwd() },
		);

		const tablesData = JSON.parse(tablesResult);
		const tables = tablesData[0].results || [];

		console.log(`[SCHEMA-GEN] Found ${tables.length} tables/views`);

		// Parse the SQL into a table info object
		const tablesWithInfo: TableInfo[] = [];

		for (const table of tables) {
			console.log(`[SCHEMA-GEN] Processing table: ${table.name}`);

			if (
				table.type === 'table'
				&& table.name[0] !== '_'
				&& table.name != 'd1_migrations'
				&& !table.name.startsWith('sqlite_')
			) {
				// Parse all the columns in the table
				try {
					const parser = new Parser();
					const parsed = parser.parse(table.sql) as any;
					console.log(parsed.ast.create_definitions);
					const columns = parsed
						.ast
						.create_definitions
						.filter(({ resource }: any) => resource=== 'column')
						.map(({ column, definition, default_val }: any) => ({
							name: column.column,
							type: definition?.dataType,
							dflt_value: default_val?.value,
						}));
					console.log(columns);

					// Get row count
					const countQuery = `SELECT COUNT(*) as count FROM ${table.name}`;
					const countResult = execSync(
						`npx wrangler d1 execute DB --command="${countQuery}" --json`,
						{ encoding: 'utf8', cwd: process.cwd() },
					);
					const countData = JSON.parse(countResult);
					const rowCount = countData.results?.[0]?.count || 0;

					tablesWithInfo.push({
						...table,
						columns,
						rowCount,
					});
				} catch (error) {
					console.error(`[SCHEMA-GEN] Error parsing table: ${table.name}`, error);
					console.error('SQL:', table.sql);
					tablesWithInfo.push({
						...table,
						columns: [],
						rowCount: 0,
					});
				}
			}
		}


		// Create schema object
		const schema: DatabaseSchema = {
			tables: tablesWithInfo,
			generatedAt: new Date().toISOString(),
			version: '1.0.0',
		};

		// Save to JSON file
		const schemaPath = path.join(__dirname, '../src/hono/table-schema.json');
		fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));

		console.log(`[SCHEMA-GEN] Schema saved to: ${schemaPath}`);

	} catch (error) {
		console.error('[SCHEMA-GEN] Failed to generate schema:', error);
		process.exit(1);
	}
}

// Run the script
generateSchema().catch(console.error);
