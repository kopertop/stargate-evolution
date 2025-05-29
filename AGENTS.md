# Agent Guidelines

This project is a TypeScript monorepo managed with `pnpm`.

## Development workflow
- Install dependencies and start both dev servers with `pnpm start`.
- Run `pnpm run check` from the repo root before committing to perform linting and type checking.
- Execute tests with `pnpm -r test`.
- Database commands for the Cloudflare D1 backend are described in `DATABASE-SETUP.md`.

## Code style
- Follow the rules in `.editorconfig`:
- Tabs for indentation (width of three spaces).
- Files end with a newline and have no trailing whitespace.
- Use strict TypeScript throughout the repo; no JavaScript files.
- Prefer `for…of` loops over `.forEach` for array iteration.
- Adhere to `LINTING.md` guidelines:
- Wrap lexical declarations in `switch`/`case` blocks with `{}`.
- Provide explicit return types for functions.
- Prefix intentionally unused variables with `_`.
- Avoid the `any` type.
- Keep imports grouped with no blank lines within a group.
- Do not use the `uuid` library; use the custom ID generator instead.

## Architecture rules
- Frontend rendering is done with PixiJS.
- Backend logic runs on Cloudflare Workers with a D1 database.
- All AI/LLM calls must happen server-side.
- Procedural generation must use a seeded random number generator.
- Shared types live in `packages/common`.

## Tasks and documentation
- Update `TASKS.md` whenever tasks are completed or added.
- Record playtesting results in `docs/playtesting.md`.
- Keep `README.md` and other docs current when workflows change.

Always keep mono-repo dependencies in sync and use the scripts defined in each package.

## React/Frontend Rules
- Use components for "display" separately from services or providers for logic
- Run `pnpm run check` from the base directory to verify typechecks and lint rules
- Use `@livestore/react` for state management and persistence
- Use `@livestore/react-query` for data fetching

### Prefer React Bootstrap components
- Use `<Button>` over `<button>` or `className="btn"` when possible
- Style using React Bootstrap before applying custom styles
- Try to avoid custom styles if possible
- If absolutely necessary, use flexbox custom styles instead of absolute positioning
