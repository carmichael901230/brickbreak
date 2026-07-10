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
  ballSkins: "弹球",
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
  musicLabel: "音乐",
  vibrationLabel: "震动",
  effectsLabel: "特效",
  soundOn: "开",
  soundOff: "关",
  done: "完成",
  reachedRound: (round) => `你打到了第 ${round} 回合`,
  shareContinue: "看广告复活",
  shareContinueHintOne: "球球还没放弃！",
  shareContinueHintTwo: "观看完整广告，立即复活继续挑战",
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
  feedback: "我要吐槽",
  feedbackUnavailable: "请点击右上角“···”，选择“反馈与投诉”",
  totalRank: "总排名",
  myRank: "我的排名",
  rankPosition: (rank) => `第 ${rank} 名`,
  currentUser: "我",
  clearThreeRows: "消三行",
  clearPromptTitle: "消除",
  clearPromptDescription: "将清除最下面 3 行砖块，帮你缓解底部压力。",
  clearConfirm: "确认清除",
  clearAdConfirm: "看广告获取",
  clearLimitDescription: "每局最多使用 3 次清除功能，下一局可重新使用。",
  clearNoBlocks: "暂无可清除的砖块",
  clearAdLoading: "广告加载中",
  clearAdFailed: "广告暂时不可用，请稍后再试",
  clearAdRewarded: "已获得 1 个清除道具",
  bombPromptTitle: "炸弹",
  bombDescription: "拖动炸弹到空位，释放后会炸掉周围 3×3 范围内的砖块。",
  bombConfirm: "确认使用",
  bombAdConfirm: "看广告获取",
  bombLimitDescription: "每局最多使用 3 次炸弹，下一局可重新使用。",
  bombNoBlocks: "附近没有可炸除的砖块",
  bombInvalidPosition: "请选择没有砖块、金币或加球的空位",
  bombCannotPlace: "此处不能放置",
  bombAdLoading: "广告加载中",
  bombAdRewarded: "已获得 1 个炸弹",
  bombAdFailed: "广告暂时不可用，请稍后再试",
  bombShareConfirm: "分享获取",
  bombShareFailed: "分享暂时不可用，请稍后再试",
  bombShareRewarded: "已获得 1 个炸弹",
  freezePromptTitle: "冰冻",
  freezeDescription: "冻结当前棋盘一回合。下一轮砖块不会下移，也不会生成新的一行。",
  freezeConfirm: "确认使用",
  freezeShareConfirm: "分享获取",
  freezeAdConfirm: "看广告获取",
  freezeAdLoading: "广告加载中",
  freezeAdRewarded: "已获得 1 个冰冻道具",
  freezeAdFailed: "广告暂时不可用，请稍后再试",
  freezeLimitDescription: "每局最多使用 3 次冰冻，下一局可重新使用。",
  freezeShareFailed: "分享暂时不可用，请稍后再试",
  freezeShareRewarded: "已获得 1 个冰冻道具",
  ragePromptTitle: "狂暴",
  rageDescription: "下一次发射的球数量翻倍，本回合结束后恢复正常。",
  rageConfirm: "确认使用",
  rageShareConfirm: "分享获取",
  rageAdConfirm: "看广告获取",
  rageAdLoading: "广告加载中",
  rageAdRewarded: "已获得 1 个狂暴道具",
  rageAdFailed: "广告暂时不可用，请稍后再试",
  rageLimitDescription: "每局最多使用 3 次狂暴，下一局可重新使用。",
  rageShareFailed: "分享暂时不可用，请稍后再试",
  rageShareRewarded: "已获得 1 个狂暴道具",
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
const DOUBLE_COINS_SHARE_TEXT = "分享游戏翻倍";
const DOUBLE_COINS_SHARE_FAILED_TEXT = "分享暂时不可用，请稍后再试";
const SHARE_REWARD_MIN_DWELL_MS = 5000;
const SHARE_REWARD_DWELL_FAILED_TEXT = "请分享到不同的群";
const SHARE_REWARD_DWELL_MESSAGE_MS = 2000;
const REVIVE_AD_LOADING_TEXT = "广告加载中";
const REVIVE_AD_FAILED_TEXT = "广告暂时不可用，请稍后再试";
const CLEAR_TOOL_MAX_USES_PER_RUN = 3;
const CLEAR_TOOL_ROWS = 3;
const BOMB_MAX_USES_PER_RUN = 3;
const BOMB_RADIUS = 1;
const BOMB_ANIMATION_DURATION = 700;
const BOMB_DRAG_THRESHOLD = 8;
const FREEZE_MAX_USES_PER_RUN = 3;
const FREEZE_ANIMATION_DURATION = 900;
const RAGE_MAX_USES_PER_RUN = 3;
const RAGE_ANIMATION_DURATION = 850;
const REWARDED_AD_UNIT_ID = "adunit-fce0dbb1a75742d4";
const ITEM_TRAY_HEIGHT = 86;
const ITEM_TRAY_GAP = 8;
const CLEAR_ANIMATION_DURATION = 550;
const GAME_ROUNDED_FONT_FAMILY = '"YouYuan", "幼圆", "Arial Rounded MT Bold", "PingFang SC", "Microsoft YaHei", sans-serif';
const POPUP_TITLE_FONT_FAMILY = '"YouYuan", "幼圆", "PingFang SC", "Microsoft YaHei", sans-serif';

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
    y: rect.y + rect.height * 0.1,
    width: rect.width - panelSideInset * 2,
    height: rect.height * 0.72
  };
}

function settingsLayout(panel) {
  const horizontalInset = clamp(panel.width * 0.11, 28, 36);
  const buttonHeight = clamp(panel.height * 0.095, 38, 46);
  const doneHeight = clamp(panel.height * 0.105, 42, 50);
  const doneY = panel.y + panel.height - horizontalInset - doneHeight;
  const contentTop = panel.y + clamp(panel.height * 0.17, 58, 82);
  const contentBottom = doneY - clamp(panel.height * 0.045, 12, 20);
  const rowCount = 4;
  const minimumRowGap = 8;
  const availableHeight = Math.max(buttonHeight * rowCount + minimumRowGap * (rowCount - 1), contentBottom - contentTop);
  const rowGap = clamp((availableHeight - buttonHeight * rowCount) / (rowCount - 1), minimumRowGap, 20);
  const rowsHeight = buttonHeight * rowCount + rowGap * (rowCount - 1);
  const firstRowY = contentTop + Math.max(0, (availableHeight - rowsHeight) / 2);
  const toggleWidth = clamp(panel.width * 0.32, 96, 106);

  return {
    labelX: panel.x + horizontalInset,
    toggleX: panel.x + panel.width - horizontalInset - toggleWidth,
    toggleWidth,
    buttonHeight,
    soundY: firstRowY,
    musicY: firstRowY + buttonHeight + rowGap,
    vibrationY: firstRowY + (buttonHeight + rowGap) * 2,
    effectsY: firstRowY + (buttonHeight + rowGap) * 3,
    doneX: panel.x + horizontalInset,
    doneY,
    doneWidth: panel.width - horizontalInset * 2,
    doneHeight
  };
}

function clearToolPanelRect(rect) {
  const panelSideInset = 24;
  const panelHeight = clamp(rect.height * 0.56, 354, 390);
  return {
    x: rect.x + panelSideInset,
    y: rect.y + rect.height * 0.16,
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

function menuTitleFont(size, weight = 800) {
  return `${weight} ${size}px ${GAME_ROUNDED_FONT_FAMILY}`;
}

function popupTitleFont(size, weight = 700) {
  return `${weight} ${size}px ${POPUP_TITLE_FONT_FAMILY}`;
}

function gameHudFont(size, weight = 700) {
  return `${weight} ${size}px ${GAME_ROUNDED_FONT_FAMILY}`;
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

function createBackgroundMusicPlayer(wxApi, src, { volume = 0.34 } = {}) {
  if (!wxApi.createInnerAudioContext) {
    return {
      destroy() {},
      pause() {},
      play() {},
      stop() {}
    };
  }

  const audio = wxApi.createInnerAudioContext();
  audio.src = src;
  audio.loop = true;
  audio.autoplay = false;
  audio.volume = volume;
  let playing = false;

  return {
    destroy() {
      audio.destroy?.();
    },

    pause() {
      playing = false;
      audio.pause?.();
    },

    play() {
      if (playing) {
        return;
      }
      playing = true;
      try {
        audio.play();
      } catch {
        playing = false;
      }
    },

    stop() {
      playing = false;
      audio.stop?.();
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
  let musicEnabled = settings.musicEnabled !== false;
  let vibrationEnabled = settings.vibrationEnabled !== false;
  let effectsEnabled = settings.effectsEnabled !== false;
  const tutorialAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/tap.png");
  const coinIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/dollar.png");
  const heartIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/heart.png");
  const speedIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/fast-forward.png");
  const trophyIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/trophy.png");
  const confettiIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/confetti.png");
  const dailyRewardsIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/gift-box.png");
  const clearLinesIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/clear-lines.png");
  const bombItemIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/bomb-item.png");
  const freezeItemIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/freeze-item.png");
  const rageItemIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/rage-item.png");
  const adVideoIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/ad-video.png");
  const shareIconAsset = loadImageAsset(wxApi, canvas, "src/assets/pic/share.png");
  const homeNavIconAssets = {
    leaderboard: loadImageAsset(wxApi, canvas, "src/assets/pic/home-nav/leaderboard.png"),
    shop: loadImageAsset(wxApi, canvas, "src/assets/pic/home-nav/shop.png"),
    feedback: loadImageAsset(wxApi, canvas, "src/assets/pic/home-nav/feedback.png"),
    "menu-settings": loadImageAsset(wxApi, canvas, "src/assets/pic/home-nav/settings.png")
  };
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
  const clearRowsSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/clear.mp3", {
    volume: 0.72
  });
  const bombSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/boom.mp3", {
    volume: 0.78
  });
  const freezeSoundPlayer = createSoundPlayer(wxApi, "src/assets/sound/freeze.mp3", {
    volume: 0.72
  });
  const backgroundMusicPlayer = createBackgroundMusicPlayer(wxApi, "src/assets/sound/background-music.mp3", {
    volume: 0.32
  });
  const rewardedVideoAd = wxApi.createRewardedVideoAd?.({
    adUnitId: REWARDED_AD_UNIT_ID
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
    effectsEnabled,
    boardGenerator,
    audioBus
  });

  function startCoinCollectAnimation(payload = {}) {
    if (!effectsEnabled || screen !== "game") {
      return;
    }

    const rect = canvasRect();
    const scaleX = rect.width / GAME_CONFIG.width;
    const scaleY = rect.height / GAME_CONFIG.height;
    coinCollectAnimations.push({
      sourceX: rect.x + (Number(payload.x) || GAME_CONFIG.width / 2) * scaleX,
      sourceY: rect.y + (Number(payload.y) || GAME_CONFIG.height / 2) * scaleY,
      startedAt: Date.now(),
      duration: 720
    });
    coinCollectAnimations = coinCollectAnimations.slice(-10);
  }

  function startAddBallCollectAnimation(payload = {}) {
    if (!effectsEnabled || screen !== "game") {
      return;
    }

    const rect = canvasRect();
    const scaleX = rect.width / GAME_CONFIG.width;
    const scaleY = rect.height / GAME_CONFIG.height;
    addBallCollectAnimations.push({
      sourceX: rect.x + (Number(payload.x) || GAME_CONFIG.width / 2) * scaleX,
      sourceY: rect.y + (Number(payload.y) || GAME_CONFIG.height / 2) * scaleY,
      startedAt: Date.now(),
      duration: 820
    });
    addBallCollectAnimations = addBallCollectAnimations.slice(-8);
  }

  function playSound(player) {
    if (audioBus.isEnabled()) {
      player.play();
    }
  }

  audioBus.onEvent(({ type, payload }) => {
    if (type === "hit") {
      playSound(hitSoundPlayer);
    }
    if (type === "pickup") {
      startAddBallCollectAnimation(payload);
    }
    if (type === "coin") {
      playSound(coinSoundPlayer);
      startCoinCollectAnimation(payload);
      if (hasStartedRun) {
        runCoinsEarned += 1;
      }
    }
    if (type === "newRecord") {
      playSound(cheerSoundPlayer);
    }
    if (type === "revive") {
      playSound(reviveSoundPlayer);
    }
    if (type === "clear") {
      vibrateOnBrickClear();
    }
    if (type === "clearRows") {
      playSound(clearRowsSoundPlayer);
    }
    if (type === "bomb") {
      playSound(bombSoundPlayer);
    }
    if (type === "freeze") {
      playSound(freezeSoundPlayer);
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
  let runCoinsEarned = 0;
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
  let feedbackNativeButton = null;
  let feedbackNativeButtonBounds = null;
  let feedbackNativeUnavailable = false;
  let feedbackWarningUntil = 0;
  let leaderboardScrollY = 0;
  let leaderboardDragStartY = 0;
  let leaderboardDragStartScrollY = 0;
  let leaderboardDragging = false;
  let clearFreeItemAvailable = storage.loadClearFreeUsed() !== true;
  let clearAdItemsThisRun = 0;
  let clearUsesThisRun = 0;
  let clearToolMessage = "";
  let clearToolAnimation = null;
  let clearToolDemoStartedAt = 0;
  let clearAdLoading = false;
  let bombFreeItemAvailable = storage.loadBombFreeUsed() !== true;
  let bombFreeUsedThisRun = false;
  let bombShareItemsThisRun = 0;
  let bombAdItemsThisRun = 0;
  let bombUsesThisRun = 0;
  let bombToolMessage = "";
  let bombToolDemoStartedAt = 0;
  let bombAdLoading = false;
  let pendingBombShare = false;
  let pendingBombShareStartedAt = 0;
  let bombPlacementArmed = false;
  let bombDrag = null;
  let bombAnimation = null;
  let freezeFreeItemAvailable = storage.loadFreezeFreeUsed() !== true;
  let freezeFreeUsedThisRun = false;
  let freezeShareItemsThisRun = 0;
  let freezeAdItemsThisRun = 0;
  let freezeUsesThisRun = 0;
  let freezeToolMessage = "";
  let freezeToolDemoStartedAt = 0;
  let freezeAdLoading = false;
  let freezeAnimation = null;
  let pendingFreezeShare = false;
  let pendingFreezeShareStartedAt = 0;
  let rageFreeItemAvailable = storage.loadRageFreeUsed() !== true;
  let rageFreeUsedThisRun = false;
  let rageShareItemsThisRun = 0;
  let rageAdItemsThisRun = 0;
  let rageUsesThisRun = 0;
  let rageToolMessage = "";
  let rageToolDemoStartedAt = 0;
  let rageAdLoading = false;
  let rageAnimation = null;
  let pendingRageShare = false;
  let pendingRageShareStartedAt = 0;
  let rewardedAdPurpose = null;
  let reviveAdLoading = false;
  let doubleCoinMessage = "";
  let coinDoubleAnimation = null;
  let coinCollectAnimations = [];
  let addBallCollectAnimations = [];
  let pendingDoubleCoinShare = null;
  let transientCenterMessage = null;
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
      musicEnabled,
      vibrationEnabled,
      effectsEnabled,
      language: "zh-CN"
    });
  }

  function syncBackgroundMusic() {
    if (musicEnabled) {
      backgroundMusicPlayer.play();
    } else {
      backgroundMusicPlayer.stop();
    }
  }

  function startShareRewardDwellTimer() {
    return Date.now();
  }

  function shareRewardDwellSatisfied(startedAt) {
    return Date.now() - startedAt >= SHARE_REWARD_MIN_DWELL_MS;
  }

  function showShareRewardDwellWarning() {
    transientCenterMessage = {
      text: SHARE_REWARD_DWELL_FAILED_TEXT,
      expiresAt: Date.now() + SHARE_REWARD_DWELL_MESSAGE_MS
    };
  }

  function drawTransientCenterMessage(context) {
    if (!transientCenterMessage) {
      return;
    }
    const now = Date.now();
    if (now >= transientCenterMessage.expiresAt) {
      transientCenterMessage = null;
      return;
    }

    const progress = 1 - ((transientCenterMessage.expiresAt - now) / SHARE_REWARD_DWELL_MESSAGE_MS);
    const alpha = progress > 0.78 ? clamp((1 - progress) / 0.22, 0, 1) : 1;
    const maxWidth = Math.min(screenWidth - 40, 360);
    const boxWidth = Math.min(maxWidth, Math.max(260, screenWidth * 0.74));
    const boxHeight = 86;
    const boxX = screenWidth / 2 - boxWidth / 2;
    const boxY = screenHeight / 2 - boxHeight / 2;

    context.save();
    context.globalAlpha = alpha;
    context.shadowColor = "rgba(0,0,0,0.45)";
    context.shadowBlur = 16;
    roundedRect(context, boxX, boxY, boxWidth, boxHeight, 18);
    context.fillStyle = "rgba(24,24,27,0.94)";
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "rgba(250,204,21,0.85)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#fef3c7";
    context.font = popupTitleFont(clamp(screenWidth * 0.062, 23, 30), 800);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(transientCenterMessage.text, screenWidth / 2, screenHeight / 2 + 1);
    context.restore();
  }

  function setEffectsEnabled(enabled) {
    effectsEnabled = enabled !== false;
    game.setEffectsEnabled(effectsEnabled);
    if (!effectsEnabled) {
      coinCollectAnimations = [];
      addBallCollectAnimations = [];
    }
    saveSettings();
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

  function homeBottomNavLayout(rect) {
    const ids = ["leaderboard", "shop", "feedback", "menu-settings"];
    const itemWidth = (screenWidth - rect.horizontalPadding * 2) / ids.length;
    const iconSize = clamp(screenWidth * 0.128, 46, 56);
    const labelFontSize = clamp(screenWidth * 0.034, 12, 14);
    const iconLabelGap = clamp(screenWidth * 0.012, 4, 6);
    const verticalPadding = 4;
    const height = iconSize + iconLabelGap + labelFontSize + verticalPadding * 2;
    const y = screenHeight - rect.bottomInset - height - 24;

    return ids.map((id, index) => ({
      id,
      x: rect.horizontalPadding + itemWidth * index,
      y,
      width: itemWidth,
      height,
      iconSize,
      labelFontSize,
      iconLabelGap,
      verticalPadding
    }));
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
    const snapshot = game.exportSnapshot({ includeVolatile: false });
    if (!snapshot || screen !== "game") {
      return null;
    }

    return {
      version: GAME_PROGRESS_VERSION,
      savedAt: Date.now(),
      continueUsedThisRun,
      runStartBestScore,
      runCoinsEarned,
      clearFreeItemAvailable,
      clearAdItemsThisRun,
      clearUsesThisRun,
      bombFreeItemAvailable,
      bombFreeUsedThisRun,
      bombShareItemsThisRun,
      bombAdItemsThisRun,
      bombUsesThisRun,
      freezeFreeItemAvailable,
      freezeFreeUsedThisRun,
      freezeShareItemsThisRun,
      freezeAdItemsThisRun,
      freezeUsesThisRun,
      rageFreeItemAvailable,
      rageFreeUsedThisRun,
      rageShareItemsThisRun,
      rageAdItemsThisRun,
      rageUsesThisRun,
      pendingBombShare,
      pendingFreezeShare,
      pendingRageShare,
      snapshot
    };
  }

  function clearSavedProgress() {
    lastSavedProgressJson = null;
    storage.clearGameProgress();
  }

  function persistProgress(force = false) {
    const now = Date.now();
    if (!force && lastSavedProgressAt && now - lastSavedProgressAt < 1000) {
      return;
    }

    const progress = buildProgressPayload();
    if (!progress) {
      return;
    }

    const savedAt = progress.savedAt;
    progress.savedAt = 0;
    const progressJson = JSON.stringify(progress);
    progress.savedAt = savedAt;
    if (!force && progressJson === lastSavedProgressJson) {
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
    const horizontalInset = clamp(rect.horizontalPadding * 0.65, 8, 12);
    return {
      x: horizontalInset,
      y: top,
      width: screenWidth - horizontalInset * 2,
      height: Math.max(0, bottom - top)
    };
  }

  function clearToolInventoryCount() {
    return (clearFreeItemAvailable ? 1 : 0) + clearAdItemsThisRun;
  }

  function itemToolButtonSize(rect) {
    const tray = itemTrayRect(rect);
    const gap = itemToolButtonGap(rect);
    const sidePadding = itemToolTraySidePadding(rect);
    return clamp(
      Math.min(tray.height * 0.9, (tray.width - sidePadding * 2 - gap * 3) / 4),
      58,
      96
    );
  }

  function itemToolButtonGap(rect) {
    const tray = itemTrayRect(rect);
    return clamp(tray.width * 0.011, 4, 6);
  }

  function itemToolTraySidePadding(rect) {
    const tray = itemTrayRect(rect);
    return clamp(tray.width * 0.02, 7, 10);
  }

  function itemToolButtonRect(rect, index, id) {
    const tray = itemTrayRect(rect);
    const size = itemToolButtonSize(rect);
    const gap = itemToolButtonGap(rect);
    const totalWidth = size * 4 + gap * 3;
    return {
      id,
      x: tray.x + (tray.width - totalWidth) / 2 + index * (size + gap),
      y: tray.y + Math.max(0, (tray.height - size) / 2),
      width: size,
      height: size
    };
  }

  function clearToolButtonRect(rect) {
    return itemToolButtonRect(rect, 3, "clear-tool");
  }

  function bombToolInventoryCount() {
    return (bombFreeItemAvailable ? 1 : 0) + bombShareItemsThisRun + bombAdItemsThisRun;
  }

  function bombToolButtonRect(rect) {
    return itemToolButtonRect(rect, 0, "bomb-tool");
  }

  function freezeToolInventoryCount() {
    return (freezeFreeItemAvailable ? 1 : 0) + freezeShareItemsThisRun + freezeAdItemsThisRun;
  }

  function freezeToolButtonRect(rect) {
    return itemToolButtonRect(rect, 1, "freeze-tool");
  }

  function rageToolInventoryCount() {
    return (rageFreeItemAvailable ? 1 : 0) + rageShareItemsThisRun + rageAdItemsThisRun;
  }

  function rageToolButtonRect(rect) {
    return itemToolButtonRect(rect, 2, "rage-tool");
  }

  function itemsCanActivate() {
    return game.getState().state === "aiming" &&
      !clearToolAnimation &&
      !bombAnimation &&
      !freezeAnimation &&
      !rageAnimation;
  }

  function limitedItemGrantMode(usesThisRun, inventoryCount, maxUses, freeUsedThisRun) {
    if (usesThisRun >= maxUses) {
      return "limit";
    }
    if (inventoryCount > 0) {
      return "use";
    }
    if (usesThisRun === 0 || (usesThisRun === 1 && freeUsedThisRun)) {
      return "share";
    }
    return "ad";
  }

  function bombToolPanelMode() {
    return limitedItemGrantMode(
      bombUsesThisRun,
      bombToolInventoryCount(),
      BOMB_MAX_USES_PER_RUN,
      bombFreeUsedThisRun
    );
  }

  function openBombToolPanel() {
    if (!itemsCanActivate()) {
      return;
    }
    bombToolMessage = "";
    bombToolDemoStartedAt = Date.now();
    overlay = "bomb-tool";
  }

  function consumeBombToolItem() {
    if (bombFreeItemAvailable) {
      bombFreeItemAvailable = false;
      bombFreeUsedThisRun = true;
      storage.saveBombFreeUsed(true);
      return true;
    }
    if (bombShareItemsThisRun > 0) {
      bombShareItemsThisRun -= 1;
      return true;
    }
    if (bombAdItemsThisRun > 0) {
      bombAdItemsThisRun -= 1;
      return true;
    }
    return false;
  }

  function confirmBombToolUse() {
    if (!itemsCanActivate()) {
      overlay = null;
      return;
    }
    const mode = bombToolPanelMode();
    if (mode === "share") {
      requestBombToolShare();
      return;
    }
    if (mode === "ad") {
      requestBombToolAd();
      return;
    }
    if (mode !== "use") {
      return;
    }

    bombToolMessage = "";
    bombPlacementArmed = false;
    overlay = null;
  }

  function requestBombToolShare() {
    if (
      pendingBombShare ||
      bombFreeItemAvailable ||
      (bombUsesThisRun > 0 && !bombFreeUsedThisRun) ||
      bombUsesThisRun > 1 ||
      bombUsesThisRun + bombToolInventoryCount() >= BOMB_MAX_USES_PER_RUN ||
      game.getState().state !== "aiming"
    ) {
      return;
    }

    bombToolMessage = "";
    pendingBombShare = true;
    pendingBombShareStartedAt = startShareRewardDwellTimer();
    persistProgress(true);
    try {
      if (typeof wxApi.shareAppMessage !== "function") {
        throw new Error("share unavailable");
      }
      wxApi.shareAppMessage(createSharePayload("bomb-tool"));
    } catch {
      pendingBombShare = false;
      pendingBombShareStartedAt = 0;
      bombToolMessage = texts.bombShareFailed;
      persistProgress(true);
    }
  }

  function completePendingBombShare() {
    if (!pendingBombShare) {
      return false;
    }

    if (!shareRewardDwellSatisfied(pendingBombShareStartedAt)) {
      pendingBombShare = false;
      pendingBombShareStartedAt = 0;
      showShareRewardDwellWarning();
      persistProgress(true);
      return true;
    }

    pendingBombShare = false;
    pendingBombShareStartedAt = 0;
    if (
      (bombUsesThisRun > 0 && !bombFreeUsedThisRun) ||
      bombUsesThisRun > 1 ||
      bombUsesThisRun + bombToolInventoryCount() >= BOMB_MAX_USES_PER_RUN
    ) {
      persistProgress(true);
      return false;
    }
    bombShareItemsThisRun += 1;
    bombToolMessage = texts.bombShareRewarded;
    persistProgress(true);
    return true;
  }

  function requestBombToolAd() {
    if (
      bombAdLoading ||
      bombFreeItemAvailable ||
      bombUsesThisRun === 0 ||
      (bombUsesThisRun === 1 && bombFreeUsedThisRun) ||
      bombUsesThisRun + bombToolInventoryCount() >= BOMB_MAX_USES_PER_RUN ||
      rewardedAdPurpose
    ) {
      return;
    }

    if (!rewardedVideoAd) {
      bombToolMessage = texts.bombAdFailed;
      return;
    }

    bombAdLoading = true;
    rewardedAdPurpose = "bomb-tool";
    bombToolMessage = texts.bombAdLoading;
    const showAd = () => rewardedVideoAd.show?.();
    Promise.resolve()
      .then(showAd)
      .catch(() => Promise.resolve(rewardedVideoAd.load?.()).then(() => rewardedVideoAd.show?.()))
      .catch(() => {
        bombAdLoading = false;
        rewardedAdPurpose = null;
        bombToolMessage = texts.bombAdFailed;
      });
  }

  function bombCellFromPoint(point) {
    const rect = canvasRect();
    if (
      point.x < rect.x ||
      point.x > rect.x + rect.width ||
      point.y < rect.y ||
      point.y > rect.y + rect.height
    ) {
      return null;
    }

    const gamePoint = toGamePoint(point);
    const state = game.getState();
    const maxRow = Math.min(
      GAME_CONFIG.visibleRows - 1,
      Math.floor((GAME_CONFIG.height - GAME_CONFIG.topPadding) / state.arena.laneHeight) - 1
    );
    const column = Math.floor((gamePoint.x - GAME_CONFIG.sidePadding) / state.arena.blockSize);
    const row = Math.floor((gamePoint.y - GAME_CONFIG.topPadding) / state.arena.laneHeight);
    if (
      column < 0 ||
      column >= GAME_CONFIG.columns ||
      row < 0 ||
      row > maxRow
    ) {
      return null;
    }
    return { row, column };
  }

  function isBombCellEmpty(cell) {
    if (!cell) {
      return false;
    }
    const state = game.getState();
    const occupiesCell = (entity) =>
      !entity.collected && entity.row === cell.row && entity.column === cell.column;
    return !state.blocks.some(occupiesCell) &&
      !state.pickups.some(occupiesCell) &&
      !(state.coinsOnBoard ?? []).some(occupiesCell);
  }

  function bombAreaHasBlocks(cell) {
    if (!cell) {
      return false;
    }
    return game.getState().blocks.some((block) =>
      Math.abs(block.row - cell.row) <= BOMB_RADIUS &&
      Math.abs(block.column - cell.column) <= BOMB_RADIUS
    );
  }

  function startBombDrag(point) {
    bombToolMessage = "";
    const cell = bombCellFromPoint(point);
    bombDrag = {
      point,
      cell,
      valid: isBombCellEmpty(cell)
    };
  }

  function updateBombDrag(point) {
    if (!bombDrag) {
      return;
    }
    const cell = bombCellFromPoint(point);
    bombDrag = {
      point,
      cell,
      valid: isBombCellEmpty(cell)
    };
  }

  function startBombAnimation(cell, removedBlocks) {
    bombAnimation = {
      startedAt: Date.now(),
      duration: BOMB_ANIMATION_DURATION,
      cell,
      removedBlocks: removedBlocks.map((removed, index) => ({
        ...removed,
        angle: (index * 1.73) % (Math.PI * 2)
      }))
    };
  }

  function finishBombDrag() {
    if (!bombDrag) {
      return;
    }
    const { point, cell, valid } = bombDrag;
    bombDrag = null;
    bombPlacementArmed = false;
    const bombButton = currentButtons().find((button) => button.id === "bomb-tool");
    if (bombButton && hitTest(bombButton, point)) {
      bombToolMessage = "";
      return;
    }
    if (!valid) {
      bombToolMessage = texts.bombInvalidPosition;
      return;
    }
    if (!bombAreaHasBlocks(cell)) {
      bombToolMessage = texts.bombNoBlocks;
      return;
    }
    if (!itemsCanActivate()) {
      return;
    }
    if (!consumeBombToolItem()) {
      openBombToolPanel();
      return;
    }

    const result = game.clearBlocksInArea(cell.row, cell.column, BOMB_RADIUS);
    if (result.removedBlocks.length === 0) {
      return;
    }
    bombUsesThisRun = Math.min(BOMB_MAX_USES_PER_RUN, bombUsesThisRun + 1);
    bombToolMessage = "";
    startBombAnimation(cell, result.removedBlocks);
    persistProgress(true);
  }

  function clearToolPanelMode() {
    if (clearUsesThisRun >= CLEAR_TOOL_MAX_USES_PER_RUN) {
      return "limit";
    }
    return clearToolInventoryCount() > 0 ? "use" : "ad";
  }

  function openClearToolPanel() {
    if (!itemsCanActivate()) {
      return;
    }

    bombPlacementArmed = false;
    bombDrag = null;
    clearToolMessage = "";
    clearToolDemoStartedAt = Date.now();
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
    if (!itemsCanActivate()) {
      overlay = null;
      return;
    }
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

  function freezeToolPanelMode() {
    return limitedItemGrantMode(
      freezeUsesThisRun,
      freezeToolInventoryCount(),
      FREEZE_MAX_USES_PER_RUN,
      freezeFreeUsedThisRun
    );
  }

  function openFreezeToolPanel() {
    if (!itemsCanActivate() || game.getState().freezeActive) {
      return;
    }
    bombPlacementArmed = false;
    bombDrag = null;
    freezeToolMessage = "";
    freezeToolDemoStartedAt = Date.now();
    overlay = "freeze-tool";
  }

  function consumeFreezeToolItem() {
    if (freezeFreeItemAvailable) {
      freezeFreeItemAvailable = false;
      freezeFreeUsedThisRun = true;
      storage.saveFreezeFreeUsed(true);
      return true;
    }
    if (freezeShareItemsThisRun > 0) {
      freezeShareItemsThisRun -= 1;
      return true;
    }
    if (freezeAdItemsThisRun > 0) {
      freezeAdItemsThisRun -= 1;
      return true;
    }
    return false;
  }

  function startFreezeAnimation() {
    freezeAnimation = {
      startedAt: Date.now(),
      duration: FREEZE_ANIMATION_DURATION
    };
  }

  function requestFreezeToolShare() {
    if (
      pendingFreezeShare ||
      freezeFreeItemAvailable ||
      (freezeUsesThisRun > 0 && !freezeFreeUsedThisRun) ||
      freezeUsesThisRun > 1 ||
      freezeUsesThisRun + freezeToolInventoryCount() >= FREEZE_MAX_USES_PER_RUN ||
      game.getState().state !== "aiming"
    ) {
      return;
    }

    freezeToolMessage = "";
    pendingFreezeShare = true;
    pendingFreezeShareStartedAt = startShareRewardDwellTimer();
    try {
      if (typeof wxApi.shareAppMessage !== "function") {
        throw new Error("share unavailable");
      }
      wxApi.shareAppMessage(createSharePayload("freeze-tool"));
    } catch {
      pendingFreezeShare = false;
      pendingFreezeShareStartedAt = 0;
      freezeToolMessage = texts.freezeShareFailed;
    }
  }

  function completePendingFreezeShare() {
    if (!pendingFreezeShare) {
      return false;
    }

    if (!shareRewardDwellSatisfied(pendingFreezeShareStartedAt)) {
      pendingFreezeShare = false;
      pendingFreezeShareStartedAt = 0;
      showShareRewardDwellWarning();
      persistProgress(true);
      return true;
    }

    pendingFreezeShare = false;
    pendingFreezeShareStartedAt = 0;
    if (
      (freezeUsesThisRun > 0 && !freezeFreeUsedThisRun) ||
      freezeUsesThisRun > 1 ||
      freezeUsesThisRun + freezeToolInventoryCount() >= FREEZE_MAX_USES_PER_RUN
    ) {
      persistProgress(true);
      return false;
    }
    freezeShareItemsThisRun += 1;
    freezeToolMessage = texts.freezeShareRewarded;
    persistProgress(true);
    return true;
  }

  function requestFreezeToolAd() {
    if (
      freezeAdLoading ||
      freezeFreeItemAvailable ||
      freezeUsesThisRun === 0 ||
      (freezeUsesThisRun === 1 && freezeFreeUsedThisRun) ||
      freezeUsesThisRun + freezeToolInventoryCount() >= FREEZE_MAX_USES_PER_RUN ||
      rewardedAdPurpose
    ) {
      return;
    }

    if (!rewardedVideoAd) {
      freezeToolMessage = texts.freezeAdFailed;
      return;
    }

    freezeAdLoading = true;
    rewardedAdPurpose = "freeze-tool";
    freezeToolMessage = texts.freezeAdLoading;
    const showAd = () => rewardedVideoAd.show?.();
    Promise.resolve()
      .then(showAd)
      .catch(() => Promise.resolve(rewardedVideoAd.load?.()).then(() => rewardedVideoAd.show?.()))
      .catch(() => {
        freezeAdLoading = false;
        rewardedAdPurpose = null;
        freezeToolMessage = texts.freezeAdFailed;
      });
  }

  function confirmFreezeToolUse() {
    if (!itemsCanActivate()) {
      overlay = null;
      return;
    }

    const mode = freezeToolPanelMode();
    if (mode === "share") {
      requestFreezeToolShare();
      return;
    }
    if (mode === "ad") {
      requestFreezeToolAd();
      return;
    }
    if (mode !== "use" || !game.activateFreeze()) {
      return;
    }
    if (!consumeFreezeToolItem()) {
      game.getState().freezeActive = false;
      return;
    }

    freezeUsesThisRun = Math.min(FREEZE_MAX_USES_PER_RUN, freezeUsesThisRun + 1);
    freezeToolMessage = "";
    overlay = null;
    startFreezeAnimation();
    persistProgress(true);
  }

  function rageToolPanelMode() {
    return limitedItemGrantMode(
      rageUsesThisRun,
      rageToolInventoryCount(),
      RAGE_MAX_USES_PER_RUN,
      rageFreeUsedThisRun
    );
  }

  function openRageToolPanel() {
    const state = game.getState();
    if (!itemsCanActivate() || state.rageArmed || state.rageVolleyActive) {
      return;
    }
    bombPlacementArmed = false;
    bombDrag = null;
    rageToolMessage = "";
    rageToolDemoStartedAt = Date.now();
    overlay = "rage-tool";
  }

  function consumeRageToolItem() {
    if (rageFreeItemAvailable) {
      rageFreeItemAvailable = false;
      rageFreeUsedThisRun = true;
      storage.saveRageFreeUsed(true);
      return true;
    }
    if (rageShareItemsThisRun > 0) {
      rageShareItemsThisRun -= 1;
      return true;
    }
    if (rageAdItemsThisRun > 0) {
      rageAdItemsThisRun -= 1;
      return true;
    }
    return false;
  }

  function requestRageToolShare() {
    if (
      pendingRageShare ||
      rageFreeItemAvailable ||
      (rageUsesThisRun > 0 && !rageFreeUsedThisRun) ||
      rageUsesThisRun > 1 ||
      rageUsesThisRun + rageToolInventoryCount() >= RAGE_MAX_USES_PER_RUN ||
      game.getState().state !== "aiming"
    ) {
      return;
    }

    rageToolMessage = "";
    pendingRageShare = true;
    pendingRageShareStartedAt = startShareRewardDwellTimer();
    persistProgress(true);
    try {
      if (typeof wxApi.shareAppMessage !== "function") {
        throw new Error("share unavailable");
      }
      wxApi.shareAppMessage(createSharePayload("rage-tool"));
    } catch {
      pendingRageShare = false;
      pendingRageShareStartedAt = 0;
      rageToolMessage = texts.rageShareFailed;
      persistProgress(true);
    }
  }

  function completePendingRageShare() {
    if (!pendingRageShare) {
      return false;
    }

    if (!shareRewardDwellSatisfied(pendingRageShareStartedAt)) {
      pendingRageShare = false;
      pendingRageShareStartedAt = 0;
      showShareRewardDwellWarning();
      persistProgress(true);
      return true;
    }

    pendingRageShare = false;
    pendingRageShareStartedAt = 0;
    if (
      (rageUsesThisRun > 0 && !rageFreeUsedThisRun) ||
      rageUsesThisRun > 1 ||
      rageUsesThisRun + rageToolInventoryCount() >= RAGE_MAX_USES_PER_RUN
    ) {
      persistProgress(true);
      return false;
    }
    rageShareItemsThisRun += 1;
    rageToolMessage = texts.rageShareRewarded;
    persistProgress(true);
    return true;
  }

  function requestRageToolAd() {
    if (
      rageAdLoading ||
      rageFreeItemAvailable ||
      rageUsesThisRun === 0 ||
      (rageUsesThisRun === 1 && rageFreeUsedThisRun) ||
      rageUsesThisRun + rageToolInventoryCount() >= RAGE_MAX_USES_PER_RUN ||
      rewardedAdPurpose
    ) {
      return;
    }

    if (!rewardedVideoAd) {
      rageToolMessage = texts.rageAdFailed;
      return;
    }

    rageAdLoading = true;
    rewardedAdPurpose = "rage-tool";
    rageToolMessage = texts.rageAdLoading;
    const showAd = () => rewardedVideoAd.show?.();
    Promise.resolve()
      .then(showAd)
      .catch(() => Promise.resolve(rewardedVideoAd.load?.()).then(() => rewardedVideoAd.show?.()))
      .catch(() => {
        rageAdLoading = false;
        rewardedAdPurpose = null;
        rageToolMessage = texts.rageAdFailed;
      });
  }

  function confirmRageToolUse() {
    if (!itemsCanActivate()) {
      overlay = null;
      return;
    }
    const mode = rageToolPanelMode();
    if (mode === "share") {
      requestRageToolShare();
      return;
    }
    if (mode === "ad") {
      requestRageToolAd();
      return;
    }
    if (mode !== "use" || !game.activateRage()) {
      return;
    }
    if (!consumeRageToolItem()) {
      game.getState().rageArmed = false;
      return;
    }

    rageUsesThisRun = Math.min(RAGE_MAX_USES_PER_RUN, rageUsesThisRun + 1);
    rageToolMessage = "";
    rageAnimation = {
      startedAt: Date.now(),
      duration: RAGE_ANIMATION_DURATION
    };
    overlay = null;
    persistProgress(true);
  }

  function requestClearToolAd() {
    if (
      clearAdLoading ||
      clearFreeItemAvailable ||
      clearUsesThisRun + clearToolInventoryCount() >= CLEAR_TOOL_MAX_USES_PER_RUN ||
      rewardedAdPurpose
    ) {
      return;
    }

    if (!rewardedVideoAd) {
      clearToolMessage = texts.clearAdFailed;
      return;
    }

    clearAdLoading = true;
    rewardedAdPurpose = "clear-tool";
    clearToolMessage = texts.clearAdLoading;
    const showAd = () => rewardedVideoAd.show?.();
    Promise.resolve()
      .then(showAd)
      .catch(() => Promise.resolve(rewardedVideoAd.load?.()).then(() => rewardedVideoAd.show?.()))
      .catch(() => {
        clearAdLoading = false;
        rewardedAdPurpose = null;
        clearToolMessage = texts.clearAdFailed;
      });
  }

  rewardedVideoAd?.onClose?.((result) => {
    const purpose = rewardedAdPurpose;
    rewardedAdPurpose = null;
    const completed = result?.isEnded === true || result === undefined;
    syncBackgroundMusic();

    if (purpose === "revive") {
      reviveAdLoading = false;
      if (completed) {
        completeAdRevive();
      } else {
        doubleCoinMessage = "";
      }
      return;
    }

    if (purpose === "bomb-tool") {
      bombAdLoading = false;
      if (completed) {
        bombAdItemsThisRun += 1;
        bombToolMessage = texts.bombAdRewarded;
        persistProgress(true);
      } else {
        bombToolMessage = "";
      }
      return;
    }

    if (purpose === "freeze-tool") {
      freezeAdLoading = false;
      if (completed) {
        freezeAdItemsThisRun += 1;
        freezeToolMessage = texts.freezeAdRewarded;
        persistProgress(true);
      } else {
        freezeToolMessage = "";
      }
      return;
    }

    if (purpose === "rage-tool") {
      rageAdLoading = false;
      if (completed) {
        rageAdItemsThisRun += 1;
        rageToolMessage = texts.rageAdRewarded;
        persistProgress(true);
      } else {
        rageToolMessage = "";
      }
      return;
    }

    clearAdLoading = false;
    if (purpose === "clear-tool" && completed) {
      clearAdItemsThisRun += 1;
      clearToolMessage = texts.clearAdRewarded;
      persistProgress(true);
      return;
    }

    clearToolMessage = "";
  });
  rewardedVideoAd?.onError?.(() => {
    const purpose = rewardedAdPurpose;
    rewardedAdPurpose = null;
    syncBackgroundMusic();
    if (purpose === "revive") {
      reviveAdLoading = false;
      doubleCoinMessage = REVIVE_AD_FAILED_TEXT;
      return;
    }
    if (purpose === "bomb-tool") {
      bombAdLoading = false;
      bombToolMessage = texts.bombAdFailed;
      return;
    }
    if (purpose === "freeze-tool") {
      freezeAdLoading = false;
      freezeToolMessage = texts.freezeAdFailed;
      return;
    }
    if (purpose === "rage-tool") {
      rageAdLoading = false;
      rageToolMessage = texts.rageAdFailed;
      return;
    }
    clearAdLoading = false;
    clearToolMessage = texts.clearAdFailed;
  });

  function requestReviveAd() {
    if (
      reviveAdLoading ||
      continueUsedThisRun ||
      game.getState().state !== "gameover" ||
      rewardedAdPurpose
    ) {
      return;
    }

    if (!rewardedVideoAd) {
      doubleCoinMessage = REVIVE_AD_FAILED_TEXT;
      return;
    }

    reviveAdLoading = true;
    rewardedAdPurpose = "revive";
    doubleCoinMessage = REVIVE_AD_LOADING_TEXT;
    const showAd = () => rewardedVideoAd.show?.();
    Promise.resolve()
      .then(showAd)
      .catch(() => Promise.resolve(rewardedVideoAd.load?.()).then(() => rewardedVideoAd.show?.()))
      .catch(() => {
        reviveAdLoading = false;
        rewardedAdPurpose = null;
        doubleCoinMessage = REVIVE_AD_FAILED_TEXT;
      });
  }

  function requestDoubleCoinShare() {
    const amount = Math.max(0, Math.floor(gameOverResult?.coinsEarned || 0));
    if (
      amount <= 0 ||
      gameOverResult?.coinDoubled === true ||
      pendingDoubleCoinShare
    ) {
      return;
    }

    const rewardButton = currentButtons().find((button) => button.id === "double-coins-share");
    pendingDoubleCoinShare = {
      amount,
      sourceX: rewardButton ? rewardButton.x + rewardButton.width / 2 : screenWidth / 2,
      sourceY: rewardButton ? rewardButton.y + rewardButton.height / 2 : screenHeight * 0.68,
      startedAt: startShareRewardDwellTimer()
    };
    doubleCoinMessage = "";
    try {
      if (typeof wxApi.shareAppMessage !== "function") {
        throw new Error("share unavailable");
      }
      wxApi.shareAppMessage(createSharePayload("double-coins"));
    } catch {
      pendingDoubleCoinShare = null;
      doubleCoinMessage = DOUBLE_COINS_SHARE_FAILED_TEXT;
    }
  }

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
    runCoinsEarned = Math.max(0, Math.floor(Number(progress.runCoinsEarned) || 0));
    clearAdItemsThisRun = Math.max(0, Math.floor(Number(progress.clearAdItemsThisRun) || 0));
    clearUsesThisRun = Math.max(0, Math.floor(Number(progress.clearUsesThisRun) || 0));
    clearFreeItemAvailable = progress.clearFreeItemAvailable !== false && storage.loadClearFreeUsed() !== true;
    bombFreeItemAvailable = progress.bombFreeItemAvailable !== false &&
      storage.loadBombFreeUsed() !== true;
    bombFreeUsedThisRun = progress.bombFreeUsedThisRun === true;
    bombShareItemsThisRun = Math.max(
      0,
      Math.floor(Number(progress.bombShareItemsThisRun) || 0)
    );
    bombAdItemsThisRun = Math.max(
      0,
      Math.floor(Number(progress.bombAdItemsThisRun) || 0)
    );
    bombUsesThisRun = Math.max(0, Math.floor(Number(progress.bombUsesThisRun) || 0));
    freezeFreeItemAvailable = progress.freezeFreeItemAvailable !== false &&
      storage.loadFreezeFreeUsed() !== true;
    freezeFreeUsedThisRun = progress.freezeFreeUsedThisRun === true;
    freezeShareItemsThisRun = Math.max(
      0,
      Math.floor(Number(progress.freezeShareItemsThisRun) || 0)
    );
    freezeAdItemsThisRun = Math.max(
      0,
      Math.floor(Number(progress.freezeAdItemsThisRun) || 0)
    );
    freezeUsesThisRun = Math.max(0, Math.floor(Number(progress.freezeUsesThisRun) || 0));
    rageFreeItemAvailable = progress.rageFreeItemAvailable !== false &&
      storage.loadRageFreeUsed() !== true;
    rageFreeUsedThisRun = progress.rageFreeUsedThisRun === true;
    rageShareItemsThisRun = Math.max(
      0,
      Math.floor(Number(progress.rageShareItemsThisRun) || 0)
    );
    rageAdItemsThisRun = Math.max(
      0,
      Math.floor(Number(progress.rageAdItemsThisRun) || 0)
    );
    rageUsesThisRun = Math.max(0, Math.floor(Number(progress.rageUsesThisRun) || 0));
    clearToolMessage = "";
    clearToolAnimation = null;
    clearAdLoading = false;
    bombToolMessage = "";
    bombAdLoading = false;
    pendingBombShare = false;
    pendingBombShareStartedAt = 0;
    bombPlacementArmed = false;
    bombDrag = null;
    bombAnimation = null;
    freezeToolMessage = "";
    freezeAdLoading = false;
    freezeAnimation = null;
    pendingFreezeShare = false;
    pendingFreezeShareStartedAt = 0;
    rageToolMessage = "";
    rageAdLoading = false;
    rageAnimation = null;
    pendingRageShare = false;
    pendingRageShareStartedAt = 0;
    rewardedAdPurpose = null;
    reviveAdLoading = false;
    doubleCoinMessage = "";
    coinDoubleAnimation = null;
    coinCollectAnimations = [];
    addBallCollectAnimations = [];
    pendingDoubleCoinShare = null;
    transientCenterMessage = null;
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
    bombFreeItemAvailable = storage.loadBombFreeUsed() !== true;
    bombFreeUsedThisRun = false;
    bombShareItemsThisRun = 0;
    bombAdItemsThisRun = 0;
    bombUsesThisRun = 0;
    bombToolMessage = "";
    bombAdLoading = false;
    pendingBombShare = false;
    pendingBombShareStartedAt = 0;
    bombPlacementArmed = false;
    bombDrag = null;
    bombAnimation = null;
    freezeFreeItemAvailable = storage.loadFreezeFreeUsed() !== true;
    freezeFreeUsedThisRun = false;
    freezeShareItemsThisRun = 0;
    freezeAdItemsThisRun = 0;
    freezeUsesThisRun = 0;
    freezeToolMessage = "";
    freezeAdLoading = false;
    freezeAnimation = null;
    pendingFreezeShare = false;
    pendingFreezeShareStartedAt = 0;
    rageFreeItemAvailable = storage.loadRageFreeUsed() !== true;
    rageFreeUsedThisRun = false;
    rageShareItemsThisRun = 0;
    rageAdItemsThisRun = 0;
    rageUsesThisRun = 0;
    rageToolMessage = "";
    rageAdLoading = false;
    rageAnimation = null;
    pendingRageShare = false;
    pendingRageShareStartedAt = 0;
    game.restart();
    runCoinsEarned = 0;
    hasStartedRun = true;
    continueUsedThisRun = false;
    gameOverResult = null;
    newRecordCheerPlayed = false;
    resetRecordConfetti();
    rewardedAdPurpose = null;
    reviveAdLoading = false;
    doubleCoinMessage = "";
    coinDoubleAnimation = null;
    coinCollectAnimations = [];
    addBallCollectAnimations = [];
    pendingDoubleCoinShare = null;
    transientCenterMessage = null;
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
    bombPlacementArmed = false;
    bombDrag = null;
    tutorialIdleTime = 0;
    resetRecordConfetti();
  }

  function completeAdRevive() {
    if (continueUsedThisRun || game.getState().state !== "gameover") {
      return;
    }

    doubleCoinMessage = "";
    continueUsedThisRun = true;
    if (!game.continueFromGameOver()) {
      return;
    }
    audioBus.emit("revive");

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

  function completePendingDoubleCoinShare() {
    if (
      !pendingDoubleCoinShare ||
      !gameOverResult ||
      gameOverResult.coinDoubled === true
    ) {
      return false;
    }

    if (!shareRewardDwellSatisfied(pendingDoubleCoinShare.startedAt)) {
      pendingDoubleCoinShare = null;
      showShareRewardDwellWarning();
      return true;
    }

    const reward = pendingDoubleCoinShare;
    pendingDoubleCoinShare = null;
    gameOverResult.coinDoubled = true;
    doubleCoinMessage = "";
    coinDoubleAnimation = {
      amount: reward.amount,
      startedAt: Date.now(),
      duration: 1050,
      sourceX: reward.sourceX,
      sourceY: reward.sourceY
    };
    return true;
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

  function hasHeartReviveAvailable() {
    return game.getState().heartCount > 0;
  }

  function gameOverPanelMetrics() {
    if (continueUsedThisRun) {
      return { yScale: 0.1, heightScale: 0.78 };
    }

    if (hasHeartReviveAvailable()) {
      return { yScale: 0.16, heightScale: 0.66 };
    }

    return { yScale: 0.24, heightScale: 0.54 };
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

  function showFeedbackUnavailable() {
    feedbackWarningUntil = Date.now() + 2600;
    try {
      wxApi.showModal?.({
        title: texts.feedback,
        content: texts.feedbackUnavailable,
        showCancel: false,
        confirmText: texts.done
      });
    } catch {
      // Canvas fallback below keeps feedback guidance visible if modal APIs are unavailable.
    }
  }

  function hideFeedbackNativeButton() {
    if (feedbackNativeButton?.hide) {
      feedbackNativeButton.hide();
    }
  }

  function destroyFeedbackNativeButton() {
    if (feedbackNativeButton?.destroy) {
      feedbackNativeButton.destroy();
    }
    feedbackNativeButton = null;
    feedbackNativeButtonBounds = null;
  }

  function syncFeedbackNativeButton() {
    if (feedbackNativeUnavailable) {
      return;
    }

    if (typeof wxApi.createFeedbackButton !== "function") {
      feedbackNativeUnavailable = true;
      return;
    }

    if (screen !== "menu" || overlay !== null) {
      hideFeedbackNativeButton();
      return;
    }

    const feedbackButton = currentButtons().find((button) => button.id === "feedback");
    if (!feedbackButton) {
      hideFeedbackNativeButton();
      return;
    }

    const bounds = {
      left: Math.round(feedbackButton.x),
      top: Math.round(feedbackButton.y),
      width: Math.round(feedbackButton.width),
      height: Math.round(feedbackButton.height)
    };
    const sameBounds = feedbackNativeButtonBounds &&
      feedbackNativeButtonBounds.left === bounds.left &&
      feedbackNativeButtonBounds.top === bounds.top &&
      feedbackNativeButtonBounds.width === bounds.width &&
      feedbackNativeButtonBounds.height === bounds.height;

    if (feedbackNativeButton && sameBounds) {
      feedbackNativeButton.show?.();
      return;
    }

    destroyFeedbackNativeButton();
    try {
      feedbackNativeButton = wxApi.createFeedbackButton({
        type: "text",
        text: "",
        style: {
          left: bounds.left,
          top: bounds.top,
          width: bounds.width,
          height: bounds.height,
          lineHeight: bounds.height,
          backgroundColor: "rgba(0,0,0,0)",
          borderColor: "rgba(0,0,0,0)",
          borderWidth: 0,
          borderRadius: 0,
          color: "rgba(0,0,0,0)",
          fontSize: 1,
          textAlign: "center"
        }
      });
      feedbackNativeButtonBounds = bounds;
      feedbackNativeButton.show?.();
    } catch {
      feedbackNativeUnavailable = true;
      destroyFeedbackNativeButton();
    }
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

  let currentButtonsRenderCache = null;

  function buildCurrentButtons() {
    const rect = canvasRect();
    const layout = shopLayout();
    const gameOverPanelLayout = gameOverPanelMetrics();
    const confirmNewRunPanel = {
      x: rect.x + 24,
      y: rect.y + rect.height * 0.16,
      width: rect.width - 48,
      height: rect.height * 0.68
    };
    const gameOverPanel = {
      x: rect.x + 24,
      y: rect.y + rect.height * gameOverPanelLayout.yScale,
      width: rect.width - 48,
      height: rect.height * gameOverPanelLayout.heightScale
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
      const buttons = [];

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
          }
        );
        buttons.push(...homeBottomNavLayout(rect));
      }

      if (overlay === "settings") {
        const settings = settingsLayout(settingsPanel);
        buttons.push(
          {
            id: "toggle-sound",
            x: settings.toggleX,
            y: settings.soundY,
            width: settings.toggleWidth,
            height: settings.buttonHeight
          },
          {
            id: "toggle-music",
            x: settings.toggleX,
            y: settings.musicY,
            width: settings.toggleWidth,
            height: settings.buttonHeight
          },
          {
            id: "toggle-vibration",
            x: settings.toggleX,
            y: settings.vibrationY,
            width: settings.toggleWidth,
            height: settings.buttonHeight
          },
          {
            id: "toggle-effects",
            x: settings.toggleX,
            y: settings.effectsY,
            width: settings.toggleWidth,
            height: settings.buttonHeight
          },
          {
            id: "settings-done",
            x: settings.doneX,
            y: settings.doneY,
            width: settings.doneWidth,
            height: settings.doneHeight
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

    if (overlay === null && itemsCanActivate()) {
      buttons.push(bombToolButtonRect(rect));
      if (!game.getState().freezeActive) {
        buttons.push(freezeToolButtonRect(rect));
      }
      if (!game.getState().rageArmed && !game.getState().rageVolleyActive) {
        buttons.push(rageToolButtonRect(rect));
      }
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
      const settings = settingsLayout(settingsPanel);
      buttons.push(
        {
          id: "toggle-sound",
          x: settings.toggleX,
          y: settings.soundY,
          width: settings.toggleWidth,
          height: settings.buttonHeight
        },
        {
          id: "toggle-music",
          x: settings.toggleX,
          y: settings.musicY,
          width: settings.toggleWidth,
          height: settings.buttonHeight
        },
        {
          id: "toggle-vibration",
          x: settings.toggleX,
          y: settings.vibrationY,
          width: settings.toggleWidth,
          height: settings.buttonHeight
        },
        {
          id: "toggle-effects",
          x: settings.toggleX,
          y: settings.effectsY,
          width: settings.toggleWidth,
          height: settings.buttonHeight
        },
        {
          id: "settings-done",
          x: settings.doneX,
          y: settings.doneY,
          width: settings.doneWidth,
          height: settings.doneHeight
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

    if (overlay === "bomb-tool") {
      buttons.push({
        id: "bomb-tool-close",
        x: clearToolPanel.x + clearToolPanel.width - 44,
        y: clearToolPanel.y + 20,
        width: 24,
        height: 24
      });

      if (bombToolPanelMode() !== "limit") {
        buttons.push({
          id: "bomb-tool-confirm",
          x: clearToolPanel.x + 32,
          y: clearToolPanel.y + clearToolPanel.height - 76,
          width: clearToolPanel.width - 64,
          height: 52
        });
      }
    }

    if (overlay === "freeze-tool") {
      buttons.push({
        id: "freeze-tool-close",
        x: clearToolPanel.x + clearToolPanel.width - 44,
        y: clearToolPanel.y + 20,
        width: 24,
        height: 24
      });

      if (freezeToolPanelMode() !== "limit") {
        buttons.push({
          id: "freeze-tool-confirm",
          x: clearToolPanel.x + 32,
          y: clearToolPanel.y + clearToolPanel.height - 76,
          width: clearToolPanel.width - 64,
          height: 52
        });
      }
    }

    if (overlay === "rage-tool") {
      buttons.push({
        id: "rage-tool-close",
        x: clearToolPanel.x + clearToolPanel.width - 44,
        y: clearToolPanel.y + 20,
        width: 24,
        height: 24
      });

      if (rageToolPanelMode() !== "limit") {
        buttons.push({
          id: "rage-tool-confirm",
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
        const hasHeartRevive = hasHeartReviveAvailable();
        const bottomPadding = 34;
        const buttonGap = hasHeartRevive ? 12 : 0;
        buttons.push({
          id: "ad-continue",
          x: gameOverPanel.x + 24,
          y: gameOverPanel.y + gameOverPanel.height - bottomPadding - 52 -
            (hasHeartRevive ? 52 + buttonGap : 0),
          width: gameOverPanel.width - 48,
          height: 52
        });
        if (hasHeartRevive) {
          buttons.push({
            id: "heart-use",
            x: gameOverPanel.x + 24,
            y: gameOverPanel.y + gameOverPanel.height - bottomPadding - 52,
            width: gameOverPanel.width - 48,
            height: 52
          });
        }
      } else {
        const earnedCoins = Math.max(0, Math.floor(gameOverResult?.coinsEarned || 0));
        if (earnedCoins > 0 && gameOverResult?.coinDoubled !== true) {
          buttons.push({
            id: "double-coins-share",
            x: gameOverPanel.x + 24,
            y: gameOverPanel.y + gameOverPanel.height - 138,
            width: gameOverPanel.width - 48,
            height: 52
          });
        }
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

  function currentButtons() {
    return currentButtonsRenderCache ?? buildCurrentButtons();
  }

  function handleButton(id) {
    if (
      (coinDoubleAnimation && screen === "game" && overlay === "gameover") ||
      bombAnimation ||
      clearToolAnimation ||
      freezeAnimation ||
      rageAnimation
    ) {
      return;
    }

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
      case "double-coins-share":
        requestDoubleCoinShare();
        break;
      case "ad-continue":
        requestReviveAd();
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
      case "feedback":
        if (!wxApi.createFeedbackButton || feedbackNativeUnavailable || !feedbackNativeButton) {
          showFeedbackUnavailable();
        }
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
          bombPlacementArmed = false;
          bombDrag = null;
          overlay = "pause";
        }
        break;
      case "speed":
        game.activateSpeedUp();
        break;
      case "clear-tool":
        openClearToolPanel();
        break;
      case "bomb-tool":
        openBombToolPanel();
        break;
      case "clear-tool-close":
        clearAdLoading = false;
        clearToolMessage = "";
        overlay = null;
        break;
      case "clear-tool-confirm":
        confirmClearToolUse();
        break;
      case "bomb-tool-close":
        bombToolMessage = "";
        overlay = null;
        break;
      case "bomb-tool-confirm":
        confirmBombToolUse();
        break;
      case "freeze-tool":
        openFreezeToolPanel();
        break;
      case "freeze-tool-close":
        freezeToolMessage = "";
        overlay = null;
        break;
      case "freeze-tool-confirm":
        confirmFreezeToolUse();
        break;
      case "rage-tool":
        openRageToolPanel();
        break;
      case "rage-tool-close":
        rageToolMessage = "";
        overlay = null;
        break;
      case "rage-tool-confirm":
        confirmRageToolUse();
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
      case "toggle-music":
        musicEnabled = !musicEnabled;
        syncBackgroundMusic();
        saveSettings();
        break;
      case "toggle-vibration":
        vibrationEnabled = !vibrationEnabled;
        saveSettings();
        break;
      case "toggle-effects":
        setEffectsEnabled(!effectsEnabled);
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
    const isContinueButton = button.id === "ad-continue" ||
      button.id === "continue-challenge" ||
      button.id === "confirm-new-continue";
    const isMainMenuButton = button.id === "continue-challenge" ||
      button.id === "play" ||
      button.id === "shop" ||
      button.id === "leaderboard";
    const usesBlackMainMenuText = button.id === "continue-challenge" || button.id === "play";
    context.fillStyle = isContinueButton
      ? button.id === "ad-continue"
        ? "#ef4444"
        : "#22c55e"
      : button.id === "restart"
        ? "#22c55e"
      : primary
        ? "#f2b400"
        : button.id === "shop"
          ? "#2f80ed"
          : "rgba(255,255,255,0.08)";
    context.fill();
    if (button.id === "double-coins-share") {
      const shimmer = (Date.now() % 1800) / 1800;
      const shineX = button.x - button.width * 0.35 + shimmer * button.width * 1.7;
      context.save();
      context.beginPath();
      roundedRect(context, button.x, button.y, button.width, button.height, 24);
      context.clip();
      const shine = context.createLinearGradient(
        shineX - button.width * 0.18,
        button.y,
        shineX + button.width * 0.18,
        button.y
      );
      shine.addColorStop(0, "rgba(255,255,255,0)");
      shine.addColorStop(0.5, "rgba(255,255,255,0.62)");
      shine.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = shine;
      context.fillRect(button.x, button.y, button.width, button.height);
      context.restore();
    }
    if (button.id !== "speed") {
      context.strokeStyle = button.id === "double-coins-share"
        ? "rgba(255,245,180,0.95)"
        : isContinueButton
        ? "rgba(255,255,255,0.18)"
        : primary
          ? "rgba(0,0,0,0.08)"
          : "rgba(255,255,255,0.12)";
      context.lineWidth = button.id === "double-coins-share" ? 2 : 1;
      if (button.id === "double-coins-share") {
        context.save();
        context.shadowColor = "rgba(250,204,21,0.72)";
        context.shadowBlur = 14 + Math.sin(Date.now() * 0.006) * 4;
        context.stroke();
        context.restore();
      } else {
        context.stroke();
      }
    }
    const usesDarkButtonText = primary || isContinueButton || button.id === "shop";
    context.fillStyle = usesBlackMainMenuText
      ? "#1d1d1d"
      : isMainMenuButton
        ? "#ffffff"
        : usesDarkButtonText
          ? "#1d1d1d"
          : "#fbfbfb";
    context.font = "700 20px sans-serif";
    context.textBaseline = "middle";

    if (button.id === "double-coins-share") {
      const amount = Math.max(0, Math.floor(gameOverResult?.coinsEarned || 0));
      const amountText = `+${amount}`;
      const iconSize = 24;
      const gap = 6;
      context.font = "800 17px sans-serif";
      const labelWidth = context.measureText(label).width;
      context.font = "900 18px sans-serif";
      const amountWidth = context.measureText(amountText).width;
      const totalWidth = iconSize + gap + labelWidth + gap + iconSize + 3 + amountWidth;
      let cursorX = button.x + (button.width - totalWidth) / 2;
      const centerY = button.y + button.height / 2;

      if (shareIconAsset.loaded && shareIconAsset.image) {
        context.drawImage(shareIconAsset.image, cursorX, centerY - iconSize / 2, iconSize, iconSize);
      }
      cursorX += iconSize + gap;
      context.fillStyle = "#1d1d1d";
      context.font = "800 17px sans-serif";
      context.textAlign = "left";
      context.fillText(label, cursorX, centerY + 1);
      cursorX += labelWidth + gap;
      if (coinIconAsset.loaded && coinIconAsset.image) {
        context.drawImage(coinIconAsset.image, cursorX, centerY - iconSize / 2, iconSize, iconSize);
      } else {
        context.beginPath();
        context.arc(cursorX + iconSize / 2, centerY, iconSize / 2, 0, Math.PI * 2);
        context.fillStyle = "#facc15";
        context.fill();
      }
      context.fillStyle = "#1d1d1d";
      context.font = "900 18px sans-serif";
      context.fillText(amountText, cursorX + iconSize + 3, centerY + 1);
      return;
    }

    if (button.id === "ad-continue") {
      const iconSize = 24;
      const gap = 8;
      const textWidth = context.measureText(label).width;
      const contentX = button.x + (button.width - iconSize - gap - textWidth) / 2;
      const centerY = button.y + button.height / 2;
      if (adVideoIconAsset.loaded && adVideoIconAsset.image) {
        context.drawImage(adVideoIconAsset.image, contentX, centerY - iconSize / 2, iconSize, iconSize);
      }
      context.fillStyle = "#ffffff";
      context.textAlign = "left";
      context.fillText(label, contentX + iconSize + gap, centerY + 1);
      return;
    }

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
      context.fillStyle = usesBlackMainMenuText
        ? "rgba(29,29,29,0.72)"
        : isMainMenuButton
          ? "rgba(255,255,255,0.82)"
        : usesDarkButtonText
          ? "rgba(29,29,29,0.72)"
          : "rgba(255,255,255,0.78)";
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
    context.font = menuTitleFont(36);
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

  function drawHomeBottomNav(context, buttons) {
    const navButtons = buttons.filter((button) =>
      ["leaderboard", "shop", "feedback", "menu-settings"].includes(button.id)
    );
    if (!navButtons.length) {
      return;
    }

    const labels = {
      leaderboard: texts.leaderboard,
      shop: texts.shop,
      feedback: texts.feedback,
      "menu-settings": texts.settings
    };
    context.save();
    for (const button of navButtons) {
      const centerX = button.x + button.width / 2;
      const iconSize = button.iconSize ?? 42;
      const iconX = centerX - iconSize / 2;
      const iconY = button.y + (button.verticalPadding ?? 4);
      const asset = homeNavIconAssets[button.id];

      if (asset?.loaded && asset.image) {
        context.drawImage(asset.image, iconX, iconY, iconSize, iconSize);
      } else {
        context.beginPath();
        context.arc(centerX, iconY + iconSize / 2, iconSize * 0.42, 0, Math.PI * 2);
        context.fillStyle = button.id === "feedback"
          ? "#ef4444"
          : button.id === "shop"
            ? "#f59e0b"
            : button.id === "leaderboard"
              ? "#facc15"
              : "#60a5fa";
        context.fill();
      }

      context.fillStyle = "rgba(255,255,255,0.86)";
      context.font = `800 ${button.labelFontSize ?? 13}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "alphabetic";
      context.fillText(
        labels[button.id],
        centerX,
        iconY + iconSize + (button.iconLabelGap ?? 5) + (button.labelFontSize ?? 13)
      );
    }
    context.restore();
  }

  function drawFeedbackWarning(context) {
    if (Date.now() >= feedbackWarningUntil) {
      return;
    }

    const rect = canvasRect();
    const navTop = homeBottomNavLayout(rect)[0]?.y ?? (screenHeight - rect.bottomInset - 82);
    const text = texts.feedbackUnavailable;
    context.save();
    context.font = "800 14px sans-serif";
    const width = Math.min(screenWidth - rect.horizontalPadding * 2, context.measureText(text).width + 34);
    const height = 34;
    const x = (screenWidth - width) / 2;
    const y = navTop - height - 12;
    roundedRect(context, x, y, width, height, 17);
    context.fillStyle = "rgba(239,68,68,0.92)";
    context.fill();
    context.fillStyle = "#fff7ed";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, screenWidth / 2, y + height / 2 + 1);
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
    context.font = gameHudFont(26, 800);
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
      context.font = gameHudFont(18, 800);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("$", startX + iconSize / 2, y + 1);
      context.font = gameHudFont(26, 800);
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
    context.font = gameHudFont(26, 800);
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
      context.font = gameHudFont(18, 800);
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("+", startX + iconSize / 2, y + 1);
      context.font = gameHudFont(26, 800);
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
    context.font = gameHudFont(26, 800);
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

  function drawCoinDoubleAnimation(context, state, rect) {
    if (!coinDoubleAnimation) {
      return;
    }

    const elapsed = Date.now() - coinDoubleAnimation.startedAt;
    const target = counterIconTarget(context, rect, "coin", state);
    const sourceX = coinDoubleAnimation.sourceX ?? screenWidth / 2;
    const sourceY = coinDoubleAnimation.sourceY ??
      Math.min(screenHeight * 0.68, rect.y + rect.height * 0.72);
    const coinCount = clamp(coinDoubleAnimation.amount, 4, 8);

    for (let index = 0; index < coinCount; index += 1) {
      const delay = index * 55;
      const flight = clamp((elapsed - delay) / 700, 0, 1);
      if (flight <= 0 || flight >= 1) {
        continue;
      }

      const eased = easeOutCubic(flight);
      const spread = (index - (coinCount - 1) / 2) * 12;
      const x = lerp(sourceX + spread, target.x, eased);
      const y = lerp(sourceY + Math.abs(spread) * 0.28, target.y, eased) -
        Math.sin(flight * Math.PI) * (58 + (index % 3) * 8);
      const size = lerp(32, 19, eased);
      const alpha = 1 - Math.max(0, flight - 0.86) / 0.14;
      drawRewardIcon(context, {
        asset: coinIconAsset,
        fallback: "$",
        color: "#f2b400",
        fallbackColor: "#1d1d1d"
      }, x, y, size, alpha);
    }

    const glowProgress = clamp((elapsed - 650) / 350, 0, 1);
    if (glowProgress > 0) {
      const glow = Math.sin(glowProgress * Math.PI);
      context.save();
      context.beginPath();
      context.arc(target.x, target.y, 28 + glow * 12, 0, Math.PI * 2);
      context.strokeStyle = `rgba(250,204,21,${0.2 + glow * 0.45})`;
      context.lineWidth = 3;
      context.stroke();
      context.restore();
    }

    drawCoinCounter(context, screenWidth - rect.horizontalPadding, rect.topInset + 40, state.coins);
  }

  function drawCoinCollectAnimations(context, state, rect) {
    if (!effectsEnabled || !coinCollectAnimations.length) {
      coinCollectAnimations = [];
      return;
    }

    const now = Date.now();
    const target = counterIconTarget(context, rect, "coin", state);
    coinCollectAnimations = coinCollectAnimations.filter((animation) => now - animation.startedAt < animation.duration);
    if (!coinCollectAnimations.length) {
      return;
    }

    for (const animation of coinCollectAnimations) {
      const elapsed = now - animation.startedAt;
      const flight = clamp(elapsed / animation.duration, 0, 1);
      if (flight <= 0 || flight >= 1) {
        continue;
      }

      const eased = easeOutCubic(flight);
      const arcLift = Math.sin(flight * Math.PI) * 46;
      const x = lerp(animation.sourceX, target.x, eased);
      const y = lerp(animation.sourceY, target.y, eased) - arcLift;
      const size = lerp(30, 19, eased);
      const alpha = 1 - Math.max(0, flight - 0.84) / 0.16;

      drawRewardIcon(context, {
        asset: coinIconAsset,
        fallback: "$",
        color: "#f2b400",
        fallbackColor: "#1d1d1d"
      }, x, y, size, alpha);

      context.save();
      context.globalAlpha = 0.5 * alpha;
      context.fillStyle = "#facc15";
      for (let spark = 0; spark < 3; spark += 1) {
        const angle = spark * Math.PI * 0.72 + flight * Math.PI * 2;
        context.beginPath();
        context.arc(
          x - Math.cos(angle) * (9 + spark * 3),
          y - Math.sin(angle) * (7 + spark * 2),
          2,
          0,
          Math.PI * 2
        );
        context.fill();
      }
      context.restore();
    }

    const glowProgress = clamp((now - Math.max(...coinCollectAnimations.map((animation) => animation.startedAt))) / 420, 0, 1);
    if (glowProgress > 0) {
      const glow = Math.sin(glowProgress * Math.PI);
      context.save();
      context.beginPath();
      context.arc(target.x, target.y, 26 + glow * 9, 0, Math.PI * 2);
      context.strokeStyle = `rgba(250,204,21,${0.18 + glow * 0.34})`;
      context.lineWidth = 2;
      context.stroke();
      context.restore();
    }

    drawCoinCounter(context, screenWidth - rect.horizontalPadding, rect.topInset + 40, state.coins);
  }

  function drawAddBallCollectAnimations(context, state, rect) {
    if (!effectsEnabled || !addBallCollectAnimations.length) {
      addBallCollectAnimations = [];
      return;
    }

    const now = Date.now();
    const scaleX = rect.width / GAME_CONFIG.width;
    const scaleY = rect.height / GAME_CONFIG.height;
    const target = {
      x: rect.x + state.launcherX * scaleX,
      y: rect.y + state.arena.launcherY * scaleY
    };
    addBallCollectAnimations = addBallCollectAnimations.filter((animation) => now - animation.startedAt < animation.duration);
    if (!addBallCollectAnimations.length) {
      return;
    }

    for (const animation of addBallCollectAnimations) {
      const elapsed = now - animation.startedAt;
      const progress = clamp(elapsed / animation.duration, 0, 1);
      const flight = clamp(elapsed / 650, 0, 1);

      if (elapsed < 170) {
        const pulse = Math.sin((elapsed / 170) * Math.PI);
        context.save();
        context.beginPath();
        context.arc(animation.sourceX, animation.sourceY, 18 + pulse * 14, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255,207,140,${0.35 + pulse * 0.42})`;
        context.lineWidth = 2 + pulse * 2;
        context.stroke();
        context.restore();
      }

      if (flight > 0 && flight < 1) {
        const eased = easeOutCubic(flight);
        const arcLift = Math.sin(flight * Math.PI) * 54;
        const x = lerp(animation.sourceX, target.x, eased);
        const y = lerp(animation.sourceY, target.y, eased) - arcLift;
        const radius = lerp(18, 12, eased);
        const alpha = 1 - Math.max(0, flight - 0.84) / 0.16;

        context.save();
        context.globalAlpha = alpha;
        for (let trail = 1; trail <= 3; trail += 1) {
          const tailFlight = clamp(flight - trail * 0.045, 0, 1);
          const tailEase = easeOutCubic(tailFlight);
          const tailX = lerp(animation.sourceX, target.x, tailEase);
          const tailY = lerp(animation.sourceY, target.y, tailEase) - Math.sin(tailFlight * Math.PI) * 54;
          context.beginPath();
          context.arc(tailX, tailY, Math.max(2, radius * (0.3 - trail * 0.045)), 0, Math.PI * 2);
          context.fillStyle = `rgba(255,207,140,${0.28 / trail})`;
          context.fill();
        }
        drawDemoAddBall(context, x, y, radius);
        context.restore();
      }

      if (progress > 0.72) {
        const arrive = clamp((progress - 0.72) / 0.28, 0, 1);
        const glow = Math.sin(arrive * Math.PI);
        context.save();
        context.beginPath();
        context.arc(target.x, target.y, 24 + glow * 16, 0, Math.PI * 2);
        context.strokeStyle = `rgba(255,207,140,${0.18 + glow * 0.42})`;
        context.lineWidth = 2 + glow * 2;
        context.stroke();
        context.restore();
      }
    }
  }

  function drawItemCountBadge(context, button, count, accentColor) {
    const badgeWidth = clamp(button.width * 0.48, 34, 52);
    const badgeHeight = clamp(button.height * 0.27, 22, 30);
    const badgeX = button.x + button.width - badgeWidth * 0.84;
    const badgeY = button.y + button.height - badgeHeight * 0.86;

    context.save();
    context.shadowColor = "rgba(0,0,0,0.42)";
    context.shadowBlur = 6;
    context.shadowOffsetY = 2;
    roundedRect(context, badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
    context.fillStyle = count > 0 ? "rgba(8,28,58,0.96)" : "rgba(30,41,59,0.9)";
    context.fill();
    context.shadowColor = "transparent";
    context.strokeStyle = count > 0 ? accentColor : "rgba(148,163,184,0.55)";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = count > 0 ? "#ffffff" : "rgba(255,255,255,0.62)";
    context.font = `900 ${clamp(button.width * 0.17, 14, 18)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`×${count}`, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2 + 1);
    context.restore();
  }

  function drawClearToolButton(context, rect) {
    if (overlay !== null || game.getState().state === "gameover") {
      return;
    }
    const button = clearToolButtonRect(rect);

    const count = clearToolInventoryCount();
    const disabled = !itemsCanActivate() ||
      clearUsesThisRun >= CLEAR_TOOL_MAX_USES_PER_RUN;
    context.save();
    const iconSize = button.width * 0.9;
    const iconX = button.x + (button.width - iconSize) / 2;
    const iconY = button.y + (button.height - iconSize) / 2;
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

    drawItemCountBadge(context, button, count, "#38bdf8");
    context.restore();
  }

  function drawItemTray(context, rect) {
    const tray = itemTrayRect(rect);
    context.save();
    roundedRect(context, tray.x, tray.y, tray.width, tray.height, 18);
    context.fillStyle = "rgba(10,15,35,0.22)";
    context.fill();
    context.restore();
  }

  function drawBombToolButton(context, rect) {
    if (overlay !== null || game.getState().state === "gameover") {
      return;
    }
    const button = bombToolButtonRect(rect);

    const count = bombToolInventoryCount();
    const disabled = !itemsCanActivate() || bombUsesThisRun >= BOMB_MAX_USES_PER_RUN;
    const iconSize = button.width * 0.9;
    const iconX = button.x + (button.width - iconSize) / 2;
    const iconY = button.y + (button.height - iconSize) / 2;
    context.save();
    context.globalAlpha = disabled ? 0.45 : 1;
    if (bombItemIconAsset.loaded && bombItemIconAsset.image) {
      context.drawImage(bombItemIconAsset.image, iconX, iconY, iconSize, iconSize);
    } else {
      context.beginPath();
      context.arc(button.x + button.width / 2, button.y + button.height / 2, iconSize * 0.28, 0, Math.PI * 2);
      context.fillStyle = "#20283a";
      context.fill();
    }
    context.globalAlpha = 1;

    if (bombPlacementArmed) {
      roundedRect(context, button.x + 3, button.y + 3, button.width - 6, button.height - 6, 14);
      context.strokeStyle = "#ef4444";
      context.lineWidth = 3;
      context.stroke();
    }

    drawItemCountBadge(context, button, count, "#38bdf8");
    if (bombPlacementArmed && bombToolMessage) {
      const tray = itemTrayRect(rect);
      context.fillStyle = "#fca5a5";
      context.font = "700 13px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillText(bombToolMessage, tray.x + tray.width / 2, tray.y - 6);
    }
    context.restore();
  }

  function drawFreezeToolButton(context, rect) {
    if (overlay !== null || game.getState().state === "gameover") {
      return;
    }
    const button = freezeToolButtonRect(rect);

    const count = freezeToolInventoryCount();
    const disabled = !itemsCanActivate() ||
      game.getState().freezeActive ||
      freezeUsesThisRun >= FREEZE_MAX_USES_PER_RUN;
    const iconSize = button.width * 0.9;
    const iconX = button.x + (button.width - iconSize) / 2;
    const iconY = button.y + (button.height - iconSize) / 2;
    context.save();
    context.globalAlpha = disabled ? 0.45 : 1;
    if (freezeItemIconAsset.loaded && freezeItemIconAsset.image) {
      context.drawImage(freezeItemIconAsset.image, iconX, iconY, iconSize, iconSize);
    } else {
      context.fillStyle = "#38d9ff";
      context.font = `900 ${Math.max(22, iconSize * 0.42)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("❄", button.x + button.width / 2, button.y + button.height / 2);
    }
    context.globalAlpha = 1;
    drawItemCountBadge(context, button, count, "#67e8f9");
    context.restore();
  }

  function drawRageToolButton(context, rect) {
    if (overlay !== null || game.getState().state === "gameover") {
      return;
    }
    const button = rageToolButtonRect(rect);
    const state = game.getState();
    const count = rageToolInventoryCount();
    const disabled = !itemsCanActivate() ||
      state.rageArmed ||
      state.rageVolleyActive ||
      rageUsesThisRun >= RAGE_MAX_USES_PER_RUN;
    const iconSize = button.width * 0.94;
    const iconX = button.x + (button.width - iconSize) / 2;
    const iconY = button.y + (button.height - iconSize) / 2;
    context.save();
    context.globalAlpha = disabled ? 0.45 : 1;
    if (rageItemIconAsset.loaded && rageItemIconAsset.image) {
      context.drawImage(rageItemIconAsset.image, iconX, iconY, iconSize, iconSize);
    } else {
      const gradient = context.createRadialGradient(
        button.x + button.width / 2,
        button.y + button.height / 2,
        2,
        button.x + button.width / 2,
        button.y + button.height / 2,
        iconSize * 0.42
      );
      gradient.addColorStop(0, "#fff3a3");
      gradient.addColorStop(0.45, "#ff4b20");
      gradient.addColorStop(1, "#6b0b0b");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(button.x + button.width / 2, button.y + button.height / 2, iconSize * 0.38, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    drawItemCountBadge(context, button, count, "#38bdf8");
    context.restore();
  }

  function bombCellScreenRect(rect, row, column) {
    const state = game.getState();
    const scaleX = rect.width / GAME_CONFIG.width;
    const scaleY = rect.height / GAME_CONFIG.height;
    return {
      x: rect.x + (GAME_CONFIG.sidePadding + column * state.arena.blockSize) * scaleX,
      y: rect.y + (GAME_CONFIG.topPadding + row * state.arena.laneHeight) * scaleY,
      width: state.arena.blockSize * scaleX,
      height: state.arena.blockSize * scaleY
    };
  }

  function drawBombArea(context, rect, cell, valid, alpha = 1) {
    if (!cell) {
      return;
    }
    const state = game.getState();
    const maxRow = Math.min(
      GAME_CONFIG.visibleRows - 1,
      Math.floor((GAME_CONFIG.height - GAME_CONFIG.topPadding) / state.arena.laneHeight) - 1
    );
    context.save();
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip();
    context.globalAlpha = alpha;
    const minRow = Math.max(0, cell.row - BOMB_RADIUS);
    const maxAreaRow = Math.min(maxRow, cell.row + BOMB_RADIUS);
    const minColumn = Math.max(0, cell.column - BOMB_RADIUS);
    const maxColumn = Math.min(GAME_CONFIG.columns - 1, cell.column + BOMB_RADIUS);
    const cells = [];
    for (let row = minRow; row <= maxAreaRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const target = bombCellScreenRect(rect, row, column);
        cells.push(target);
        context.fillStyle = valid ? "rgba(239,68,68,0.18)" : "rgba(127,29,29,0.18)";
        context.fillRect(target.x + 1, target.y + 1, target.width - 2, target.height - 2);
      }
    }

    if (cells.length > 0) {
      const first = cells[0];
      const last = cells[cells.length - 1];
      const left = first.x + 1;
      const top = first.y + 1;
      const right = last.x + last.width - 1;
      const bottom = last.y + last.height - 1;
      context.strokeStyle = valid ? "rgba(255,92,92,0.96)" : "rgba(248,113,113,0.55)";
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.setLineDash([3, 6]);
      roundedRect(context, left, top, right - left, bottom - top, 6);
      context.stroke();

      context.lineWidth = 1.5;
      context.strokeStyle = valid ? "rgba(255,120,120,0.72)" : "rgba(248,113,113,0.38)";
      for (let column = minColumn + 1; column <= maxColumn; column += 1) {
        const boundary = bombCellScreenRect(rect, minRow, column).x;
        context.beginPath();
        context.moveTo(boundary, top + 3);
        context.lineTo(boundary, bottom - 3);
        context.stroke();
      }
      for (let row = minRow + 1; row <= maxAreaRow; row += 1) {
        const boundary = bombCellScreenRect(rect, row, minColumn).y;
        context.beginPath();
        context.moveTo(left + 3, boundary);
        context.lineTo(right - 3, boundary);
        context.stroke();
      }
      context.setLineDash([]);
    }
    context.restore();
  }

  function drawBombPlacement(context, rect) {
    if (!bombDrag) {
      return;
    }
    if (bombDrag.valid) {
      drawBombArea(context, rect, bombDrag.cell, true);
    } else {
      drawBombInvalidPlacement(context, rect, bombDrag);
    }
    const size = clamp(rect.width * 0.13, 42, 56);
    const x = bombDrag.point.x - size / 2;
    const y = bombDrag.point.y - size * 0.82;
    context.save();
    context.globalAlpha = bombDrag.valid ? 1 : 0.42;
    if (bombItemIconAsset.loaded && bombItemIconAsset.image) {
      context.drawImage(bombItemIconAsset.image, x, y, size, size);
    }
    context.restore();
  }

  function drawBombInvalidPlacement(context, rect, drag) {
    const target = drag.cell
      ? bombCellScreenRect(rect, drag.cell.row, drag.cell.column)
      : null;
    const markerX = target ? target.x + target.width / 2 : drag.point.x;
    const markerY = target ? target.y + target.height / 2 : drag.point.y - 26;
    const markerRadius = target
      ? clamp(Math.min(target.width, target.height) * 0.28, 14, 22)
      : 18;

    context.save();
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip();

    if (target) {
      roundedRect(context, target.x + 2, target.y + 2, target.width - 4, target.height - 4, 6);
      context.fillStyle = "rgba(127,29,29,0.72)";
      context.fill();
      context.strokeStyle = "#f87171";
      context.lineWidth = 3;
      context.stroke();
    }

    context.beginPath();
    context.arc(markerX, markerY, markerRadius, 0, Math.PI * 2);
    context.fillStyle = "#dc2626";
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2;
    context.stroke();

    const crossInset = markerRadius * 0.45;
    context.beginPath();
    context.moveTo(markerX - crossInset, markerY - crossInset);
    context.lineTo(markerX + crossInset, markerY + crossInset);
    context.moveTo(markerX + crossInset, markerY - crossInset);
    context.lineTo(markerX - crossInset, markerY + crossInset);
    context.strokeStyle = "#ffffff";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.stroke();

    context.font = "700 15px sans-serif";
    const labelPaddingX = 12;
    const labelHeight = 30;
    const labelWidth = context.measureText(texts.bombCannotPlace).width + labelPaddingX * 2;
    const labelX = clamp(
      drag.point.x - labelWidth / 2,
      rect.x + 8,
      rect.x + rect.width - labelWidth - 8
    );
    const preferredLabelY = drag.point.y - markerRadius - 70;
    const labelY = clamp(
      preferredLabelY,
      rect.y + 8,
      rect.y + rect.height - labelHeight - 8
    );
    roundedRect(context, labelX, labelY, labelWidth, labelHeight, 8);
    context.fillStyle = "rgba(127,29,29,0.96)";
    context.fill();
    context.strokeStyle = "rgba(248,113,113,0.92)";
    context.lineWidth = 1.5;
    context.stroke();
    context.fillStyle = "#ffffff";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(texts.bombCannotPlace, labelX + labelWidth / 2, labelY + labelHeight / 2 + 1);
    context.restore();
  }

  function drawBombAnimation(context, rect) {
    if (!bombAnimation) {
      return;
    }
    const elapsed = Date.now() - bombAnimation.startedAt;
    const progress = clamp(elapsed / bombAnimation.duration, 0, 1);
    if (progress >= 1) {
      bombAnimation = null;
      return;
    }

    const centerCell = bombCellScreenRect(
      rect,
      bombAnimation.cell.row,
      bombAnimation.cell.column
    );
    const centerX = centerCell.x + centerCell.width / 2;
    const centerY = centerCell.y + centerCell.height / 2;
    const flash = Math.sin(clamp(progress / 0.32, 0, 1) * Math.PI);
    const shock = easeOutCubic(clamp((progress - 0.08) / 0.72, 0, 1));

    context.save();
    drawBombArea(context, rect, bombAnimation.cell, true, Math.max(0, 1 - progress * 1.5));
    if (progress < 0.2 && bombItemIconAsset.loaded && bombItemIconAsset.image) {
      const bombScale = 1 + Math.sin((progress / 0.2) * Math.PI) * 0.24;
      const bombSize = centerCell.width * 0.72 * bombScale;
      context.drawImage(
        bombItemIconAsset.image,
        centerX - bombSize / 2,
        centerY - bombSize / 2,
        bombSize,
        bombSize
      );
    }
    context.beginPath();
    context.arc(centerX, centerY, lerp(8, centerCell.width * 2.1, shock), 0, Math.PI * 2);
    context.fillStyle = `rgba(255,120,30,${0.42 * (1 - shock)})`;
    context.fill();
    context.strokeStyle = `rgba(255,230,120,${0.9 * (1 - shock)})`;
    context.lineWidth = lerp(8, 2, shock);
    context.stroke();

    context.beginPath();
    context.arc(centerX, centerY, 12 + flash * centerCell.width * 0.72, 0, Math.PI * 2);
    context.fillStyle = `rgba(255,255,220,${flash * 0.9})`;
    context.fill();

    const scaleX = rect.width / GAME_CONFIG.width;
    const scaleY = rect.height / GAME_CONFIG.height;
    const burst = clamp((progress - 0.12) / 0.68, 0, 1);
    for (const removed of bombAnimation.removedBlocks) {
      const x = rect.x + removed.x * scaleX;
      const y = rect.y + removed.y * scaleY;
      const size = removed.size * scaleX;
      context.globalAlpha = Math.max(0, 1 - burst);
      context.fillStyle = removed.block.column % 2 === 0 ? "#fb923c" : "#ef4444";
      for (let index = 0; index < 5; index += 1) {
        const angle = removed.angle + index * (Math.PI * 2 / 5);
        const distance = burst * (26 + index * 5);
        const fragment = Math.max(4, size * 0.16);
        context.fillRect(
          x + size / 2 + Math.cos(angle) * distance - fragment / 2,
          y + size / 2 + Math.sin(angle) * distance - 20 * burst - fragment / 2,
          fragment,
          fragment
        );
      }
    }
    context.globalAlpha = Math.max(0, 0.42 - progress * 0.35);
    context.fillStyle = "#64748b";
    for (let index = 0; index < 5; index += 1) {
      context.beginPath();
      context.arc(
        centerX + Math.cos(index * 1.35) * progress * 28,
        centerY - progress * (18 + index * 5),
        9 + index * 2,
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.restore();
  }

  function drawClearToolPanel(context, panel) {
    const mode = clearToolPanelMode();
    const confirmButton = currentButtons().find((button) => button.id === "clear-tool-confirm");
    const centerX = panel.x + panel.width / 2;
    drawClearToolDemo(context, panel);

    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    const lines = mode === "limit"
      ? ["每局最多使用 3 次清除功能，", "下一局可重新使用。"]
      : ["将清除最下面 3 行砖块，", "帮你缓解底部压力。"];
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], centerX, panel.y + 218 + index * 24);
    }

    if (clearToolMessage) {
      context.fillStyle = clearToolMessage === texts.clearAdFailed ? "#fca5a5" : "#facc15";
      context.font = "700 14px sans-serif";
      context.fillText(clearToolMessage, centerX, confirmButton ? confirmButton.y - 16 : panel.y + panel.height - 42);
    }

    if (confirmButton) {
      if (mode === "ad" && adVideoIconAsset.loaded && adVideoIconAsset.image) {
        roundedRect(
          context,
          confirmButton.x,
          confirmButton.y,
          confirmButton.width,
          confirmButton.height,
          24
        );
        context.fillStyle = "#f2b400";
        context.fill();
        context.strokeStyle = "rgba(0,0,0,0.08)";
        context.lineWidth = 1;
        context.stroke();

        const label = texts.clearAdConfirm;
        const iconButtonSize = 24;
        const gap = 8;
        context.fillStyle = "#1d1d1d";
        context.font = "700 20px sans-serif";
        context.textBaseline = "middle";
        const textWidth = context.measureText(label).width;
        const contentX = confirmButton.x +
          (confirmButton.width - iconButtonSize - gap - textWidth) / 2;
        const centerY = confirmButton.y + confirmButton.height / 2;
        context.drawImage(
          adVideoIconAsset.image,
          contentX,
          centerY - iconButtonSize / 2,
          iconButtonSize,
          iconButtonSize
        );
        context.textAlign = "left";
        context.fillText(label, contentX + iconButtonSize + gap, centerY + 1);
      } else {
        drawButton(
          context,
          confirmButton,
          mode === "ad" ? texts.clearAdConfirm : texts.clearConfirm,
          true
        );
      }
    }
  }

  function drawBombToolPanel(context, panel) {
    const mode = bombToolPanelMode();
    const confirmButton = currentButtons().find((button) => button.id === "bomb-tool-confirm");
    const centerX = panel.x + panel.width / 2;
    drawBombToolDemo(context, panel);

    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    const lines = mode === "limit"
      ? ["每局最多使用 3 次炸弹，", "下一局可重新使用。"]
      : ["拖动炸弹到空位，释放后会炸掉", "周围 3×3 范围内的砖块。"];
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], centerX, panel.y + 218 + index * 24);
    }

    if (bombToolMessage) {
      context.fillStyle = (
        bombToolMessage === texts.bombAdFailed ||
        bombToolMessage === texts.bombShareFailed
      ) ? "#fca5a5" : "#facc15";
      context.font = "700 14px sans-serif";
      context.fillText(
        bombToolMessage,
        centerX,
        confirmButton ? confirmButton.y - 16 : panel.y + panel.height - 42
      );
    }

    if (!confirmButton) {
      return;
    }
    if (mode === "share" || mode === "ad") {
      roundedRect(
        context,
        confirmButton.x,
        confirmButton.y,
        confirmButton.width,
        confirmButton.height,
        24
      );
      context.fillStyle = "#f2b400";
      context.fill();
      const label = mode === "share" ? texts.bombShareConfirm : texts.bombAdConfirm;
      const iconSize = 24;
      const gap = 8;
      context.font = "700 20px sans-serif";
      const textWidth = context.measureText(label).width;
      const contentX = confirmButton.x + (confirmButton.width - iconSize - gap - textWidth) / 2;
      const centerY = confirmButton.y + confirmButton.height / 2;
      const iconAsset = mode === "share" ? shareIconAsset : adVideoIconAsset;
      if (iconAsset.loaded && iconAsset.image) {
        context.drawImage(iconAsset.image, contentX, centerY - iconSize / 2, iconSize, iconSize);
      }
      context.fillStyle = "#1d1d1d";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(label, contentX + iconSize + gap, centerY + 1);
      return;
    }
    drawButton(context, confirmButton, texts.bombConfirm, true);
  }

  function drawFreezeToolPanel(context, panel) {
    const mode = freezeToolPanelMode();
    const confirmButton = currentButtons().find((button) => button.id === "freeze-tool-confirm");
    const centerX = panel.x + panel.width / 2;
    drawFreezeToolDemo(context, panel);

    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    const lines = mode === "limit"
      ? ["每局最多使用 3 次冰冻，", "下一局可重新使用。"]
      : ["冻结当前棋盘一回合，下一轮砖块", "不会下移，也不会生成新的一行。"];
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], centerX, panel.y + 218 + index * 24);
    }

    if (freezeToolMessage) {
      context.fillStyle = (
        freezeToolMessage === texts.freezeShareFailed ||
        freezeToolMessage === texts.freezeAdFailed
      ) ? "#fca5a5" : "#67e8f9";
      context.font = "700 14px sans-serif";
      context.fillText(
        freezeToolMessage,
        centerX,
        confirmButton ? confirmButton.y - 16 : panel.y + panel.height - 42
      );
    }

    if (!confirmButton) {
      return;
    }
    if (mode === "share" || mode === "ad") {
      roundedRect(
        context,
        confirmButton.x,
        confirmButton.y,
        confirmButton.width,
        confirmButton.height,
        24
      );
      context.fillStyle = "#67e8f9";
      context.fill();
      const label = mode === "share" ? texts.freezeShareConfirm : texts.freezeAdConfirm;
      const iconSize = 24;
      const gap = 8;
      context.font = "700 20px sans-serif";
      const textWidth = context.measureText(label).width;
      const contentX = confirmButton.x + (confirmButton.width - iconSize - gap - textWidth) / 2;
      const centerY = confirmButton.y + confirmButton.height / 2;
      const iconAsset = mode === "share" ? shareIconAsset : adVideoIconAsset;
      if (iconAsset.loaded && iconAsset.image) {
        context.drawImage(iconAsset.image, contentX, centerY - iconSize / 2, iconSize, iconSize);
      }
      context.fillStyle = "#10243d";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(label, contentX + iconSize + gap, centerY + 1);
      return;
    }
    drawButton(context, confirmButton, texts.freezeConfirm, true);
  }

  function drawRageToolPanel(context, panel) {
    const mode = rageToolPanelMode();
    const confirmButton = currentButtons().find((button) => button.id === "rage-tool-confirm");
    const centerX = panel.x + panel.width / 2;
    drawRageToolDemo(context, panel);

    context.fillStyle = "rgba(255,255,255,0.82)";
    context.font = "16px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "alphabetic";
    const lines = mode === "limit"
      ? ["每局最多使用 3 次狂暴，", "下一局可重新使用。"]
      : ["下一次发射的球数量翻倍。"];
    for (let index = 0; index < lines.length; index += 1) {
      context.fillText(lines[index], centerX, panel.y + 218 + index * 24);
    }

    if (rageToolMessage) {
      context.fillStyle = (
        rageToolMessage === texts.rageShareFailed ||
        rageToolMessage === texts.rageAdFailed
      ) ? "#fca5a5" : "#ff8a65";
      context.font = "700 14px sans-serif";
      context.fillText(
        rageToolMessage,
        centerX,
        confirmButton ? confirmButton.y - 16 : panel.y + panel.height - 42
      );
    }

    if (!confirmButton) {
      return;
    }
    if (mode === "share" || mode === "ad") {
      roundedRect(
        context,
        confirmButton.x,
        confirmButton.y,
        confirmButton.width,
        confirmButton.height,
        24
      );
      const buttonGradient = context.createLinearGradient(
        confirmButton.x,
        confirmButton.y,
        confirmButton.x + confirmButton.width,
        confirmButton.y
      );
      buttonGradient.addColorStop(0, "#ef2d1f");
      buttonGradient.addColorStop(1, "#ff8a1f");
      context.fillStyle = buttonGradient;
      context.fill();
      const label = mode === "share" ? texts.rageShareConfirm : texts.rageAdConfirm;
      const iconSize = 24;
      const gap = 8;
      context.font = "700 20px sans-serif";
      const textWidth = context.measureText(label).width;
      const contentX = confirmButton.x + (confirmButton.width - iconSize - gap - textWidth) / 2;
      const centerY = confirmButton.y + confirmButton.height / 2;
      const iconAsset = mode === "share" ? shareIconAsset : adVideoIconAsset;
      if (iconAsset.loaded && iconAsset.image) {
        context.drawImage(iconAsset.image, contentX, centerY - iconSize / 2, iconSize, iconSize);
      }
      context.fillStyle = "#ffffff";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(label, contentX + iconSize + gap, centerY + 1);
      return;
    }
    drawButton(context, confirmButton, texts.rageConfirm, true);
  }

  function drawRageToolDemo(context, panel) {
    const demo = {
      x: panel.x + 24,
      y: panel.y + 72,
      width: panel.width - 48,
      height: 126
    };
    const elapsed = Math.max(0, Date.now() - rageToolDemoStartedAt) % 3600;
    const charge = easeOutCubic(clamp((elapsed - 500) / 650, 0, 1));
    const launch = clamp((elapsed - 1350) / 1300, 0, 1);
    const fade = 1 - clamp((elapsed - 2850) / 500, 0, 1);
    const centerX = demo.x + demo.width / 2;
    const launchY = demo.y + demo.height - 24;

    context.save();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.fillStyle = "#180d16";
    context.fill();
    context.beginPath();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.clip();

    const aura = context.createRadialGradient(centerX, launchY, 4, centerX, launchY, 54 + charge * 24);
    aura.addColorStop(0, `rgba(255,244,170,${0.28 + charge * 0.4})`);
    aura.addColorStop(0.42, `rgba(255,57,24,${0.18 + charge * 0.38})`);
    aura.addColorStop(1, "rgba(100,0,0,0)");
    context.fillStyle = aura;
    context.beginPath();
    context.arc(centerX, launchY, 64 + charge * 22, 0, Math.PI * 2);
    context.fill();

    if (rageItemIconAsset.loaded && rageItemIconAsset.image && charge < 0.98) {
      const iconSize = 42 + charge * 18;
      context.globalAlpha = Math.max(0, 1 - charge * 0.8);
      context.drawImage(
        rageItemIconAsset.image,
        centerX - iconSize / 2,
        launchY - iconSize / 2,
        iconSize,
        iconSize
      );
      context.globalAlpha = 1;
    }

    const ballRadius = 8;
    const paths = [-34, -22, -10, 10, 22, 34];
    for (let index = 0; index < paths.length; index += 1) {
      const doubled = index >= 3;
      const localLaunch = doubled
        ? clamp((launch - 0.16) / 0.84, 0, 1)
        : launch;
      const x = centerX + paths[index] * localLaunch;
      const y = launchY - localLaunch * (82 + (index % 3) * 6);
      context.globalAlpha = fade * (doubled ? charge : 1);
      context.beginPath();
      context.moveTo(x, y + ballRadius * 2.8);
      context.lineTo(x - 4, y + ballRadius * 0.4);
      context.lineTo(x + 4, y + ballRadius * 0.4);
      context.closePath();
      context.fillStyle = doubled ? "#ef2d1f" : "#ff8a1f";
      context.fill();
      context.beginPath();
      context.arc(x, y, ballRadius, 0, Math.PI * 2);
      context.fillStyle = "#fff6e8";
      context.fill();
      context.strokeStyle = doubled ? "#ff3020" : "#ffb347";
      context.lineWidth = 2;
      context.stroke();
    }
    context.globalAlpha = 1;

    context.font = "900 22px sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    const label = charge > 0.72 ? "×6" : "×3";
    const labelX = centerX + 28;
    const labelY = launchY - 2;
    if (charge > 0.72) {
      context.shadowColor = "#ff2d20";
      context.shadowBlur = 10;
      const gradient = context.createLinearGradient(labelX, labelY + 10, labelX, labelY - 14);
      gradient.addColorStop(0, "#ff2d20");
      gradient.addColorStop(0.55, "#ff8a1f");
      gradient.addColorStop(1, "#fff3a3");
      context.fillStyle = gradient;
    } else {
      context.fillStyle = "#d8f1ff";
    }
    context.fillText(label, labelX, labelY);
    context.restore();
  }

  function drawFreezeToolDemo(context, panel) {
    const demo = {
      x: panel.x + 24,
      y: panel.y + 72,
      width: panel.width - 48,
      height: 126
    };
    const columns = 6;
    const rows = 4;
    const gap = 3;
    const cellSize = Math.min(
      (demo.width - gap * (columns - 1)) / columns,
      (demo.height - gap * (rows - 1)) / rows
    );
    const boardWidth = cellSize * columns + gap * (columns - 1);
    const boardHeight = cellSize * rows + gap * (rows - 1);
    const boardX = demo.x + (demo.width - boardWidth) / 2;
    const boardY = demo.y + (demo.height - boardHeight) / 2;
    const cells = [
      [0, 0, 4], [2, 0, 3], [5, 0, 5],
      [1, 1, 3], [3, 1, 2], [4, 1, 4],
      [0, 2, 5], [2, 2, 4], [5, 2, 3],
      [1, 3, 2], [3, 3, 4], [4, 3, 5]
    ];
    const elapsed = Math.max(0, Date.now() - freezeToolDemoStartedAt) % 3200;
    const freezeProgress = easeOutCubic(clamp((elapsed - 500) / 850, 0, 1));
    const holdAlpha = clamp((2800 - elapsed) / 400, 0, 1);

    context.save();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.fillStyle = "#0d2036";
    context.fill();
    context.beginPath();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.clip();

    for (const [column, row, hp] of cells) {
      const x = boardX + column * (cellSize + gap);
      const y = boardY + row * (cellSize + gap);
      roundedRect(context, x, y, cellSize, cellSize, 3);
      context.fillStyle = row % 2 === 0 ? "#78a6d6" : "#a8c4e5";
      context.fill();
      if (freezeProgress > 0) {
        context.globalAlpha = freezeProgress * holdAlpha * 0.72;
        const ice = context.createLinearGradient(x, y, x + cellSize, y + cellSize);
        ice.addColorStop(0, "#e5fbff");
        ice.addColorStop(0.5, "#35c9ff");
        ice.addColorStop(1, "#c5f5ff");
        context.fillStyle = ice;
        context.fill();
        context.globalAlpha = 1;
        context.strokeStyle = `rgba(224,252,255,${freezeProgress * holdAlpha})`;
        context.lineWidth = 2;
        context.stroke();
      }
      context.fillStyle = "#f5f9ff";
      context.font = `700 ${Math.max(10, cellSize * 0.42)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(hp), x + cellSize / 2, y + cellSize / 2 + 1);
    }

    if (freezeProgress > 0 && freezeProgress < 1) {
      const sweepY = lerp(demo.y, demo.y + demo.height, freezeProgress);
      const gradient = context.createLinearGradient(demo.x, sweepY, demo.x + demo.width, sweepY);
      gradient.addColorStop(0, "rgba(103,232,249,0)");
      gradient.addColorStop(0.5, "rgba(255,255,255,0.95)");
      gradient.addColorStop(1, "rgba(103,232,249,0)");
      context.strokeStyle = gradient;
      context.lineWidth = 6;
      context.beginPath();
      context.moveTo(demo.x, sweepY);
      context.lineTo(demo.x + demo.width, sweepY);
      context.stroke();
    }

    context.fillStyle = `rgba(224,252,255,${0.85 * freezeProgress * holdAlpha})`;
    context.font = "900 24px sans-serif";
    context.textAlign = "center";
    context.fillText("❄", demo.x + demo.width / 2, demo.y + demo.height / 2 + 8);
    context.restore();
  }

  function drawBombToolDemo(context, panel) {
    const demo = {
      x: panel.x + 24,
      y: panel.y + 72,
      width: panel.width - 48,
      height: 126
    };
    const columns = 6;
    const rows = 4;
    const gap = 3;
    const cellSize = Math.min(
      (demo.width - gap * (columns - 1)) / columns,
      (demo.height - gap * (rows - 1)) / rows
    );
    const boardWidth = cellSize * columns + gap * (columns - 1);
    const boardHeight = cellSize * rows + gap * (rows - 1);
    const boardX = demo.x + (demo.width - boardWidth) / 2;
    const boardY = demo.y + (demo.height - boardHeight) / 2;
    const target = { row: 2, column: 3 };
    const cells = [
      [0, 0, 4], [2, 0, 3], [5, 0, 5],
      [0, 1, 3], [2, 1, 2], [3, 1, 4],
      [1, 2, 5], [4, 2, 4],
      [0, 3, 2], [2, 3, 4], [3, 3, 3], [4, 3, 5], [5, 3, 2]
    ];
    const elapsed = Math.max(0, Date.now() - bombToolDemoStartedAt) % 4000;
    const dragProgress = easeOutCubic(clamp((elapsed - 700) / 1000, 0, 1));
    const explosionProgress = clamp((elapsed - 1750) / 700, 0, 1);
    const affected = (row, column) =>
      Math.abs(row - target.row) <= 1 && Math.abs(column - target.column) <= 1;

    context.save();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.fillStyle = "#0d2036";
    context.fill();
    context.beginPath();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.clip();

    for (const [column, row, hp] of cells) {
      if (affected(row, column) && explosionProgress > 0.18) {
        continue;
      }
      const x = boardX + column * (cellSize + gap);
      const y = boardY + row * (cellSize + gap);
      roundedRect(context, x, y, cellSize, cellSize, 3);
      context.fillStyle = row % 2 === 0 ? "#78a6d6" : "#a8c4e5";
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.2)";
      context.stroke();
      context.fillStyle = "#f5f9ff";
      context.font = `700 ${Math.max(10, cellSize * 0.42)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(hp), x + cellSize / 2, y + cellSize / 2 + 1);
    }

    drawDemoCoin(
      context,
      boardX + 2 * (cellSize + gap) + cellSize / 2,
      boardY + 2 * (cellSize + gap) + cellSize / 2,
      cellSize * 0.3
    );
    drawDemoAddBall(
      context,
      boardX + 4 * (cellSize + gap) + cellSize / 2,
      boardY + (cellSize + gap) + cellSize / 2,
      cellSize * 0.28
    );

    const startX = boardX + cellSize * 0.2;
    const startY = demo.y + demo.height - cellSize * 0.15;
    const endX = boardX + target.column * (cellSize + gap) + cellSize / 2;
    const endY = boardY + target.row * (cellSize + gap) + cellSize / 2;
    const bombX = lerp(startX, endX, dragProgress);
    const bombY = lerp(startY, endY, dragProgress);
    if (dragProgress > 0.15 && explosionProgress < 0.12) {
      const dragTarget = {
        row: dragProgress < 0.55 ? 3 : 2,
        column: dragProgress < 0.45 ? 1 : dragProgress < 0.75 ? 2 : 3
      };
      context.fillStyle = "rgba(239,68,68,0.22)";
      context.strokeStyle = "rgba(255,90,90,0.9)";
      context.lineWidth = 1.5;
      context.lineCap = "round";
      context.setLineDash([2, 4]);
      for (let row = Math.max(0, dragTarget.row - 1);
        row <= Math.min(rows - 1, dragTarget.row + 1);
        row += 1) {
        for (let column = Math.max(0, dragTarget.column - 1);
          column <= Math.min(columns - 1, dragTarget.column + 1);
          column += 1) {
          const x = boardX + column * (cellSize + gap);
          const y = boardY + row * (cellSize + gap);
          context.fillRect(x, y, cellSize, cellSize);
          context.strokeRect(x, y, cellSize, cellSize);
        }
      }
      context.setLineDash([]);
    }
    if (explosionProgress < 0.18 && bombItemIconAsset.loaded && bombItemIconAsset.image) {
      const size = cellSize * 0.95;
      context.drawImage(bombItemIconAsset.image, bombX - size / 2, bombY - size / 2, size, size);
    }
    if (explosionProgress > 0 && explosionProgress < 1) {
      const shock = easeOutCubic(explosionProgress);
      context.beginPath();
      context.arc(endX, endY, lerp(4, cellSize * 2, shock), 0, Math.PI * 2);
      context.fillStyle = `rgba(255,120,30,${0.48 * (1 - shock)})`;
      context.fill();
      context.strokeStyle = `rgba(255,245,180,${0.9 * (1 - shock)})`;
      context.lineWidth = 4;
      context.stroke();
    }
    context.restore();
  }

  function drawClearToolDemo(context, panel) {
    const demo = {
      x: panel.x + 24,
      y: panel.y + 72,
      width: panel.width - 48,
      height: 126
    };
    const columns = 6;
    const rows = 4;
    const gap = 3;
    const cellSize = Math.min(
      (demo.width - gap * (columns - 1)) / columns,
      (demo.height - gap * (rows - 1)) / rows
    );
    const boardWidth = cellSize * columns + gap * (columns - 1);
    const boardHeight = cellSize * rows + gap * (rows - 1);
    const boardX = demo.x + (demo.width - boardWidth) / 2;
    const boardY = demo.y + (demo.height - boardHeight) / 2;
    const blockCells = [
      [0, 0, 4], [2, 0, 3], [4, 0, 5],
      [0, 1, 3], [1, 1, 2], [3, 1, 4], [5, 1, 2],
      [0, 2, 5], [2, 2, 3], [3, 2, 2], [5, 2, 4],
      [0, 3, 2], [1, 3, 4], [3, 3, 3], [4, 3, 5], [5, 3, 2]
    ];
    const demoBlocks = blockCells.map(([column, row, hp], index) => ({
      x: boardX + column * (cellSize + gap),
      y: boardY + row * (cellSize + gap),
      size: cellSize,
      column,
      row,
      hp,
      angle: (index * 1.37) % (Math.PI * 2),
      drift: 10 + (index % 4) * 3,
      color: row === 0 ? "#90b4dd" : row % 2 === 0 ? "#78a6d6" : "#a8c4e5"
    }));
    const cycleElapsed = Math.max(0, Date.now() - clearToolDemoStartedAt) % 3000;
    const clearProgress = clamp((cycleElapsed - 1000) / 1000, 0, 1);

    context.save();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.fillStyle = "#0d2036";
    context.fill();
    context.beginPath();
    roundedRect(context, demo.x, demo.y, demo.width, demo.height, 10);
    context.clip();

    for (const block of demoBlocks) {
      if (block.row > 0 && clearProgress > 0) {
        continue;
      }
      roundedRect(context, block.x, block.y, block.size, block.size, 3);
      context.fillStyle = block.color;
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.2)";
      context.lineWidth = 1;
      context.stroke();
      context.fillStyle = "#f5f9ff";
      context.font = `700 ${Math.max(10, cellSize * 0.42)}px sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(block.hp), block.x + block.size / 2, block.y + block.size / 2 + 1);
    }

    drawDemoAddBall(
      context,
      boardX + 4 * (cellSize + gap) + cellSize / 2,
      boardY + (cellSize + gap) + cellSize / 2,
      cellSize * 0.28
    );
    drawDemoCoin(
      context,
      boardX + (cellSize + gap) + cellSize / 2,
      boardY + 2 * (cellSize + gap) + cellSize / 2,
      cellSize * 0.3
    );

    if (clearProgress > 0 && clearProgress < 1) {
      drawClearBlockEffect(
        context,
        demoBlocks.filter((block) => block.row > 0),
        clearProgress,
        demo
      );
    }
    context.restore();
  }

  function drawDemoAddBall(context, x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = "rgba(255,179,71,0.18)";
    context.fill();
    context.strokeStyle = "#ffcf8c";
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.moveTo(x - radius * 0.48, y);
    context.lineTo(x + radius * 0.48, y);
    context.moveTo(x, y - radius * 0.48);
    context.lineTo(x, y + radius * 0.48);
    context.strokeStyle = "#fff8ed";
    context.lineWidth = Math.max(2, radius * 0.25);
    context.lineCap = "round";
    context.stroke();
  }

  function drawDemoCoin(context, x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = "#f2b400";
    context.fill();
    context.strokeStyle = "#fff0a6";
    context.lineWidth = 2;
    context.stroke();
    context.fillStyle = "#5b3a00";
    context.font = `800 ${Math.max(10, radius * 1.15)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("$", x, y + 1);
  }

  function drawClearBlockEffect(context, removedBlocks, progress, bounds) {
    const pulse = Math.sin(clamp(progress / 0.22, 0, 1) * Math.PI);
    for (const removed of removedBlocks) {
      const x = removed.x;
      const y = removed.y;
      const size = removed.size;

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
        context.fillStyle = removed.color || (removed.column % 2 === 0 ? "#facc15" : "#fb923c");
        for (let index = 0; index < 4; index += 1) {
          const angle = removed.angle + index * Math.PI * 0.5;
          const drift = removed.drift * burst;
          const fragmentSize = Math.max(4, size * 0.18);
          context.fillRect(
            x + size / 2 + Math.cos(angle) * drift - fragmentSize / 2,
            y + size / 2 + Math.sin(angle) * drift - size * 0.42 * burst - fragmentSize / 2,
            fragmentSize,
            fragmentSize
          );
        }
        context.globalAlpha = 1;
      }
    }

    const sweep = clamp((progress - 0.68) / 0.28, 0, 1);
    if (sweep > 0 && sweep < 1 && removedBlocks.length > 0) {
      const minY = Math.min(...removedBlocks.map((removed) => removed.y));
      const maxY = Math.max(...removedBlocks.map((removed) => removed.y));
      const y = lerp(minY, maxY, sweep);
      const gradient = context.createLinearGradient(bounds.x, y, bounds.x + bounds.width, y);
      gradient.addColorStop(0, "rgba(250,204,21,0)");
      gradient.addColorStop(0.5, "rgba(255,255,255,0.82)");
      gradient.addColorStop(1, "rgba(250,204,21,0)");
      context.strokeStyle = gradient;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(bounds.x, y);
      context.lineTo(bounds.x + bounds.width, y);
      context.stroke();
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
    const scaleX = rect.width / GAME_CONFIG.width;
    const scaleY = rect.height / GAME_CONFIG.height;
    const displayBlocks = clearToolAnimation.removedBlocks.map((removed) => ({
      x: removed.x * scaleX,
      y: removed.y * scaleY,
      size: removed.size * scaleX,
      column: removed.block?.column ?? 0,
      angle: removed.angle,
      drift: removed.drift
    }));
    drawClearBlockEffect(context, displayBlocks, progress, {
      x: 0,
      y: 0,
      width: rect.width,
      height: rect.height
    });

    context.restore();
  }

  function drawFreezeAnimation(context, rect) {
    if (!freezeAnimation) {
      return;
    }

    const elapsed = Date.now() - freezeAnimation.startedAt;
    const progress = clamp(elapsed / freezeAnimation.duration, 0, 1);
    if (progress >= 1) {
      freezeAnimation = null;
      return;
    }

    const sweep = easeOutCubic(clamp(progress / 0.68, 0, 1));
    const fade = 1 - clamp((progress - 0.72) / 0.28, 0, 1);
    const sweepY = rect.y + rect.height * sweep;
    context.save();
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip();

    const wash = context.createLinearGradient(rect.x, rect.y, rect.x, sweepY);
    wash.addColorStop(0, `rgba(186,244,255,${0.28 * fade})`);
    wash.addColorStop(1, `rgba(56,189,248,${0.12 * fade})`);
    context.fillStyle = wash;
    context.fillRect(rect.x, rect.y, rect.width, Math.max(0, sweepY - rect.y));

    const edge = context.createLinearGradient(rect.x, sweepY, rect.x + rect.width, sweepY);
    edge.addColorStop(0, "rgba(103,232,249,0)");
    edge.addColorStop(0.5, `rgba(255,255,255,${0.96 * fade})`);
    edge.addColorStop(1, "rgba(103,232,249,0)");
    context.strokeStyle = edge;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(rect.x, sweepY);
    context.lineTo(rect.x + rect.width, sweepY);
    context.stroke();

    context.fillStyle = `rgba(224,252,255,${0.82 * fade})`;
    context.font = `900 ${clamp(rect.width * 0.12, 34, 58)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("❄", rect.x + rect.width / 2, rect.y + rect.height / 2);

    for (let index = 0; index < 18; index += 1) {
      const seedX = ((index * 47) % 101) / 100;
      const seedY = ((index * 29) % 97) / 96;
      const drift = Math.sin(progress * Math.PI * 2 + index) * 8;
      const x = rect.x + rect.width * seedX + drift;
      const y = rect.y + rect.height * seedY;
      const size = 2 + (index % 4);
      context.globalAlpha = fade * (0.35 + (index % 3) * 0.18);
      context.fillRect(x - size / 2, y - size / 2, size, size);
    }
    context.restore();
  }

  function drawRageAnimation(context, rect) {
    if (!rageAnimation) {
      return;
    }

    const elapsed = Date.now() - rageAnimation.startedAt;
    const progress = clamp(elapsed / rageAnimation.duration, 0, 1);
    if (progress >= 1) {
      rageAnimation = null;
      return;
    }

    const state = game.getState();
    const centerX = rect.x + state.launcherX * (rect.width / GAME_CONFIG.width);
    const centerY = rect.y + state.arena.launcherY * (rect.height / GAME_CONFIG.height);
    const burst = Math.sin(progress * Math.PI);
    const fade = 1 - clamp((progress - 0.62) / 0.38, 0, 1);
    context.save();
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip();
    context.globalCompositeOperation = "screen";

    const aura = context.createRadialGradient(centerX, centerY, 4, centerX, centerY, 36 + burst * 72);
    aura.addColorStop(0, `rgba(255,248,190,${0.8 * fade})`);
    aura.addColorStop(0.38, `rgba(255,70,20,${0.62 * fade})`);
    aura.addColorStop(1, "rgba(160,0,0,0)");
    context.fillStyle = aura;
    context.beginPath();
    context.arc(centerX, centerY, 38 + burst * 72, 0, Math.PI * 2);
    context.fill();

    if (rageItemIconAsset.loaded && rageItemIconAsset.image) {
      const iconSize = 46 + burst * 48;
      context.globalAlpha = fade * (1 - progress * 0.45);
      context.drawImage(
        rageItemIconAsset.image,
        centerX - iconSize / 2,
        centerY - iconSize / 2,
        iconSize,
        iconSize
      );
    }

    context.globalAlpha = fade;
    for (let index = 0; index < 16; index += 1) {
      const angle = index * Math.PI * 2 / 16 - Math.PI / 2;
      const distance = 18 + burst * (48 + (index % 4) * 8);
      context.fillStyle = index % 2 === 0 ? "#ff2d20" : "#ffd166";
      context.beginPath();
      context.arc(
        centerX + Math.cos(angle) * distance,
        centerY + Math.sin(angle) * distance,
        2 + (index % 3),
        0,
        Math.PI * 2
      );
      context.fill();
    }
    context.restore();
  }

  function drawColoredTitle(context, x, y) {
    const colors = ["#ef4444", "#facc15", "#3b82f6", "#22c55e"];
    const characters = Array.from(texts.title);
    context.save();
    context.font = menuTitleFont(48, 700);
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
    const doubleCoinsButton = currentButtons().find((button) => button.id === "double-coins-share");
    const contentTop = panel.y + 82;
    const firstActionButton = doubleCoinsButton || restartButton;
    const contentBottom = firstActionButton ? firstActionButton.y - 16 : panel.y + panel.height - 92;
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

  function drawMiniOverlayContent(context, state) {
    const rect = canvasRect();

    if (screen === "menu") {
      context.fillStyle = "#171717";
      context.fillRect(0, 0, screenWidth, screenHeight);
      drawColoredTitle(context, screenWidth / 2, rect.y + 138);
      drawMenuStats(context, rect);
      const menuButtons = currentButtons();
      drawTopRightResourceCounters(context, rect, state);
      drawDailyRewardsButton(context, menuButtons.find((button) => button.id === "daily-rewards"));
      if (!overlay) {
        const progressLevel = unfinishedProgressLevel();
        drawButton(
          context,
          menuButtons.find((button) => button.id === "continue-challenge"),
          texts.continueChallenge,
          false,
          progressLevel ? `${texts.unfinishedProgress}：${texts.levelValue(progressLevel)}` : null
        );
        drawButton(context, menuButtons.find((button) => button.id === "play"), texts.play, true);
        drawHomeBottomNav(context, menuButtons);
        drawFeedbackWarning(context);
      }
      drawCoinDoubleAnimation(context, state, rect);
      if (overlay === "shop") {
        drawShopOverlay(context, rect);
        drawTransientCenterMessage(context);
        return;
      }
      if (!overlay) {
        drawTransientCenterMessage(context);
        return;
      }
    }

    if (screen !== "menu") {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = gameHudFont(15, 700);
      context.textAlign = "left";
      context.fillText(texts.best, rect.horizontalPadding + 58, rect.topInset + 16);
      context.fillStyle = "#fbfbfb";
      context.font = gameHudFont(42, 700);
      context.fillText(String(bestScore), rect.horizontalPadding + 58, rect.topInset + 54);

      context.textAlign = "center";
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = gameHudFont(15, 700);
      context.fillText(texts.round, screenWidth / 2, rect.topInset + 16);
      context.fillStyle = "#fbfbfb";
      context.font = gameHudFont(42, 700);
      context.fillText(String(state.round), screenWidth / 2, rect.topInset + 54);
      drawTopRightResourceCounters(context, rect, state);
      drawCoinCollectAnimations(context, state, rect);
      drawAddBallCollectAnimations(context, state, rect);

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

      drawItemTray(context, rect);
      drawBombToolButton(context, rect);
      drawFreezeToolButton(context, rect);
      drawRageToolButton(context, rect);
      drawClearToolButton(context, rect);
      drawBombPlacement(context, rect);
      drawClearToolAnimation(context, rect);
      drawBombAnimation(context, rect);
      drawFreezeAnimation(context, rect);
      drawRageAnimation(context, rect);

      if (shouldShowTutorial(state)) {
        drawTutorialHint(context, rect);
      }

      if (!overlay) {
        drawTransientCenterMessage(context);
        return;
      }
    } else if (!overlay) {
      drawTransientCenterMessage(context);
      return;
    }

    context.fillStyle = "rgba(0,0,0,0.54)";
    context.fillRect(0, 0, screenWidth, screenHeight);

    const gameOverPanelLayout = overlay === "gameover"
      ? gameOverPanelMetrics()
      : { yScale: 0.24, heightScale: 0.54 };
    const panelYScale = overlay === "daily-checkin"
      ? 0.04
      : overlay === "confirm-new-run" || overlay === "pause"
        ? 0.16
        : overlay === "heart-continue"
          ? HEART_CONTINUE_PANEL_Y_SCALE
          : gameOverPanelLayout.yScale;
    const panelHeightScale = overlay === "daily-checkin"
      ? 0.9
      : overlay === "confirm-new-run" || overlay === "pause"
        ? 0.68
        : gameOverPanelLayout.heightScale;
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
              : overlay === "bomb-tool"
                ? clearToolPanelRect(rect)
                : overlay === "freeze-tool"
                  ? clearToolPanelRect(rect)
                  : overlay === "rage-tool"
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
    context.font = popupTitleFont(32);
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
                    : overlay === "bomb-tool"
                      ? texts.bombPromptTitle
                      : overlay === "freeze-tool"
                        ? texts.freezePromptTitle
                        : overlay === "rage-tool"
                          ? texts.ragePromptTitle
                    : texts.runOver;
    context.fillText(
      overlayTitle,
      screenWidth / 2,
      panel.y + 48
    );

    if (
      overlay === "gameover" ||
      overlay === "confirm-new-run" ||
      overlay === "leaderboard" ||
      overlay === "clear-tool" ||
      overlay === "bomb-tool" ||
      overlay === "freeze-tool" ||
      overlay === "rage-tool"
    ) {
      drawCloseButton(context, currentButtons().find((button) =>
        button.id === (overlay === "gameover"
          ? "gameover-close"
          : overlay === "leaderboard"
            ? "leaderboard-close"
            : overlay === "clear-tool"
              ? "clear-tool-close"
              : overlay === "bomb-tool"
                ? "bomb-tool-close"
                : overlay === "freeze-tool"
                  ? "freeze-tool-close"
                  : overlay === "rage-tool"
                    ? "rage-tool-close"
              : "confirm-new-close")
      ));
    }

    if (overlay === "leaderboard") {
      drawLeaderboardOverlay(context, panel);
      drawTransientCenterMessage(context);
      return;
    }

    if (overlay === "clear-tool") {
      drawClearToolPanel(context, panel);
      drawTransientCenterMessage(context);
      return;
    }

    if (overlay === "bomb-tool") {
      drawBombToolPanel(context, panel);
      drawTransientCenterMessage(context);
      return;
    }

    if (overlay === "freeze-tool") {
      drawFreezeToolPanel(context, panel);
      drawTransientCenterMessage(context);
      return;
    }

    if (overlay === "rage-tool") {
      drawRageToolPanel(context, panel);
      drawTransientCenterMessage(context);
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
      const settings = settingsLayout(panel);
      const soundToggleButton = currentButtons().find((button) => button.id === "toggle-sound");
      const musicToggleButton = currentButtons().find((button) => button.id === "toggle-music");
      const vibrationToggleButton = currentButtons().find((button) => button.id === "toggle-vibration");
      const effectsToggleButton = currentButtons().find((button) => button.id === "toggle-effects");
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "22px sans-serif";
      context.textAlign = "left";
      context.textBaseline = "middle";
      context.fillText(texts.soundLabel, settings.labelX, soundToggleButton.y + soundToggleButton.height / 2);
      context.fillText(texts.musicLabel ?? "BGM", settings.labelX, musicToggleButton.y + musicToggleButton.height / 2);
      context.fillText(texts.vibrationLabel, settings.labelX, vibrationToggleButton.y + vibrationToggleButton.height / 2);
      context.fillText(texts.effectsLabel, settings.labelX, effectsToggleButton.y + effectsToggleButton.height / 2);
    }

    if (overlay === "gameover") {
      if (!continueUsedThisRun) {
        const hasHeartRevive = hasHeartReviveAvailable();
        const shareContinueButton = currentButtons().find((button) => button.id === "ad-continue");
        const lineTop = panel.y + (hasHeartRevive ? 92 : 120);
        const lineBottom = shareContinueButton ? shareContinueButton.y - 14 : panel.y + panel.height - 96;
        const lineGap = hasHeartRevive
          ? clamp((lineBottom - lineTop) / 2, 22, 28)
          : Math.max(24, Math.min(34, (lineBottom - lineTop) / 2));
        context.fillStyle = "rgba(255,255,255,0.82)";
        context.font = `${hasHeartRevive ? 16 : 17}px sans-serif`;
        context.fillText(texts.shareContinueHintTwo, screenWidth / 2, lineTop);
        context.fillText(texts.shareContinueHintThree, screenWidth / 2, lineTop + lineGap);
        if (doubleCoinMessage) {
          context.fillStyle = doubleCoinMessage === REVIVE_AD_FAILED_TEXT ? "#fca5a5" : "#facc15";
          context.font = "700 13px sans-serif";
          context.fillText(doubleCoinMessage, screenWidth / 2, shareContinueButton.y - 10);
        }
      } else {
        drawFinalScoreResult(context, panel, gameOverResult, state);
        if (doubleCoinMessage) {
          const doubleCoinsButton = currentButtons().find((button) => button.id === "double-coins-share");
          context.fillStyle = doubleCoinMessage === DOUBLE_COINS_SHARE_FAILED_TEXT ||
            doubleCoinMessage === REVIVE_AD_FAILED_TEXT
            ? "#fca5a5"
            : "#facc15";
          context.font = "700 13px sans-serif";
          context.textAlign = "center";
          context.fillText(
            doubleCoinMessage,
            screenWidth / 2,
            doubleCoinsButton ? doubleCoinsButton.y - 7 : panel.y + panel.height - 86
          );
        }
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
        "ad-continue": texts.shareContinue,
        restart: texts.restart,
        "double-coins-share": DOUBLE_COINS_SHARE_TEXT,
        "confirm-new-continue": texts.continueChallenge,
        "confirm-new-start": texts.startNew,
        "heart-use": texts.useHeart,
        "heart-decline": texts.noThanks,
        "daily-checkin-ok": pendingCheckIn?.reward ? texts.claim : texts.done
      };

      if (button.id === "toggle-sound" || button.id === "toggle-music" || button.id === "toggle-vibration" || button.id === "toggle-effects") {
        drawToggle(
          context,
          button,
          button.id === "toggle-sound"
            ? audioBus.isEnabled()
            : button.id === "toggle-music"
              ? musicEnabled
              : button.id === "toggle-vibration"
                ? vibrationEnabled
                : effectsEnabled
        );
        continue;
      }

      drawButton(
        context,
        button,
        labels[button.id],
        button.id === "resume" ||
          (overlay === "gameover" && button.id === "menu") ||
          button.id === "ad-continue" ||
          button.id === "confirm-new-continue" ||
          button.id === "confirm-new-start" ||
          button.id === "heart-use" ||
          (button.id === "daily-checkin-ok" && Boolean(pendingCheckIn?.reward)) ||
          button.id === "double-coins-share" ||
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
    if (screen === "game" && overlay === "gameover") {
      drawCoinDoubleAnimation(context, state, rect);
    }
    drawTransientCenterMessage(context);
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

  function drawMiniOverlay(context, state) {
    const previousButtonsCache = currentButtonsRenderCache;
    currentButtonsRenderCache = buildCurrentButtons();
    try {
      drawMiniOverlayContent(context, state);
    } finally {
      currentButtonsRenderCache = previousButtonsCache;
    }
  }

  function onTouchStart(event) {
    if (bombAnimation || clearToolAnimation || freezeAnimation || rageAnimation) {
      return;
    }
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
      if (button.id === "bomb-tool") {
        touchStart = { point, buttonId: button.id, bombIconGesture: true };
        return;
      }
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
    if (bombDrag) {
      const point = getTouchPoint(event);
      if (point) {
        updateBombDrag(point);
      }
      return;
    }

    if (touchStart?.bombIconGesture) {
      const point = getTouchPoint(event);
      if (!point) {
        return;
      }
      const deltaX = point.x - touchStart.point.x;
      const deltaY = point.y - touchStart.point.y;
      if (Math.hypot(deltaX, deltaY) < BOMB_DRAG_THRESHOLD) {
        return;
      }
      if (
        bombToolInventoryCount() <= 0 ||
        bombUsesThisRun >= BOMB_MAX_USES_PER_RUN
      ) {
        touchStart = null;
        openBombToolPanel();
        return;
      }
      bombPlacementArmed = true;
      touchStart = { point, buttonId: null, bombDrag: true };
      startBombDrag(point);
      return;
    }

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

    if (bombDrag) {
      updateBombDrag(point);
      finishBombDrag();
      touchStart = null;
      return;
    }

    if (touchStart?.bombIconGesture) {
      touchStart = null;
      openBombToolPanel();
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
    bombPlacementArmed = false;
    bombDrag = null;
    touchStart = null;
    leaderboardDragging = false;
  });
  wxApi.onHide?.(() => {
    hideFeedbackNativeButton();
    backgroundMusicPlayer.pause();
    if (screen === "game" && game.getState().state !== "gameover") {
      persistProgress(true);
    }
  });
  wxApi.onShow?.(() => {
    const handledPendingShare =
      completePendingDoubleCoinShare() ||
      completePendingBombShare() ||
      completePendingRageShare() ||
      completePendingFreezeShare();
    if (!handledPendingShare && screen === "menu") {
      claimDailyCheckIn();
    }
    syncBackgroundMusic();
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
        bombPlacementArmed = false;
        bombDrag = null;
        const finalState = game.getState();
        const previousBestScore = runStartBestScore;
        const currentScore = Math.max(0, Math.floor(finalState.score));
        gameOverResult = {
          currentLevel: scoreToLevel(currentScore),
          previousRecordLevel: scoreToLevel(previousBestScore),
          brokeRecord: currentScore > previousBestScore,
          coinsEarned: runCoinsEarned,
          coinDoubled: false
        };
        doubleCoinMessage = "";
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
      coinDoubleAnimation &&
      Date.now() - coinDoubleAnimation.startedAt >= coinDoubleAnimation.duration
    ) {
      const amount = coinDoubleAnimation.amount;
      coinDoubleAnimation = null;
      game.grantRewards({ coins: amount });
      storage.saveCoins(game.getState().coins);
      lastSavedCoins = game.getState().coins;
      playSound(coinSoundPlayer);
    }
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
    syncFeedbackNativeButton();
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
  syncBackgroundMusic();
  loop();
}
