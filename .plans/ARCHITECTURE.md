# ARCHITECTURE

## Tech stack

- **Runtime:** Node 24+ (requires built-in `node:sqlite`)
- **Language:** TypeScript, bundled with esbuild
- **Database:** SQLite via `DatabaseSync` (synchronous, WAL mode)
- **Test runner:** Node built-in test runner with tsx loader
- **Extension API:** `@earendil-works/pi-coding-agent` (peer dep)
- **Schema validation:** `@sinclair/typebox` (peer dep)
- **Package format:** ESM (`"type": "module"`)

## Infrastructure and security

- No telemetry or extension-owned network services.
- Consolidation spawns `pi` as a subprocess via `pi.exec()`. It sends conversation to configured provider with user's existing Pi authentication.
- SQLite DB is user-owned, stored in `~/.pi/memory/` or project-local `.pi/memory/`.
- `writeLock` serializes writes; WAL mode allows concurrent reads.
- 45s exec timeout + 60s hard backstop on consolidation to prevent shutdown hangs.

## Unknowns

- [ ] npm publish readiness — package.json looks correct but no dry-run publish test yet
- [ ] Pi package gallery discoverability — `pi-package` keyword is set; need to verify gallery indexing
- [ ] FTS5 availability — store.ts checks `hasFTS5` but falls back to LIKE search; need to confirm FTS5 is available in Node 24's built-in sqlite
