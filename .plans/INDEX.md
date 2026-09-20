# INDEX

## Shipped

- Fork of `@samfp/pi-memory` v1.3.5 with local SQLite storage
- Session-start one-shot memory injection (8KB cap)
- Opt-in per-turn injection with documented cache tradeoff
- LLM consolidation at session end with configurable model
- Five tools: search, remember, forget, lessons, stats
- `/memory-consolidate` manual command
- Bootstrap script for seeding from session-search index
- Per-project DB path via `.pi/settings.json`

## Planned

- [ ] Publish to npm as `@bitbonsai/pi-memory`
- [ ] Verify Pi package gallery discoverability
- [ ] Confirm FTS5 availability in Node 24 built-in sqlite
