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

## 🚧 In Progress / Next Up
- [ ] Core Game Loop: Implement `Game` class, update/render cycle, and state management
- [ ] Ship Controls: WASD/arrow keys to move ship, basic camera/viewport
- [ ] Starfield/Background: Simple procedural or static starfield
- [ ] Backend API: `/hello` endpoint, test frontend-backend connectivity
- [ ] Procedural Galaxy Generation (backend)
- [ ] Game State Management (backend, Cloudflare KV)
- [ ] Frontend-backend integration: fetch and display backend data
- [ ] Crew Management UI (stub)
- [ ] Destiny AI (backend OpenAI integration, frontend chat UI stub)
- [ ] Playtesting and bug logging (`docs/playtesting.md`)

## 🗓️ Future / Stretch
- [ ] Missions & Events system
- [ ] Bones files persistence
- [ ] Accessibility & responsive UI polish
- [ ] Unit tests (Vitest)
- [ ] Deployment (Cloudflare Pages/Workers) 
