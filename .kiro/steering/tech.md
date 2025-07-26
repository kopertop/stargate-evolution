# Technology Stack & Build System

## Package Management
- **Package Manager**: pnpm (v10.11.0+)
- **Workspace Structure**: pnpm workspaces with monorepo architecture
- **Lock File**: Always use committed `pnpm-lock.yaml` for reproducible installs

## Build System
- **Build Tool**: Turbo (v2.5.4+) for monorepo task orchestration
- **Task Runner**: Turbo with TUI interface for development
- **Bundler**: Vite (v6.3.5+) for frontend, Wrangler for backend

## Tech Stack

### Frontend (`packages/frontend`)
- **Framework**: React 18.2+ with TypeScript 5.8+
- **Rendering**: PixiJS 8.9+ for game graphics and animations
- **UI Library**: React Bootstrap 2.10+ with Bootstrap 5.3+
- **Routing**: React Router 7.6+
- **State Management**: React Context API
- **Input Handling**: pixijs-input-devices for gamepad/keyboard/mouse
- **Notifications**: react-toastify
- **Icons**: react-icons
- **Search**: Fuse.js for fuzzy search, react-bootstrap-typeahead

### Backend (`packages/backend`)
- **Runtime**: Cloudflare Workers
- **Framework**: Hono 4.5+ (lightweight web framework)
- **Database**: Cloudflare D1 (SQLite-compatible)
- **Storage**: Cloudflare R2 (S3-compatible object storage)
- **Authentication**: JWT with jose library
- **CLI Tools**: Commander.js for database scripts
- **ID Generation**: ULID for unique identifiers

### Common (`packages/common`)
- **Shared Types**: TypeScript interfaces and Zod schemas
- **Utilities**: Shared utility functions across packages
- **Models**: Game data models and validation schemas

## Development Tools
- **TypeScript**: 5.8+ with strict configuration
- **Linting**: ESLint 9+ with TypeScript, React, and Unicorn plugins
- **Testing**: Vitest 3+ with Cloudflare Workers test pool
- **Code Style**: Tab indentation, single quotes, trailing commas

## Common Commands

### Development
```bash
# Install dependencies
pnpm install

# Start development servers (with TUI)
pnpm start

# Type checking across all packages
pnpm run check

# Linting with auto-fix
pnpm run lint

# Run tests across all packages
pnpm test
```

### Database Management
```bash
# Apply migrations to local D1
pnpm run db:up

# Reset local database
pnpm run db:down

# Initialize database with schema
pnpm run db:init

# Reset and recreate database
pnpm run db:reset

# Generate schema from models
pnpm run db:generate

# Full schema setup (generate + init)
pnpm run db:create-schema
```

### Package-Specific Commands
```bash
# Backend development
pnpm --filter backend run start

# Frontend development  
pnpm --filter frontend run start

# Build frontend for production
pnpm --filter frontend run build

# Deploy backend to Cloudflare Workers
pnpm --filter backend run deploy

# Deploy frontend to Cloudflare Pages
pnpm --filter frontend run deploy
```

### Release Process
```bash
# Full release workflow
pnpm run release

# Deploy all packages
pnpm run deploy
```

## Configuration Files
- **Turbo**: `turbo.json` for task orchestration
- **ESLint**: `eslint.config.mjs` with flat config format
- **Wrangler**: `packages/backend/wrangler.toml` for Cloudflare Workers
- **Vite**: `packages/frontend/vite.config.ts` for frontend build
- **TypeScript**: `tsconfig.json` at root with package-specific configs
