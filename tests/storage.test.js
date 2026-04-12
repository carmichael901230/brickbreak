import test from "node:test";
import assert from "node:assert/strict";

import { createStorageAdapter } from "../src/storage.js";

function createMemoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

test("storage adapter falls back safely on corrupt settings", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": "{bad"
  });
  const adapter = createStorageAdapter(storage);
  assert.deepEqual(adapter.loadSettings(), { soundEnabled: false });
});

test("storage adapter persists and loads best score", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveBestScore(12);
  assert.equal(adapter.loadBestScore(), 12);
});
