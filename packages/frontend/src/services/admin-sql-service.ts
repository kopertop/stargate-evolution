import { apiClient } from './api-client';

export interface SqlQueryResult {
	success: boolean;
	isReadOnly: boolean;
	result: any;
	affectedRows: number;
	executedAt: string;
	executedBy: string;
	error?: string;
	details?: string;
}

export interface DatabaseSchema {
	tables: {
		name: string;
		type: 'table' | 'view';
		sql: string;
		columns?: {
			cid: number;
			name: string;
			type: string;
			notnull: number;
			dflt_value: any;
			pk: number;
		}[];
		rowCount?: number;
	}[];
	indexes: {
		name: string;
		tbl_name: string;
		sql: string;
	}[];
	generatedAt: string;
	requestedBy: string;
}

export interface TableData {
	tableName: string;
	columns: {
		cid: number;
		name: string;
		type: string;
		notnull: number;
		dflt_value: any;
		pk: number;
	}[];
	data: any[];
	pagination: {
		limit: number;
		offset: number;
		totalRows: number;
		hasMore: boolean;
	};
	generatedAt: string;
	requestedBy: string;
}

export class AdminSqlService {
	/**
	 * Execute an arbitrary SQL query
	 */
	static async executeQuery(query: string, params: any[] = []): Promise<SqlQueryResult> {
		try {
			const response = await apiClient.post('/api/admin/sql/query', {
				query,
				params,
			}, true); // authenticated

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		} catch (error) {
			console.error('[ADMIN-SQL-SERVICE] Query execution failed:', error);
			throw error;
		}
	}

	/**
	 * Get database schema information
	 */
	static async getDatabaseSchema(): Promise<DatabaseSchema> {
		try {
			const response = await apiClient.get('/api/admin/sql/schema', true); // authenticated

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		} catch (error) {
			console.error('[ADMIN-SQL-SERVICE] Schema fetch failed:', error);
			throw error;
		}
	}

	/**
	 * Get table data with pagination
	 */
	static async getTableData(tableName: string, limit: number = 100, offset: number = 0): Promise<TableData> {
		try {
			const response = await apiClient.get(
				`/api/admin/sql/table/${encodeURIComponent(tableName)}?limit=${limit}&offset=${offset}`,
				true, // authenticated
			);

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		} catch (error) {
			console.error('[ADMIN-SQL-SERVICE] Table data fetch failed:', error);
			throw error;
		}
	}

	/**
	 * Get query history (for audit purposes)
	 */
	static async getQueryHistory(): Promise<any> {
		try {
			const response = await apiClient.get('/api/admin/sql/history', true); // authenticated

			if (response.error) {
				throw new Error(response.error);
			}

			return response.data;
		} catch (error) {
			console.error('[ADMIN-SQL-SERVICE] Query history fetch failed:', error);
			throw error;
		}
	}

	/**
	 * Helper method to validate SQL query safety
	 */
	static validateQuery(query: string): { isValid: boolean; warnings: string[]; errors: string[] } {
		const warnings: string[] = [];
		const errors: string[] = [];
		const trimmedQuery = query.trim().toLowerCase();

		// Check for potentially dangerous operations
		const dangerousOperations = [
			'drop table',
			'drop database',
			'truncate',
			'alter table',
			'create table',
			'create index',
			'drop index',
		];

		const destructiveOperations = [
			'delete from',
			'update ',
			'insert into',
		];

		// Check for dangerous operations
		for (const operation of dangerousOperations) {
			if (trimmedQuery.includes(operation)) {
				warnings.push(`Warning: Query contains potentially dangerous operation: ${operation.toUpperCase()}`);
			}
		}

		// Check for destructive operations
		for (const operation of destructiveOperations) {
			if (trimmedQuery.includes(operation)) {
				warnings.push(`Warning: Query contains data-modifying operation: ${operation.toUpperCase()}`);
			}
		}

		// Basic SQL injection checks
		const suspiciousPatterns = [
			/;\s*(drop|delete|update|insert|create|alter)\s/i,
			/union\s+select/i,
			/\/\*.*\*\//,
			/--.*$/m,
		];

		for (const pattern of suspiciousPatterns) {
			if (pattern.test(query)) {
				warnings.push('Warning: Query contains potentially suspicious patterns');
				break;
			}
		}

		// Check if query is empty
		if (!query.trim()) {
			errors.push('Query cannot be empty');
		}

		return {
			isValid: errors.length === 0,
			warnings,
			errors,
		};
	}

	/**
	 * Common safe queries for quick access
	 */
	static getSampleQueries(): { name: string; description: string; query: string }[] {
		return [
			{
				name: 'List all tables',
				description: 'Show all tables in the database',
				query: 'SELECT name, type, sql FROM sqlite_master WHERE type IN (\'table\', \'view\') ORDER BY name;',
			},
			{
				name: 'User statistics',
				description: 'Count of users by admin status',
				query: 'SELECT is_admin, COUNT(*) as count FROM users GROUP BY is_admin;',
			},
			{
				name: 'Recent users',
				description: 'Show 10 most recently created users',
				query: 'SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC LIMIT 10;',
			},
			{
				name: 'Saved games count',
				description: 'Count saved games by user',
				query: 'SELECT user_id, COUNT(*) as game_count FROM saved_games GROUP BY user_id ORDER BY game_count DESC;',
			},
			{
				name: 'Database size info',
				description: 'Show table sizes and row counts',
				query: `SELECT
					name as table_name,
					(SELECT COUNT(*) FROM sqlite_master WHERE name = m.name) as row_count
				FROM sqlite_master m
				WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
				ORDER BY name;`,
			},
		];
	}
}
