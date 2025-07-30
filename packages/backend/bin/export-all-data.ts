#!/usr/bin/env npx tsx
/**
 * Comprehensive SQL Data Export Script for Stargate Evolution
 * 
 * Exports ALL data from every table in both local and remote databases.
 * Supports multiple output formats: SQL, JSON, CSV
 * 
 * Usage:
 *   # Export from local database
 *   npx tsx bin/export-all-data.ts --local --format=sql
 *   
 *   # Export from remote database
 *   npx tsx bin/export-all-data.ts --remote --format=json
 *   
 *   # Export specific tables
 *   npx tsx bin/export-all-data.ts --local --tables=users,characters --format=csv
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// All known tables from the schema
const ALL_TABLES = [
	'users',
	'race_templates',
	'technology_templates',
	'room_templates',
	'door_templates',
	'person_templates',
	'galaxy_templates',
	'star_system_templates',
	'planet_templates',
	'room_technology',
	'room_furniture',
	'characters',
	'game_sessions',
	'saved_games',
	'furniture_templates',
] as const;

interface ExportOptions {
  local?: boolean;
  remote?: boolean;
  format?: 'sql' | 'json' | 'csv';
  tables?: string;
  outputDir?: string;
}

interface TableSchema {
  name: string;
  type: string;
  notnull: boolean;
  defaultValue: string | null;
  pk: boolean;
}

interface TableExportJSON {
  table: string;
  rowCount: number;
  data: Record<string, any>[];
  exportedAt: string;
  error?: string;
}

class DatabaseExporter {
	private isLocal: boolean;
	private isRemote: boolean;
	private format: 'sql' | 'json' | 'csv';
	private tables: string[];
	private outputDir: string;
	private timestamp: string;

	constructor(options: ExportOptions = {}) {
		this.isLocal = options.local || false;
		this.isRemote = options.remote || false;
		this.format = options.format || 'sql';
		this.tables = options.tables ? options.tables.split(',') : [...ALL_TABLES];
		this.outputDir = options.outputDir || './exports';
		this.timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
		// Ensure output directory exists
		if (!fs.existsSync(this.outputDir)) {
			fs.mkdirSync(this.outputDir, { recursive: true });
		}
	}

	/**
   * Execute SQL query against the database
   */
	private executeQuery(query: string): string | null {
		try {
			let command: string;
      
			if (this.isLocal) {
				// Use wrangler d1 execute for local database
				command = `wrangler d1 execute stargate-game --local --command="${query.replace(/"/g, '\\"')}"`;
			} else if (this.isRemote) {
				// Use wrangler d1 execute for remote database
				command = `wrangler d1 execute stargate-game --command="${query.replace(/"/g, '\\"')}"`;
			} else {
				throw new Error('Must specify either --local or --remote');
			}

			console.log(`Executing: ${query.substring(0, 100)}...`);
			const result = execSync(command, { 
				encoding: 'utf8',
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer
			});
      
			return result.trim();
		} catch (error) {
			console.error(`Error executing query: ${query}`);
			console.error((error as Error).message);
			return null;
		}
	}

	/**
   * Get table schema information
   */
	private getTableSchema(tableName: string): TableSchema[] | null {
		const query = `PRAGMA table_info(${tableName})`;
		const result = this.executeQuery(query);
    
		if (!result) return null;
    
		try {
			// Parse the result - wrangler returns structured data
			const lines = result.split('\n').filter(line => line.trim());
			const schema: TableSchema[] = [];
      
			for (const line of lines) {
				if (line.includes('|')) {
					const parts = line.split('|').map(p => p.trim());
					if (parts.length >= 3) {
						schema.push({
							name: parts[1],
							type: parts[2],
							notnull: parts[3] === '1',
							defaultValue: parts[4] || null,
							pk: parts[5] === '1',
						});
					}
				}
			}
      
			return schema;
		} catch (error) {
			console.error(`Error parsing schema for ${tableName}:`, error);
			return null;
		}
	}

	/**
   * Get row count for a table
   */
	private getRowCount(tableName: string): number {
		const query = `SELECT COUNT(*) as count FROM ${tableName}`;
		const result = this.executeQuery(query);
    
		if (!result) return 0;
    
		try {
			// Extract count from wrangler output
			const match = result.match(/(\d+)/);
			return match ? parseInt(match[1]) : 0;
		} catch (error) {
			console.error(`Error getting row count for ${tableName}:`, error);
			return 0;
		}
	}

	/**
   * Export table data in SQL format
   */
	private exportTableAsSQL(tableName: string): string {
		console.log(`Exporting ${tableName} as SQL...`);
    
		const schema = this.getTableSchema(tableName);
		if (!schema) {
			console.warn(`Could not get schema for ${tableName}, skipping...`);
			return '';
		}

		const rowCount = this.getRowCount(tableName);
		if (rowCount === 0) {
			console.log(`Table ${tableName} is empty, skipping data export...`);
			return `-- Table ${tableName} is empty\n\n`;
		}

		// Get all data
		const query = `SELECT * FROM ${tableName}`;
		const result = this.executeQuery(query);
    
		if (!result) {
			return `-- Error exporting ${tableName}\n\n`;
		}

		let sql = `-- Export of table: ${tableName}\n`;
		sql += `-- Row count: ${rowCount}\n`;
		sql += `-- Exported at: ${new Date().toISOString()}\n\n`;

		try {
			// Parse the wrangler output to extract data
			const lines = result.split('\n').filter(line => line.trim());
			const dataLines = lines.filter(line => line.includes('|') && !line.includes('---'));
      
			if (dataLines.length === 0) {
				return sql + `-- No data found in ${tableName}\n\n`;
			}

			for (const line of dataLines.slice(1)) { // Skip header
				const values = line.split('|').map(v => v.trim());
				if (values.length >= schema.length) {
					const columnNames = schema.map(col => col.name).join(', ');
					const columnValues = values.slice(0, schema.length).map(val => {
						if (val === 'NULL' || val === '') return 'NULL';
						if (val.match(/^\d+$/)) return val; // Numbers
						return `'${val.replace(/'/g, "''")}'`; // Escape quotes
					}).join(', ');
          
					sql += `INSERT INTO ${tableName} (${columnNames}) VALUES (${columnValues});\n`;
				}
			}
		} catch (error) {
			console.error(`Error parsing data for ${tableName}:`, error);
			sql += `-- Error parsing data for ${tableName}: ${(error as Error).message}\n`;
		}

		return sql + '\n';
	}

	/**
   * Export table data in JSON format
   */
	private exportTableAsJSON(tableName: string): TableExportJSON {
		console.log(`Exporting ${tableName} as JSON...`);
    
		const rowCount = this.getRowCount(tableName);
		if (rowCount === 0) {
			return {
				table: tableName,
				rowCount: 0,
				data: [],
				exportedAt: new Date().toISOString(),
			};
		}

		const query = `SELECT * FROM ${tableName}`;
		const result = this.executeQuery(query);
    
		if (!result) {
			return {
				table: tableName,
				rowCount: 0,
				data: [],
				error: 'Failed to query table',
				exportedAt: new Date().toISOString(),
			};
		}

		try {
			const lines = result.split('\n').filter(line => line.trim());
			const dataLines = lines.filter(line => line.includes('|') && !line.includes('---'));
      
			if (dataLines.length === 0) {
				return {
					table: tableName,
					rowCount: 0,
					data: [],
					exportedAt: new Date().toISOString(),
				};
			}

			const headers = dataLines[0].split('|').map(h => h.trim());
			const rows: Record<string, any>[] = [];

			for (const line of dataLines.slice(1)) {
				const values = line.split('|').map(v => v.trim());
				if (values.length >= headers.length) {
					const row: Record<string, any> = {};
					headers.forEach((header, index) => {
						const value = values[index];
						if (value === 'NULL' || value === '') {
							row[header] = null;
						} else if (value.match(/^\d+$/)) {
							row[header] = parseInt(value);
						} else if (value.match(/^\d*\.\d+$/)) {
							row[header] = parseFloat(value);
						} else {
							row[header] = value;
						}
					});
					rows.push(row);
				}
			}

			return {
				table: tableName,
				rowCount: rows.length,
				data: rows,
				exportedAt: new Date().toISOString(),
			};
		} catch (error) {
			console.error(`Error parsing JSON data for ${tableName}:`, error);
			return {
				table: tableName,
				rowCount: 0,
				data: [],
				error: (error as Error).message,
				exportedAt: new Date().toISOString(),
			};
		}
	}

	/**
   * Export table data in CSV format
   */
	private exportTableAsCSV(tableName: string): string {
		console.log(`Exporting ${tableName} as CSV...`);
    
		const rowCount = this.getRowCount(tableName);
		if (rowCount === 0) {
			return `# Table ${tableName} is empty\n`;
		}

		const query = `SELECT * FROM ${tableName}`;
		const result = this.executeQuery(query);
    
		if (!result) {
			return `# Error exporting ${tableName}\n`;
		}

		try {
			const lines = result.split('\n').filter(line => line.trim());
			const dataLines = lines.filter(line => line.includes('|') && !line.includes('---'));
      
			if (dataLines.length === 0) {
				return `# No data found in ${tableName}\n`;
			}

			const headers = dataLines[0].split('|').map(h => h.trim());
			let csv = headers.join(',') + '\n';

			for (const line of dataLines.slice(1)) {
				const values = line.split('|').map(v => {
					const val = v.trim();
					if (val === 'NULL' || val === '') return '';
					if (val.includes(',') || val.includes('"')) {
						return `"${val.replace(/"/g, '""')}"`;
					}
					return val;
				});
        
				if (values.length >= headers.length) {
					csv += values.slice(0, headers.length).join(',') + '\n';
				}
			}

			return csv;
		} catch (error) {
			console.error(`Error parsing CSV data for ${tableName}:`, error);
			return `# Error parsing data for ${tableName}: ${(error as Error).message}\n`;
		}
	}

	/**
   * Main export function
   */
	public async export(): Promise<void> {
		console.log(`Starting export of ${this.tables.length} tables...`);
		console.log(`Database: ${this.isLocal ? 'Local' : 'Remote'}`);
		console.log(`Format: ${this.format.toUpperCase()}`);
		console.log(`Output directory: ${this.outputDir}`);
		console.log('---');

		const dbType = this.isLocal ? 'local' : 'remote';
    
		if (this.format === 'sql') {
			// Export all tables to a single SQL file
			const fileName = `stargate-evolution-${dbType}-export-${this.timestamp}.sql`;
			const filePath = path.join(this.outputDir, fileName);
      
			let sqlContent = '-- Stargate Evolution Database Export\n';
			sqlContent += `-- Database: ${dbType}\n`;
			sqlContent += `-- Exported at: ${new Date().toISOString()}\n`;
			sqlContent += `-- Tables: ${this.tables.join(', ')}\n\n`;
      
			for (const table of this.tables) {
				sqlContent += this.exportTableAsSQL(table);
			}
      
			fs.writeFileSync(filePath, sqlContent);
			console.log(`\nSQL export complete: ${filePath}`);
      
		} else if (this.format === 'json') {
			// Export to a single JSON file with all tables
			const fileName = `stargate-evolution-${dbType}-export-${this.timestamp}.json`;
			const filePath = path.join(this.outputDir, fileName);
      
			const jsonData = {
				database: dbType,
				exportedAt: new Date().toISOString(),
				tables: {} as Record<string, TableExportJSON>,
			};
      
			for (const table of this.tables) {
				jsonData.tables[table] = this.exportTableAsJSON(table);
			}
      
			fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
			console.log(`\nJSON export complete: ${filePath}`);
      
		} else if (this.format === 'csv') {
			// Export each table to separate CSV files
			const dirName = `stargate-evolution-${dbType}-csv-${this.timestamp}`;
			const dirPath = path.join(this.outputDir, dirName);
      
			if (!fs.existsSync(dirPath)) {
				fs.mkdirSync(dirPath, { recursive: true });
			}
      
			for (const table of this.tables) {
				const csvContent = this.exportTableAsCSV(table);
				const csvPath = path.join(dirPath, `${table}.csv`);
				fs.writeFileSync(csvPath, csvContent);
			}
      
			console.log(`\nCSV export complete: ${dirPath}`);
		}

		console.log('\nExport summary:');
		for (const table of this.tables) {
			const count = this.getRowCount(table);
			console.log(`  ${table}: ${count} rows`);
		}
	}
}

// Command line interface
function parseArgs(): ExportOptions {
	const args = process.argv.slice(2);
	const options: ExportOptions = {};
  
	for (const arg of args) {
		if (arg === '--local') {
			options.local = true;
		} else if (arg === '--remote') {
			options.remote = true;
		} else if (arg.startsWith('--format=')) {
			const format = arg.split('=')[1] as 'sql' | 'json' | 'csv';
			if (['sql', 'json', 'csv'].includes(format)) {
				options.format = format;
			}
		} else if (arg.startsWith('--tables=')) {
			options.tables = arg.split('=')[1];
		} else if (arg.startsWith('--output=')) {
			options.outputDir = arg.split('=')[1];
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Stargate Evolution Database Export Tool

Usage:
  npx tsx bin/export-all-data.ts [options]

Options:
  --local              Export from local database
  --remote             Export from remote database
  --format=FORMAT      Output format: sql, json, csv (default: sql)
  --tables=TABLE_LIST  Comma-separated list of tables (default: all)
  --output=DIR         Output directory (default: ./exports)
  --help, -h           Show this help message

Examples:
  npx tsx bin/export-all-data.ts --local --format=sql
  npx tsx bin/export-all-data.ts --remote --format=json
  npx tsx bin/export-all-data.ts --local --tables=users,characters --format=csv

Available tables:
  ${ALL_TABLES.join(', ')}
`);
			process.exit(0);
		}
	}
  
	return options;
}

// Main execution
async function main(): Promise<void> {
	const options = parseArgs();
  
	if (!options.local && !options.remote) {
		console.error('Error: Must specify either --local or --remote');
		console.error('Use --help for usage information');
		process.exit(1);
	}
  
	if (options.local && options.remote) {
		console.error('Error: Cannot specify both --local and --remote');
		process.exit(1);
	}
  
	if (options.format && !['sql', 'json', 'csv'].includes(options.format)) {
		console.error('Error: Format must be one of: sql, json, csv');
		process.exit(1);
	}
  
	try {
		const exporter = new DatabaseExporter(options);
		await exporter.export();
	} catch (error) {
		console.error('Export failed:', (error as Error).message);
		process.exit(1);
	}
}

if (require.main === module) {
	main().catch(console.error);
}