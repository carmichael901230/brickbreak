import { STORAGE_KEYS } from "./config.js";

const defaultSettings = {
  soundEnabled: true,
  language: "zh-CN"
};

const defaultSkins = {
  owned: {
    brick: [],
    ball: []
  },
  selected: {
    brick: null,
    ball: null
  }
};

function safeParse(rawValue, fallback) {
  try {
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeStringList(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}

function normalizeSkins(skins) {
  return {
    owned: {
      brick: normalizeStringList(skins?.owned?.brick),
      ball: normalizeStringList(skins?.owned?.ball)
    },
    selected: {
      brick: typeof skins?.selected?.brick === "string" ? skins.selected.brick : null,
      ball: typeof skins?.selected?.ball === "string" ? skins.selected.ball : null
    }
  };
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
    },

    loadCoins() {
      if (!storage) {
        return 0;
      }

      const value = Number(storage.getItem(STORAGE_KEYS.coins));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    },

    saveCoins(coins) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.coins, String(Math.max(0, Math.floor(coins))));
    },

    loadSkins() {
      if (!storage) {
        return normalizeSkins(defaultSkins);
      }

      return normalizeSkins(safeParse(storage.getItem(STORAGE_KEYS.skins), defaultSkins));
    },

    saveSkins(skins) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.skins, JSON.stringify(normalizeSkins(skins)));
    },

    loadGameProgress() {
      if (!storage) {
        return null;
      }

      return safeParse(storage.getItem(STORAGE_KEYS.gameProgress), null);
    },

    saveGameProgress(progress) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.gameProgress, JSON.stringify(progress));
    },

    clearGameProgress() {
      if (!storage) {
        return;
      }

      if (typeof storage.removeItem === "function") {
        storage.removeItem(STORAGE_KEYS.gameProgress);
        return;
      }

      storage.setItem(STORAGE_KEYS.gameProgress, "");
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
    },

    removeItem(key) {
      try {
        wxApi.removeStorageSync?.(key);
      } catch {
        // Ignore storage write failures so gameplay can continue.
      }
    }
  });
}
