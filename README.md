# @bitbonsai/pi-memory

Small persistent memory extension for [Pi](https://pi.dev).

Stores facts and corrections in local SQLite. At session start, injects one bounded memory block. At session end, it can use a cheap model to extract durable facts.

No embeddings. No vector database. No file index. No background agents.

Derived from [`@samfp/pi-memory` v1.3.5](https://github.com/samfoy/pi-memory), under its MIT license.

## Install

```sh
pi install npm:@bitbonsai/pi-memory
```

## Configure consolidation

Without a configured model, consolidation uses Pi's normal default model. Set a cheap model explicitly when wanted:

```json
{
  "memory": {
    "consolidationModel": "opencode-go/mimo-v2.5"
  }
}
```

Consolidation runs after sessions with at least three user messages. It sends that session's conversation to the configured provider.

## Tools

- `memory_search`
- `memory_remember`
- `memory_forget`
- `memory_lessons`
- `memory_stats`

`/memory-consolidate` extracts memory from the current session on demand.

## Storage

Default database: `~/.pi/memory/memory.db`.

Project-local storage:

```json
{
  "pi-memory": {
    "localPath": ".pi/memory"
  }
}
```

## License

MIT.
