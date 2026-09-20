# INDEX

## Shipped

- Fork of `@samfp/pi-memory` v1.3.5 with local SQLite storage
- Session-start one-shot memory injection (8KB cap)
- Opt-in per-turn injection with documented cache tradeoff
- LLM consolidation at session end with configurable model
- Five tools: search, remember, forget, lessons, stats
- `/memory-consolidate` manual command
- Per-project DB path via `.pi/settings.json`
- v0.2.0: removed FTS and per-turn injection; added one-shot untrusted-data block and `/memory-context`
- v0.2.0: Wrap can store direct user preferences through `memory_remember` when installed

## Planned

- [ ] Publish `0.2.0` to npm
- [ ] Verify Pi package gallery discoverability

Archived plans: `.archive/`
