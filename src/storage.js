import { STORAGE_KEYS } from "./config.js";

const defaultSettings = {
  soundEnabled: false
};

function safeParse(rawValue, fallback) {
  try {
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

export function createStorageAdapter(storage = globalThis.localStorage) {
  return {
    loadSettings() {
      if (!storage) {
        return { ...defaultSettings };
      }

      const settings = safeParse(storage.getItem(STORAGE_KEYS.settings), defaultSettings);
      return { ...defaultSettings, ...settings };
    },

    saveSettings(settings) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ...defaultSettings, ...settings }));
    },

    loadBestScore() {
      if (!storage) {
        return 0;
      }

      const value = Number(storage.getItem(STORAGE_KEYS.bestScore));
      return Number.isFinite(value) && value > 0 ? value : 0;
    },

    saveBestScore(score) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.bestScore, String(Math.max(0, Math.floor(score))));
    }
  };
}

export { defaultSettings };
