# Stargate Evolution: Exploration & Discovery

A web-based, top-down, turn-based game based on the Stargate universe, focusing on exploration, resource management, and base building, powered by React Three Fiber.

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

## \ud83d\ude80 Deploying the Frontend to Cloudflare Pages

1. Build the frontend:
   ```sh
   pnpm --filter frontend run build
   ```
2. Deploy with Wrangler:
   ```sh
   pnpm --filter frontend run deploy
   ```
