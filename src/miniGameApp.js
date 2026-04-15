import { createAudioBus } from "./audio.js";
import { createBoardGenerator } from "./board.js";
import { GAME_CONFIG } from "./config.js";
import { createGameController } from "./gameState.js";
import { createRenderer } from "./render.js";
import { createWeChatStorageAdapter } from "./storage.js";

const translations = {
  "zh-CN": {
    menuKicker: "微信小游戏",
    title: "Arc Cascade",
    menuLineOne: "调整角度，击碎砖块。",
    menuLineTwo: "再坚持一回合。",
    play: "开始游戏",
    best: "最高分",
    round: "回合",
    paused: "已暂停",
    settings: "设置",
    runOver: "本局结束",
    restart: "重新开始",
    mainMenu: "主菜单",
    resume: "继续",
    soundOn: "音效开",
    soundOff: "音效关",
    toggleSoundOn: "关闭音效",
    toggleSoundOff: "开启音效",
    language: "语言",
    languageValueZh: "简体中文",
    languageValueEn: "English",
    switchLanguage: "切换到 English",
    done: "完成",
    reachedRound: (round) => `你打到了第 ${round} 回合。`,
    speed: "2倍速"
  },
  en: {
    menuKicker: "WECHAT MINI GAME",
    title: "Arc Cascade",
    menuLineOne: "Stack the angles, break the wall.",
    menuLineTwo: "Survive one more round.",
    play: "Play",
    best: "Best",
    round: "Round",
    paused: "Paused",
    settings: "Settings",
    runOver: "Run Over",
    restart: "Restart",
    mainMenu: "Main Menu",
    resume: "Resume",
    soundOn: "Sound On",
    soundOff: "Sound Off",
    toggleSoundOn: "Turn Sound Off",
    toggleSoundOff: "Turn Sound On",
    language: "Language",
    languageValueZh: "简体中文",
    languageValueEn: "English",
    switchLanguage: "Switch to 简体中文",
    done: "Done",
    reachedRound: (round) => `You made it to round ${round}.`,
    speed: "2x Speed"
  }
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

export function bootMiniGame(wxApi = globalThis.wx) {
  const systemInfo = wxApi.getSystemInfoSync();
  const canvas = wxApi.createCanvas();
  const pixelRatio = systemInfo.pixelRatio || 1;
  const screenWidth = systemInfo.screenWidth;
  const screenHeight = systemInfo.screenHeight;
  canvas.width = screenWidth * pixelRatio;
  canvas.height = screenHeight * pixelRatio;

  const renderer = createRenderer(canvas, GAME_CONFIG, {
    autoResize: false,
    pixelRatio
  });
  renderer.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const storage = createWeChatStorageAdapter(wxApi);
  const settings = storage.loadSettings();
  const audioBus = createAudioBus();
  audioBus.setEnabled(settings.soundEnabled);
  let currentLanguage = settings.language || "zh-CN";

  const boardGenerator = createBoardGenerator(GAME_CONFIG);
  const game = createGameController({
    config: GAME_CONFIG,
    boardGenerator,
    audioBus
  });

  let screen = "menu";
  let overlay = null;
  let pointerActive = false;
  let bestScore = storage.loadBestScore();
  let touchStart = null;
  let lastTime = Date.now();
  const scheduleFrame =
    globalThis.requestAnimationFrame?.bind(globalThis) ||
    wxApi.requestAnimationFrame?.bind(wxApi) ||
    ((callback) => setTimeout(() => callback(Date.now()), 16));

  function t(key, ...args) {
    const table = translations[currentLanguage] || translations["zh-CN"];
    const value = table[key];
    return typeof value === "function" ? value(...args) : value;
  }

  function saveSettings() {
    storage.saveSettings({
      soundEnabled: audioBus.isEnabled(),
      language: currentLanguage
    });
  }

  function canvasRect() {
    const topInset = Math.max(systemInfo.safeArea?.top ?? 0, 18);
    const bottomInset = Math.max(screenHeight - (systemInfo.safeArea?.bottom ?? screenHeight), 16);
    const horizontalPadding = clamp(screenWidth * 0.035, 12, 18);
    const hudHeight = clamp(screenHeight * 0.14, 88, 132);
    const boardTop = topInset + hudHeight;
    const boardBottom = screenHeight - bottomInset;
    const boardHeight = Math.max(160, boardBottom - boardTop);
    const boardWidth = Math.min(screenWidth - horizontalPadding * 2, boardHeight * (GAME_CONFIG.width / GAME_CONFIG.height));
    return {
      x: (screenWidth - boardWidth) / 2,
      y: boardTop,
      width: boardWidth,
      height: boardWidth * (GAME_CONFIG.height / GAME_CONFIG.width),
      topInset,
      bottomInset,
      hudHeight,
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

  function startRun() {
    game.restart();
    screen = "game";
    overlay = null;
  }

  function goToMenu() {
    overlay = null;
    screen = "menu";
    pointerActive = false;
  }

  function currentButtons() {
    const rect = canvasRect();
    if (screen === "menu") {
      return [
        {
          id: "play",
          x: rect.x + 32,
          y: rect.y + rect.height * 0.58,
          width: rect.width - 64,
          height: 56
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

    if (overlay === "pause") {
      buttons.push(
        { id: "resume", x: rect.x + 36, y: rect.y + rect.height * 0.36, width: rect.width - 72, height: 52 },
        { id: "settings", x: rect.x + 36, y: rect.y + rect.height * 0.47, width: rect.width - 72, height: 52 },
        { id: "menu", x: rect.x + 36, y: rect.y + rect.height * 0.58, width: rect.width - 72, height: 52 }
      );
    }

    if (overlay === "settings") {
      buttons.push(
        { id: "toggle-sound", x: rect.x + 36, y: rect.y + rect.height * 0.38, width: rect.width - 72, height: 52 },
        { id: "toggle-language", x: rect.x + 36, y: rect.y + rect.height * 0.50, width: rect.width - 72, height: 52 },
        { id: "settings-done", x: rect.x + 36, y: rect.y + rect.height * 0.62, width: rect.width - 72, height: 52 }
      );
    }

    if (overlay === "gameover") {
      buttons.push(
        { id: "restart", x: rect.x + 36, y: rect.y + rect.height * 0.52, width: rect.width - 72, height: 52 },
        { id: "menu", x: rect.x + 36, y: rect.y + rect.height * 0.64, width: rect.width - 72, height: 52 }
      );
    }

    return buttons;
  }

  function handleButton(id) {
    switch (id) {
      case "play":
      case "restart":
        startRun();
        break;
      case "pause":
        if (overlay === null && game.getState().state !== "gameover") {
          overlay = "pause";
        }
        break;
      case "speed":
        game.activateSpeedUp();
        break;
      case "resume":
        overlay = null;
        break;
      case "settings":
        overlay = "settings";
        break;
      case "toggle-sound":
        audioBus.setEnabled(!audioBus.isEnabled());
        saveSettings();
        break;
      case "toggle-language":
        currentLanguage = currentLanguage === "zh-CN" ? "en" : "zh-CN";
        saveSettings();
        break;
      case "settings-done":
        overlay = "pause";
        break;
      case "menu":
        goToMenu();
        break;
      default:
        break;
    }
  }

  function drawButton(context, button, label, primary = false) {
    roundedRect(context, button.x, button.y, button.width, button.height, 24);
    context.fillStyle = primary ? "#f2b400" : "rgba(255,255,255,0.08)";
    context.fill();
    context.strokeStyle = primary ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.12)";
    context.lineWidth = 1;
    context.stroke();
    context.fillStyle = primary ? "#1d1d1d" : "#fbfbfb";
    context.font = "700 20px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, button.x + button.width / 2, button.y + button.height / 2 + 1);
  }

  function drawMiniOverlay(context, state) {
    const rect = canvasRect();

    if (screen === "menu") {
      context.fillStyle = "#171717";
      context.fillRect(0, 0, screenWidth, screenHeight);
      context.fillStyle = "#f5c95c";
      context.font = "700 16px sans-serif";
      context.textAlign = "center";
      context.fillText(t("menuKicker"), screenWidth / 2, rect.y + 90);
      context.fillStyle = "#fbfbfb";
      context.font = "700 48px sans-serif";
      context.fillText(t("title"), screenWidth / 2, rect.y + 156);
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "20px sans-serif";
      context.fillText(t("menuLineOne"), screenWidth / 2, rect.y + 210);
      context.fillText(t("menuLineTwo"), screenWidth / 2, rect.y + 238);
      drawButton(context, currentButtons().find((button) => button.id === "play"), t("play"), true);
      return;
    }

    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "15px sans-serif";
    context.textAlign = "left";
    context.fillText(t("best"), rect.horizontalPadding + 58, rect.topInset + 16);
    context.fillStyle = "#fbfbfb";
    context.font = "700 42px sans-serif";
    context.fillText(String(bestScore), rect.horizontalPadding + 58, rect.topInset + 54);

    context.textAlign = "center";
    context.fillStyle = "rgba(255,255,255,0.72)";
    context.font = "15px sans-serif";
    context.fillText(t("round"), screenWidth / 2, rect.topInset + 16);
    context.fillStyle = "#fbfbfb";
    context.font = "700 42px sans-serif";
    context.fillText(String(state.round), screenWidth / 2, rect.topInset + 54);

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
      drawButton(context, speedButton, t("speed"));
    }

    if (!overlay) {
      return;
    }

    context.fillStyle = "rgba(0,0,0,0.54)";
    context.fillRect(0, 0, screenWidth, screenHeight);
    const panel = {
      x: rect.x + 24,
      y: rect.y + rect.height * 0.24,
      width: rect.width - 48,
      height: rect.height * 0.46
    };
    roundedRect(context, panel.x, panel.y, panel.width, panel.height, 28);
    context.fillStyle = "#262626";
    context.fill();
    context.strokeStyle = "rgba(255,255,255,0.1)";
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = "#fbfbfb";
    context.textAlign = "center";
    context.font = "700 34px sans-serif";
    context.fillText(
      overlay === "pause" ? t("paused") : overlay === "settings" ? t("settings") : t("runOver"),
      screenWidth / 2,
      panel.y + 58
    );

    if (overlay === "settings") {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "20px sans-serif";
      context.fillText(
        `${t("settings")}: ${audioBus.isEnabled() ? t("soundOn") : t("soundOff")}`,
        screenWidth / 2,
        panel.y + 110
      );
      context.fillText(
        `${t("language")}: ${currentLanguage === "zh-CN" ? t("languageValueZh") : t("languageValueEn")}`,
        screenWidth / 2,
        panel.y + 146
      );
    }

    if (overlay === "gameover") {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "20px sans-serif";
      context.fillText(t("reachedRound", state.round), screenWidth / 2, panel.y + 110);
    }

    for (const button of currentButtons()) {
      if (["play", "pause", "speed"].includes(button.id)) {
        continue;
      }

      const labels = {
        resume: t("resume"),
        settings: t("settings"),
        menu: t("mainMenu"),
        "toggle-sound": audioBus.isEnabled() ? t("toggleSoundOn") : t("toggleSoundOff"),
        "toggle-language": t("switchLanguage"),
        "settings-done": t("done"),
        restart: t("restart")
      };

      drawButton(context, button, labels[button.id], button.id === "resume" || button.id === "restart" || button.id === "settings-done");
    }
  }

  function getTouchPoint(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchStart(event) {
    const point = getTouchPoint(event);
    if (!point) {
      return;
    }

    const button = currentButtons().find((candidate) => hitTest(candidate, point));
    if (button) {
      touchStart = { point, buttonId: button.id };
      return;
    }

    if (screen !== "game" || overlay !== null) {
      return;
    }

    pointerActive = true;
    touchStart = { point, buttonId: null };
    game.startAim(toGamePoint(point));
  }

  function onTouchMove(event) {
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
      if (button && hitTest(button, point)) {
        handleButton(button.id);
      }
      touchStart = null;
      return;
    }

    if (pointerActive) {
      pointerActive = false;
      game.releaseAim(toGamePoint(point));
    }

    touchStart = null;
  }

  wxApi.onTouchStart(onTouchStart);
  wxApi.onTouchMove(onTouchMove);
  wxApi.onTouchEnd(onTouchEnd);
  wxApi.onTouchCancel(() => {
    pointerActive = false;
    touchStart = null;
  });

  function loop() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000;
    lastTime = now;

    if (screen === "game" && overlay === null) {
      game.update(deltaTime);
      if (game.getState().state === "gameover") {
        overlay = "gameover";
      }
    }

    syncBestScore();
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

  loop();
}
