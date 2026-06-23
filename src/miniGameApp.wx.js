import { createAudioBus } from "./audio.js";
import { createBoardGenerator } from "./board.js";
import { DAILY_CHECK_IN_REWARDS, formatLocalDate, resolveDailyCheckIn } from "./checkIn.js";
import { GAME_CONFIG } from "./config.js";
import { createGameController } from "./gameState.js";
import { createLeaderboard, FAKE_LEADERBOARD_USERS, LEADERBOARD_BOARD_TYPES } from "./leaderboard.js";
import { createRenderer } from "./render.js";
import { createWeChatStorageAdapter } from "./storage.js";

const texts = {
  title: "弹球突围",
  bestRecord: "最高纪录",
  unfinishedProgress: "当前进度",
  levelValue: (level) => `第 ${level} 关`,
  continueChallenge: "继续游戏",
  play: "开始游戏",
  startNew: "开始新游戏",
  shop: "商店",
  brickSkins: "砖块",
  ballSkins: "小球",
  buy: "购买",
  selected: "已选择",
  use: "使用",
  coinsShort: "金币不足",
  best: "最高分",
  round: "回合",
  paused: "已暂停",
  settings: "设置",
  runOver: "本局结束",
  restart: "再来一局",
  mainMenu: "主菜单",
  resume: "继续游戏",
  soundLabel: "音效",
  vibrationLabel: "震动",
  soundOn: "开",
  soundOff: "关",
  done: "完成",
  reachedRound: (round) => `你打到了第 ${round} 回合`,
  shareContinue: "分享复活",
  shareContinueHintOne: "球球还没放弃！",
  shareContinueHintTwo: "分享到微信群立即复活 +1",
  shareContinueHintThree: "继续冲击更高分!",
  useHeartTitle: "使用爱心复活？",
  useHeartHint: "消耗 1 个爱心，继续挑战本局。",
  useHeart: "立即复活",
  noThanks: "放弃",
  dailyCheckIn: "每日签到",
  dailyStreak: (day) => `连续签到 ${day} 天`,
  dailyKeepGoing: "连续登录领大奖, 中断将从第 1 天重新开始",
  dailyResetHint: "",
  dailyReset: "连续签到中断，从第 1 天开始",
  dailyRewards: "每日奖励",
  leaderboard: "排行榜",
  totalRank: "总排名",
  myRank: "我的排名",
  rankPosition: (rank) => `第 ${rank} 名`,
  currentUser: "我",
  clearThreeRows: "消三行",
  clearPromptTitle: "提示",
  clearPromptDescription: "将清除最下面 3 行砖块，帮你缓解底部压力。",
  clearConfirm: "确认清除",
  clearAdConfirm: "看广告获取",
  clearLimitDescription: "每局最多使用 3 次清除功能，下一局可重新使用。",
  clearNoBlocks: "暂无可清除的砖块",
  clearAdLoading: "广告加载中",
  clearAdFailed: "广告暂时不可用，请稍后再试",
  clearAdRewarded: "已获得 1 个清除道具",
  claim: "领取",
  newRecord: "新纪录",
  brokePreviousRecord: (level) => `你已突破之前的第 ${level} 关纪录`,
  currentPlay: "本局到达",
  unfinishedTitle: "还有未完成的游戏",
  unfinishedLineOne: "继续上一局，还是开始新游戏？",
  unfinishedLineTwo: "开始新游戏会放弃当前进度。",
  speed: "加速"
};

const HEART_CONTINUE_PANEL_Y_SCALE = 0.23;
const HEART_CONTINUE_PANEL_MIN_HEIGHT = 230;
const HEART_CONTINUE_PANEL_MAX_HEIGHT = 252;
const CLEAR_TOOL_MAX_USES_PER_RUN = 3;
const CLEAR_TOOL_ROWS = 3;
const CLEAR_TOOL_AD_UNIT_ID = "adunit-fce0dbb1a75742d4";
const ITEM_TRAY_HEIGHT = 86;
const ITEM_TRAY_GAP = 8;
const CLEAR_ANIMATION_DURATION = 550;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function heartContinuePanelRect(rect) {
  const panelSideInset = 24;
  const panelHeight = clamp(
    rect.height * 0.5,
    HEART_CONTINUE_PANEL_MIN_HEIGHT,
    HEART_CONTINUE_PANEL_MAX_HEIGHT
  );
  return {
    x: rect.x + panelSideInset,
    y: rect.y + rect.height * HEART_CONTINUE_PANEL_Y_SCALE,
    width: rect.width - panelSideInset * 2,
    height: panelHeight
  };
}

function settingsPanelRect(rect) {
  const panelSideInset = 24;
  return {
    x: rect.x + panelSideInset,
    y: rect.y + rect.height * 0.24,
    width: rect.width - panelSideInset * 2,
    height: rect.height * 0.58
  };
}

function clearToolPanelRect(rect) {
  const panelSideInset = 24;
  const panelHeight = clamp(rect.height * 0.46, 292, 328);
  return {
    x: rect.x + panelSideInset,
    y: rect.y + rect.height * 0.22,
    width: rect.width - panelSideInset * 2,
    height: panelHeight
  };
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function easeOutCubic(amount) {
  const inverted = 1 - amount;
  return 1 - inverted * inverted * inverted;
}

function roundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function hitTest(button, point) {
  return (
    point.x >= button.x &&
    point.x <= button.x + button.width &&
    point.y >= button.y &&
    point.y <= button.y + button.height
  );
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadImageAsset(wxApi, canvas, src) {
  const image = wxApi.createImage?.() || canvas.createImage?.();
  if (!image) {
    return { image: null, loaded: false };
  }

  const asset = {
    image,
    loaded: false
  };

  image.onload = () => {
    asset.loaded = true;
  };
  image.onerror = () => {
    asset.loaded = false;
  };
  image.src = src;
  return asset;
}

function createSoundPlayer(wxApi, src, { poolSize = 1, volume = 0.4, cooldownMs = 0 } = {}) {
  if (!wxApi.createInnerAudioContext) {
    return {
      destroy() {},
      play() {}
    };
  }

  const players = Array.from({ length: poolSize }, () => {
    const audio = wxApi.createInnerAudioContext();
    audio.src = src;
    audio.loop = false;
    audio.autoplay = false;
    audio.volume = volume;
    return {
      audio,
      busy: false
    };
  });
  let nextIndex = 0;
  let lastPlayAt = 0;

  for (const player of players) {
    const release = () => {
      player.busy = false;
    };
    player.audio.onEnded?.(release);
    player.audio.onStop?.(release);
    player.audio.onError?.(release);
  }

  return {
    destroy() {
      for (const player of players) {
        player.audio.destroy?.();
      }
    },

    play() {
      const now = Date.now();

      if (now - lastPlayAt < cooldownMs) {
        return;
      }

      let availablePlayer = null;
      for (let offset = 0; offset < players.length; offset += 1) {
        const player = players[(nextIndex + offset) % players.length];
        if (!player.busy) {
          availablePlayer = player;
          nextIndex = (nextIndex + offset + 1) % players.length;
          break;
        }
      }

      if (!availablePlayer) {
        return;
      }

      lastPlayAt = now;
      availablePlayer.busy = true;
      const audio = availablePlayer.audio;
      if ("seek" in audio && typeof audio.seek === "function") {
        try {
          audio.seek(0);
        } catch {
          // Some runtimes do not allow seek before the first play; resetting is best-effort only.
        }
      }
      audio.play();
    }
  };
}

function createSharePayload(source = "menu-share") {
  return {
    title: "弹球突围 - 一起来挑战更高回合",
    imageUrl: "src/assets/pic/icon.png",
    query: `from=${source}`
  };
}

function enableWeChatShare(wxApi) {
  wxApi.showShareMenu?.({
    menus: ["shareAppMessage", "shareTimeline"]
  });

  wxApi.onShareAppMessage?.(() => createSharePayload());
  wxApi.onShareTimeline?.(() => createSharePayload());
}

const GAME_PROGRESS_VERSION = 1;

export function bootMiniGame(wxApi = globalThis.wx) {
  const systemInfo = wxApi.getSystemInfoSync();
  enableWeChatShare(wxApi);
  const canvas = wxApi.createCanvas();
  const pixelRatio = systemInfo.pixelRatio || 1;
  // WeChat real devices report a visible window area that can differ from the physical screen size.
  // Layout should follow the window bounds so the launcher and touch regions stay on-screen.
  const screenWidth = systemInfo.windowWidth || systemInfo.screenWidth;
  const screenHeight = systemInfo.windowHeight || systemInfo.screenHeight;

  canvas.width = screenWidth * pixelRatio;
  canvas.height = screenHeight * pixelRatio;

  const storage = createWeChatStorageAdapter(wxApi);
  const settings = storage.loadSettings();
  const audioBus = createAudioBus();
  audioBus.setEnabled(settings.soundEnabled);
  let vibrationEnabled = settings.vibrationEnabled !== false;
  const tutorialAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/tap.png");
  const settingsIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/settings.png");
  const coinIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/dollar.png");
  const heartIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/heart.png");
  const speedIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/fast-forward.png");
  const trophyIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/trophy.png");
  const confettiIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/confetti.png");
  const dailyRewardsIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/gift-box.png");
  const clearLinesIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/clear-lines.png");
  const adVideoIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/ad-video.png");
  const leaderboardAvatarAssets = Object.fromEntries(
    FAKE_LEADERBOARD_USERS.map((user) => [user.avatar, loadImageAsset(wxApi, canvas, user.avatar)])
  );
  const leaderboardCrownAssets = {
    1: loadImageAsset(wxApi, canvas, "src/assets/pic/crowns/crown-gold.png"),
    2: loadImageAsset(wxApi, canvas, "src/assets/pic/crowns/crown-silver.png"),
    3: loadImageAsset(wxApi, canvas, "src/assets/pic/crowns/crown-copper.png")
  };
  const ballSkinAssets = Object.fromEntries(
    GAME_CONFIG.skins.ball
      .map((skin) => skin.gameImage ?? skin.image)
      .filter(Boolean)
      .map((image) => [image, loadImageAsset(wxApi, canvas, image)])
  );
  const shopBallSkinAssets = Object.fromEntries(
    GAME_CONFIG.skins.ball
      .map((skin) => skin.storeImage ?? skin.image)
      .filter(Boolean)
      .map((image) => [image, loadImageAsset(wxApi, canvas, image)])
  );
  const renderer = createRenderer(canvas, GAME_CONFIG, {
    autoResize: false,
    pixelRatio,
    showRoundBanner: false,
    coinAsset: coinIconAsset,
    heartAsset: heartIconAsset,
    ballSkinAssets
  });
  renderer.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const hitSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/bubble_sound.m4a", {
    poolSize: 3,
    volume: 0.4,
    cooldownMs: 45
  });
  const coinSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/coin.mp3", {
    poolSize: 2,
    volume: 0.72
  });
  const cheerSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/cheer.mp3", {
    volume: 0.72
  });
  const reviveSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/revive.mp3", {
    volume: 0.76
  });
  const rewardedVideoAd = wxApi.createRewardedVideoAd?.({
    adUnitId: CLEAR_TOOL_AD_UNIT_ID
  });
  let lastClearVibrationAt = 0;

  function vibrateOnBrickClear() {
    if (!vibrationEnabled) {
      return;
    }

    const now = Date.now();
    if (now - lastClearVibrationAt < 80) {
      return;
    }

    lastClearVibrationAt = now;
    try {
      wxApi.vibrateShort?.({ type: "light" });
    } catch {
      // Vibration is a small tactile flourish; gameplay should never depend on it.
    }
  }

  const boardGenerator = createBoardGenerator(GAME_CONFIG);
  const game = createGameController({
    config: GAME_CONFIG,
    initialCoins: storage.loadCoins(),
    initialHearts: storage.loadHearts(),
    initialSkins: storage.loadSkins(),
    boardGenerator,
    audioBus
  });
  audioBus.onEvent(({ type }) => {
    if (type === "hit") {
      hitSoundPlayer.play();
    }
    if (type === "coin") {
      coinSoundPlayer.play();
    }
    if (type === "newRecord") {
      cheerSoundPlayer.play();
    }
    if (type === "revive") {
      reviveSoundPlayer.play();
    }
    if (type === "clear") {
      vibrateOnBrickClear();
    }
  });

  let screen = "menu";
  let overlay = null;
  let pointerActive = false;
  let bestScore = storage.loadBestScore();
  let runStartBestScore = bestScore;
  let touchStart = null;
  let lastTime = Date.now();
  let tutorialIdleTime = 0;
  let tutorialDismissed = false;
  let lastSavedProgressJson = null;
  let lastSavedProgressAt = 0;
  let hasStartedRun = false;
  let continueUsedThisRun = false;
  let gameOverResult = null;
  let newRecordCheerPlayed = false;
  let recordConfetti = null;
  let lastSavedCoins = storage.loadCoins();
  let lastSavedHearts = storage.loadHearts();
  let lastSavedSkinsJson = JSON.stringify(storage.loadSkins());
  let shopCategory = "brick";
  let pendingPurchase = null;
  let shopMessage = "";
  let shopBannerUntil = 0;
  let shopScrollY = 0;
  let shopDragStartY = 0;
  let shopDragStartScrollY = 0;
  let shopDragging = false;
  let leaderboardScrollY = 0;
  let leaderboardDragStartY = 0;
  let leaderboardDragStartScrollY = 0;
  let leaderboardDragging = false;
  let clearFreeItemAvailable = storage.loadClearFreeUsed() !== true;
  let clearAdItemsThisRun = 0;
  let clearUsesThisRun = 0;
  let clearToolMessage = "";
  let clearToolAnimation = null;
  let clearAdLoading = false;
  let pendingCheckIn = null;
  let dailyRewardsView = null;
  let dailyClaimAnimation = null;
  const scheduleFrame =
    globalThis.requestAnimationFrame?.bind(globalThis) ||
    wxApi.requestAnimationFrame?.bind(wxApi) ||
    ((callback) => setTimeout(() => callback(Date.now()), 16));

  function saveSettings() {
    storage.saveSettings({
      soundEnabled: audioBus.isEnabled(),
      vibrationEnabled,
      language: "zh-CN"
    });
  }

  function canvasRect() {
    const topInset = Math.max(systemInfo.safeArea?.top ?? 0, 18);
    const bottomInset = Math.max(screenHeight - (systemInfo.safeArea?.bottom ?? screenHeight), 16);
    const horizontalPadding = clamp(screenWidth * 0.035, 12, 18);
    const hudHeight = clamp(screenHeight * 0.14, 88, 132);
    const boardTop = topInset + hudHeight;
    const boardBottom = screenHeight - bottomInset - ITEM_TRAY_HEIGHT;
    const boardHeight = Math.max(160, boardBottom - boardTop);
    const boardWidth = Math.min(
      screenWidth - horizontalPadding * 2,
      boardHeight * (GAME_CONFIG.width / GAME_CONFIG.height)
    );

    return {
      x: (screenWidth - boardWidth) / 2,
      y: boardTop,
      width: boardWidth,
      height: boardWidth * (GAME_CONFIG.height / GAME_CONFIG.width),
      topInset,
      bottomInset,
      horizontalPadding
    };
  }

  function toGamePoint(point) {
    const rect = canvasRect();
    return {
      x: ((point.x - rect.x) / rect.width) * GAME_CONFIG.width,
      y: ((point.y - rect.y) / rect.height) * GAME_CONFIG.height
    };
  }

  function syncBestScore() {
    const state = game.getState();
    state.bestScore = Math.max(bestScore, state.score);
    if (state.bestScore > bestScore) {
      bestScore = state.bestScore;
      storage.saveBestScore(bestScore);
    }
  }

  function syncCoins() {
    const coins = game.getState().coins;
    if (coins !== lastSavedCoins) {
      storage.saveCoins(coins);
      lastSavedCoins = coins;
    }
  }

  function syncHearts() {
    const hearts = game.getState().heartCount;
    if (hearts !== lastSavedHearts) {
      storage.saveHearts(hearts);
      lastSavedHearts = hearts;
    }
  }

  function syncSkins() {
    const skinsJson = JSON.stringify(game.getState().skins);
    if (skinsJson !== lastSavedSkinsJson) {
      storage.saveSkins(game.getState().skins);
      lastSavedSkinsJson = skinsJson;
    }
  }

  function claimDailyCheckIn() {
    if (pendingCheckIn) {
      return;
    }

    const result = resolveDailyCheckIn(storage.loadDailyCheckIn(), formatLocalDate());
    if (!result.claimed) {
      return;
    }

    pendingCheckIn = result;
    dailyRewardsView = result;
    overlay = "daily-checkin";
  }

  function openDailyRewards() {
    if (dailyClaimAnimation) {
      return;
    }

    const result = resolveDailyCheckIn(storage.loadDailyCheckIn(), formatLocalDate());
    dailyRewardsView = result;
    pendingCheckIn = result.claimed ? result : null;
    overlay = "daily-checkin";
  }

  function collectDailyCheckInReward() {
    if (dailyClaimAnimation) {
      return;
    }

    if (!pendingCheckIn) {
      overlay = null;
      dailyRewardsView = null;
      return;
    }

    dailyClaimAnimation = {
      reward: pendingCheckIn.reward,
      startedAt: Date.now(),
      duration: 900
    };
  }

  function buildProgressPayload() {
    const snapshot = game.exportSnapshot();
    if (!snapshot || screen !== "game") {
      return null;
    }

    return {
      version: GAME_PROGRESS_VERSION,
      savedAt: Date.now(),
      continueUsedThisRun,
      runStartBestScore,
      clearFreeItemAvailable,
      clearAdItemsThisRun,
      clearUsesThisRun,
      snapshot
    };
  }

  function clearSavedProgress() {
    lastSavedProgressJson = null;
    storage.clearGameProgress();
  }

  function persistProgress(force = false) {
    const progress = buildProgressPayload();
    if (!progress) {
      if (force) {
        clearSavedProgress();
      }
      return;
    }

    const progressJson = JSON.stringify(progress);
    const now = Date.now();
    if (!force && progressJson === lastSavedProgressJson && now - lastSavedProgressAt < 1000) {
      return;
    }

    storage.saveGameProgress(progress);
    lastSavedProgressJson = progressJson;
    lastSavedProgressAt = now;
  }

  function loadSavedProgress() {
    const progress = storage.loadGameProgress();
    if (!progress || progress.version !== GAME_PROGRESS_VERSION || !progress.snapshot) {
      return null;
    }

    return progress;
  }

  function hasActiveUnfinishedRun() {
    return hasStartedRun && game.getState().state !== "gameover";
  }

  function hasUnfinishedRun() {
    if (hasActiveUnfinishedRun()) {
      return true;
    }

    return loadSavedProgress() !== null;
  }

  function itemTrayRect(rect) {
    const top = rect.y + rect.height + ITEM_TRAY_GAP;
    const bottom = screenHeight - rect.bottomInset;
    return {
      x: rect.x,
      y: top,
      width: rect.width,
      height: Math.max(0, bottom - top)
    };
  }

  function clearToolInventoryCount() {
    return (clearFreeItemAvailable ? 1 : 0) + clearAdItemsThisRun;
  }

  function clearToolButtonRect(rect) {
    const tray = itemTrayRect(rect);
    const size = clamp(Math.min(tray.height, 72), 58, 72);
    return {
      id: "clear-tool",
      x: tray.x + 12,
      y: tray.y + Math.max(0, (tray.height - size) / 2),
      width: size,
      height: size
    };
  }

  function clearToolPanelMode() {
    if (clearUsesThisRun >= CLEAR_TOOL_MAX_USES_PER_RUN) {
      return "limit";
    }
    return clearToolInventoryCount() > 0 ? "use" : "ad";
  }

  function openClearToolPanel() {
    if (clearToolAnimation) {
      return;
    }

    clearToolMessage = "";
    overlay = "clear-tool";
  }

  function consumeClearToolItem() {
    if (clearFreeItemAvailable) {
      clearFreeItemAvailable = false;
      storage.saveClearFreeUsed(true);
      return true;
    }

    if (clearAdItemsThisRun > 0) {
      clearAdItemsThisRun -= 1;
      return true;
    }

    return false;
  }

  function startClearToolAnimation(removedBlocks) {
    clearToolAnimation = {
      startedAt: Date.now(),
      duration: CLEAR_ANIMATION_DURATION,
      removedBlocks: removedBlocks.map((removed, index) => ({
        ...removed,
        angle: (index * 1.37) % (Math.PI * 2),
        drift: 18 + (index % 5) * 7
      }))
    };
  }

  function confirmClearToolUse() {
    if (clearToolPanelMode() !== "use") {
      requestClearToolAd();
      return;
    }

    if (game.getState().blocks.length === 0) {
      clearToolMessage = texts.clearNoBlocks;
      return;
    }

    if (!consumeClearToolItem()) {
      clearToolMessage = "";
      return;
    }

    clearUsesThisRun = Math.min(CLEAR_TOOL_MAX_USES_PER_RUN, clearUsesThisRun + 1);
    const result = game.clearLowestBlockRows(CLEAR_TOOL_ROWS);
    startClearToolAnimation(result.removedBlocks);
    overlay = null;
    persistProgress(true);
  }

  function requestClearToolAd() {
    if (clearAdLoading || clearUsesThisRun >= CLEAR_TOOL_MAX_USES_PER_RUN) {
      return;
    }

    if (!rewardedVideoAd) {
      clearToolMessage = texts.clearAdFailed;
      return;
    }

    clearAdLoading = true;
    clearToolMessage = texts.clearAdLoading;
    const showAd = () => rewardedVideoAd.show?.();
    Promise.resolve()
      .then(showAd)
      .catch(() => Promise.resolve(rewardedVideoAd.load?.()).then(() => rewardedVideoAd.show?.()))
      .catch(() => {
        clearAdLoading = false;
        clearToolMessage = texts.clearAdFailed;
      });
  }

  rewardedVideoAd?.onClose?.((result) => {
    clearAdLoading = false;
    if (result?.isEnded === true || result === undefined) {
      clearAdItemsThisRun += 1;
      clearToolMessage = texts.clearAdRewarded;
      persistProgress(true);
      return;
    }

    clearToolMessage = "";
  });
  rewardedVideoAd?.onError?.(() => {
    clearAdLoading = false;
    clearToolMessage = texts.clearAdFailed;
  });

  function currentRecordLevel() {
    return Math.max(1, Math.floor(bestScore) + 1);
  }

  function scoreToLevel(score) {
    return Math.max(1, Math.floor(score) + 1);
  }

  function hasBestRecord() {
    return bestScore > 0;
  }

  function resetRecordConfetti() {
    recordConfetti = null;
  }

  function startRecordConfetti() {
    if (recordConfetti?.started) {
      return;
    }

    const colors = ["#facc15", "#ef4444", "#22c55e", "#3b82f6", "#f97316", "#e879f9"];
    const particleCount = 50;
    const centerX = screenWidth / 2;
    const horizontalSpread = screenWidth * 0.76;
    recordConfetti = {
      started: true,
      particles: Array.from({ length: particleCount }, (_, index) => {
        const size = 5 + Math.random() * 6;
        return {
          x: centerX + (Math.random() - 0.5) * horizontalSpread,
          y: screenHeight + 8 + Math.random() * 28,
          vx: (Math.random() - 0.5) * 210,
          vy: -780 - Math.random() * 360 - (index % 5) * 18,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 9,
          width: size * (0.7 + Math.random() * 0.7),
          height: size * (1.7 + Math.random() * 1.2),
          color: colors[index % colors.length],
          gravity: 980 + Math.random() * 220
        };
      })
    };
  }

  function updateRecordConfetti(deltaTime) {
    if (!recordConfetti?.particles?.length) {
      return;
    }

    const cappedDelta = Math.min(deltaTime, 0.033);
    for (const particle of recordConfetti.particles) {
      particle.vy += particle.gravity * cappedDelta;
      particle.x += particle.vx * cappedDelta;
      particle.y += particle.vy * cappedDelta;
      particle.rotation += particle.rotationSpeed * cappedDelta;
    }

    recordConfetti.particles = recordConfetti.particles.filter((particle) => particle.y < screenHeight + 90);
  }

  function drawRecordConfetti(context) {
    if (!recordConfetti?.particles?.length) {
      return;
    }

    context.save();
    context.globalAlpha = 0.88;
    for (const particle of recordConfetti.particles) {
      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      context.restore();
    }
    context.restore();
  }

  function unfinishedProgressLevel() {
    if (hasActiveUnfinishedRun()) {
      return Math.max(1, Math.floor(game.getState().round));
    }

    const progress = loadSavedProgress();
    return progress?.snapshot
      ? Math.max(1, Math.floor(Number(progress.snapshot.round) || 1))
      : null;
  }

  function resumeSavedProgress() {
    const progress = loadSavedProgress();
    if (!progress) {
      return false;
    }

    const restored = game.importSnapshot(progress.snapshot);
    if (!restored) {
      clearSavedProgress();
      return false;
    }

    screen = "game";
    overlay = "pause";
    hasStartedRun = true;
    continueUsedThisRun = progress.continueUsedThisRun === true;
    clearFreeItemAvailable = progress.clearFreeItemAvailable !== false && storage.loadClearFreeUsed() !== true;
    clearAdItemsThisRun = Math.max(0, Math.floor(Number(progress.clearAdItemsThisRun) || 0));
    clearUsesThisRun = Math.max(0, Math.floor(Number(progress.clearUsesThisRun) || 0));
    clearToolMessage = "";
    clearToolAnimation = null;
    clearAdLoading = false;
    gameOverResult = null;
    newRecordCheerPlayed = false;
    resetRecordConfetti();
    bestScore = Math.max(bestScore, storage.loadBestScore());
    runStartBestScore = Number.isFinite(Number(progress.runStartBestScore))
      ? Math.max(0, Math.floor(Number(progress.runStartBestScore)))
      : bestScore;
    tutorialIdleTime = 0;
    tutorialDismissed = true;
    lastSavedProgressJson = JSON.stringify(progress);
    lastSavedProgressAt = Date.now();
    return true;
  }

  function continueFromMenu() {
    if (hasActiveUnfinishedRun()) {
      screen = "game";
      overlay = null;
      pointerActive = false;
      tutorialIdleTime = 0;
      persistProgress(true);
      return;
    }

    if (resumeSavedProgress()) {
      overlay = null;
      pointerActive = false;
      persistProgress(true);
    }
  }

  function startRun() {
    clearSavedProgress();
    bestScore = Math.max(bestScore, storage.loadBestScore());
    runStartBestScore = bestScore;
    clearFreeItemAvailable = storage.loadClearFreeUsed() !== true;
    clearAdItemsThisRun = 0;
    clearUsesThisRun = 0;
    clearToolMessage = "";
    clearToolAnimation = null;
    clearAdLoading = false;
    game.restart();
    hasStartedRun = true;
    continueUsedThisRun = false;
    gameOverResult = null;
    newRecordCheerPlayed = false;
    resetRecordConfetti();
    screen = "game";
    overlay = null;
    tutorialIdleTime = 0;
    tutorialDismissed = false;
    persistProgress(true);
  }

  function playFromMenu() {
    if (hasUnfinishedRun()) {
      overlay = "confirm-new-run";
      return;
    }

    startRun();
  }

  function goToMenu() {
    if (screen === "game" && game.getState().state !== "gameover") {
      persistProgress(true);
    }
    overlay = null;
    screen = "menu";
    pointerActive = false;
    tutorialIdleTime = 0;
    resetRecordConfetti();
  }

  function shareToContinue() {
    if (continueUsedThisRun || game.getState().state !== "gameover") {
      return;
    }

    try {
      wxApi.shareAppMessage?.(createSharePayload("loss-continue"));
    } catch {
      // Sharing is best-effort; continue is granted even if the share panel cannot open.
    }

    continueUsedThisRun = true;
    if (!game.continueFromGameOver()) {
      return;
    }

    screen = "game";
    overlay = null;
    hasStartedRun = true;
    pointerActive = false;
    gameOverResult = null;
    newRecordCheerPlayed = false;
    resetRecordConfetti();
    tutorialIdleTime = 0;
    tutorialDismissed = true;
    persistProgress(true);
  }

  function showFinalGameOver() {
    continueUsedThisRun = true;
    hasStartedRun = false;
    clearSavedProgress();
    overlay = "gameover";
  }

  function gameOverRecoveryOverlay(finalState) {
    if (!continueUsedThisRun) {
      return "gameover";
    }

    return finalState.heartCount > 0 ? "heart-continue" : "gameover";
  }

  function useHeartToContinue() {
    if (!game.consumeHeartContinue()) {
      return;
    }

    storage.saveHearts(game.getState().heartCount);
    lastSavedHearts = game.getState().heartCount;
    screen = "game";
    overlay = null;
    hasStartedRun = true;
    pointerActive = false;
    gameOverResult = null;
    newRecordCheerPlayed = false;
    resetRecordConfetti();
    tutorialIdleTime = 0;
    tutorialDismissed = true;
    persistProgress(true);
  }

  function openShop() {
    overlay = "shop";
    shopCategory = "brick";
    pendingPurchase = null;
    shopMessage = "";
    shopScrollY = 0;
  }

  function shopLayout() {
    const rect = canvasRect();
    const panel = {
      x: rect.x,
      y: rect.topInset,
      width: rect.width,
      height: screenHeight - rect.topInset - 12
    };
    const columns = 3;
    const gap = 10;
    const itemWidth = (panel.width - 32 - gap * (columns - 1)) / columns;
    const itemHeight = clamp(itemWidth * 1.34, 116, 146);
    const gridTop = panel.y + 166;
    const gridBottom = panel.y + panel.height - 24;
    const rowCount = Math.ceil(GAME_CONFIG.skins[shopCategory].length / columns);
    const contentHeight = rowCount * itemHeight + Math.max(0, rowCount - 1) * gap;
    const viewportHeight = gridBottom - gridTop;

    return {
      panel,
      columns,
      gap,
      itemWidth,
      itemHeight,
      gridTop,
      gridBottom,
      viewportHeight,
      maxScrollY: Math.max(0, contentHeight - viewportHeight)
    };
  }

  function clampShopScroll(value) {
    return clamp(value, 0, shopLayout().maxScrollY);
  }

  function isSkinOwned(category, skinId) {
    const skin = GAME_CONFIG.skins[category].find((candidate) => candidate.id === skinId);
    return Boolean(skin?.default) || game.getState().skins.owned[category].includes(skinId);
  }

  function handleSkinTap(category, skinId) {
    const skin = GAME_CONFIG.skins[category].find((candidate) => candidate.id === skinId);
    if (!skin) {
      return;
    }

    const skins = cloneSerializable(game.getState().skins);
    if (skin.default || skins.owned[category].includes(skin.id)) {
      skins.selected[category] = skin.default ? null : skin.id;
      game.setSkins(skins);
      syncSkins();
      pendingPurchase = null;
      shopMessage = texts.selected;
      return;
    }

    if (pendingPurchase?.category !== category || pendingPurchase.skinId !== skin.id) {
      pendingPurchase = { category, skinId: skin.id };
      shopMessage = "";
      return;
    }

    if (!game.spendCoins(skin.price)) {
      pendingPurchase = null;
      shopMessage = "";
      shopBannerUntil = Date.now() + 2000;
      return;
    }

    skins.owned[category].push(skin.id);
    skins.selected[category] = skin.id;
    game.setSkins(skins);
    syncCoins();
    syncSkins();
    pendingPurchase = null;
    shopMessage = texts.selected;
  }

  function shouldShowTutorial(state) {
    return (
      screen === "game" &&
      overlay === null &&
      !pointerActive &&
      !tutorialDismissed &&
      state.round === 1 &&
      state.state === "aiming" &&
      state.ballsLaunched === 0 &&
      tutorialIdleTime >= 2
    );
  }

  function currentButtons() {
    const rect = canvasRect();
    const layout = shopLayout();
    const gameOverPanelYScale = continueUsedThisRun ? 0.16 : 0.24;
    const gameOverPanelHeightScale = continueUsedThisRun ? 0.68 : 0.54;
    const confirmNewRunPanel = {
      x: rect.x + 24,
      y: rect.y + rect.height * 0.16,
      width: rect.width - 48,
      height: rect.height * 0.68
    };
    const gameOverPanel = {
      x: rect.x + 24,
      y: rect.y + rect.height * gameOverPanelYScale,
      width: rect.width - 48,
      height: rect.height * gameOverPanelHeightScale
    };
    const heartPanel = heartContinuePanelRect(rect);
    const checkInPanel = checkInPanelRect(rect);
    const settingsPanel = settingsPanelRect(rect);
    const clearToolPanel = clearToolPanelRect(rect);
    const pausePanel = {
      x: rect.x + 24,
      y: rect.y + rect.height * 0.16,
      width: rect.width - 48,
      height: rect.height * 0.68
    };
    const leaderboardPanel = leaderboardPanelRect(rect);

    if (screen === "menu") {
      const buttons = overlay === "shop" || overlay === "settings" || overlay === "confirm-new-run" || overlay === "daily-checkin" || overlay === "leaderboard"
        ? []
        : [
            {
              id: "menu-settings",
              x: rect.horizontalPadding,
              y: rect.topInset + 10,
              width: 60,
              height: 60
            }
          ];

      if (overlay === "confirm-new-run") {
        buttons.push(
          {
            id: "confirm-new-close",
            x: confirmNewRunPanel.x + confirmNewRunPanel.width - 44,
            y: confirmNewRunPanel.y + 20,
            width: 24,
            height: 24
          },
          {
            id: "confirm-new-continue",
            x: confirmNewRunPanel.x + 24,
            y: confirmNewRunPanel.y + confirmNewRunPanel.height - 138,
            width: confirmNewRunPanel.width - 48,
            height: 52
          },
          {
            id: "confirm-new-start",
            x: confirmNewRunPanel.x + 24,
            y: confirmNewRunPanel.y + confirmNewRunPanel.height - 76,
            width: confirmNewRunPanel.width - 48,
            height: 52
          }
        );
        return buttons;
      }

      if (overlay === "daily-checkin") {
        if (dailyClaimAnimation) {
          return buttons;
        }
        buttons.push({
          id: "daily-checkin-ok",
          x: checkInPanel.x + 36,
          y: checkInPanel.y + checkInPanel.height - 74,
          width: checkInPanel.width - 72,
          height: 52
        });
        return buttons;
      }

      if (overlay === "leaderboard") {
        buttons.push({
          id: "leaderboard-close",
          x: leaderboardPanel.x + leaderboardPanel.width - 44,
          y: leaderboardPanel.y + 20,
          width: 24,
          height: 24
        });
        return buttons;
      }

      if (overlay === null) {
        const hasProgress = hasUnfinishedRun();
        const firstButtonY = hasProgress ? rect.y + rect.height * 0.58 : rect.y + rect.height * 0.66;
        buttons.push({
          id: "daily-rewards",
          x: screenWidth - rect.horizontalPadding - 82,
          y: rect.topInset + 100,
          width: 82,
          height: 64
        });
        if (hasProgress) {
          buttons.push({
            id: "continue-challenge",
            x: rect.x + 30,
            y: firstButtonY,
            width: rect.width - 64,
            height: 56
          });
        }

        buttons.push(
          {
            id: "play",
            x: rect.x + 32,
            y: firstButtonY + (hasProgress ? 72 : 0),
            width: rect.width - 64,
            height: 56
          },
          {
            id: "shop",
            x: rect.x + 32,
            y: firstButtonY + (hasProgress ? 144 : 98),
            width: rect.width - 64,
            height: 56
          },
          {
            id: "leaderboard",
            x: rect.x + 32,
            y: firstButtonY + (hasProgress ? 216 : 170),
            width: rect.width - 64,
            height: 52
          }
        );
      }

      if (overlay === "settings") {
        buttons.push(
          {
            id: "toggle-sound",
            x: settingsPanel.x + settingsPanel.width - 142,
            y: settingsPanel.y + 92,
            width: 106,
            height: 48
          },
          {
            id: "toggle-vibration",
            x: settingsPanel.x + settingsPanel.width - 142,
            y: settingsPanel.y + 164,
            width: 106,
            height: 48
          },
          {
            id: "settings-done",
            x: settingsPanel.x + 36,
            y: settingsPanel.y + settingsPanel.height - 76,
            width: settingsPanel.width - 72,
            height: 52
          }
        );
      }

      if (overlay === "shop") {
        const tabWidth = (layout.panel.width - 44) / 2;
        buttons.push(
          { id: "shop-done", x: layout.panel.x + 4, y: layout.panel.y + 8, width: 58, height: 58 },
          { id: "shop-tab-brick", x: layout.panel.x + 12, y: layout.panel.y + 104, width: tabWidth, height: 44 },
          { id: "shop-tab-ball", x: layout.panel.x + 32 + tabWidth, y: layout.panel.y + 104, width: tabWidth, height: 44 }
        );

        for (let index = 0; index < GAME_CONFIG.skins[shopCategory].length; index += 1) {
          const col = index % layout.columns;
          const row = Math.floor(index / layout.columns);
          const y = layout.gridTop + row * (layout.itemHeight + layout.gap) - shopScrollY;
          if (y + layout.itemHeight < layout.gridTop || y > layout.gridBottom) {
            continue;
          }

          buttons.push({
            id: `skin-${shopCategory}-${index}`,
            x: layout.panel.x + 16 + col * (layout.itemWidth + layout.gap),
            y,
            width: layout.itemWidth,
            height: layout.itemHeight
          });
        }
      }

      return buttons;
    }

    if (overlay === "daily-checkin") {
      if (dailyClaimAnimation) {
        return [];
      }
      return [
        {
          id: "daily-checkin-ok",
          x: checkInPanel.x + 36,
          y: checkInPanel.y + checkInPanel.height - 74,
          width: checkInPanel.width - 72,
          height: 52
        }
      ];
    }

    if (overlay === "heart-continue") {
      return [
        {
          id: "heart-use",
          x: heartPanel.x + 24,
          y: heartPanel.y + heartPanel.height - 124,
          width: heartPanel.width - 48,
          height: 52
        },
        {
          id: "heart-decline",
          x: heartPanel.x + 24,
          y: heartPanel.y + heartPanel.height - 62,
          width: heartPanel.width - 48,
          height: 52
        }
      ];
    }

    const buttons = [
      {
        id: "pause",
        x: rect.horizontalPadding,
        y: rect.topInset + 10,
        width: 46,
        height: 46
      }
    ];

    if (game.getState().speedUpAvailable && overlay === null) {
      buttons.push({
        id: "speed",
        x: rect.x + rect.width - 110,
        y: rect.y + 10,
        width: 100,
        height: 42
      });
    }

    if (overlay === null && game.getState().state !== "gameover") {
      buttons.push(clearToolButtonRect(rect));
    }

    if (overlay === "pause") {
      const buttonHeight = 52;
      const contentTop = pausePanel.y + 82;
      const contentBottom = pausePanel.y + pausePanel.height - 28;
      const usableHeight = Math.max(buttonHeight * 3, contentBottom - contentTop);
      const buttonGap = clamp((usableHeight - buttonHeight * 3) / 2, 10, 24);
      const buttonStackHeight = buttonHeight * 3 + buttonGap * 2;
      const firstButtonY = contentTop + Math.max(0, (usableHeight - buttonStackHeight) / 2);
      buttons.push(
        { id: "resume", x: pausePanel.x + 36, y: firstButtonY, width: pausePanel.width - 72, height: buttonHeight },
        { id: "settings", x: pausePanel.x + 36, y: firstButtonY + buttonHeight + buttonGap, width: pausePanel.width - 72, height: buttonHeight },
        { id: "menu", x: pausePanel.x + 36, y: firstButtonY + (buttonHeight + buttonGap) * 2, width: pausePanel.width - 72, height: buttonHeight }
      );
    }

    if (overlay === "settings") {
      buttons.push(
        {
          id: "toggle-sound",
          x: settingsPanel.x + settingsPanel.width - 142,
          y: settingsPanel.y + 92,
          width: 106,
          height: 48
        },
        {
          id: "toggle-vibration",
          x: settingsPanel.x + settingsPanel.width - 142,
          y: settingsPanel.y + 164,
          width: 106,
          height: 48
        },
        {
          id: "settings-done",
          x: settingsPanel.x + 36,
          y: settingsPanel.y + settingsPanel.height - 76,
          width: settingsPanel.width - 72,
          height: 52
        }
      );
    }

    if (overlay === "clear-tool") {
      buttons.push({
        id: "clear-tool-close",
        x: clearToolPanel.x + clearToolPanel.width - 44,
        y: clearToolPanel.y + 20,
        width: 24,
        height: 24
      });

      if (clearToolPanelMode() !== "limit") {
        buttons.push({
          id: "clear-tool-confirm",
          x: clearToolPanel.x + 32,
          y: clearToolPanel.y + clearToolPanel.height - 76,
          width: clearToolPanel.width - 64,
          height: 52
        });
      }
    }

    if (overlay === "gameover") {
      buttons.push({
        id: "gameover-close",
        x: gameOverPanel.x + gameOverPanel.width - 44,
        y: gameOverPanel.y + 20,
        width: 24,
        height: 24
      });

      if (!continueUsedThisRun) {
        buttons.push({
          id: "share-continue",
          x: gameOverPanel.x + 24,
          y: gameOverPanel.y + gameOverPanel.height - 76,
          width: gameOverPanel.width - 48,
          height: 52
        });
      } else {
        buttons.push({
          id: "restart",
          x: gameOverPanel.x + 24,
          y: gameOverPanel.y + gameOverPanel.height - 76,
          width: gameOverPanel.width - 48,
          height: 52
        });
      }
    }

    return buttons;
  }

  function handleButton(id) {
    switch (id) {
      case "continue-challenge":
        continueFromMenu();
        break;
      case "play":
        playFromMenu();
        break;
      case "confirm-new-close":
        overlay = null;
        break;
      case "confirm-new-continue":
        continueFromMenu();
        break;
      case "confirm-new-start":
        startRun();
        break;
      case "shop":
        openShop();
        break;
      case "shop-tab-brick":
        shopCategory = "brick";
        pendingPurchase = null;
        shopMessage = "";
        shopScrollY = 0;
        break;
      case "shop-tab-ball":
        shopCategory = "ball";
        pendingPurchase = null;
        shopMessage = "";
        shopScrollY = 0;
        break;
      case "shop-done":
        overlay = null;
        pendingPurchase = null;
        shopMessage = "";
        break;
      case "restart":
        startRun();
        break;
      case "share-continue":
        shareToContinue();
        break;
      case "heart-use":
        useHeartToContinue();
        break;
      case "heart-decline":
        showFinalGameOver();
        break;
      case "daily-checkin-ok":
        collectDailyCheckInReward();
        break;
      case "daily-rewards":
        openDailyRewards();
        break;
      case "leaderboard":
        leaderboardScrollY = 0;
        overlay = "leaderboard";
        break;
      case "leaderboard-close":
        leaderboardScrollY = 0;
        leaderboardDragging = false;
        overlay = null;
        break;
      case "gameover-close":
        if (!continueUsedThisRun) {
          showFinalGameOver();
          break;
        }
        goToMenu();
        break;
      case "pause":
        if (overlay === null && game.getState().state !== "gameover") {
          overlay = "pause";
        }
        break;
      case "speed":
        game.activateSpeedUp();
        break;
      case "clear-tool":
        openClearToolPanel();
        break;
      case "clear-tool-close":
        clearAdLoading = false;
        clearToolMessage = "";
        overlay = null;
        break;
      case "clear-tool-confirm":
        confirmClearToolUse();
        break;
      case "resume":
        overlay = null;
        persistProgress(true);
        break;
      case "settings":
      case "menu-settings":
        overlay = "settings";
        break;
      case "toggle-sound":
        audioBus.setEnabled(!audioBus.isEnabled());
        saveSettings();
        break;
      case "toggle-vibration":
        vibrationEnabled = !vibrationEnabled;
        saveSettings();
        break;
      case "settings-done":
        overlay = screen === "menu" ? null : "pause";
        break;
      case "menu":
        goToMenu();
        break;
      default:
        if (id.startsWith("skin-")) {
          const index = Number(id.split("-").pop());
          const skin = GAME_CONFIG.skins[shopCategory][index];
          if (skin) {
            handleSkinTap(shopCategory, skin.id);
          }
        }
        break;
    }
  }

  function drawButton(context, button, label, primary = false, subtitle = null) {
    if (!button) {
      return;
    }

    roundedRect(context, button.x, button.y, button.width, button.height, 24);
    const isContinueButton = button.id === "share-continue" ||
      button.id === "continue-challenge" ||
      button.id === "confirm-new-continue";
    context.fillStyle = isContinueButton
      ? "#22c55e"
      : primary
        ? "#f2b400"
        : button.id === "shop"
          ? "#2f80ed"
          : "rgba(255,255,255,0.08)";
    context.fill();
    if (button.id !== "speed") {
      context.strokeStyle = isContinueButton
        ? "rgba(255,255,255,0.18)"
        : primary
          ? "rgba(0,0,0,0.08)"
          : "rgba(255,255,255,0.12)";
      context.lineWidth = 1;
      context.stroke();
    }
    const usesDarkButtonText = primary || isContinueButton || button.id === "shop";
    context.fillStyle = usesDarkButtonText ? "#1d1d1d" : "#fbfbfb";
    context.font = "700 20px sans-serif";
    context.textBaseline = "middle";

    if (button.id === "speed" && speedIconAsset.loaded && speedIconAsset.image) {
      const iconSize = 20;
      const gap = 6;
      const textWidth = context.measureText(label).width;
      const contentX = button.x + (button.width - iconSize - gap - textWidth) / 2;
      const centerY = button.y + button.height / 2;
      context.drawImage(speedIconAsset.image, contentX, centerY - iconSize / 2, iconSize, iconSize);
      context.textAlign = "left";
      context.fillText(label, contentX + iconSize + gap, centerY + 1);
      return;
    }

    if (button.id === "heart-use") {
      const iconSize = 24;
      const gap = 8;
      const textWidth = context.measureText(label).width;
      const contentX = button.x + (button.width - iconSize - gap - textWidth) / 2;
      const centerY = button.y + button.height / 2;
      if (heartIconAsset.loaded && heartIconAsset.image) {
        context.drawImage(heartIconAsset.image, contentX, centerY - iconSize / 2, iconSize, iconSize);
      } else {
        context.beginPath();
        context.arc(contentX + iconSize / 2, centerY, iconSize / 2, 0, Math.PI * 2);
        context.fillStyle = "#ff6f8e";
        context.fill();
        context.fillStyle = usesDarkButtonText ? "#1d1d1d" : "#fbfbfb";
      }
      context.textAlign = "left";
      context.fillText(label, contentX + iconSize + gap, centerY + 1);
      return;
    }

    context.textAlign = "center";
    if (subtitle) {
      context.font = "700 19px sans-serif";
      context.fillText(label, button.x + button.width / 2, button.y + button.height / 2 - 8);
      context.fillStyle = usesDarkButtonText ? "rgba(29,29,29,0.72)" : "rgba(255,255,255,0.78)";
      context.font = "600 14px sans-serif";
      context.fillText(subtitle, button.x + button.width / 2, button.y + button.height / 2 + 15);
      return;
    }

    context.fillText(label, button.x + button.width / 2, button.y + button.height / 2 + 1);
  }

  function drawShopItem(context, button, skin, category) {
    const state = game.getState();
    const owned = isSkinOwned(category, skin.id);
    const selected = skin.default
      ? state.skins.selected[category] === null
      : state.skins.selected[category] === skin.id;
    const pending = pendingPurchase?.category === category && pendingPurchase.skinId === skin.id;
    const sampleSize = Math.min(button.width * 0.64, button.height * 0.54);
    const sampleX = button.x + button.width / 2;
    const sampleY = button.y + 18 + sampleSize / 2;
    const priceY = button.y + button.height - 28;

    roundedRect(context, button.x, button.y, button.width, button.height, 8);
    context.fillStyle = selected ? "rgba(134,239,172,0.18)" : "rgba(255,255,255,0.08)";
    context.fill();
    context.strokeStyle = selected ? "rgba(134,239,172,0.78)" : "rgba(255,255,255,0.12)";
    context.lineWidth = 1;
    context.stroke();

    if (category === "ball") {
      const storeImage = skin.storeImage ?? skin.image;
      const asset = storeImage ? shopBallSkinAssets[storeImage] : null;
      if (asset?.loaded && asset.image) {
        context.drawImage(
          asset.image,
          sampleX - sampleSize / 2,
          sampleY - sampleSize / 2,
          sampleSize,
          sampleSize
        );
      } else {
        context.fillStyle = skin.color;
        context.beginPath();
        context.arc(sampleX, sampleY, sampleSize / 2, 0, Math.PI * 2);
        context.fill();
      }
    } else {
      drawBrickSample(context, sampleX - sampleSize / 2, sampleY - sampleSize / 2, sampleSize, skin);
    }

    const label = selected ? texts.selected : owned ? texts.use : pending ? texts.buy : String(skin.price);
    const tagWidth = Math.min(button.width - 18, 76);
    const tagHeight = 26;
    roundedRect(context, sampleX - tagWidth / 2, priceY - tagHeight / 2, tagWidth, tagHeight, tagHeight / 2);
    context.fillStyle = selected
      ? "#86efac"
      : owned
        ? "rgba(255,255,255,0.18)"
        : pending
          ? "#f2b400"
          : "#0ea5a6";
    context.fill();

    context.fillStyle = selected || pending ? "#1d1d1d" : "#fbfbfb";
    context.font = "800 15px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, sampleX - (!owned && !pending && coinIconAsset.loaded ? 7 : 0), priceY + 1);
    if (!owned && !pending && coinIconAsset.loaded && coinIconAsset.image) {
      context.drawImage(coinIconAsset.image, sampleX + 14, priceY - 9, 18, 18);
    }
  }

  function drawBrickSample(context, x, y, size, skin) {
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    const accent = skin.accent ?? "rgba(255,255,255,0.72)";

    context.save();
    context.fillStyle = skin.color;
    context.fillRect(x, y, size, size);
    context.beginPath();
    context.rect(x, y, size, size);
    context.clip();

    context.globalAlpha = 0.72;
    context.strokeStyle = accent;
    context.fillStyle = accent;
    context.lineWidth = Math.max(2, size * 0.05);

    if (skin.pattern === "sunburst") {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(centerX + Math.cos(angle) * size, centerY + Math.sin(angle) * size);
        context.stroke();
      }
      context.beginPath();
      context.arc(centerX, centerY, size * 0.22, 0, Math.PI * 2);
      context.fill();
    } else if (skin.pattern === "candy") {
      context.lineWidth = Math.max(7, size * 0.15);
      for (let offset = -size; offset < size * 2; offset += size * 0.42) {
        context.beginPath();
        context.moveTo(x + offset, y + size);
        context.lineTo(x + offset + size, y);
        context.stroke();
      }
    } else if (skin.pattern === "heart") {
      context.beginPath();
      context.arc(x + size * 0.4, y + size * 0.38, size * 0.13, 0, Math.PI * 2);
      context.arc(x + size * 0.6, y + size * 0.38, size * 0.13, 0, Math.PI * 2);
      context.moveTo(x + size * 0.28, y + size * 0.45);
      context.lineTo(centerX, y + size * 0.72);
      context.lineTo(x + size * 0.72, y + size * 0.45);
      context.closePath();
      context.fill();
    } else if (skin.pattern === "prism") {
      context.beginPath();
      context.moveTo(centerX, y + size * 0.12);
      context.lineTo(x + size * 0.84, centerY);
      context.lineTo(centerX, y + size * 0.88);
      context.lineTo(x + size * 0.16, centerY);
      context.closePath();
      context.stroke();
      context.beginPath();
      context.moveTo(centerX, y + size * 0.12);
      context.lineTo(centerX, y + size * 0.88);
      context.moveTo(x + size * 0.16, centerY);
      context.lineTo(x + size * 0.84, centerY);
      context.stroke();
    } else if (skin.pattern === "ice") {
      context.lineWidth = Math.max(1.5, size * 0.03);
      context.beginPath();
      context.moveTo(x + size * 0.18, y + size * 0.22);
      context.lineTo(x + size * 0.82, y + size * 0.38);
      context.lineTo(x + size * 0.58, y + size * 0.86);
      context.moveTo(x + size * 0.28, y + size * 0.78);
      context.lineTo(x + size * 0.48, y + size * 0.16);
      context.lineTo(x + size * 0.88, y + size * 0.72);
      context.stroke();
    } else if (skin.pattern === "circuit") {
      const tracks = [
        [0.16, 0.28, 0.78, 0.28],
        [0.22, 0.54, 0.68, 0.54],
        [0.34, 0.78, 0.84, 0.78]
      ];
      for (const [x1, y1, x2, y2] of tracks) {
        context.beginPath();
        context.moveTo(x + size * x1, y + size * y1);
        context.lineTo(x + size * x2, y + size * y2);
        context.stroke();
        context.beginPath();
        context.arc(x + size * x2, y + size * y2, size * 0.045, 0, Math.PI * 2);
        context.fill();
      }
    } else if (skin.pattern === "slime") {
      context.beginPath();
      context.arc(x + size * 0.28, y + size * 0.32, size * 0.1, 0, Math.PI * 2);
      context.arc(x + size * 0.7, y + size * 0.26, size * 0.07, 0, Math.PI * 2);
      context.arc(x + size * 0.58, y + size * 0.72, size * 0.12, 0, Math.PI * 2);
      context.fill();
    } else if (skin.pattern === "leaf") {
      context.beginPath();
      context.ellipse(centerX, centerY, size * 0.18, size * 0.34, Math.PI / 4, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(x + size * 0.28, y + size * 0.72);
      context.lineTo(x + size * 0.72, y + size * 0.28);
      context.stroke();
    } else if (skin.pattern === "lava") {
      context.lineWidth = Math.max(4, size * 0.07);
      context.beginPath();
      context.moveTo(x + size * 0.22, y);
      context.lineTo(x + size * 0.38, y + size * 0.34);
      context.lineTo(x + size * 0.3, y + size * 0.58);
      context.lineTo(x + size * 0.52, y + size);
      context.moveTo(x + size * 0.72, y + size * 0.04);
      context.lineTo(x + size * 0.6, y + size * 0.44);
      context.lineTo(x + size * 0.82, y + size * 0.78);
      context.stroke();
    } else if (skin.pattern === "marble") {
      context.lineWidth = Math.max(2, size * 0.035);
      for (let offset = -0.1; offset < 1.2; offset += 0.28) {
        context.beginPath();
        context.moveTo(x + size * offset, y + size);
        context.bezierCurveTo(
          x + size * (offset + 0.18),
          y + size * 0.72,
          x + size * (offset - 0.05),
          y + size * 0.36,
          x + size * (offset + 0.22),
          y
        );
        context.stroke();
      }
    }

    context.globalAlpha = 1;
    const shine = context.createLinearGradient(x, y, x + size, y + size);
    shine.addColorStop(0, "rgba(255,255,255,0.24)");
    shine.addColorStop(0.48, "rgba(255,255,255,0)");
    shine.addColorStop(1, "rgba(0,0,0,0.18)");
    context.fillStyle = shine;
    context.fillRect(x, y, size, size);
    context.strokeStyle = "rgba(255,255,255,0.18)";
    context.lineWidth = 2;
    context.strokeRect(x, y, size, size);
    context.restore();
  }

  function drawShopOverlay(context, rect) {
    const layout = shopLayout();
    const panel = layout.panel;

    context.fillStyle = "rgba(0,0,0,0.62)";
    context.fillRect(0, 0, screenWidth, screenHeight);

    context.fillStyle = "#fbfbfb";
    context.font = "800 36px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(texts.shop, screenWidth / 2, panel.y + 48);

    context.save();
    context.strokeStyle = "#fbfbfb";
    context.lineWidth = 8;
    context.lineCap = "square";
    context.beginPath();
    context.moveTo(panel.x + 38, panel.y + 24);
    context.lineTo(panel.x + 18, panel.y + 48);
    context.lineTo(panel.x + 38, panel.y + 72);
    context.stroke();
    context.restore();

    drawButton(context, currentButtons().find((button) => button.id === "shop-tab-brick"), texts.brickSkins, shopCategory === "brick");
    drawButton(context, currentButtons().find((button) => button.id === "shop-tab-ball"), texts.ballSkins, shopCategory === "ball");

    if (Date.now() < shopBannerUntil) {
      const bannerWidth = 142;
      const bannerHeight = 38;
      roundedRect(context, screenWidth / 2 - bannerWidth / 2, panel.y + 70, bannerWidth, bannerHeight, bannerHeight / 2);
      context.fillStyle = "#f2b400";
      context.fill();
      context.fillStyle = "#1d1d1d";
      context.font = "800 18px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(texts.coinsShort, screenWidth / 2, panel.y + 89);
    }

    context.save();
    context.beginPath();
    context.rect(panel.x, layout.gridTop, panel.width, layout.viewportHeight);
    context.clip();
    for (const button of currentButtons().filter((candidate) => candidate.id.startsWith("skin-"))) {
      const index = Number(button.id.split("-").pop());
      drawShopItem(context, button, GAME_CONFIG.skins[shopCategory][index], shopCategory);
    }
    context.restore();

    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.fillText(shopMessage, screenWidth / 2, panel.y + panel.height - 8);
  }

  function drawToggle(context, button, enabled) {
    roundedRect(context, button.x, button.y, button.width, button.height, button.height / 2);
    context.fillStyle = enabled ? "#f2b400" : "rgba(255,255,255,0.14)";
    context.fill();
    context.strokeStyle = enabled ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.16)";
    context.lineWidth = 1;
    context.stroke();

    const knobSize = button.height - 8;
    const knobX = enabled ? button.x + button.width - knobSize - 4 : button.x + 4;
    const knobY = button.y + 4;

    context.beginPath();
    context.arc(knobX + knobSize / 2, knobY + knobSize / 2, knobSize / 2, 0, Math.PI * 2);
    context.fillStyle = "#fbfbfb";
    context.fill();

    context.fillStyle = enabled ? "#1d1d1d" : "rgba(255,255,255,0.82)";
    context.font = "700 18px sans-serif";
    context.textAlign = enabled ? "left" : "right";
    context.textBaseline = "middle";
    context.fillText(
      enabled ? texts.soundOn : texts.soundOff,
      enabled ? button.x + 16 : button.x + button.width - 16,
      button.y + button.height / 2 + 1
    );
  }

  function drawGearButton(context, button) {
    if (!button) {
      return;
    }

    roundedRect(context, button.x, button.y, button.width, button.height, 16);
    context.fillStyle = "#171717";
    context.fill();

    if (settingsIconAsset.loaded && settingsIconAsset.image) {
      const iconInset = 1;
      context.drawImage(
        settingsIconAsset.image,
        button.x + iconInset,
        button.y + iconInset,
        button.width - iconInset * 2,
        button.height - iconInset * 2
      );
    }
  }

  function drawDailyRewardsButton(context, button) {
    if (!button) {
      return;
    }

    context.save();
    const centerX = button.x + button.width / 2;
    const iconSize = 46;
    const iconX = centerX - iconSize / 2;
    const iconY = button.y;
    if (dailyRewardsIconAsset.loaded && dailyRewardsIconAsset.image) {
      context.drawImage(
        dailyRewardsIconAsset.image,
        iconX,
        iconY,
        iconSize,
        iconSize
      );
    } else {
      roundedRect(context, iconX, iconY, iconSize, iconSize, 12);
      context.fillStyle = "#f2b400";
      context.fill();
      context.strokeStyle = "rgba(0,0,0,0.18)";
      context.lineWidth = 2;
      context.stroke();
    }

    const labelHeight = 22;
    const labelWidth = Math.min(button.width, 76);
    const labelX = centerX - labelWidth / 2;
    const labelY = iconY + iconSize + 5;
    roundedRect(context, labelX, labelY - labelHeight / 2, labelWidth, labelHeight, labelHeight / 2);
    context.fillStyle = "rgba(12,32,72,0.82)";
    context.fill();

    const maxTextWidth = labelWidth - 10;
    let fontSize = 14;
    context.font = `900 ${fontSize}px sans-serif`;
    const measuredWidth = context.measureText(texts.dailyRewards).width;
    if (measuredWidth > maxTextWidth) {
      fontSize = Math.max(12, Math.floor(fontSize * (maxTextWidth / measuredWidth)));
      context.font = `900 ${fontSize}px sans-serif`;
    }
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.lineJoin = "round";
    context.lineWidth = 4;
    context.strokeStyle = "rgba(0,0,0,0.72)";
    context.strokeText(texts.dailyRewards, centerX, labelY);
    context.fillStyle = "#fff7d6";
    context.fillText(texts.dailyRewards, centerX, labelY);
    context.restore();
  }

  function drawLeaderboardAvatar(context, row, x, y, size) {
    context.save();
    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.clip();
    const asset = row.avatar ? leaderboardAvatarAssets[row.avatar] : null;
    if (asset?.loaded && asset.image) {
      context.drawImage(asset.image, x, y, size, size);
    } else {
      context.fillStyle = row.isCurrentUser ? "#f2b400" : row.avatarColor ?? "#38bdf8";
      context.fillRect(x, y, size, size);
      context.fillStyle = row.isCurrentUser ? "#1d1d1d" : "#fbfbfb";
      context.font = `900 ${Math.max(13, size * 0.42)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(row.isCurrentUser ? texts.currentUser : "★", x + size / 2, y + size / 2 + 1);
    }
    context.restore();

    context.beginPath();
    context.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    context.strokeStyle = row.isCurrentUser ? "#facc15" : "rgba(255,255,255,0.22)";
    context.lineWidth = row.isCurrentUser ? 2 : 1;
    context.stroke();
  }

  function drawFittedText(context, text, x, y, maxWidth, fontWeight, fontSize, color, align = "left") {
    let resolvedSize = fontSize;
    context.font = `${fontWeight} ${resolvedSize}px sans-serif`;
    const measuredWidth = context.measureText(text).width;
    if (measuredWidth > maxWidth) {
      resolvedSize = Math.max(10, Math.floor(resolvedSize * (maxWidth / measuredWidth)));
      context.font = `${fontWeight} ${resolvedSize}px sans-serif`;
    }
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(text, x, y);
  }

  function leaderboardRankText(row) {
    return row.rank ? texts.rankPosition(row.rank) : row.rankLabel;
  }

  function drawLeaderboardRankBadge(context, x, y, width, height, row, highlight = false) {
    roundedRect(context, x, y, width, height, height / 2);
    context.fillStyle = highlight ? "rgba(250,204,21,0.18)" : "rgba(10,15,35,0.72)";
    context.fill();
    context.strokeStyle = highlight ? "rgba(250,204,21,0.76)" : "rgba(250,204,21,0.42)";
    context.lineWidth = 1;
    context.stroke();
    context.textBaseline = "middle";
    drawFittedText(
      context,
      leaderboardRankText(row),
      x + width / 2,
      y + height / 2 + 1,
      width - 12,
      900,
      12,
      highlight ? "#facc15" : "#fde68a",
      "center"
    );
  }

  function drawLeaderboardRow(context, panel, row, y, rowHeight, highlight = false) {
    const inset = 16;
    const rowX = panel.x + inset;
    const rowWidth = panel.width - inset * 2;
    const radius = Math.min(16, rowHeight / 2);
    roundedRect(context, rowX, y, rowWidth, rowHeight, radius);
    context.fillStyle = highlight
      ? "rgba(250,204,21,0.15)"
      : "rgba(255,255,255,0.08)";
    context.fill();
    context.strokeStyle = highlight ? "rgba(250,204,21,0.34)" : "rgba(255,255,255,0.08)";
    context.lineWidth = 1;
    context.stroke();

    const rankBadgeWidth = row.rank >= 10 ? 56 : 50;
    const rankBadgeHeight = 24;
    const rankBadgeX = rowX + rowWidth - rankBadgeWidth - 10;
    const rankBadgeY = y + (rowHeight - rankBadgeHeight) / 2;
    drawLeaderboardRankBadge(context, rankBadgeX, rankBadgeY, rankBadgeWidth, rankBadgeHeight, row, highlight);

    const avatarSize = Math.min(38, rowHeight - 8);
    const avatarX = rowX + 10;
    drawLeaderboardAvatar(context, row, avatarX, y + (rowHeight - avatarSize) / 2, avatarSize);

    const nameX = avatarX + avatarSize + 10;
    const maxTextWidth = rankBadgeX - nameX - 10;
    const levelText = texts.levelValue(row.bestLevel);
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    drawFittedText(
      context,
      row.displayName ?? maskDisplayFallback(row),
      nameX,
      y + rowHeight / 2 - 4,
      maxTextWidth,
      900,
      13,
      highlight ? "#fef3c7" : "#fbfbfb"
    );
    drawFittedText(
      context,
      levelText,
      nameX,
      y + rowHeight / 2 + 14,
      maxTextWidth,
      900,
      12,
      highlight ? "#facc15" : "#22c55e"
    );
  }

  function drawFallbackCrown(context, x, y, width, height, accentColor) {
    context.save();
    context.fillStyle = accentColor;
    context.strokeStyle = "rgba(56,20,0,0.62)";
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(x + width * 0.1, y + height * 0.42);
    context.lineTo(x + width * 0.28, y + height * 0.54);
    context.lineTo(x + width * 0.5, y + height * 0.16);
    context.lineTo(x + width * 0.72, y + height * 0.54);
    context.lineTo(x + width * 0.9, y + height * 0.42);
    context.lineTo(x + width * 0.82, y + height * 0.82);
    context.lineTo(x + width * 0.18, y + height * 0.82);
    context.closePath();
    context.fill();
    context.stroke();
    roundedRect(context, x + width * 0.16, y + height * 0.78, width * 0.68, height * 0.14, 4);
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawLeaderboardCrown(context, row, x, y, size, accentColor) {
    const asset = leaderboardCrownAssets[row.rank];
    if (asset?.loaded && asset.image) {
      context.drawImage(asset.image, x, y, size, size);
      return;
    }
    drawFallbackCrown(context, x + size * 0.1, y + size * 0.2, size * 0.8, size * 0.6, accentColor);
  }

  function drawLeaderboardTopCard(context, card, row, accentColor) {
    roundedRect(context, card.x, card.y, card.width, card.height, 18);
    const gradient = context.createLinearGradient(card.x, card.y, card.x, card.y + card.height);
    gradient.addColorStop(0, "rgba(255,255,255,0.16)");
    gradient.addColorStop(1, "rgba(255,255,255,0.04)");
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = accentColor;
    context.lineWidth = row.rank === 1 ? 2 : 1;
    context.stroke();

    const rankBadgeWidth = row.rank === 1 ? 64 : 58;
    const rankBadgeHeight = 24;
    drawLeaderboardRankBadge(
      context,
      card.x + (card.width - rankBadgeWidth) / 2,
      card.y + 10,
      rankBadgeWidth,
      rankBadgeHeight,
      row,
      row.rank === 1
    );

    const avatarSize = row.rank === 1 ? 64 : 54;
    const avatarX = card.x + (card.width - avatarSize) / 2;
    const avatarY = card.y + (row.rank === 1 ? 62 : 58);
    const crownSize = row.rank === 1 ? 36 : 30;
    drawLeaderboardAvatar(
      context,
      row,
      avatarX,
      avatarY,
      avatarSize
    );
    drawLeaderboardCrown(
      context,
      row,
      card.x + (card.width - crownSize) / 2,
      avatarY - crownSize * 0.78,
      crownSize,
      accentColor
    );

    const nameY = card.y + card.height - 34;
    const levelY = card.y + card.height - 14;
    const textMaxWidth = card.width - 12;
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    drawFittedText(
      context,
      row.displayName ?? maskDisplayFallback(row),
      card.x + card.width / 2,
      nameY,
      textMaxWidth,
      900,
      12,
      "#fbfbfb",
      "center"
    );
    drawFittedText(
      context,
      texts.levelValue(row.bestLevel),
      card.x + card.width / 2,
      levelY,
      textMaxWidth,
      900,
      12,
      "#38bdf8",
      "center"
    );
  }

  function maskDisplayFallback(row) {
    return row.isCurrentUser ? texts.currentUser : row.nickname ?? "";
  }

  function drawCurrentUserRankCard(context, panel, row, y, height) {
    const inset = 16;
    const cardX = panel.x + inset;
    const cardWidth = panel.width - inset * 2;
    roundedRect(context, cardX, y, cardWidth, height, 18);
    context.fillStyle = "rgba(250,204,21,0.16)";
    context.fill();
    context.strokeStyle = "rgba(250,204,21,0.58)";
    context.lineWidth = 1;
    context.stroke();

    const avatarSize = Math.min(42, height - 14);
    const avatarX = cardX + 12;
    const avatarY = y + (height - avatarSize) / 2;
    drawLeaderboardAvatar(context, row, avatarX, avatarY, avatarSize);

    const nameX = avatarX + avatarSize + 10;
    const rankText = texts.rankPosition(row.rank);
    const rankMaxWidth = Math.min(116, cardWidth * 0.42);
    const rankX = cardX + cardWidth - 12;
    const nameMaxWidth = rankX - rankMaxWidth - nameX - 12;

    context.textBaseline = "alphabetic";
    drawFittedText(
      context,
      texts.myRank,
      nameX,
      y + height / 2 - 7,
      Math.max(52, nameMaxWidth),
      800,
      12,
      "rgba(255,255,255,0.66)"
    );
    drawFittedText(
      context,
      texts.levelValue(row.bestLevel),
      nameX,
      y + height / 2 + 13,
      Math.max(52, nameMaxWidth),
      900,
      13,
      "#facc15"
    );

    context.textAlign = "right";
    drawFittedText(
      context,
      rankText,
      rankX,
      y + height / 2 + 8,
      rankMaxWidth,
      900,
      20,
      "#fff7d6",
      "right"
    );
  }

  function leaderboardListMetrics(panel) {
    const topY = panel.y + 78;
    const topCardHeight = 154;
    const rowsTop = topY + topCardHeight + 12;
    const footerHeight = 62;
    const footerGap = 8;
    const footerY = panel.y + panel.height - footerHeight - 14;
    const viewportHeight = Math.max(120, footerY - footerGap - rowsTop);
    return {
      rowsTop,
      footerY,
      footerHeight,
      viewportHeight,
      rowHeight: 40,
      rowGap: 4
    };
  }

  function clampLeaderboardScroll(rowCount, metrics) {
    const contentHeight = rowCount * metrics.rowHeight + Math.max(0, rowCount - 1) * metrics.rowGap;
    return clamp(leaderboardScrollY, 0, Math.max(0, contentHeight - metrics.viewportHeight));
  }

  function drawLeaderboardOverlay(context, panel) {
    const board = createLeaderboard({
      currentBestLevel: currentRecordLevel(),
      boardType: LEADERBOARD_BOARD_TYPES.total
    });

    const contentX = panel.x + 14;
    const contentWidth = panel.width - 28;
    const topY = panel.y + 78;
    const cardGap = 6;
    const centerCardWidth = Math.min(98, contentWidth * 0.34);
    const sideCardWidth = (contentWidth - centerCardWidth - cardGap * 2) / 2;
    const topCardHeight = 154;
    const topRows = board.topRows.slice(0, 3);
    const topCards = [
      {
        row: topRows[1],
        x: contentX,
        y: topY + 16,
        width: sideCardWidth,
        height: topCardHeight - 16,
        color: "#c7d2fe"
      },
      {
        row: topRows[0],
        x: contentX + sideCardWidth + cardGap,
        y: topY,
        width: centerCardWidth,
        height: topCardHeight,
        color: "#facc15"
      },
      {
        row: topRows[2],
        x: contentX + sideCardWidth + cardGap + centerCardWidth + cardGap,
        y: topY + 22,
        width: sideCardWidth,
        height: topCardHeight - 22,
        color: "#fb923c"
      }
    ];

    for (const card of topCards) {
      if (card.row) {
        drawLeaderboardTopCard(context, card, card.row, card.color);
      }
    }

    const metrics = leaderboardListMetrics(panel);
    const listRows = board.rankedRows.filter((row) => !row.isCurrentUser).slice(3);
    leaderboardScrollY = clampLeaderboardScroll(listRows.length, metrics);

    context.save();
    context.beginPath();
    context.rect(panel.x, metrics.rowsTop, panel.width, metrics.viewportHeight);
    context.clip();

    for (let index = 0; index < listRows.length; index += 1) {
      const row = listRows[index];
      const rowY = metrics.rowsTop + index * (metrics.rowHeight + metrics.rowGap) - leaderboardScrollY;
      if (rowY + metrics.rowHeight < metrics.rowsTop || rowY > metrics.rowsTop + metrics.viewportHeight) {
        continue;
      }
      drawLeaderboardRow(context, panel, row, rowY, metrics.rowHeight, row.isCurrentUser);
    }
    context.restore();

    const contentHeight = listRows.length * metrics.rowHeight + Math.max(0, listRows.length - 1) * metrics.rowGap;
    if (contentHeight > metrics.viewportHeight) {
      const trackHeight = metrics.viewportHeight;
      const thumbHeight = clamp((metrics.viewportHeight / contentHeight) * trackHeight, 32, trackHeight);
      const thumbY = metrics.rowsTop + (leaderboardScrollY / (contentHeight - metrics.viewportHeight)) * (trackHeight - thumbHeight);
      roundedRect(context, panel.x + panel.width - 8, metrics.rowsTop, 3, trackHeight, 2);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fill();
      roundedRect(context, panel.x + panel.width - 8, thumbY, 3, thumbHeight, 2);
      context.fillStyle = "rgba(250,204,21,0.62)";
      context.fill();
    }

    drawCurrentUserRankCard(context, panel, board.currentUser, metrics.footerY, metrics.footerHeight);
  }

  function drawCoinCounter(context, x, y, coins, align = "right") {
    const iconSize = 32;
    const text = String(coins);
    context.save();
    context.font = "800 26px sans-serif";
    const textWidth = context.measureText(text).width;
    const totalWidth = iconSize + 6 + textWidth;
    const startX = align === "right" ? x - totalWidth : x;

    if (coinIconAsset.loaded && coinIconAsset.image) {
      context.drawImage(coinIconAsset.image, startX, y - iconSize / 2, iconSize, iconSize);
    } else {
      context.beginPath();
      context.arc(startX + iconSize / 2, y, iconSize / 2, 0, Math.PI * 2);
      context.fillStyle = "#f2b400";
      context.fill();
      context.fillStyle = "#1d1d1d";
      context.font = "800 18px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("$", startX + iconSize / 2, y + 1);
      context.font = "800 26px sans-serif";
    }

    context.fillStyle = "#fbfbfb";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(text, startX + iconSize + 6, y + 1);
    context.restore();
  }

  function drawHeartCounter(context, x, y, hearts, align = "right") {
    const iconSize = 32;
    const text = String(hearts);
    context.save();
    context.font = "800 26px sans-serif";
    const textWidth = context.measureText(text).width;
    const totalWidth = iconSize + 6 + textWidth;
    const startX = align === "right" ? x - totalWidth : x;

    if (heartIconAsset.loaded && heartIconAsset.image) {
      context.drawImage(heartIconAsset.image, startX, y - iconSize / 2, iconSize, iconSize);
    } else {
      context.beginPath();
      context.arc(startX + iconSize / 2, y, iconSize / 2, 0, Math.PI * 2);
      context.fillStyle = "#ff6f8e";
      context.fill();
      context.fillStyle = "#fbfbfb";
      context.font = "800 18px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("+", startX + iconSize / 2, y + 1);
      context.font = "800 26px sans-serif";
    }

    context.fillStyle = "#fbfbfb";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(text, startX + iconSize + 6, y + 1);
    context.restore();
  }

  function drawTopRightResourceCounters(context, rect, state, yOffset = 0) {
    drawCoinCounter(context, screenWidth - rect.horizontalPadding, rect.topInset + 40 + yOffset, state.coins);
    drawHeartCounter(context, screenWidth - rect.horizontalPadding, rect.topInset + 78 + yOffset, state.heartCount);
  }

  function drawCheckInRewardItem(context, item, x, y, options = {}) {
    if (!item || item.amount <= 0) {
      return;
    }

    const iconSize = options.iconSize ?? 16;
    const fontSize = options.fontSize ?? 13;
    const gap = options.gap ?? 3;
    const text = String(item.amount);
    context.save();
    context.font = `900 ${fontSize}px sans-serif`;
    const textWidth = context.measureText(text).width;
    const totalWidth = iconSize + gap + textWidth;
    const startX = x - totalWidth / 2;

    if (item.asset.loaded && item.asset.image) {
      context.drawImage(item.asset.image, startX, y - iconSize / 2, iconSize, iconSize);
    } else {
      context.beginPath();
      context.arc(startX + iconSize / 2, y, iconSize / 2, 0, Math.PI * 2);
      context.fillStyle = item.color;
      context.fill();
      context.fillStyle = item.fallbackColor;
      context.font = `900 ${Math.max(10, fontSize - 2)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(item.fallback, startX + iconSize / 2, y + 1);
      context.font = `900 ${fontSize}px sans-serif`;
    }

    context.fillStyle = options.textColor ?? "#fbfbfb";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(text, startX + iconSize + gap, y + 1);
    context.restore();
  }

  function drawRewardIcon(context, item, centerX, centerY, size, alpha = 1) {
    context.save();
    context.globalAlpha = alpha;
    if (item.asset.loaded && item.asset.image) {
      context.drawImage(item.asset.image, centerX - size / 2, centerY - size / 2, size, size);
    } else {
      context.beginPath();
      context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
      context.fillStyle = item.color;
      context.fill();
      context.fillStyle = item.fallbackColor;
      context.font = `900 ${Math.max(12, size * 0.5)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(item.fallback, centerX, centerY + 1);
    }
    context.restore();
  }

  function checkInRewardItems(reward) {
    return [
      {
        type: "coin",
        asset: coinIconAsset,
        fallback: "$",
        color: "#f2b400",
        fallbackColor: "#1d1d1d",
        amount: reward?.coins ?? 0
      },
      {
        type: "heart",
        asset: heartIconAsset,
        fallback: "+",
        color: "#ff6f8e",
        fallbackColor: "#fbfbfb",
        amount: reward?.hearts ?? 0
      }
    ].filter((item) => item.amount > 0);
  }

  function checkInPanelRect(rect) {
    const panelSideInset = 18;
    return {
      x: rect.x + panelSideInset,
      y: rect.y + rect.height * 0.04,
      width: rect.width - panelSideInset * 2,
      height: rect.height * 0.9
    };
  }

  function leaderboardPanelRect(rect) {
    const panelSideInset = 18;
    return {
      x: rect.x + panelSideInset,
      y: rect.topInset + 72,
      width: rect.width - panelSideInset * 2,
      height: screenHeight - rect.topInset - 104
    };
  }

  function checkInRewardCardLayout(panel, day) {
    const gridTop = panel.y + 122;
    const cardGap = 10;
    const cardHeight = 66;
    const gridInset = 24;
    const index = day - 1;
    const isTopRow = index < 4;
    const rowIndex = isTopRow ? index : index - 4;
    const topCardWidth = (panel.width - gridInset * 2 - cardGap * 3) / 4;
    const bottomCardWidth = (panel.width - gridInset * 2 - cardGap * 2) / 3;
    const cardWidth = isTopRow ? topCardWidth : bottomCardWidth;
    const rowWidth = isTopRow
      ? topCardWidth * 4 + cardGap * 3
      : bottomCardWidth * 3 + cardGap * 2;

    return {
      x: panel.x + (panel.width - rowWidth) / 2 + rowIndex * (cardWidth + cardGap),
      y: gridTop + (isTopRow ? 0 : cardHeight + cardGap),
      width: cardWidth,
      height: cardHeight
    };
  }

  function drawCheckInDayCard(context, card, dayReward, active, claimed) {
    const isBigReward = Boolean(dayReward.big);
    const radius = 10;
    roundedRect(context, card.x, card.y, card.width, card.height, radius);
    context.fillStyle = active
      ? "#f2b400"
      : claimed
        ? "rgba(34,197,94,0.22)"
        : "rgba(255,255,255,0.08)";
    context.fill();
    context.strokeStyle = active
      ? "rgba(255,255,255,0.4)"
      : claimed
        ? "rgba(74,222,128,0.62)"
        : isBigReward
          ? "rgba(255,209,90,0.9)"
          : "rgba(255,255,255,0.12)";
    context.lineWidth = active || isBigReward ? 2 : 1;
    context.stroke();

    if (isBigReward && !claimed && !active) {
      context.save();
      context.shadowColor = "rgba(250,204,21,0.55)";
      context.shadowBlur = 12;
      roundedRect(context, card.x + 2, card.y + 2, card.width - 4, card.height - 4, radius - 2);
      context.strokeStyle = "rgba(250,204,21,0.45)";
      context.lineWidth = 1;
      context.stroke();
      context.restore();
    }

    const labelColor = active ? "#1d1d1d" : claimed ? "#bbf7d0" : "rgba(255,255,255,0.82)";
    context.fillStyle = labelColor;
    context.font = "900 13px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`第${dayReward.day}天`, card.x + card.width / 2, card.y + 15);

    const rewardItems = [
      {
        asset: coinIconAsset,
        fallback: "$",
        color: "#f2b400",
        fallbackColor: "#1d1d1d",
        amount: dayReward.coins
      },
      {
        asset: heartIconAsset,
        fallback: "+",
        color: "#ff6f8e",
        fallbackColor: "#fbfbfb",
        amount: dayReward.hearts
      }
    ].filter((item) => item.amount > 0);

    if (rewardItems.length > 1) {
      const rewardYs = [card.y + 31, card.y + 47];
      for (let index = 0; index < rewardItems.length; index += 1) {
        drawCheckInRewardItem(context, rewardItems[index], card.x + card.width / 2, rewardYs[index], {
        iconSize: 13,
        fontSize: 11,
        gap: 2,
        textColor: active ? "#1d1d1d" : claimed ? "#dcfce7" : "#fbfbfb"
      });
      }
      return;
    }

    const rewardY = card.y + 38;
    for (let index = 0; index < rewardItems.length; index += 1) {
      const itemX = card.x + card.width / 2;
      drawCheckInRewardItem(context, rewardItems[index], itemX, rewardY, {
        iconSize: 16,
        fontSize: 13,
        gap: 2,
        textColor: active ? "#1d1d1d" : claimed ? "#dcfce7" : "#fbfbfb"
      });
    }
  }

  function counterIconTarget(context, rect, type, state) {
    const iconSize = 32;
    const text = type === "coin" ? String(state.coins) : String(state.heartCount);
    context.save();
    context.font = "800 26px sans-serif";
    const textWidth = context.measureText(text).width;
    context.restore();
    const totalWidth = iconSize + 6 + textWidth;
    return {
      x: screenWidth - rect.horizontalPadding - totalWidth + iconSize / 2,
      y: rect.topInset + (type === "coin" ? 40 : 78)
    };
  }

  function drawDailyClaimAnimation(context, state, rect, panel) {
    if (!dailyClaimAnimation) {
      return;
    }

    const elapsed = Date.now() - dailyClaimAnimation.startedAt;
    const progress = clamp(elapsed / dailyClaimAnimation.duration, 0, 1);
    const reward = dailyClaimAnimation.reward;
    const card = checkInRewardCardLayout(panel, reward.day);
    const items = checkInRewardItems(reward);
    const sourceX = card.x + card.width / 2;
    const sourceY = card.y + card.height / 2;

    if (elapsed < 150) {
      const pulse = Math.sin((elapsed / 150) * Math.PI);
      const inset = -6 - pulse * 6;
      context.save();
      roundedRect(
        context,
        card.x + inset,
        card.y + inset,
        card.width - inset * 2,
        card.height - inset * 2,
        14
      );
      context.strokeStyle = `rgba(250,204,21,${0.35 + pulse * 0.45})`;
      context.lineWidth = 2 + pulse * 2;
      context.stroke();
      context.restore();
    }

    if (progress >= 0.75) {
      const glow = Math.sin(clamp((progress - 0.75) / 0.25, 0, 1) * Math.PI);
      for (const item of items) {
        const target = counterIconTarget(context, rect, item.type, state);
        context.save();
        context.beginPath();
        context.arc(target.x, target.y, 28 + glow * 10, 0, Math.PI * 2);
        context.strokeStyle = item.type === "coin"
          ? `rgba(250,204,21,${0.18 + glow * 0.32})`
          : `rgba(255,111,142,${0.18 + glow * 0.32})`;
        context.lineWidth = 2;
        context.stroke();
        context.restore();
      }
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const itemDelay = 150 + index * 90;
      const itemDuration = 600;
      const flight = clamp((elapsed - itemDelay) / itemDuration, 0, 1);
      if (flight <= 0 || flight >= 1) {
        continue;
      }

      const eased = easeOutCubic(flight);
      const target = counterIconTarget(context, rect, item.type, state);
      const arcLift = Math.sin(flight * Math.PI) * 46;
      const x = lerp(sourceX, target.x, eased);
      const y = lerp(sourceY, target.y, eased) - arcLift;
      const size = lerp(34, 22, eased);
      const alpha = 1 - Math.max(0, flight - 0.82) / 0.18;

      drawRewardIcon(context, item, x, y, size, alpha);

      context.save();
      context.globalAlpha = 0.55 * alpha;
      context.fillStyle = item.type === "coin" ? "#facc15" : "#ff8fab";
      for (let spark = 0; spark < 3; spark += 1) {
        const angle = spark * Math.PI * 0.72 + flight * Math.PI * 2;
        context.beginPath();
        context.arc(
          x - Math.cos(angle) * (10 + spark * 3),
          y - Math.sin(angle) * (8 + spark * 2),
          2,
          0,
          Math.PI * 2
        );
        context.fill();
      }
      context.restore();
    }

    drawCoinCounter(context, screenWidth - rect.horizontalPadding, rect.topInset + 40, state.coins);
    drawHeartCounter(context, screenWidth - rect.horizontalPadding, rect.topInset + 78, state.heartCount);
  }

  function drawClearToolButton(context, rect) {
    const button = currentButtons().find((candidate) => candidate.id === "clear-tool");
    if (!button) {
      return;
    }

    const count = clearToolInventoryCount();
    const disabled = clearToolAnimation || clearUsesThisRun >= CLEAR_TOOL_MAX_USES_PER_RUN;
    const tray = itemTrayRect(rect);
    context.save();
    roundedRect(context, tray.x, tray.y, tray.width, tray.height, 18);
    context.fillStyle = "rgba(10,15,35,0.22)";
    context.fill();

    roundedRect(context, button.x, button.y, button.width, button.height, 16);
    context.fillStyle = disabled ? "rgba(255,255,255,0.1)" : "rgba(250,204,21,0.18)";
    context.fill();
    context.strokeStyle = count > 0 ? "rgba(250,204,21,0.78)" : "rgba(255,255,255,0.18)";
    context.lineWidth = 2;
    context.stroke();

    const iconSize = button.width * 0.58;
    const iconX = button.x + (button.width - iconSize) / 2;
    const iconY = button.y + 7;
    context.globalAlpha = disabled ? 0.45 : 1;
    if (clearLinesIconAsset.loaded && clearLinesIconAsset.image) {
      context.drawImage(clearLinesIconAsset.image, iconX, iconY, iconSize, iconSize);
    } else {
      context.fillStyle = "#facc15";
      roundedRect(context, iconX, iconY + iconSize * 0.45, iconSize, iconSize * 0.32, 6);
      context.fill();
      context.fillStyle = "#ef4444";
      context.fillRect(iconX + 4, iconY + iconSize * 0.48, iconSize - 8, 5);
      context.fillStyle = "#38bdf8";
      context.fillRect(iconX + 4, iconY + iconSize * 0.62, iconSize - 8, 5);
    }
    context.globalAlpha = 1;

    context.fillStyle = disabled ? "rgba(255,255,255,0.45)" : "#fbfbfb";
    context.font = "800 12px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillText(texts.clearThreeRows, button.x + button.width / 2, button.y + button.height - 8);

    roundedRect(context, button.x + button.width - 33, button.y - 8, 40, 28, 14);
    context.fillStyle = count > 0 ? "#22c55e" : "rgba(255,255,255,0.16)";
    context.fill();
    context.fillStyle = count > 0 ? "#052e16" : "rgba(255,255,255,0.72)";
    context.font = "900 16px sans-serif";
    context.textBaseline = "middle";
    context.fillText(`x${count}`, button.x + button.width - 13, button.y + 6);
    context.restore();
  }

  function drawClearToolPanel(context, panel) {
    const mode = clearToolPanelMode();
    const confirmButton = currentButtons().find((button) => button.id === "clear-tool-confirm");
    const iconSize = 38;
    const centerX = panel.x + panel.width / 2;
    const iconY = panel.y + 66;

    if (clearLinesIconAsset.loaded && clearLinesIconAsset.image) {
      context.drawImage(clearLinesIconAsset.image, centerX - iconSize / 2, iconY, iconSize, iconSize);
    }

    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    const lines = mode === "limit"
      ? ["每局最多使用 3 次清除功能，", "下一局可重新使用。"]
      : ["将清除最下面 3 行砖块，", "帮你缓解底部压力。"];
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], centerX, panel.y + 132 + index * 24);
    }

    if (clearToolMessage) {
      context.fillStyle = clearToolMessage === texts.clearAdFailed ? "#fca5a5" : "#facc15";
      context.font = "700 14px sans-serif";
      context.fillText(clearToolMessage, centerX, confirmButton ? confirmButton.y - 16 : panel.y + panel.height - 42);
    }

    if (confirmButton) {
      drawButton(
        context,
        confirmButton,
        mode === "ad" ? texts.clearAdConfirm : texts.clearConfirm,
        true
      );
      if (mode === "ad" && adVideoIconAsset.loaded && adVideoIconAsset.image) {
        const iconButtonSize = 22;
        context.drawImage(
          adVideoIconAsset.image,
          confirmButton.x + 20,
          confirmButton.y + (confirmButton.height - iconButtonSize) / 2,
          iconButtonSize,
          iconButtonSize
        );
      }
    }
  }

  function drawClearToolAnimation(context, rect) {
    if (!clearToolAnimation) {
      return;
    }

    const elapsed = Date.now() - clearToolAnimation.startedAt;
    const progress = clamp(elapsed / clearToolAnimation.duration, 0, 1);
    if (progress >= 1) {
      clearToolAnimation = null;
      return;
    }

    context.save();
    context.translate(rect.x, rect.y);
    const pulse = Math.sin(clamp(progress / 0.22, 0, 1) * Math.PI);
    for (const removed of clearToolAnimation.removedBlocks) {
      const scaleX = rect.width / GAME_CONFIG.width;
      const scaleY = rect.height / GAME_CONFIG.height;
      const x = removed.x * scaleX;
      const y = removed.y * scaleY;
      const size = removed.size * scaleX;

      if (progress < 0.25) {
        roundedRect(context, x - 5 * pulse, y - 5 * pulse, size + 10 * pulse, size + 10 * pulse, 8);
        context.strokeStyle = `rgba(250,204,21,${0.25 + pulse * 0.55})`;
        context.lineWidth = 2 + pulse * 2;
        context.stroke();
      }

      const burst = clamp((progress - 0.18) / 0.58, 0, 1);
      const alpha = Math.max(0, 1 - burst);
      if (burst > 0 && alpha > 0) {
        context.globalAlpha = alpha;
        context.fillStyle = removed.block?.column % 2 === 0 ? "#facc15" : "#fb923c";
        for (let index = 0; index < 4; index += 1) {
          const angle = removed.angle + index * Math.PI * 0.5;
          const drift = removed.drift * burst;
          context.fillRect(
            x + size / 2 + Math.cos(angle) * drift - 4,
            y + size / 2 + Math.sin(angle) * drift - 18 * burst - 4,
            8,
            8
          );
        }
        context.globalAlpha = 1;
      }
    }

    const sweep = clamp((progress - 0.68) / 0.28, 0, 1);
    if (sweep > 0 && sweep < 1) {
      const sweepYValues = clearToolAnimation.removedBlocks.map((removed) => removed.y * (rect.height / GAME_CONFIG.height));
      const minY = Math.min(...sweepYValues);
      const maxY = Math.max(...sweepYValues);
      const y = lerp(minY, maxY, sweep);
      const gradient = context.createLinearGradient(0, y, rect.width, y);
      gradient.addColorStop(0, "rgba(250,204,21,0)");
      gradient.addColorStop(0.5, "rgba(255,255,255,0.82)");
      gradient.addColorStop(1, "rgba(250,204,21,0)");
      context.strokeStyle = gradient;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(rect.width, y);
      context.stroke();
    }

    context.restore();
  }

  function drawColoredTitle(context, x, y) {
    const colors = ["#ef4444", "#facc15", "#3b82f6", "#22c55e"];
    const characters = Array.from(texts.title);
    context.save();
    context.font = "700 48px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    const widths = characters.map((character) => context.measureText(character).width);
    const totalWidth = widths.reduce((sum, width) => sum + width, 0);
    let cursorX = x - totalWidth / 2;

    for (let index = 0; index < characters.length; index += 1) {
      context.fillStyle = colors[index] ?? "#fbfbfb";
      context.fillText(characters[index], cursorX, y);
      cursorX += widths[index];
    }

    context.restore();
  }

  function drawTrophyIcon(context, x, y, size, color) {
    const cupTop = y + size * 0.2;
    const cupWidth = size * 0.5;
    const cupHeight = size * 0.34;
    const cupX = x + (size - cupWidth) / 2;

    context.save();
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = Math.max(2, size * 0.08);
    context.lineCap = "round";
    context.lineJoin = "round";

    roundedRect(context, cupX, cupTop, cupWidth, cupHeight, size * 0.08);
    context.fill();

    context.beginPath();
    context.arc(cupX, cupTop + cupHeight * 0.24, size * 0.18, Math.PI * 0.5, Math.PI * 1.5);
    context.arc(cupX + cupWidth, cupTop + cupHeight * 0.24, size * 0.18, Math.PI * 1.5, Math.PI * 0.5);
    context.stroke();

    context.fillRect(x + size * 0.44, y + size * 0.54, size * 0.12, size * 0.18);
    roundedRect(context, x + size * 0.31, y + size * 0.7, size * 0.38, size * 0.1, size * 0.04);
    context.fill();
    context.restore();
  }

  function drawMenuStat(context, x, y, width, label, level, accentColor) {
    const height = 70;
    const iconSize = 42;
    const iconX = x - width / 2 + 20;
    const labelX = iconX + iconSize + 14;
    roundedRect(context, x - width / 2, y, width, height, 14);
    context.fillStyle = "rgba(255,255,255,0.055)";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.09)";
    context.lineWidth = 1;
    context.stroke();

    if (trophyIconAsset.loaded && trophyIconAsset.image) {
      context.drawImage(trophyIconAsset.image, iconX, y + (height - iconSize) / 2, iconSize, iconSize);
    } else {
      drawTrophyIcon(context, iconX, y + (height - iconSize) / 2, iconSize, accentColor);
    }

    const textAreaRight = x + width / 2 - 18;
    const textCenterX = labelX + (textAreaRight - labelX) / 2;

    context.fillStyle = accentColor;
    context.font = "700 16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    context.fillText(label, textCenterX, y + 25);

    const baselineY = y + 58;
    context.font = "800 22px sans-serif";
    const prefixWidth = context.measureText("第").width;
    context.font = "900 34px sans-serif";
    const numberWidth = context.measureText(String(level)).width;
    context.font = "800 22px sans-serif";
    const suffixWidth = context.measureText("关").width;
    const levelTextX = textCenterX - (prefixWidth + 4 + numberWidth + 10 + suffixWidth) / 2;

    context.fillStyle = "#fbfbfb";
    context.textAlign = "left";
    context.fillText("第", levelTextX, baselineY);

    context.font = "900 34px sans-serif";
    context.fillStyle = "#ef4444";
    context.fillText(String(level), levelTextX + prefixWidth + 4, baselineY);

    context.font = "800 22px sans-serif";
    context.fillStyle = "#fbfbfb";
    context.fillText("关", levelTextX + prefixWidth + numberWidth + 10, baselineY);
  }

  function drawMenuStats(context, rect) {
    if (!hasBestRecord()) {
      return;
    }

    const recordLevel = currentRecordLevel();
    const statTop = rect.y + 174;
    const statWidth = Math.min(248, rect.width - 76);

    drawMenuStat(
      context,
      screenWidth / 2,
      statTop,
      statWidth,
      texts.bestRecord,
      recordLevel,
      "#facc15"
    );
  }

  function drawLevelText(context, centerX, baselineY, level, numberSize = 34) {
    context.font = "800 22px sans-serif";
    const prefixWidth = context.measureText("第").width;
    context.font = `900 ${numberSize}px sans-serif`;
    const numberWidth = context.measureText(String(level)).width;
    context.font = "800 22px sans-serif";
    const suffixWidth = context.measureText("关").width;
    const startX = centerX - (prefixWidth + 4 + numberWidth + 10 + suffixWidth) / 2;

    context.textAlign = "left";
    context.fillStyle = "#fbfbfb";
    context.font = "800 22px sans-serif";
    context.fillText("第", startX, baselineY);
    context.fillStyle = "#ef4444";
    context.font = `900 ${numberSize}px sans-serif`;
    context.fillText(String(level), startX + prefixWidth + 4, baselineY);
    context.fillStyle = "#fbfbfb";
    context.font = "800 22px sans-serif";
    context.fillText("关", startX + prefixWidth + 4 + numberWidth + 10, baselineY);
    context.textAlign = "center";
  }

  function drawFinalScoreResult(context, panel, result, state) {
    const currentLevel = result?.currentLevel ?? scoreToLevel(state.score);
    const previousRecordLevel = result?.previousRecordLevel ?? currentRecordLevel();
    const brokeRecord = result?.brokeRecord === true;
    const restartButton = currentButtons().find((button) => button.id === "restart");
    const contentTop = panel.y + 82;
    const contentBottom = restartButton ? restartButton.y - 16 : panel.y + panel.height - 92;
    const availableHeight = Math.max(116, contentBottom - contentTop);
    const compact = availableHeight < 150;
    const centerX = screenWidth / 2;

    if (brokeRecord) {
      const iconSize = compact ? 34 : 44;
      const iconY = contentTop;
      const labelY = iconY + iconSize + (compact ? 18 : 24);
      const levelY = labelY + (compact ? 34 : 40);
      const messageY = Math.min(contentBottom, levelY + (compact ? 28 : 32));
      if (confettiIconAsset.loaded && confettiIconAsset.image) {
        context.drawImage(confettiIconAsset.image, centerX - iconSize / 2, iconY, iconSize, iconSize);
      }

      context.fillStyle = "#facc15";
      context.font = `800 ${compact ? 18 : 20}px sans-serif`;
      context.textAlign = "center";
      context.fillText(texts.newRecord, centerX, labelY);
      drawLevelText(context, centerX, levelY, currentLevel, compact ? 32 : 38);
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.font = `${compact ? 15 : 17}px sans-serif`;
      context.fillText(texts.brokePreviousRecord(previousRecordLevel), centerX, messageY);
      return;
    }

    context.fillStyle = "rgba(255,255,255,0.74)";
    context.font = `${compact ? 15 : 17}px sans-serif`;
    context.textAlign = "center";
    context.fillText(texts.currentPlay, centerX, contentTop + (compact ? 16 : 22));
    drawLevelText(context, centerX, contentTop + (compact ? 52 : 62), currentLevel, compact ? 30 : 34);

    const iconSize = compact ? 24 : 28;
    const rowY = Math.min(contentBottom, contentTop + (compact ? 96 : 108));
    const rowText = `${texts.bestRecord}：${texts.levelValue(previousRecordLevel)}`;
    context.font = "700 17px sans-serif";
    const textWidth = context.measureText(rowText).width;
    const gap = 8;
    const startX = centerX - (iconSize + gap + textWidth) / 2;
    if (trophyIconAsset.loaded && trophyIconAsset.image) {
      context.drawImage(trophyIconAsset.image, startX, rowY - iconSize / 2, iconSize, iconSize);
    } else {
      drawTrophyIcon(context, startX, rowY - iconSize / 2, iconSize, "#facc15");
    }
    context.fillStyle = "#facc15";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(rowText, startX + iconSize + gap, rowY + 1);
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
  }

  function drawCloseButton(context, button) {
    if (!button) {
      return;
    }

    const inset = 4;
    context.save();
    context.strokeStyle = "rgba(255,255,255,0.48)";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(button.x + inset, button.y + inset);
    context.lineTo(button.x + button.width - inset, button.y + button.height - inset);
    context.moveTo(button.x + button.width - inset, button.y + inset);
    context.lineTo(button.x + inset, button.y + button.height - inset);
    context.stroke();
    context.restore();
  }

  function drawMiniOverlay(context, state) {
    const rect = canvasRect();

    if (screen === "menu") {
      context.fillStyle = "#171717";
      context.fillRect(0, 0, screenWidth, screenHeight);
      drawColoredTitle(context, screenWidth / 2, rect.y + 138);
      drawMenuStats(context, rect);
      drawGearButton(context, currentButtons().find((button) => button.id === "menu-settings"));
      drawTopRightResourceCounters(context, rect, state);
      drawDailyRewardsButton(context, currentButtons().find((button) => button.id === "daily-rewards"));
      if (!overlay) {
        const progressLevel = unfinishedProgressLevel();
        drawButton(
          context,
          currentButtons().find((button) => button.id === "continue-challenge"),
          texts.continueChallenge,
          false,
          progressLevel ? `${texts.unfinishedProgress}：${texts.levelValue(progressLevel)}` : null
        );
        drawButton(context, currentButtons().find((button) => button.id === "play"), texts.play, true);
        drawButton(context, currentButtons().find((button) => button.id === "shop"), texts.shop, false);
        drawButton(context, currentButtons().find((button) => button.id === "leaderboard"), texts.leaderboard, false);
      }
      if (overlay === "shop") {
        drawShopOverlay(context, rect);
        return;
      }
      if (!overlay) {
        return;
      }
    }

    if (screen !== "menu") {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "15px sans-serif";
      context.textAlign = "left";
      context.fillText(texts.best, rect.horizontalPadding + 58, rect.topInset + 16);
      context.fillStyle = "#fbfbfb";
      context.font = "700 42px sans-serif";
      context.fillText(String(bestScore), rect.horizontalPadding + 58, rect.topInset + 54);

      context.textAlign = "center";
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "15px sans-serif";
      context.fillText(texts.round, screenWidth / 2, rect.topInset + 16);
      context.fillStyle = "#fbfbfb";
      context.font = "700 42px sans-serif";
      context.fillText(String(state.round), screenWidth / 2, rect.topInset + 54);
      drawTopRightResourceCounters(context, rect, state);

      const pauseButton = currentButtons().find((button) => button.id === "pause");
      if (pauseButton && state.state !== "gameover") {
        roundedRect(context, pauseButton.x, pauseButton.y, pauseButton.width, pauseButton.height, 16);
        context.fillStyle = "rgba(255,255,255,0.06)";
        context.fill();
        context.fillStyle = "rgba(255,255,255,0.78)";
        context.fillRect(pauseButton.x + 14, pauseButton.y + 12, 6, 22);
        context.fillRect(pauseButton.x + 26, pauseButton.y + 12, 6, 22);
      }

      const speedButton = currentButtons().find((button) => button.id === "speed");
      if (speedButton) {
        drawButton(context, speedButton, texts.speed);
      }

      drawClearToolButton(context, rect);
      drawClearToolAnimation(context, rect);

      if (shouldShowTutorial(state)) {
        drawTutorialHint(context, rect);
      }

      if (!overlay) {
        return;
      }
    } else if (!overlay) {
      return;
    }

    context.fillStyle = "rgba(0,0,0,0.54)";
    context.fillRect(0, 0, screenWidth, screenHeight);

    const gameOverPanelYScale = overlay === "gameover" && continueUsedThisRun ? 0.16 : 0.24;
    const gameOverPanelHeightScale = overlay === "gameover" && continueUsedThisRun ? 0.68 : 0.54;
    const panelYScale = overlay === "daily-checkin"
      ? 0.04
      : overlay === "confirm-new-run" || overlay === "pause"
        ? 0.16
        : overlay === "heart-continue"
          ? HEART_CONTINUE_PANEL_Y_SCALE
          : gameOverPanelYScale;
    const panelHeightScale = overlay === "daily-checkin"
      ? 0.9
      : overlay === "confirm-new-run" || overlay === "pause"
        ? 0.68
        : gameOverPanelHeightScale;
    const panelSideInset = overlay === "daily-checkin" || overlay === "leaderboard" ? 18 : 24;
    const panel = overlay === "daily-checkin"
      ? checkInPanelRect(rect)
      : overlay === "heart-continue"
        ? heartContinuePanelRect(rect)
        : overlay === "leaderboard"
          ? leaderboardPanelRect(rect)
          : overlay === "settings"
            ? settingsPanelRect(rect)
            : overlay === "clear-tool"
              ? clearToolPanelRect(rect)
      : {
          x: rect.x + panelSideInset,
          y: rect.y + rect.height * panelYScale,
          width: rect.width - panelSideInset * 2,
          height: rect.height * panelHeightScale
        };

    roundedRect(context, panel.x, panel.y, panel.width, panel.height, 28);
    context.fillStyle = "#262626";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.1)";
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "#fbfbfb";
    context.textAlign = "center";
    context.font = "700 32px sans-serif";
    const overlayTitle = overlay === "gameover" && !continueUsedThisRun
      ? texts.shareContinueHintOne
      : overlay === "pause"
        ? texts.paused
        : overlay === "settings"
          ? texts.settings
          : overlay === "confirm-new-run"
            ? texts.unfinishedTitle
            : overlay === "heart-continue"
              ? texts.useHeartTitle
              : overlay === "daily-checkin"
                ? texts.dailyCheckIn
                : overlay === "leaderboard"
                  ? texts.leaderboard
                  : overlay === "clear-tool"
                    ? texts.clearPromptTitle
                    : texts.runOver;
    context.fillText(
      overlayTitle,
      screenWidth / 2,
      panel.y + 48
    );

    if (overlay === "gameover" || overlay === "confirm-new-run" || overlay === "leaderboard" || overlay === "clear-tool") {
      drawCloseButton(context, currentButtons().find((button) =>
        button.id === (overlay === "gameover"
          ? "gameover-close"
          : overlay === "leaderboard"
            ? "leaderboard-close"
            : overlay === "clear-tool"
              ? "clear-tool-close"
              : "confirm-new-close")
      ));
    }

    if (overlay === "leaderboard") {
      drawLeaderboardOverlay(context, panel);
      return;
    }

    if (overlay === "clear-tool") {
      drawClearToolPanel(context, panel);
      return;
    }

    if (overlay === "daily-checkin" && (pendingCheckIn?.reward || dailyRewardsView?.state)) {
      const rewardDay = pendingCheckIn?.reward?.day || dailyRewardsView?.state?.lastRewardDay || 1;
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.font = "20px sans-serif";
      context.textAlign = "center";
      context.fillText(texts.dailyStreak(rewardDay), screenWidth / 2, panel.y + 86);

      const gridTop = panel.y + 122;
      const cardGap = 10;
      const cardHeight = 66;
      for (const dayReward of DAILY_CHECK_IN_REWARDS) {
        const card = checkInRewardCardLayout(panel, dayReward.day);
        drawCheckInDayCard(
          context,
          card,
          dayReward,
          dayReward.day === rewardDay,
          dayReward.day <= rewardDay
        );
      }

      context.fillStyle = pendingCheckIn?.chainBroken ? "#facc15" : "rgba(255,255,255,0.72)";
      context.font = "15px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      const reminderLines = pendingCheckIn?.chainBroken
        ? [texts.dailyReset]
        : texts.dailyKeepGoing.split(", ");
      const reminderTop = gridTop + cardHeight * 2 + cardGap + (reminderLines.length > 1 ? 26 : 34);
      for (let index = 0; index < reminderLines.length; index += 1) {
        context.fillText(reminderLines[index], screenWidth / 2, reminderTop + index * 20);
      }
    }

    if (overlay === "heart-continue") {
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.font = "18px sans-serif";
      context.textAlign = "center";
      context.fillText(texts.useHeartHint, screenWidth / 2, panel.y + 92);
    }

    if (overlay === "settings") {
      const soundToggleButton = currentButtons().find((button) => button.id === "toggle-sound");
      const vibrationToggleButton = currentButtons().find((button) => button.id === "toggle-vibration");
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "22px sans-serif";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(texts.soundLabel, panel.x + 36, soundToggleButton.y + soundToggleButton.height / 2);
      context.fillText(texts.vibrationLabel, panel.x + 36, vibrationToggleButton.y + vibrationToggleButton.height / 2);
    }

    if (overlay === "gameover") {
      if (!continueUsedThisRun) {
        const shareContinueButton = currentButtons().find((button) => button.id === "share-continue");
        const lineTop = panel.y + 120;
        const lineBottom = shareContinueButton ? shareContinueButton.y - 14 : panel.y + panel.height - 96;
        const lineGap = Math.max(24, Math.min(34, (lineBottom - lineTop) / 2));
        context.fillStyle = "rgba(255,255,255,0.82)";
        context.font = "17px sans-serif";
        context.fillText(texts.shareContinueHintTwo, screenWidth / 2, lineTop);
        context.fillText(texts.shareContinueHintThree, screenWidth / 2, lineTop + lineGap);
      } else {
        drawFinalScoreResult(context, panel, gameOverResult, state);
      }
    }

    if (overlay === "confirm-new-run") {
      const progressLevel = unfinishedProgressLevel();
      context.fillStyle = "rgba(255,255,255,0.82)";
      context.font = "20px sans-serif";
      context.textAlign = "center";
      context.fillText(
        progressLevel ? `${texts.unfinishedProgress}：${texts.levelValue(progressLevel)}` : texts.unfinishedLineOne,
        screenWidth / 2,
        panel.y + 96
      );
      context.fillStyle = "rgba(255,255,255,0.68)";
      context.font = "18px sans-serif";
      context.fillText(texts.unfinishedLineOne, screenWidth / 2, panel.y + 126);
      context.fillText(texts.unfinishedLineTwo, screenWidth / 2, panel.y + 154);
    }

    for (const button of currentButtons()) {
      if (["play", "pause", "speed", "menu-settings", "gameover-close", "confirm-new-close"].includes(button.id)) {
        continue;
      }

      const labels = {
        resume: texts.resume,
        settings: texts.settings,
        menu: texts.mainMenu,
        "settings-done": texts.done,
        "share-continue": texts.shareContinue,
        restart: texts.restart,
        "confirm-new-continue": texts.continueChallenge,
        "confirm-new-start": texts.startNew,
        "heart-use": texts.useHeart,
        "heart-decline": texts.noThanks,
        "daily-checkin-ok": pendingCheckIn?.reward ? texts.claim : texts.done
      };

      if (button.id === "toggle-sound" || button.id === "toggle-vibration") {
        drawToggle(context, button, button.id === "toggle-sound" ? audioBus.isEnabled() : vibrationEnabled);
        continue;
      }

      drawButton(
        context,
        button,
        labels[button.id],
        button.id === "resume" ||
          (overlay === "gameover" && button.id === "menu") ||
          button.id === "share-continue" ||
          button.id === "confirm-new-continue" ||
          button.id === "confirm-new-start" ||
          button.id === "heart-use" ||
          (button.id === "daily-checkin-ok" && Boolean(pendingCheckIn?.reward)) ||
          button.id === "restart" ||
        button.id === "settings-done"
      );
    }

    if (overlay === "gameover" && continueUsedThisRun && gameOverResult?.brokeRecord) {
      drawRecordConfetti(context);
    }

    if (overlay === "daily-checkin") {
      drawDailyClaimAnimation(context, state, rect, panel);
    }
  }

  function drawTutorialHint(context, rect) {
    const animationTime = (Date.now() % 1600) / 1600;
    const eased = animationTime < 0.85 ? animationTime / 0.85 : 1;
    const centerX = rect.x + rect.width / 2;
    const startY = rect.y + rect.height * 0.38;
    const travelDistance = Math.min(rect.height * 0.28, 180);
    const currentY = startY + travelDistance * eased;
    const iconSize = clamp(rect.width * 0.14, 42, 72);

    context.save();
    context.strokeStyle = "rgba(255,255,255,0.28)";
    context.lineWidth = 6;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(centerX, startY);
    context.lineTo(centerX, startY + travelDistance);
    context.stroke();

    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "20px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("向下拖动瞄准", centerX, startY - 38);

    if (tutorialAsset.loaded && tutorialAsset.image) {
      context.globalAlpha = 0.92 - animationTime * 0.18;
      context.drawImage(
        tutorialAsset.image,
        centerX - iconSize / 2,
        currentY - iconSize / 2,
        iconSize,
        iconSize
      );
    } else {
      context.globalAlpha = 0.9 - animationTime * 0.18;
      context.beginPath();
      context.arc(centerX, currentY, iconSize * 0.34, 0, Math.PI * 2);
      context.fillStyle = "#ffffff";
      context.fill();
    }

    context.restore();
  }

  function getTouchPoint(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0] || event;
    if (!touch) {
      return null;
    }

    const x = touch.x ?? touch.clientX ?? touch.pageX;
    const y = touch.y ?? touch.clientY ?? touch.pageY;
    if (typeof x !== "number" || typeof y !== "number") {
      return null;
    }

    return { x, y };
  }

  function onTouchStart(event) {
    const point = getTouchPoint(event);
    if (!point) {
      return;
    }

    if (screen === "menu" && overlay === "shop") {
      shopDragStartY = point.y;
      shopDragStartScrollY = shopScrollY;
      shopDragging = false;
    }
    if (screen === "menu" && overlay === "leaderboard") {
      leaderboardDragStartY = point.y;
      leaderboardDragStartScrollY = leaderboardScrollY;
      leaderboardDragging = false;
    }

    const button = currentButtons().find((candidate) => hitTest(candidate, point));
    if (button) {
      touchStart = { point, buttonId: button.id };
      return;
    }

    if (screen === "menu" && overlay === "leaderboard") {
      touchStart = { point, buttonId: null };
      return;
    }

    if (screen !== "game" || overlay !== null) {
      return;
    }

    tutorialIdleTime = 0;
    pointerActive = true;
    touchStart = { point, buttonId: null };
    game.startAim(toGamePoint(point));
  }

  function onTouchMove(event) {
    if (screen === "menu" && overlay === "shop" && touchStart) {
      const point = getTouchPoint(event);
      if (!point) {
        return;
      }

      const deltaY = point.y - shopDragStartY;
      if (Math.abs(deltaY) > 6) {
        shopDragging = true;
      }
      shopScrollY = clampShopScroll(shopDragStartScrollY - deltaY);
      return;
    }

    if (screen === "menu" && overlay === "leaderboard" && touchStart) {
      const point = getTouchPoint(event);
      if (!point) {
        return;
      }

      const panel = leaderboardPanelRect(canvasRect());
      const metrics = leaderboardListMetrics(panel);
      const board = createLeaderboard({
        currentBestLevel: currentRecordLevel(),
        boardType: LEADERBOARD_BOARD_TYPES.total
      });
      const listRows = board.rankedRows.filter((row) => !row.isCurrentUser).slice(3);
      const contentHeight = listRows.length * metrics.rowHeight + Math.max(0, listRows.length - 1) * metrics.rowGap;
      const maxScroll = Math.max(0, contentHeight - metrics.viewportHeight);
      if (maxScroll <= 0) {
        leaderboardScrollY = 0;
        leaderboardDragging = false;
        return;
      }
      const deltaY = point.y - leaderboardDragStartY;
      if (Math.abs(deltaY) > 6) {
        leaderboardDragging = true;
      }
      leaderboardScrollY = clamp(leaderboardDragStartScrollY - deltaY, 0, maxScroll);
      return;
    }

    if (!pointerActive) {
      return;
    }

    const point = getTouchPoint(event);
    if (!point) {
      return;
    }

    game.updateAim(toGamePoint(point));
  }

  function onTouchEnd(event) {
    const point = getTouchPoint(event) || touchStart?.point;
    if (!point) {
      return;
    }

    if (touchStart?.buttonId) {
      const button = currentButtons().find((candidate) => candidate.id === touchStart.buttonId);
      if (
        button &&
        hitTest(button, point) &&
        !(screen === "menu" && overlay === "shop" && shopDragging) &&
        !(screen === "menu" && overlay === "leaderboard" && leaderboardDragging)
      ) {
        handleButton(button.id);
      }
      touchStart = null;
      shopDragging = false;
      leaderboardDragging = false;
      return;
    }

    if (pointerActive) {
      pointerActive = false;
      const stateBeforeRelease = game.getState();
      game.releaseAim(toGamePoint(point));
      const stateAfterRelease = game.getState();
      if (stateBeforeRelease.state === "aiming" && stateAfterRelease.state !== "aiming") {
        tutorialDismissed = true;
      }
    }

    touchStart = null;
  }

  wxApi.onTouchStart(onTouchStart);
  wxApi.onTouchMove(onTouchMove);
  wxApi.onTouchEnd(onTouchEnd);
  wxApi.onTouchCancel(() => {
    pointerActive = false;
    touchStart = null;
    leaderboardDragging = false;
  });
  wxApi.onHide?.(() => {
    persistProgress(true);
  });
  wxApi.onShow?.(() => {
    claimDailyCheckIn();
  });

  function loop() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (screen === "game" && overlay === null) {
      const stateBeforeUpdate = game.getState();
      if (
        !tutorialDismissed &&
        stateBeforeUpdate.round === 1 &&
        stateBeforeUpdate.state === "aiming" &&
        stateBeforeUpdate.ballsLaunched === 0 &&
        !pointerActive
      ) {
        tutorialIdleTime += deltaTime;
      } else {
        tutorialIdleTime = 0;
      }

      game.update(deltaTime);
      if (game.getState().state === "gameover") {
        const finalState = game.getState();
        const previousBestScore = runStartBestScore;
        const currentScore = Math.max(0, Math.floor(finalState.score));
        gameOverResult = {
          currentLevel: scoreToLevel(currentScore),
          previousRecordLevel: scoreToLevel(previousBestScore),
          brokeRecord: currentScore > previousBestScore
        };
        newRecordCheerPlayed = false;
        resetRecordConfetti();
        overlay = gameOverRecoveryOverlay(finalState);
        if (overlay === "gameover" && continueUsedThisRun) {
          hasStartedRun = false;
          clearSavedProgress();
        }
      }
    }

    if (
      screen === "game" &&
      overlay === "gameover" &&
      continueUsedThisRun &&
      gameOverResult?.brokeRecord &&
      !newRecordCheerPlayed
    ) {
      audioBus.emit("newRecord");
      newRecordCheerPlayed = true;
    }

    if (
      screen === "game" &&
      overlay === "gameover" &&
      continueUsedThisRun &&
      gameOverResult?.brokeRecord
    ) {
      startRecordConfetti();
      updateRecordConfetti(deltaTime);
    } else if (recordConfetti) {
      resetRecordConfetti();
    }

    syncBestScore();
    syncCoins();
    syncHearts();
    if (
      dailyClaimAnimation &&
      Date.now() - dailyClaimAnimation.startedAt >= dailyClaimAnimation.duration
    ) {
      if (pendingCheckIn) {
        storage.saveDailyCheckIn(pendingCheckIn.state);
        game.grantRewards(pendingCheckIn.reward);
        storage.saveCoins(game.getState().coins);
        storage.saveHearts(game.getState().heartCount);
        lastSavedCoins = game.getState().coins;
        lastSavedHearts = game.getState().heartCount;
      }
      dailyClaimAnimation = null;
      pendingCheckIn = null;
      dailyRewardsView = null;
      if (overlay === "daily-checkin") {
        overlay = null;
      }
    }
    if (screen === "game" && overlay !== "gameover") {
      persistProgress();
    }
    if (screen === "game") {
      const rect = canvasRect();
      renderer.render(
        game.getState(),
        game.getEntityPosition,
        drawMiniOverlay,
        {
          ...rect,
          screenWidth,
          screenHeight
        }
      );
    } else {
      renderer.context.clearRect(0, 0, screenWidth, screenHeight);
      drawMiniOverlay(renderer.context, game.getState());
    }

    scheduleFrame(loop);
  }

  claimDailyCheckIn();
  loop();
}
