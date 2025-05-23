# Database Setup: Sequelize + CloudFlare D1 (Auto-Generated)

## Overview

This project uses a **fully automated** approach for database management:

- **Sequelize models** for TypeScript type safety and ORM functionality
- **Auto-generation script** that reads Sequelize models and creates CloudFlare D1 SQL
- **CloudFlare D1** as the actual database runtime

**No manual conversion required!** The system automatically generates complete D1 SQL from your Sequelize models.

## 🚀 Quick Start

### 1. Reset and Initialize Database

```bash
# From project root - reset database (destroys all data!)
pnpm db:reset

# Generate schema from models and apply to D1
pnpm db:create-schema
```

### 2. Update Schema After Model Changes

```bash
# Regenerate schema from updated models
pnpm db:generate

# Apply the new schema
pnpm db:init
```

## 📜 Available Scripts

### Root Level (run from project root)

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Auto-generate D1 SQL from Sequelize models |
| `pnpm db:init` | Apply migration files to D1 database |
| `pnpm db:reset` | Completely reset database (delete + recreate) |
| `pnpm db:create-schema` | Full workflow: generate + apply |

### Backend Package Level (from packages/backend)

| Command | Description |
|---------|-------------|
| `npm run db:generate` | Auto-generate D1 SQL from models |
| `npm run db:init [db-name]` | Apply migrations (default: stargate-game) |
| `npm run db:reset [db-name]` | Reset database with confirmation prompt |
| `npm run db:create-schema` | Generate and apply in one command |

## 🔄 Development Workflow

### Adding a New Table

1. **Create the Sequelize Model**:
   ```typescript
   // packages/backend/src/models/user.ts
   @Table({ tableName: 'users', timestamps: true })
   export class User extends Model {
     @Column({ type: DataType.STRING, primaryKey: true })
     declare id: string;

     @Column(DataType.STRING)
     declare email: string;

     @ForeignKey(() => Game)
     @Column(DataType.STRING)
     declare gameId: string;
   }
   ```

2. **Regenerate and Apply Schema**:
   ```bash
   pnpm db:create-schema
   ```

That's it! The system automatically:
- Parses your Sequelize model decorators
- Converts data types to D1-compatible SQL types
- Generates proper foreign key relationships
- Creates indexes for foreign keys and timestamps
- Applies the schema to your D1 database

### Modifying Existing Tables

1. Update your Sequelize model
2. Run `pnpm db:create-schema`

Since the database is assumed to be blank on each migration, you can freely modify your models.

## 📁 File Structure

```
packages/backend/
├── bin/
│   ├── generate-d1-from-models.ts  # Auto-generation script
│   ├── init-db.ts                  # Apply migrations script  
│   └── reset-db.ts                 # Database reset script
├── migrations/
│   └── 001_auto_generated_schema.sql  # Generated D1 schema (don't edit!)
└── src/models/                     # Your Sequelize model definitions
    ├── user.ts
    ├── game.ts
    └── ...
```

## 🤖 Auto-Generation Features

### Automatic Type Mapping

| Sequelize Type | D1 SQL Type |
|----------------|-------------|
| `DataType.STRING` | `TEXT` |
| `DataType.INTEGER` | `INTEGER` |
| `DataType.FLOAT` | `REAL` |
| `DataType.BOOLEAN` | `INTEGER` |
| `DataType.DATE` | `INTEGER` |
| `DataType.JSON` | `TEXT` |

### Automatic Features

- **Primary Keys**: Converted to `TEXT PRIMARY KEY`
- **Foreign Keys**: Automatically detected and mapped with `CASCADE DELETE`
- **Timestamps**: `created_at`/`updated_at` get automatic defaults
- **Indexes**: Auto-created for foreign keys and timestamp columns
- **Table Ordering**: Tables sorted to handle foreign key dependencies

### Example Auto-Generated SQL

```sql
-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  game_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_users_game_id ON users(game_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
```

## ⚠️ Important Notes

### What Gets Auto-Generated

- ✅ **Table structure** from `@Table({ tableName: 'name' })`
- ✅ **Columns** from `@Column()` decorators  
- ✅ **Primary keys** from `primaryKey: true`
- ✅ **Foreign keys** from `@ForeignKey(() => Model)`
- ✅ **Data types** automatically mapped to D1
- ✅ **Indexes** for performance optimization
- ✅ **Timestamps** with proper D1 defaults

### Supported Model Patterns

```typescript
// Basic column
@Column(DataType.STRING)
declare name: string;

// Primary key
@Column({ type: DataType.STRING, primaryKey: true })
declare id: string;

// Foreign key
@ForeignKey(() => Game)
@Column(DataType.STRING)
declare gameId: string;

// With constraints
@Column({ type: DataType.STRING, allowNull: false, unique: true })
declare email: string;
```

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Database not found | Run `pnpm db:reset` to create it |
| Model not detected | Check `@Table({ tableName: 'name' })` exists |
| Foreign key wrong | Verify `@ForeignKey(() => Model)` syntax |
| Column missing | Check `@Column()` decorator format |
| Permission denied | Ensure wrangler is authenticated: `wrangler auth login` |

## 🎯 Migration-Free Development

Since this system assumes a blank database:

- **No migration files to maintain**
- **No data preservation needed** 
- **Free to restructure models** without migration complexity
- **Schema matches models exactly** at all times
- **Perfect for development and testing**

The auto-generated schema is always a complete, fresh representation of your current Sequelize models.

For production deployments with data preservation, you would typically export data before schema changes and re-import after.
