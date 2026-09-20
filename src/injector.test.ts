import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { MemoryStore } from "./store.js";
import { buildContextBlock, sanitizeMemoryText } from "./injector.js";

describe("buildContextBlock", () => {
  let store: MemoryStore;
  let dir: string;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "pi-memory-injector-"));
    store = new MemoryStore(join(dir, "test.db"));
    store.setSemantic("pref.editor", "vim", 0.9, "user");
    store.setSemantic("project.other.lang", "python", 0.9, "consolidation");
    store.setSemantic("project.myapp.lang", "typescript", 0.9, "consolidation");
    store.addLesson("Use sed for notes", "vault", "user", true);
  });

  after(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("wraps labeled, untrusted data", () => {
    const { text } = buildContextBlock(store, "/tmp/myapp");
    assert.ok(text.startsWith("<memory-data>"));
    assert.ok(text.includes("untrusted reference data"));
    assert.ok(text.includes("[user] editor: vim"));
    assert.ok(text.includes("[consolidation] myapp.lang: typescript"));
    assert.ok(!text.includes("other.lang"));
    assert.ok(text.includes("[user] DON'T: Use sed for notes"));
    assert.ok(text.endsWith("</memory-data>"));
  });

  it("strips terminal controls and caps an entry", () => {
    store.setSemantic("pref.terminal", `safe\x1b]52;c;evil\x07${"x".repeat(600)}`, 0.9, "user");
    const { text } = buildContextBlock(store);
    assert.ok(!text.includes("\x1b"));
    assert.ok(text.includes("…"));
    assert.equal(sanitizeMemoryText("a\x1b[31mb"), "a[31mb");
  });
});
