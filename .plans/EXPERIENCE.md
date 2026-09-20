# EXPERIENCE

## Feel

Invisible when it works. The agent remembers your preferences and corrections without being asked. Sessions start with relevant context already loaded. No configuration required for default behavior; every setting has a sane default.

## Principles

- **Boring by design.** SQLite, not a vector database. One file, not a service. If it can be a SQL query, it is a SQL query.
- **Bounded injection.** 8KB cap on the context block. Memory is a supplement, not a takeover of the system prompt.
- **Cache-friendly.** Default mode injects once at session start. Per-turn injection is opt-in with documented cache tradeoffs.
- **Best-effort consolidation.** Extraction runs in the background at shutdown. If it fails, nothing breaks. If it succeeds, the next session is smarter.
- **Explicit upstream.** MIT attribution to `@samfp/pi-memory` stays visible. The fork is honest about its origin.
