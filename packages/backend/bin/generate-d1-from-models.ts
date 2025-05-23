#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

import { Sequelize, DataTypes } from 'sequelize';

const MODELS_DIR = path.join(__dirname, '../src/models');
const OUTPUT_FILE = path.join(__dirname, '../migrations/001_auto_generated_schema.sql');

interface TableInfo {
	tableName: string;
	columns: ColumnInfo[];
	foreignKeys: ForeignKeyInfo[];
	indexes: IndexInfo[];
}

interface ColumnInfo {
	name: string;
	type: string;
	allowNull: boolean;
	primaryKey: boolean;
	unique: boolean;
	defaultValue?: string;
}

interface ForeignKeyInfo {
	column: string;
	referencedTable: string;
	referencedColumn: string;
	onDelete?: string;
}

interface IndexInfo {
	name: string;
	columns: string[];
	unique: boolean;
}

// Convert PascalCase model name to snake_case table name
function modelNameToTableName(modelName: string): string {
	const tableNameMap: Record<string, string> = {
		'Game': 'games',
		'Galaxy': 'galaxies',
		'StarSystem': 'star_systems',
		'Star': 'stars',
		'Planet': 'planets',
		'Stargate': 'stargates',
		'CheveronSymbol': 'chevrons',
		'Technology': 'technology',
		'Race': 'races',
		'Ship': 'ships',
		'Room': 'rooms',
		'Person': 'people',
		'DestinyStatus': 'destiny_status',
	};

	return tableNameMap[modelName] || modelName.toLowerCase().replace(/([A-Z])/g, '_$1').substring(1);
}

// Map Sequelize types to D1 SQL types
function mapSequelizeTypeToD1(sequelizeType: string): string {
	const typeMap: Record<string, string> = {
		'STRING': 'TEXT',
		'TEXT': 'TEXT',
		'INTEGER': 'INTEGER',
		'BIGINT': 'INTEGER',
		'FLOAT': 'REAL',
		'REAL': 'REAL',
		'DOUBLE': 'REAL',
		'DECIMAL': 'REAL',
		'BOOLEAN': 'INTEGER',
		'DATE': 'INTEGER',
		'DATEONLY': 'TEXT',
		'TIME': 'TEXT',
		'JSON': 'TEXT',
		'JSONB': 'TEXT',
		'BLOB': 'BLOB',
		'UUID': 'TEXT',
		'UUIDV1': 'TEXT',
		'UUIDV4': 'TEXT',
	};

	// Handle complex types like STRING(255)
	const baseType = sequelizeType.split('(')[0];
	return typeMap[baseType] || 'TEXT';
}

// Parse a Sequelize model file to extract table information
function parseModelFile(filePath: string): TableInfo | null {
	const content = fs.readFileSync(filePath, 'utf-8');

	// Extract table name from @Table decorator
	const tableMatch = content.match(/@Table\s*\(\s*\{\s*tableName:\s*['"`]([^'"`]+)['"`]/);
	if (!tableMatch) {
		console.warn(`Could not find tableName in ${filePath}`);
		return null;
	}

	const tableName = tableMatch[1];
	const columns: ColumnInfo[] = [];
	const foreignKeys: ForeignKeyInfo[] = [];

	// Extract columns - improved regex to handle various @Column formats
	const columnPatterns = [
		// @Column({ type: DataType.STRING, primaryKey: true })
		/@Column\s*\(\s*\{([^}]+)\}\s*\)\s*declare\s+(\w+):\s*([^;]+);/g,
		// @Column(DataType.STRING)
		/@Column\s*\(\s*(DataType\.\w+(?:\([^)]*\))?)\s*\)\s*declare\s+(\w+):\s*([^;]+);/g,
		// @Column({ type: DataType.STRING })
		/@Column\s*\(\s*\{\s*type:\s*(DataType\.\w+(?:\([^)]*\))?)\s*\}\s*\)\s*declare\s+(\w+):\s*([^;]+);/g,
	];

	for (const regex of columnPatterns) {
		let match;
		while ((match = regex.exec(content)) !== null) {
			let columnConfig: string;
			let columnName: string;
			let columnType: string;

			if (match.length === 4) {
				[, columnConfig, columnName, columnType] = match;
			} else {
				// Handle DataType.STRING format
				[, columnConfig, columnName, columnType] = match;
			}

			// Skip if we already have this column
			if (columns.some(col => col.name === columnName)) {
				continue;
			}

			// Parse column configuration
			let type = 'TEXT';
			let allowNull = true;
			let primaryKey = false;
			let unique = false;
			let defaultValue: string | undefined;

			// Extract DataType
			const typeMatch = columnConfig.match(/DataType\.(\w+)/);
			if (typeMatch) {
				type = mapSequelizeTypeToD1(typeMatch[1]);
			}

			// Check for primary key
			if (columnConfig.includes('primaryKey: true')) {
				primaryKey = true;
				allowNull = false;
			}

			// Check for allowNull
			if (columnConfig.includes('allowNull: false')) {
				allowNull = false;
			}

			// Check for unique
			if (columnConfig.includes('unique: true')) {
				unique = true;
			}

			// Check for default value
			const defaultMatch = columnConfig.match(/defaultValue:\s*([^,}]+)/);
			if (defaultMatch) {
				defaultValue = defaultMatch[1].trim();
			}

			columns.push({
				name: columnName,
				type,
				allowNull,
				primaryKey,
				unique,
				defaultValue,
			});
		}
	}

	// Extract foreign keys - improved regex
	const fkRegex = /@ForeignKey\s*\(\s*\(\)\s*=>\s*(\w+)\s*\)[\s\S]*?@Column[\s\S]*?declare\s+(\w+):\s*string;/g;
	let fkMatch;
	while ((fkMatch = fkRegex.exec(content)) !== null) {
		const [, referencedModel, columnName] = fkMatch;
		const referencedTable = modelNameToTableName(referencedModel);

		foreignKeys.push({
			column: columnName,
			referencedTable,
			referencedColumn: 'id', // Assume 'id' as primary key
			onDelete: 'CASCADE',
		});
	}

	return {
		tableName,
		columns,
		foreignKeys,
		indexes: [], // We'll add basic indexes automatically
	};
}

// Generate D1 SQL for a table
function generateTableSQL(table: TableInfo): string {
	let sql = `-- Table: ${table.tableName}\n`;
	sql += `CREATE TABLE IF NOT EXISTS ${table.tableName} (\n`;

	// Columns
	const columnDefinitions = table.columns.map(col => {
		let def = `  ${col.name} ${col.type}`;

		if (col.primaryKey) {
			def += ' PRIMARY KEY';
		}

		if (!col.allowNull && !col.primaryKey) {
			def += ' NOT NULL';
		}

		if (col.unique && !col.primaryKey) {
			def += ' UNIQUE';
		}

		if (col.defaultValue) {
			if (col.defaultValue.includes('strftime') || col.defaultValue.includes('now')) {
				def += ` DEFAULT (${col.defaultValue})`;
			} else if (col.type === 'TEXT') {
				def += ` DEFAULT '${col.defaultValue}'`;
			} else {
				def += ` DEFAULT ${col.defaultValue}`;
			}
		} else if (col.name === 'created_at' || col.name === 'updated_at' || col.name === 'createdAt') {
			def += ' DEFAULT (strftime(\'%s\',\'now\'))';
		}

		return def;
	});

	// Add foreign keys
	const fkDefinitions = table.foreignKeys.map(fk =>
		`  FOREIGN KEY (${fk.column}) REFERENCES ${fk.referencedTable}(${fk.referencedColumn}) ON DELETE ${fk.onDelete}`,
	);

	sql += [...columnDefinitions, ...fkDefinitions].join(',\n');
	sql += '\n);\n\n';

	// Add indexes for foreign keys and common columns
	table.foreignKeys.forEach(fk => {
		sql += `CREATE INDEX IF NOT EXISTS idx_${table.tableName}_${fk.column} ON ${table.tableName}(${fk.column});\n`;
	});

	// Add timestamp indexes if they exist
	if (table.columns.some(col => col.name === 'created_at' || col.name === 'createdAt')) {
		const timestampCol = table.columns.find(col => col.name === 'created_at' || col.name === 'createdAt')?.name;
		sql += `CREATE INDEX IF NOT EXISTS idx_${table.tableName}_${timestampCol} ON ${table.tableName}(${timestampCol});\n`;
	}

	sql += '\n';
	return sql;
}

// Main function
function main() {
	console.log('🔄 Generating D1 schema from Sequelize models...');

	if (!fs.existsSync(MODELS_DIR)) {
		console.error('❌ Models directory not found:', MODELS_DIR);
		process.exit(1);
	}

	const modelFiles = fs.readdirSync(MODELS_DIR)
		.filter(file => file.endsWith('.ts') && !file.includes('__tests__') && !file.includes('.spec.') && !file.includes('.test.'))
		.map(file => path.join(MODELS_DIR, file));

	if (modelFiles.length === 0) {
		console.error('❌ No model files found in:', MODELS_DIR);
		process.exit(1);
	}

	console.log(`📋 Found ${modelFiles.length} model files`);

	const tables: TableInfo[] = [];

	// Parse all model files
	for (const modelFile of modelFiles) {
		console.log(`📖 Parsing: ${path.basename(modelFile)}`);
		const tableInfo = parseModelFile(modelFile);
		if (tableInfo) {
			tables.push(tableInfo);
		}
	}

	if (tables.length === 0) {
		console.error('❌ No valid tables found in model files');
		process.exit(1);
	}

	console.log(`✅ Parsed ${tables.length} tables`);

	// Sort tables to handle dependencies (put tables without foreign keys first)
	const sortedTables = tables.sort((a, b) => {
		if (a.foreignKeys.length === 0 && b.foreignKeys.length > 0) return -1;
		if (a.foreignKeys.length > 0 && b.foreignKeys.length === 0) return 1;
		return 0;
	});

	// Generate SQL
	let fullSQL = '-- Auto-generated D1 schema from Sequelize models\n';
	fullSQL += `-- Generated at: ${new Date().toISOString()}\n`;
	fullSQL += '-- WARNING: This file is auto-generated. Do not edit manually.\n\n';

	// Add users table first if it doesn't exist (required for foreign keys)
	if (!tables.some(t => t.tableName === 'users')) {
		fullSQL += '-- Users table (required for foreign keys)\n';
		fullSQL += 'CREATE TABLE IF NOT EXISTS users (\n';
		fullSQL += '  id TEXT PRIMARY KEY,\n';
		fullSQL += '  email TEXT NOT NULL UNIQUE,\n';
		fullSQL += '  name TEXT NOT NULL,\n';
		fullSQL += '  image TEXT,\n';
		fullSQL += '  created_at INTEGER DEFAULT (strftime(\'%s\',\'now\')),\n';
		fullSQL += '  updated_at INTEGER DEFAULT (strftime(\'%s\',\'now\'))\n';
		fullSQL += ');\n\n';
		fullSQL += 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);\n\n';
	}

	for (const table of sortedTables) {
		fullSQL += generateTableSQL(table);
	}

	// Ensure migrations directory exists
	const migrationsDir = path.dirname(OUTPUT_FILE);
	if (!fs.existsSync(migrationsDir)) {
		fs.mkdirSync(migrationsDir, { recursive: true });
	}

	// Write the file
	fs.writeFileSync(OUTPUT_FILE, fullSQL);

	console.log('✅ Generated D1 schema file:', OUTPUT_FILE);
	console.log('📊 Summary:');
	console.log(`   - ${tables.length} tables processed`);
	console.log(`   - ${tables.reduce((acc, t) => acc + t.columns.length, 0)} columns total`);
	console.log(`   - ${tables.reduce((acc, t) => acc + t.foreignKeys.length, 0)} foreign keys`);
	console.log('');
	console.log('🚀 Run `pnpm db:init` to apply the schema to your D1 database');
}

if (require.main === module) {
	main();
}
