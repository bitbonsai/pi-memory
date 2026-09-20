# PITCH

## Why

Pi agents lose context between sessions. Users repeat the same corrections, re-state preferences, and re-explain project conventions. Existing memory solutions are heavyweight (embeddings, vector DBs, background indexers) for what is fundamentally a small, local, SQLite-shaped problem.

## What

A minimal Pi extension that stores facts and lessons in local SQLite and injects them into future conversations. One bounded context block at session start. Optional LLM consolidation at session end. Five tools. One database file. No infrastructure.

## Definition of done

A user installs the package, uses Pi across several sessions, and finds that their corrections and preferences persist automatically. The memory block arrives before the user's first message, does not exceed 8KB, and does not break provider prefix caches. Consolidation extracts durable knowledge from conversations without blocking shutdown. The package is publishable to npm, discoverable in the Pi gallery, and maintains explicit upstream MIT attribution to `@samfp/pi-memory`.
