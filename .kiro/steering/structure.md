# Project Structure & Organization

## Monorepo Architecture
This is a pnpm workspace monorepo with three main packages following domain-driven separation.

## Root Directory Structure
```
├── packages/                 # Workspace packages
│   ├── backend/             # Cloudflare Workers API
│   ├── frontend/            # React web application  
│   └── common/              # Shared types and utilities
├── .kiro/                   # Kiro AI assistant configuration
├── .cursor/                 # Cursor IDE configuration
├── .taskmaster/             # Task management system
├── docs/                    # Project documentation
└── [config files]          # Root-level configuration
```

## Package Structure

### Backend (`packages/backend/`)
```
src/
├── hono/                    # Hono web framework setup
│   ├── app.ts              # Main application setup
│   ├── middleware/         # Authentication & admin middleware
│   └── routes/             # API route handlers
├── templates/              # Game template managers
├── types.ts                # Backend-specific types
├── auth-types.ts           # Authentication types
├── openapi.ts              # OpenAPI schema generation
└── server.ts               # Cloudflare Workers entry point

migrations/                 # D1 database migrations
bin/                        # CLI scripts for database management
__tests__/                  # Backend test files
```

### Frontend (`packages/frontend/`)
```
src/
├── components/             # Reusable React components
│   └── __tests__/         # Component tests
├── pages/                  # Route-level page components
│   └── admin/             # Admin panel pages
├── services/               # API clients and business logic
│   └── __tests__/         # Service tests
├── contexts/               # React Context providers
├── auth/                   # Authentication utilities
├── utils/                  # Frontend utility functions
├── types/                  # Frontend-specific types
├── constants/              # Application constants
├── app.tsx                 # Main App component
└── main.tsx                # Application entry point

public/                     # Static assets
├── images/                 # Game images and sprites
│   ├── doors/             # Door state images
│   ├── furniture/         # Furniture sprites
│   ├── people/            # Character sprites
│   └── rooms/             # Room background images
├── sounds/                 # Audio files
└── assets/                 # App icons and manifests
```

### Common (`packages/common/`)
```
src/
├── models/                 # Shared data models
│   ├── character.ts       # Character-related types
│   ├── game.ts            # Game session types
│   ├── room-template.ts   # Room and layout types
│   ├── technology-*.ts    # Technology system types
│   └── [other models]     # Additional game models
├── index.ts                # Package exports
└── [utilities]             # Shared utility functions
```

## Naming Conventions

### Files & Directories
- **kebab-case**: All files and directories use kebab-case
- **Component Files**: React components use kebab-case (e.g., `room-builder.tsx`)
- **Test Files**: Use `.test.ts` or `.spec.ts` suffix
- **Type Files**: End with `.ts` for pure types, include in component files when component-specific

### Code Style
- **Variables/Functions**: camelCase
- **Types/Interfaces**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Database Tables**: snake_case (following SQL conventions)

## Import Organization
Imports should be organized in this order with blank lines between groups:
1. Node.js built-ins
2. External libraries
3. Internal packages (`@stargate/common`)
4. Relative imports (parent, sibling, index)

## Key Architectural Patterns

### Backend Patterns
- **Route-based Organization**: API routes grouped by domain (`/api/games`, `/api/admin`)
- **Middleware Chain**: Authentication and admin middleware applied at route level
- **Template Managers**: Centralized game template logic in `src/templates/`
- **Migration-based Schema**: Database schema managed through SQL migrations

### Frontend Patterns
- **Context-based State**: React Context for global state management
- **Service Layer**: Business logic separated into service classes
- **Component Composition**: Reusable components with clear responsibilities
- **Layer-based Rendering**: Game rendering split into logical layers (background, rooms, NPCs, etc.)

### Shared Patterns
- **Zod Validation**: Runtime type validation using Zod schemas
- **ULID Identifiers**: Consistent ID generation across the application
- **Null Safety**: Utilities for handling null/undefined values consistently

## Configuration Files Location
- **Root Level**: Workspace-wide configuration (ESLint, Turbo, TypeScript)
- **Package Level**: Package-specific configuration (Vite, Wrangler, package.json)
- **Environment**: `.env` files at root and package levels for environment variables
