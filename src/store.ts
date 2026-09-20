/**
 * SQLite-backed memory store using Node's built-in node:sqlite.
 * Three tables:
 * - semantic: key-value facts (preferences, project patterns, corrections)
 * - lessons: learned corrections with dedup
 * - events: audit log of all memory operations
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// ─── Types ───────────────────────────────────────────────────────────

export interface SemanticEntry {
  key: string;
  value: string;
  confidence: number;
  source: "user" | "consolidation" | "correction";
  created_at: string;
  updated_at: string;
  last_accessed?: string;
}

export interface LessonEntry {
  id: string;
  rule: string;
  category: string;
  source: string;
  negative: boolean;
  created_at: string;
  /** Project slug this lesson was extracted from, or null for user-authored / global lessons */
  project: string | null;
}

export interface MemoryEvent {
  id: number;
  event_type: string;
  memory_type: string;
  memory_key: string;
  details: string;
  created_at: string;
}

// ─── Store ───────────────────────────────────────────────────────────

export class MemoryStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA busy_timeout = 5000");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS semantic (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        confidence REAL NOT NULL DEFAULT 0.8,
        source TEXT NOT NULL DEFAULT 'consolidation',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        rule TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        source TEXT NOT NULL DEFAULT 'consolidation',
        negative INTEGER NOT NULL DEFAULT 0,
        is_deleted INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        memory_type TEXT NOT NULL,
        memory_key TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migration: add last_accessed column if missing
    try {
      this.db.exec(`ALTER TABLE semantic ADD COLUMN last_accessed TEXT`);
    } catch {
      // Column already exists — ignore
    }
    // Migration: add project column to lessons if missing
    try {
      this.db.exec(`ALTER TABLE lessons ADD COLUMN project TEXT`);
    } catch {
      // Column already exists — ignore
    }

    this.db.exec(`
      DROP TRIGGER IF EXISTS semantic_ai;
      DROP TRIGGER IF EXISTS semantic_ad;
      DROP TRIGGER IF EXISTS semantic_au;
      DROP TRIGGER IF EXISTS lessons_fts_ai;
      DROP TRIGGER IF EXISTS lessons_fts_ad;
      DROP TRIGGER IF EXISTS lessons_fts_au;
      DROP TABLE IF EXISTS semantic_fts;
      DROP TABLE IF EXISTS lessons_fts;
      PRAGMA user_version = 1;
    `);
  }

  /**
   * Serialize async callers so concurrent read-modify-write cycles
   * (e.g. two consolidation calls) don't clobber each other.
   */
  private withLock<T>(fn: () => T): T {
    // DatabaseSync is synchronous, so we just need to ensure
    // transactional integrity. Wrap in a SQLite transaction.
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  // ─── Semantic ────────────────────────────────────────────────────

  getSemantic(key: string): SemanticEntry | undefined {
    const normalized = key.toLowerCase();
    return this.db.prepare("SELECT * FROM semantic WHERE key = ?").get(normalized) as unknown as SemanticEntry | undefined;
  }

  setSemantic(key: string, value: string, confidence: number = 0.8, source: SemanticEntry["source"] = "consolidation"): void {
    const normalized = key.toLowerCase();
    this.withLock(() => {
      const existing = this.db.prepare("SELECT * FROM semantic WHERE key = ?").get(normalized) as unknown as SemanticEntry | undefined;
      if (existing && existing.confidence > confidence) return; // higher confidence wins

      this.db.prepare(`
        INSERT INTO semantic (key, value, confidence, source, updated_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          confidence = excluded.confidence,
          source = excluded.source,
          updated_at = datetime('now')
      `).run(normalized, value, confidence, source);

      this.logEvent(existing ? "update" : "create", "semantic", normalized);
    });
  }

  deleteSemantic(key: string): boolean {
    const normalized = key.toLowerCase();
    return this.withLock(() => {
      const result = this.db.prepare("DELETE FROM semantic WHERE key = ?").run(normalized);
      if (result.changes > 0) this.logEvent("delete", "semantic", normalized);
      return result.changes > 0;
    });
  }

  listSemantic(prefix?: string, limit: number = 100): SemanticEntry[] {
    if (prefix) {
      return this.db.prepare("SELECT * FROM semantic WHERE key LIKE ? ORDER BY updated_at DESC LIMIT ?")
        .all(`${prefix}%`, limit) as unknown as SemanticEntry[];
    }
    return this.db.prepare("SELECT * FROM semantic ORDER BY updated_at DESC LIMIT ?")
      .all(limit) as unknown as SemanticEntry[];
  }

  searchSemantic(query: string, limit: number = 10): SemanticEntry[] {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const where = terms.map(() => "(key LIKE ? ESCAPE '\\' OR value LIKE ? ESCAPE '\\')").join(" OR ");
    const values = terms.flatMap((term) => {
      const pattern = `%${escapeLike(term.toLowerCase())}%`;
      return [pattern, pattern];
    });
    return this.db.prepare(`SELECT * FROM semantic WHERE ${where} ORDER BY updated_at DESC LIMIT ?`)
      .all(...values, clampLimit(limit)) as unknown as SemanticEntry[];
  }

  touchAccessed(keys: string[]): void {
    if (keys.length === 0) return;
    const stmt = this.db.prepare("UPDATE semantic SET last_accessed = datetime('now') WHERE key = ?");
    for (const key of keys) {
      stmt.run(key.toLowerCase());
    }
  }

  // ─── Lessons ─────────────────────────────────────────────────────

  addLesson(rule: string, category: string = "general", source: string = "consolidation", negative: boolean = false, project?: string): { success: boolean; id?: string; reason?: string } {
    const trimmed = rule.trim();
    if (!trimmed) return { success: false, reason: "empty rule" };

    const normalizedCategory = category.trim().toLowerCase() || "general";

    return this.withLock(() => {
      // Exact-match dedup (case-insensitive)
      const existing = this.db.prepare(
        "SELECT id FROM lessons WHERE LOWER(TRIM(rule)) = LOWER(?) AND is_deleted = 0"
      ).get(trimmed.toLowerCase()) as { id: string } | undefined;
      if (existing) return { success: false as const, reason: "duplicate" as const, id: existing.id };

      // Jaccard dedup
      const allRules = this.db.prepare("SELECT id, rule FROM lessons WHERE is_deleted = 0").all() as { id: string; rule: string }[];
      for (const r of allRules) {
        if (jaccard(trimmed, r.rule) >= 0.7) {
          return { success: false as const, reason: "similar" as const, id: r.id };
        }
      }

      const id = crypto.randomUUID();
      this.db.prepare(
        "INSERT INTO lessons (id, rule, category, source, negative, project) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(id, trimmed, normalizedCategory, source, negative ? 1 : 0, project ?? null);

      this.logEvent("create", "lesson", id, trimmed.slice(0, 100));
      return { success: true as const, id };
    });
  }

  getLesson(id: string): LessonEntry | undefined {
    const row = this.db.prepare("SELECT * FROM lessons WHERE id = ? AND is_deleted = 0").get(id) as any;
    if (!row) return undefined;
    return { ...row, negative: !!row.negative };
  }

  /**
   * List lessons, optionally filtered by category and/or project.
   *
   * Project filtering:
   * - If `project` is provided, returns lessons where `project = slug` OR `project IS NULL`
   *   (NULL = user-authored or pre-migration lessons, treated as global).
   * - If `project` is not provided, returns all lessons (no project filter).
   */
  listLessons(category?: string, limit: number = 50, project?: string): LessonEntry[] {
    let rows: any[];
    if (category && project) {
      const normalizedCategory = category.trim().toLowerCase();
      rows = this.db.prepare(
        "SELECT * FROM lessons WHERE category = ? AND (project = ? OR project IS NULL) AND is_deleted = 0 ORDER BY created_at DESC LIMIT ?"
      ).all(normalizedCategory, project, limit);
    } else if (category) {
      const normalizedCategory = category.trim().toLowerCase();
      rows = this.db.prepare("SELECT * FROM lessons WHERE category = ? AND is_deleted = 0 ORDER BY created_at DESC LIMIT ?")
        .all(normalizedCategory, limit);
    } else if (project) {
      rows = this.db.prepare(
        "SELECT * FROM lessons WHERE (project = ? OR project IS NULL) AND is_deleted = 0 ORDER BY created_at DESC LIMIT ?"
      ).all(project, limit);
    } else {
      rows = this.db.prepare("SELECT * FROM lessons WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT ?")
        .all(limit);
    }
    return rows.map(r => ({ ...r, negative: !!r.negative, project: r.project ?? null }));
  }

  searchLessons(query: string, limit: number = 20): LessonEntry[] {
    const terms = query.trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const where = terms.map(() => "(rule LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\')").join(" OR ");
    const values = terms.flatMap((term) => {
      const pattern = `%${escapeLike(term.toLowerCase())}%`;
      return [pattern, pattern];
    });
    const rows = this.db.prepare(`SELECT * FROM lessons WHERE is_deleted = 0 AND (${where}) ORDER BY created_at DESC LIMIT ?`)
      .all(...values, clampLimit(limit)) as any[];
    return rows.map((row) => ({ ...row, negative: !!row.negative, project: row.project ?? null }));
  }

  deleteLesson(id: string): boolean {
    return this.withLock(() => {
      // Support both full UUIDs and prefix matches (e.g. first 8 chars)
      let result = this.db.prepare("UPDATE lessons SET is_deleted = 1 WHERE id = ? AND is_deleted = 0").run(id);
      if (result.changes === 0 && id.length < 36) {
        // Try prefix match — ensure it's unambiguous
        const matches = this.db.prepare("SELECT id FROM lessons WHERE id LIKE ? AND is_deleted = 0").all(`${id}%`) as { id: string }[];
        if (matches.length === 1) {
          result = this.db.prepare("UPDATE lessons SET is_deleted = 1 WHERE id = ? AND is_deleted = 0").run(matches[0].id);
          if (result.changes > 0) this.logEvent("delete", "lesson", matches[0].id);
          return true;
        }
      }
      if (result.changes > 0) this.logEvent("delete", "lesson", id);
      return result.changes > 0;
    });
  }

  // ─── Events ──────────────────────────────────────────────────────

  private logEvent(eventType: string, memoryType: string, key: string, details: string = ""): void {
    this.db.prepare(
      "INSERT INTO events (event_type, memory_type, memory_key, details) VALUES (?, ?, ?, ?)"
    ).run(eventType, memoryType, key, details);
  }

  listEvents(limit: number = 50): MemoryEvent[] {
    return this.db.prepare("SELECT * FROM events ORDER BY id DESC LIMIT ?").all(limit) as unknown as MemoryEvent[];
  }

  // ─── Stats ───────────────────────────────────────────────────────

  stats(): { semantic: number; lessons: number; events: number } {
    const semantic = (this.db.prepare("SELECT COUNT(*) as c FROM semantic").get() as any).c;
    const lessons = (this.db.prepare("SELECT COUNT(*) as c FROM lessons WHERE is_deleted = 0").get() as any).c;
    const events = (this.db.prepare("SELECT COUNT(*) as c FROM events").get() as any).c;
    return { semantic, lessons, events };
  }

  close(): void {
    this.db.close();
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────

function clampLimit(limit: number): number {
  return Math.max(1, Math.min(20, Number.isFinite(limit) ? Math.floor(limit) : 20));
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function jaccard(a: string, b: string): number {
  const setA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}
