import assert from "node:assert/strict";
import test from "node:test";
import { buildConsolidationArgs } from "./index.js";

test("uses configured model only when provided", () => {
  assert.deepEqual(buildConsolidationArgs("extract"), [
    "-p", "extract", "--print", "--no-extensions", "--no-tools", "--no-session",
  ]);
  assert.deepEqual(buildConsolidationArgs("extract", "opencode-go/mimo-v2.5"), [
    "-p", "extract", "--print", "--no-extensions", "--no-tools", "--no-session",
    "--model", "opencode-go/mimo-v2.5",
  ]);
});
