# Database Sync Script

This script allows you to sync data from the production D1 database to your local development database for testing purposes.

## Usage

### Basic Sync (All Tables)
```bash
# Sync all data from production to local
pnpm run sync:from-remote

# Preview what would be synced (dry run)
pnpm run sync:dry-run
```

### Specific Tables
```bash
# Sync only specific tables
pnpm run sync:from-remote --tables users,characters,game_sessions

# Dry run for specific tables
pnpm run sync:dry-run --tables users,rooms
```

### Verbose Output
```bash
# Get detailed logging
pnpm run sync:from-remote --verbose
```

## What It Does

1. **Exports** data from the remote D1 database using `wrangler d1 execute --remote`
2. **Converts** the JSON output to SQL INSERT statements
3. **Clears** existing local data for each table
4. **Imports** the new data into local database using `wrangler d1 execute --local`
5. **Validates** that row counts match between remote and local

## Tables Synced (Default Order)

The script syncs tables in dependency order to handle foreign key relationships.
Remote table names are mapped to local table names:

- `users` → `users`
- `galaxy_templates` → `galaxies`
- `star_system_templates` → `star_systems`
- `planet_templates` → `planets`
- `room_templates` → `room_templates`
- `door_templates` → `door_templates`
- `room_furniture` → `room_furniture`
- `room_technology` → `room_technology`
- `person_templates` → `person_templates`
- `race_templates` → `race_templates`
- `technology_templates` → `technology_templates`

**Note**: Local-only tables (`characters`, `game_sessions`, `ship_layouts`) are not synced as they don't exist in the remote database.

## Prerequisites

- Wrangler CLI configured with access to both local and remote databases
- `tsx` package installed (already in dev dependencies)
- Local D1 database initialized (`pnpm run db:init`)

## Notes

- **Destructive Operation**: This completely replaces local data with remote data
- **No Backup**: Local data is deleted before import - make sure you don't need it
- **Temp Files**: Creates `.temp-sync/` directory during operation (cleaned up automatically)
- **Rate Limits**: Large tables may hit Cloudflare rate limits - use specific table selection if needed

## Example Output

```
🔄 Stargate Evolution - Remote to Local Database Sync

[SYNC] Tables to sync: users,characters,game_sessions

📤 Exporting data from remote database...
[SYNC] Exporting users from remote...
  ✅ Exported 15 rows from users
[SYNC] Exporting characters from remote...
  ✅ Exported 8 rows from characters

📥 Importing data to local database...
[SYNC] Importing users data to local database...
  ✅ Imported users data successfully

✅ Validating sync results...
  ✅ users: 15 rows (matched)
  ✅ characters: 8 rows (matched)

📊 Sync Summary: 2/2 tables synced successfully
🎉 All tables synced successfully!
```

## Troubleshooting

- **Wrangler Auth**: Make sure you're logged in with `wrangler auth login`
- **Database Access**: Ensure you have access to the remote `stargate-game` database
- **Local Database**: Run `pnpm run db:init` if local database doesn't exist
- **Large Tables**: Use `--tables` flag to sync smaller subsets if timing out