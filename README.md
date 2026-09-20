<div align="center">
  <br>
  <img width="137" height="137" src="icon.svg" alt="Pi memory">
  <br>
  <br>
  <h1>@bitbonsai/pi-memory</h1>
  <p>Small persistent memory for <a href="https://pi.dev">Pi</a>.</p>
  <p><a href="https://www.npmjs.com/package/@bitbonsai/pi-memory"><img src="https://img.shields.io/npm/v/%40bitbonsai/pi-memory?label=npm" alt="npm version"></a> <a href="https://github.com/bitbonsai/pi-memory/blob/main/LICENSE"><img src="https://img.shields.io/github/license/bitbonsai/pi-memory" alt="MIT license"></a> <img src="https://img.shields.io/badge/node-%3E%3D24-339933?logo=nodedotjs&logoColor=white" alt="Node 24 or newer"> <img src="https://img.shields.io/badge/bun-1.4%2B-black?logo=bun" alt="Bun 1.4 or newer"></p>
  <br>
  <br>
</div>

Stores facts and corrections in local SQLite. Injects one bounded memory block at session start. Can consolidate a completed session with a configured model.

No embeddings. No vector store. No file or session index. No watchers or background agents.

Derived from [`@samfp/pi-memory` v1.3.5](https://github.com/samfoy/pi-memory), under its MIT license.

## Why derive it

The original project grew toward semantic search and a broader context stack. This package keeps local SQLite facts and lessons, one capped injection, and optional consolidation. No semantic search.

## Install

```sh
pi install npm:@bitbonsai/pi-memory
```

## Use

Pi can search, add, remove, and list memory through these tools:

| Tool | What it does |
|------|--------------|
| `memory_search` | Search stored facts and lessons |
| `memory_remember` | Store a fact or lesson |
| `memory_forget` | Remove a fact or lesson |
| `memory_lessons` | List lessons |
| `memory_stats` | Show memory counts |

`/memory-consolidate` extracts memory from current session on demand.

## Configure

The database is `~/.pi/memory/memory.db`. To use a cheap model for session-end consolidation:

```json
{
  "memory": {
    "consolidationModel": "opencode-go/mimo-v2.5"
  }
}
```

Without `consolidationModel`, it uses Pi's normal default model. Consolidation runs after sessions with at least three user messages and sends that session's conversation to configured provider.

Project-local database:

```json
{
  "pi-memory": {
    "localPath": ".pi/memory"
  }
}
```

## Develop

Node 24+ or Bun 1.4+ required.

```sh
npm test
npm run build

# or
bun test
bun run build
```

## License

MIT.

## Credits

Derived from [@samfp/pi-memory](https://github.com/samfoy/pi-memory) v1.3.5, under MIT license.

Memory icon by [Adrien Coquet](https://thenounproject.com/) from [Noun Project](https://thenounproject.com/).
