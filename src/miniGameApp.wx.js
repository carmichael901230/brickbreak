import { createAudioBus } from "./audio.js";
import { createBoardGenerator } from "./board.js";
import { GAME_CONFIG } from "./config.js";
import { createGameController } from "./gameState.js";
import { createRenderer } from "./render.js";
import { createWeChatStorageAdapter } from "./storage.js";

const texts = {
  title: "弹球突围",
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
  resume: "继续游戏",
  soundLabel: "音效",
  soundOn: "开",
  soundOff: "关",
  done: "完成",
  reachedRound: (round) => `你打到了第 ${round} 回合。`,
  speed: "2x"
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

function loadTutorialImage(wxApi, canvas) {
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
  image.src = "src/assets/tap.png";
  return asset;
}

export function bootMiniGame(wxApi = globalThis.wx) {
  const systemInfo = wxApi.getSystemInfoSync();
  const canvas = wxApi.createCanvas();
  const pixelRatio = systemInfo.pixelRatio || 1;
  // WeChat real devices report a visible window area that can differ from the physical screen size.
  // Layout should follow the window bounds so the launcher and touch regions stay on-screen.
  const screenWidth = systemInfo.windowWidth || systemInfo.screenWidth;
  const screenHeight = systemInfo.windowHeight || systemInfo.screenHeight;

  canvas.width = screenWidth * pixelRatio;
  canvas.height = screenHeight * pixelRatio;

  const renderer = createRenderer(canvas, GAME_CONFIG, {
    autoResize: false,
    pixelRatio,
    showRoundBanner: false
  });
  renderer.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const storage = createWeChatStorageAdapter(wxApi);
  const settings = storage.loadSettings();
  const audioBus = createAudioBus();
  audioBus.setEnabled(settings.soundEnabled);
  const tutorialAsset = loadTutorialImage(wxApi, canvas);

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
  let tutorialIdleTime = 0;
  let tutorialDismissed = false;

  const scheduleFrame =
    globalThis.requestAnimationFrame?.bind(globalThis) ||
    wxApi.requestAnimationFrame?.bind(wxApi) ||
    ((callback) => setTimeout(() => callback(Date.now()), 16));

  function saveSettings() {
    storage.saveSettings({
      soundEnabled: audioBus.isEnabled(),
      language: "zh-CN"
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
    tutorialIdleTime = 0;
    tutorialDismissed = false;
  }

  function goToMenu() {
    overlay = null;
    screen = "menu";
    pointerActive = false;
    tutorialIdleTime = 0;
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
        { id: "resume", x: rect.x + 36, y: rect.y + rect.height * 0.40, width: rect.width - 72, height: 52 },
        { id: "settings", x: rect.x + 36, y: rect.y + rect.height * 0.53, width: rect.width - 72, height: 52 },
        { id: "menu", x: rect.x + 36, y: rect.y + rect.height * 0.66, width: rect.width - 72, height: 52 }
      );
    }

    if (overlay === "settings") {
      buttons.push(
        { id: "toggle-sound", x: rect.x + rect.width - 132, y: rect.y + rect.height * 0.47, width: 96, height: 46 },
        { id: "settings-done", x: rect.x + 36, y: rect.y + rect.height * 0.68, width: rect.width - 72, height: 52 }
      );
    }

    if (overlay === "gameover") {
      buttons.push(
        { id: "restart", x: rect.x + 36, y: rect.y + rect.height * 0.56, width: rect.width - 72, height: 52 },
        { id: "menu", x: rect.x + 36, y: rect.y + rect.height * 0.68, width: rect.width - 72, height: 52 }
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

  function drawMiniOverlay(context, state) {
    const rect = canvasRect();

    if (screen === "menu") {
      context.fillStyle = "#171717";
      context.fillRect(0, 0, screenWidth, screenHeight);
      context.fillStyle = "#fbfbfb";
      context.font = "700 48px sans-serif";
      context.textAlign = "center";
      context.fillText(texts.title, screenWidth / 2, rect.y + 138);
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "20px sans-serif";
      context.fillText(texts.menuLineOne, screenWidth / 2, rect.y + 192);
      context.fillText(texts.menuLineTwo, screenWidth / 2, rect.y + 220);
      drawButton(context, currentButtons().find((button) => button.id === "play"), texts.play, true);
      return;
    }

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

    if (shouldShowTutorial(state)) {
      drawTutorialHint(context, rect);
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
      height: rect.height * 0.54
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
    context.fillText(
      overlay === "pause" ? texts.paused : overlay === "settings" ? texts.settings : texts.runOver,
      screenWidth / 2,
      panel.y + 48
    );

    if (overlay === "settings") {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "22px sans-serif";
      context.textAlign = "left";
      context.fillText(texts.soundLabel, panel.x + 36, panel.y + 120);
    }

    if (overlay === "gameover") {
      context.fillStyle = "rgba(255,255,255,0.72)";
      context.font = "20px sans-serif";
      context.fillText(texts.reachedRound(state.round), screenWidth / 2, panel.y + 108);
    }

    for (const button of currentButtons()) {
      if (["play", "pause", "speed"].includes(button.id)) {
        continue;
      }

      const labels = {
        resume: texts.resume,
        settings: texts.settings,
        menu: texts.mainMenu,
        "settings-done": texts.done,
        restart: texts.restart
      };

      if (button.id === "toggle-sound") {
        drawToggle(context, button, audioBus.isEnabled());
        continue;
      }

      drawButton(context, button, labels[button.id], button.id === "resume" || button.id === "restart" || button.id === "settings-done");
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

    const button = currentButtons().find((candidate) => hitTest(candidate, point));
    if (button) {
      touchStart = { point, buttonId: button.id };
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
