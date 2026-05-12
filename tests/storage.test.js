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
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test("storage adapter falls back safely on corrupt settings", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": "{bad"
  });
  const adapter = createStorageAdapter(storage);
  assert.deepEqual(adapter.loadSettings(), { soundEnabled: true, language: "zh-CN" });
});

test("storage adapter persists and loads best score", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveBestScore(12);
  assert.equal(adapter.loadBestScore(), 12);
});

test("storage adapter persists and clears saved game progress", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  const progress = {
    version: 1,
    snapshot: {
      round: 4
    }
  };

  adapter.saveGameProgress(progress);
  assert.deepEqual(adapter.loadGameProgress(), progress);

  adapter.clearGameProgress();
  assert.equal(adapter.loadGameProgress(), null);
});
