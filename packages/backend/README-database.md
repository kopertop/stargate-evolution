# Database Management with Sequelize + CloudFlare D1

This project uses Sequelize for model definitions and migration generation, with custom scripts to convert them to CloudFlare D1-compatible SQL files.

## Quick Start

### Creating the Database Schema

From the project root:

```bash
# Reset and create a fresh database
pnpm db:reset

# Initialize database with migrations (apply all SQL files)
pnpm db:init
```

### Available Commands

#### Root Level Scripts (from project root)

- `pnpm db:init` - Apply all migration files to D1 database
- `pnpm db:reset` - Completely reset the database (delete + recreate)
- `pnpm db:generate-migration <name>` - Generate a new Sequelize migration
- `pnpm db:convert-migrations` - Convert Sequelize migrations to D1 SQL
- `pnpm db:create-schema` - Full workflow: generate → convert → apply

#### Backend Package Scripts (from packages/backend)

- `npm run db:init [database-name]` - Apply migrations (default: stargate-game)
- `npm run db:reset [database-name]` - Reset database with confirmation
- `npm run db:generate-migration <name>` - Generate Sequelize migration
- `npm run db:convert-migrations` - Convert to D1 SQL format

## Workflow

### 1. Define Models

Create Sequelize models in `src/models/` using TypeScript and decorators:

```typescript
@Table({ tableName: 'example', timestamps: true })
export class Example extends Model {
	@Column({ type: DataType.STRING, primaryKey: true })
	declare id: string;

	@Column(DataType.STRING)
	declare name: string;
}
```

### 2. Generate Migration

```bash
pnpm db:generate-migration create-example-table
```

This creates a file in `migrations-generated/` with Sequelize migration code.

### 3. Convert to D1 SQL

```bash
pnpm db:convert-migrations
```

This creates numbered SQL files in `migrations/` directory that are D1-compatible.

**Note:** The conversion is currently template-based. You need to manually edit the generated SQL files to add the actual CREATE TABLE statements.

### 4. Apply Migrations

```bash
pnpm db:init
```

This applies all SQL migration files to your D1 database in order.

## Directory Structure

```
packages/backend/
├── .sequelizerc                 # Sequelize CLI config
├── sequelize-config.js          # Database connection config
├── migrations/                  # D1-compatible SQL files (numbered)
├── migrations-generated/        # Generated Sequelize migrations (JS)
├── bin/
│   ├── generate-d1-migrations.ts  # Conversion script
│   ├── init-db.ts               # Apply migrations script
│   └── reset-db.ts              # Database reset script
└── src/models/                  # Sequelize model definitions
```

## Migration File Naming

- Sequelize: `YYYYMMDDHHMMSS-description.js`
- D1 SQL: `001_description.sql`, `002_next_migration.sql`, etc.

## Important Notes

1. **Manual Conversion Required**: The generated D1 SQL files are templates. You must manually add the actual SQL statements.

2. **ID Strategy**: Use TEXT primary keys with ULID generation for CloudFlare D1 compatibility.

3. **Timestamps**: Use INTEGER timestamps with `strftime('%s','now')` for D1.

4. **Foreign Keys**: Ensure proper CASCADE behavior for related tables.

## Example Migration Conversion

**Generated Sequelize Migration:**
```javascript
await queryInterface.createTable('Users', {
  id: { type: Sequelize.STRING, primaryKey: true },
  name: { type: Sequelize.STRING, allowNull: false }
});
```

**Manual D1 SQL:**
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  updated_at INTEGER DEFAULT (strftime('%s','now'))
);
```

## Troubleshooting

- **Database not found**: Run `pnpm db:reset` to create it
- **Migration failed**: Check SQL syntax in migration files
- **Permission denied**: Ensure wrangler is configured with proper credentials 
