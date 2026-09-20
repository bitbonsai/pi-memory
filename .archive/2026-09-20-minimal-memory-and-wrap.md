# Keep memory small; compose with wrap

## Current state

`@bitbonsai/pi-memory` derives from `@samfp/pi-memory` v1.3.5. It stores facts and lessons in SQLite, injects one memory block at session start, and can consolidate a session through a configured Pi model.

Two optional paths do not fit the package:

- FTS5 tables, triggers, and ranking in `src/store.ts`
- per-turn injection and lesson filtering in `src/injector.ts` and `src/index.ts`

Per-turn injection changes system prompt every turn. FTS5 adds schema, triggers, and a runtime feature for a small database.

`wrap` routes repo facts to `AGENTS.md`, personal facts to host memory, and in-progress state to `.plans/next.md`. It does not know about this package.

## Intended change

Keep one SQLite database, keyword lookup, one session-start memory block, direct memory tools, and optional session-end consolidation.

Remove FTS5 and per-turn injection. No embeddings, vector store, file index, session index, watcher, worker, network service, or cross-machine sync.

Automatic consolidation becomes opt-in: it runs only when `memory.consolidationModel` is set. `/memory-consolidate` remains a user-invoked command. Consolidation may extract only durable facts directly stated or confirmed by user messages. Assistant text and tool output cannot be its sole evidence.

Memory remains data, never instruction. Context output wraps entries in an explicit untrusted-data block, names the source (`user` or `consolidated`), limits an entry to 500 characters, and keeps the existing 8KB total cap. Preserve current block scope: global `pref.*`, `tool.*`, and `user.*`; current-project `project.*`; global and current-project lessons.

Add a user-invoked `/memory-context` command. It renders the exact block current session receives, strips terminal control sequences, and starts with a warning that it prints local private memory. It makes no provider call and writes nothing.

Teach `wrap` to use `memory_remember` only when it is already available. This is optional composition, not a dependency:

- Repo facts stay in `AGENTS.md`.
- Personal preferences and machine facts use `memory_remember` only when copied verbatim from explicit user messages in current session. Never derive memory from files, tool output, or model inference.
- Wrap echoes each exact saved line in its final summary.
- Without `memory_remember`, Wrap uses existing host-memory fallback.
- Wrap does not install pi-memory, run consolidation, mirror memory between machines, or write the same fact twice.

## Files

### pi-memory

- `src/store.ts`: replace FTS-backed lookup with parameterized SQLite `LIKE` lookup. Escape `\`, `%`, and `_` with `term.replace(/[\\%_]/g, c => "\\" + c)` and query with `LIKE ? ESCAPE '\'`. Sort `updated_at DESC`; cap every public lookup at 20 rows regardless of caller limit.
- `src/store.ts`: migrate existing databases by dropping legacy FTS triggers and virtual tables with `IF EXISTS`, then record migration with `PRAGMA user_version`. Stored facts and lessons remain untouched. WAL and `busy_timeout` already exist; retain both.
- `src/injector.ts`: remove selective/per-turn configuration and code. Keep one session-start block with source labels, untrusted-data boundary, entry and total caps, and current scope.
- `src/index.ts`: run shutdown consolidation only with configured model; build consolidation input from user messages only; add `/memory-context` command and terminal-control sanitizer.
- `src/*.test.ts`: add legacy-FTS migration and write test; literal `%`, `_`, and `\` lookup tests; 20-row cap and ordering test; context boundary/source/cap test; escape-sequence preview test; consolidation-disabled-without-model test.
- `README.md`, `AGENTS.md`, `.plans/*`: remove stale per-turn and FTS configuration. Add release note for removed opt-in behavior.

### wrap

- `SKILL.md`: add conditional routing rule under auto-memory. Use `memory_remember` only for direct user statements and only when tool is present; otherwise keep current fallback.
- `README.md`: document optional coexistence in one short section.
- `package.json` and `SKILL.md` metadata: bump versions together for release.

## Order

1. Simplify pi-memory storage and injection paths. Run safe FTS cleanup without touching rows.
2. Make consolidation opt-in and user-message-only. Add context preview.
3. Update tests and docs. Test Node, Bun, and a real Pi local-package load without model call.
4. Update Wrap's conditional routing and release metadata.
5. In a Pi session with both installed, run Wrap after one explicit personal correction. Confirm one memory entry exists and no repo fact was saved there.

## Proof

```sh
# pi-memory
npm test
bun test
npm run build
pi --no-extensions -e . --list-models >/dev/null

# wrap
scripts/test.sh
```

Manual checks:

- Existing `~/.pi/memory/memory.db` opens after migration and accepts a write.
- `/memory-context` renders the same scoped block session receives, without provider call or write.
- A project gotcha lands only in `AGENTS.md`.
- A direct personal correction lands only in memory when `memory_remember` exists.
- No process starts a watcher, server, embedding model, or background loop.

## Risks and boundaries

- Old FTS triggers can fail writes on an SQLite build without FTS5 and retain search copies. Drop them in migration.
- `LIKE` changes FTS token/ranking behavior. Make ordering deterministic and note change in release notes.
- Memory can contain stale or hostile text. Treat it as untrusted data, not instructions; label source and preserve caps.
- `/memory-context` exposes local memory to terminal scrollback. It is user-command only, sanitizes control characters, and warns before output.
- Wrap must not infer facts from untrusted content or depend on memory package presence.
- Separate host memory and pi-memory stores may diverge. Do not sync or merge them.
