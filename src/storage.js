import { STORAGE_KEYS } from "./config.js";

const defaultSettings = {
  soundEnabled: true,
  musicEnabled: true,
  vibrationEnabled: true,
  effectsEnabled: true,
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

function normalizeCheckIn(value) {
  const checkInStreak = Math.max(0, Math.min(7, Math.floor(Number(value?.checkInStreak) || 0)));
  const lastRewardDay = Math.max(0, Math.min(7, Math.floor(Number(value?.lastRewardDay) || 0)));
  return {
    lastCheckInDate: typeof value?.lastCheckInDate === "string" ? value.lastCheckInDate : null,
    checkInStreak,
    lastRewardDay
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

      const currentSettings = safeParse(storage.getItem(STORAGE_KEYS.settings), defaultSettings);
      storage.setItem(STORAGE_KEYS.settings, JSON.stringify({ ...defaultSettings, ...currentSettings, ...settings }));
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

    loadHearts() {
      if (!storage) {
        return 0;
      }

      const value = Number(storage.getItem(STORAGE_KEYS.hearts));
      return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    },

    saveHearts(hearts) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.hearts, String(Math.max(0, Math.floor(hearts))));
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

    loadViewedNewSkins() {
      if (!storage) {
        return [];
      }

      return normalizeStringList(safeParse(storage.getItem(STORAGE_KEYS.viewedNewSkins), []));
    },

    saveViewedNewSkins(skinIds) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.viewedNewSkins, JSON.stringify(normalizeStringList(skinIds)));
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

    loadDailyCheckIn() {
      if (!storage) {
        return normalizeCheckIn(null);
      }

      return normalizeCheckIn(safeParse(storage.getItem(STORAGE_KEYS.dailyCheckIn), null));
    },

    saveDailyCheckIn(checkIn) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.dailyCheckIn, JSON.stringify(normalizeCheckIn(checkIn)));
    },

    loadClearFreeUsed() {
      if (!storage) {
        return false;
      }

      return storage.getItem(STORAGE_KEYS.clearFreeUsed) === "true";
    },

    saveClearFreeUsed(used) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.clearFreeUsed, used ? "true" : "false");
    },

    loadBombFreeUsed() {
      if (!storage) {
        return false;
      }

      return storage.getItem(STORAGE_KEYS.bombFreeUsed) === "true";
    },

    saveBombFreeUsed(used) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.bombFreeUsed, used ? "true" : "false");
    },

    loadFreezeFreeUsed() {
      if (!storage) {
        return false;
      }

      return storage.getItem(STORAGE_KEYS.freezeFreeUsed) === "true";
    },

    saveFreezeFreeUsed(used) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.freezeFreeUsed, used ? "true" : "false");
    },

    loadRageFreeUsed() {
      if (!storage) {
        return false;
      }

      return storage.getItem(STORAGE_KEYS.rageFreeUsed) === "true";
    },

    saveRageFreeUsed(used) {
      if (!storage) {
        return;
      }

      storage.setItem(STORAGE_KEYS.rageFreeUsed, used ? "true" : "false");
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
