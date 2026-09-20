<div align="center">
  <br>
  <img width="137" height="137" src="icon.svg" alt="Pi memory">
  <br>
  <br>
  <h1>@bitbonsai/pi-memory</h1>
  <p>Pi forgets the rules you taught it yesterday.</p>
  <p><a href="https://www.npmjs.com/package/@bitbonsai/pi-memory"><img src="https://img.shields.io/npm/v/%40bitbonsai/pi-memory?label=npm" alt="npm version"></a> <a href="https://github.com/bitbonsai/pi-memory/blob/main/LICENSE"><img src="https://img.shields.io/github/license/bitbonsai/pi-memory" alt="MIT license"></a> <img src="https://img.shields.io/badge/node-%3E%3D24-339933?logo=nodedotjs&logoColor=white" alt="Node 24 or newer"> <img src="https://img.shields.io/badge/bun-1.4%2B-black?logo=bun" alt="Bun 1.4 or newer"></p>
  <br>
  <br>
</div>

This keeps corrections, preferences, and project facts in one local SQLite database. New sessions receive one memory block, capped at 8KB. After a session, an optional cheap model extracts anything worth keeping.

## Why a fork

I wanted the useful part of [@samfp/pi-memory](https://github.com/samfoy/pi-memory) v1.3.5 without its newer direction: semantic search and a larger context stack. This fork stays with SQLite, keyword lookup, one bounded injection, and optional consolidation. No embeddings, vector store, file index, session index, watchers, or agent loops.

## Install

```sh
pi install npm:@bitbonsai/pi-memory
```

## Use

| Tool | What it does |
|------|--------------|
| `memory_search` | Find stored facts and lessons |
| `memory_remember` | Save a fact or lesson |
| `memory_forget` | Remove a fact or lesson |
| `memory_lessons` | List lessons |
| `memory_stats` | Show memory counts |

`/memory-consolidate` extracts memory from current session when asked.

## Configure

Database: `~/.pi/memory/memory.db`.

This uses Pi's default model unless you set one for consolidation:

```json
{
  "memory": {
    "consolidationModel": "opencode-go/mimo-v2.5"
  }
}
```

Consolidation starts after three user messages. It sends that session's conversation to configured provider.

Keep one project's memory separate:

```json
{
  "pi-memory": {
    "localPath": ".pi/memory"
  }
}
```

## Develop

Node 24+ or Bun 1.4+.

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
