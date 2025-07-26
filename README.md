# Stargate Evolution: Exploration & Discovery

A web-based, top-down, turn-based game based on the Stargate universe, focusing on exploration, resource management, and base building, powered by React Three Fiber.

This repository uses **pnpm** workspaces for dependency management. Install packages with `pnpm install` and rely on the committed `pnpm-lock.yaml` for reproducible installs.

## Game Features

- **Planetary Exploration**: Discover new planets through the Stargate network
- **Base Building**: Establish and upgrade bases on colonized planets
- **Resource Management**: Collect and manage various resources
- **Trade System**: Create trade routes between planets with stargates
- **Combat**: Defend against enemy factions like the Goa'uld
- **Research**: Discover new technologies to advance your capabilities
- **Cross-Platform Support**: Play on web and iOS devices with controller, keyboard, and mouse input
- **Turn-Based Gameplay**: Engage in strategic exploration and combat with a turn-based system.
- **Top-Down Perspective**: Experience the game from a classic tabletop-style viewpoint.
- **MCP Integration**: Model Context Protocol server for Claude AI integration

## 🗄️ Setting up the D1 Database (Cloudflare)

1. **Install Wrangler CLI** (if not already):
   ```sh
   pnpm install -g wrangler
   ```

2. **Create the D1 database:**
   ```sh
   wrangler d1 create galaxies
   ```
   - Copy the database ID from the output and paste it into `packages/backend/wrangler.toml` under `database_id` for the `DB` binding.

3. **Run the migration:**
   ```sh
   pnpm run db:up
   ```

4. **Start the dev server:**
   ```sh
   pnpm start
   ```

## 🤖 MCP Integration (Model Context Protocol)

Stargate Evolution includes an MCP server that allows Claude AI to interact with the game backend. This enables Claude to query game data, retrieve templates, and perform administrative operations.

### Authentication Options

The MCP server supports two authentication methods for admin users:

1. **API Keys (Recommended)**: Persistent keys that never expire
2. **JWT Tokens**: Short-lived tokens (15 minutes) for temporary access

### Setting up Claude Code MCP

1. **Sign in as an admin user** in the game interface
2. **Click "MCP Auth"** button to access authentication options
3. **Generate an API Key** (recommended) or use the JWT token
4. **Copy the Claude MCP command** provided in the modal
5. **Run the command** in your terminal to add the MCP server to Claude Code

Example MCP command:
```bash
claude mcp add --transport http stargate-evolution https://your-domain.com/api/mcp --header "Authorization: Bearer your-api-key-here"
```

### Available MCP Tools

- `greet` - Test connectivity with a greeting
- `get-game-sessions` - List active game sessions
- `get-templates` - Query game templates by type
- `system-status` - Get system status and database health
- `delete-game-session` - Delete game sessions (admin only)

### API Key Management

Admin users can manage their API keys through the web interface:

- **Generate**: Create a new API key (replaces any existing key)
- **Regenerate**: Create a new API key (invalidates the previous one)
- **Delete**: Remove the API key (revokes all access)

API keys are stored securely in the database and are prefixed with `sk-` for identification.

## \ud83d\ude80 Deploying the Frontend to Cloudflare Pages

1. Build the frontend:
   ```sh
   pnpm --filter frontend run build
   ```
2. Deploy with Wrangler:
   ```sh
   pnpm --filter frontend run deploy
   ```
