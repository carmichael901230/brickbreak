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
  assert.deepEqual(adapter.loadSettings(), {
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    effectsEnabled: true,
    language: "zh-CN"
  });
});

test("storage adapter preserves omitted settings on partial save", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": JSON.stringify({
      soundEnabled: true,
      musicEnabled: false,
      vibrationEnabled: false,
      effectsEnabled: true,
      language: "zh-CN"
    })
  });
  const adapter = createStorageAdapter(storage);
  adapter.saveSettings({ soundEnabled: false });
  assert.deepEqual(adapter.loadSettings(), {
    soundEnabled: false,
    musicEnabled: false,
    vibrationEnabled: false,
    effectsEnabled: true,
    language: "zh-CN"
  });
});

test("storage adapter persists and loads best score", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveBestScore(12);
  assert.equal(adapter.loadBestScore(), 12);
});

test("storage adapter persists and loads coins", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveCoins(7);
  assert.equal(adapter.loadCoins(), 7);
});

test("storage adapter persists and loads hearts", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveHearts(3);
  assert.equal(adapter.loadHearts(), 3);
});

test("storage adapter persists clear free item usage", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  assert.equal(adapter.loadClearFreeUsed(), false);
  adapter.saveClearFreeUsed(true);
  assert.equal(adapter.loadClearFreeUsed(), true);
});

test("storage adapter persists bomb free item usage", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  assert.equal(adapter.loadBombFreeUsed(), false);
  adapter.saveBombFreeUsed(true);
  assert.equal(adapter.loadBombFreeUsed(), true);
});

test("storage adapter persists freeze free item usage", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  assert.equal(adapter.loadFreezeFreeUsed(), false);
  adapter.saveFreezeFreeUsed(true);
  assert.equal(adapter.loadFreezeFreeUsed(), true);
});

test("storage adapter persists rage free item usage", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  assert.equal(adapter.loadRageFreeUsed(), false);
  adapter.saveRageFreeUsed(true);
  assert.equal(adapter.loadRageFreeUsed(), true);
});

test("storage adapter persists and loads daily check-in state", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  const checkIn = {
    lastCheckInDate: "2026-06-17",
    checkInStreak: 4,
    lastRewardDay: 4
  };

  adapter.saveDailyCheckIn(checkIn);
  assert.deepEqual(adapter.loadDailyCheckIn(), checkIn);
});

test("storage adapter persists and loads skin ownership", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  const skins = {
    owned: {
      brick: ["brick-sun"],
      ball: ["ball-ice"]
    },
    selected: {
      brick: "brick-sun",
      ball: "ball-ice"
    }
  };

  adapter.saveSkins(skins);
  assert.deepEqual(adapter.loadSkins(), skins);
});

test("storage adapter persists and clears saved game progress", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  const progress = {
    version: 1,
    snapshot: {
      round: 4,
      skins: {
        owned: {
          brick: ["brick-sun"],
          ball: ["ball-ice"]
        },
        selected: {
          brick: "brick-sun",
          ball: "ball-ice"
        }
      }
    }
  };

  adapter.saveGameProgress(progress);
  assert.deepEqual(adapter.loadGameProgress(), {
    version: 1,
    snapshot: {
      round: 4
    }
  });

  adapter.clearGameProgress();
  assert.equal(adapter.loadGameProgress(), null);
});
