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

## Room and Technology Creation
- Define new rooms and technologies using the template tables in `DB-TEMPLATE-TASKS.md`.
- Ensure room coordinates do not overlap when adding to a ship layout.
- Every room must connect to at least one other room.
- Provide a clear path from the gate room or an elevator to every room, filling unused spaces with corridors as needed.
- Place at least one elevator on each floor and link all elevators so they provide inter-floor access regardless of position.

## Adding Rooms and Technologies
When creating new rooms or technology entries, add a migration file under `packages/backend/migrations` with the next sequential number (e.g., `007_add_lab.sql`). A migration can insert both a technology and the room that uses it.

```sql
-- 007_add_lab.sql
INSERT INTO technology_templates (id, name, description)
VALUES ('beaming_pad', 'Asgard Beaming Pad', 'Transports crew and cargo instantly');

INSERT INTO room_templates (
  id, layout_id, type, name, start_x, start_y, end_x, end_y, floor,
  connection_north, connection_south, connection_east, connection_west,
  technology
) VALUES (
  'lab_alpha', 'destiny', 'lab', 'Laboratory Alpha',
  8, -2, 10, 0, 0,
  NULL, 'north_corridor', NULL, 'mess_hall',
  '["beaming_pad"]'
);
```

Follow these layout rules:
- Room coordinates may not overlap.
- Each room must connect to another room.
- Every room must be reachable from the stargate room or via an elevator.
- Fill gaps between rooms with corridors.
- Include at least one elevator on each floor and link all elevators together.

After adding a migration, run `pnpm -r test` from the repository root. Backend tests validate these migrations and must pass before committing.
