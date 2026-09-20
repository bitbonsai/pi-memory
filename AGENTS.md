# AGENTS.md

## Purpose

Minimal persistent-memory extension for [Pi](https://pi.dev). Stores facts and corrections in local SQLite, injects a bounded memory block at session start, and can consolidate sessions with a configured model.

Forked from [`@samfp/pi-memory` v1.3.5](https://github.com/samfoy/pi-memory) under MIT license.

## Hard constraints

- **No scope creep.** No embeddings, no vector database, no file index, no background agents, no watchers. This is a small extension, not a platform.
- **Node 24 required.** Uses `node:sqlite` (built-in `DatabaseSync`). Will not run on Node < 24.
- **Peer deps are external.** `@earendil-works/pi-coding-agent` and `@sinclair/typebox` are peer deps; the build externalizes them. Never bundle them.
- **Consolidation is best-effort.** It calls `pi -p ... --print --no-extensions --no-tools --no-session` as a subprocess. A 45s exec timeout plus a 60s hard backstop kill it. Failures are swallowed silently.

## Commands

```sh
npm run build          # esbuild bundle → dist/index.js
npm run dev            # watch mode
npm test               # node --test --import tsx src/**/*.test.ts
```

Tests use Node's built-in test runner with tsx loader. No vitest, no jest.

## Architecture

- `src/index.ts` — Extension entry point. Registers lifecycle handlers and tools.
- `src/store.ts` — SQLite-backed `MemoryStore` class. Three tables: `semantic`, `lessons`, `events`.
- `src/injector.ts` — Builds the memory context block for injection. 8KB cap.
- `src/consolidator.ts` — Prompt construction, response parsing, and DB writes for LLM-based extraction.
- `dist/index.js` — Bundled output. Pi loads this via the `pi.extensions` manifest.

## Storage

Default DB: `~/.pi/memory/memory.db`. Override per-project via `.pi/settings.json`:

```json
{ "pi-memory": { "localPath": ".pi/memory" } }
```

Settings also accept `memory.consolidationModel`, `memory.lessonInjection` (`"all"` | `"selective"`), and `memory.perTurnInjection` (boolean).

## Known traps

- `DatabaseSync` is synchronous and single-connection. WAL mode + busy_timeout=5000 handles concurrent reads but writes serialize through `writeLock`.
- `perTurnInjection: true` mutates `systemPrompt` every turn, breaking provider prefix caches. Users opt in knowing the tradeoff.
- Consolidation calls `pi` as a subprocess. If pi is not on PATH or the configured model string is invalid, consolidation silently fails.
- `stripQuotes()` defensively unwraps double-quoted args from local model runners that over-encode JSON.
- The extension seeds `pendingUserMessages` from session history on resume so `/memory-consolidate` works mid-session.

## Links

- [PITCH.md](.plans/PITCH.md) — Why this exists, what done looks like
- [EXPERIENCE.md](.plans/EXPERIENCE.md) — How it should feel
- [ARCHITECTURE.md](.plans/ARCHITECTURE.md) — Stack, infra, unknowns
- [INDEX.md](.plans/INDEX.md) — Active and planned work
