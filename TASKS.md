# Stargate Evolution: Development Tasks

## ✅ Completed
- [x] Monorepo structure with pnpm workspaces (`packages/frontend`, `packages/backend`, `packages/common`)
- [x] Strict TypeScript setup in all packages
- [x] PixiJS v8+ integrated in frontend (Vite, TypeScript, canvas renders)
- [x] Cloudflare Worker backend scaffolded (Wrangler, TypeScript)
- [x] Shared types package (`common`)
- [x] ESLint/Prettier configured monorepo-wide
- [x] Unified dev workflow: `pnpm start` runs both dev servers in parallel
- [x] VSCode/Cursor tasks and launch configs for dev/debug
- [x] Core Game Loop: Implement `Game` class, update/render cycle, and state management
- [x] Ship Controls: WASD/arrow keys to move ship, basic camera/viewport
- [x] Starfield/Background: Simple procedural or static starfield
- [x] Dynamic space background component with star system visuals
- [x] Backend API: `/hello` endpoint, test frontend-backend connectivity
- [x] Google Chrome-aware "Continue with Google" login (detects logged-in Google account and offers one-click login with visible email, session persistence, backend validation/refresh)
- [x] Auto-Generated D1 Migration System: Complete migration from Sequelize to CloudFlare D1 with auto-generated schema from TypeScript models, full test coverage, and working create/get game endpoints
- [x] **Frontend-First Database Architecture**: Created `packages/db` with WatermelonDB schema, models, and GameService for offline-first game creation
- [x] Frontend deployment configured with Wrangler for Cloudflare Pages
- [x] Fixed room creation null handling bug in `use-game-service`
- [x] Refactored room creation with `roomTemplateToEvent` utility
- [x] Admin portal supports multiple floors with dropdown and elevator room type
- [x] Fullscreen button hides in iOS PWA mode using display-mode detection

## 🚧 In Progress / Next Up
- [ ] **Convert Frontend to React + PixiJS**: Migrate from vanilla JS to React components with PixiJS integration
- [ ]    - Setup React with Vite and install `react` and `react-dom`
- [ ]    - Create `<PixiCanvas>` component wrapping PixiJS Application
- [ ]    - Refactor game UI overlays into React components
- [ ]    - Replace menu and popovers with React equivalents
- [ ] **Frontend Game Creation**: Implement "New Game" button using WatermelonDB GameService locally
- [ ] **WatermelonDB Sync Setup**: Configure sync between frontend WatermelonDB and backend D1 for cloud saves
- [ ] Procedural Galaxy Generation (moved to frontend)
- [ ] Game State Management (frontend WatermelonDB + React state)
- [ ] Crew Management UI (React components)
- [ ] Destiny AI (backend OpenAI integration, frontend chat UI)
- [ ] Playtesting and bug logging (`docs/playtesting.md`)

## 🗓️ Future / Stretch
- [ ] Missions & Events system
- [ ] Bones files persistence
- [ ] Accessibility & responsive UI polish
- [ ] Unit tests (Vitest) for WatermelonDB services
- [ ] Deployment (Cloudflare Pages/Workers) with WatermelonDB sync

## 📋 Architecture Notes
**New Frontend-First Approach:**
- WatermelonDB for offline-first local game storage
- React + PixiJS for UI and game rendering
- Backend only used for cloud sync and AI features
- Game creation happens entirely in frontend
- Cloud saves via WatermelonDB sync protocol 
