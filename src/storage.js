import { STORAGE_KEYS } from "./config.js";

const defaultSettings = {
  soundEnabled: false,
  language: "zh-CN"
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

export function createWeChatStorageAdapter(wxApi) {
  if (!wxApi) {
    return createStorageAdapter(null);
  }

  return createStorageAdapter({
    getItem(key) {
      try {
        const value = wxApi.getStorageSync(key);
        return value === "" || value === undefined ? null : String(value);
      } catch {
        return null;
      }
    },

    setItem(key, value) {
      try {
        wxApi.setStorageSync(key, value);
      } catch {
        // Ignore storage write failures so gameplay can continue.
      }
    }
  });
}
