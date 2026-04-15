import { createAudioBus } from "./audio.js";
import { createBoardGenerator } from "./board.js";
import { GAME_CONFIG } from "./config.js";
import { createGameController } from "./gameState.js";
import { createInputController } from "./input.js";
import { createRenderer } from "./render.js";
import { createStorageAdapter } from "./storage.js";

const mainMenu = document.querySelector("#mainMenu");
const gameScreen = document.querySelector("#gameScreen");
const topHud = document.querySelector("#topHud");
const boardShell = document.querySelector("#boardShell");
const canvas = document.querySelector("#gameCanvas");
const playButton = document.querySelector("#playButton");
const pauseButton = document.querySelector("#pauseButton");
const roundValue = document.querySelector("#roundValue");
const bestValue = document.querySelector("#bestValue");
const statusText = document.querySelector("#statusText");
const soundToggle = document.querySelector("#soundToggle");
const speedButton = document.querySelector("#speedButton");
const pauseOverlay = document.querySelector("#pauseOverlay");
const settingsOverlay = document.querySelector("#settingsOverlay");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const resumeButton = document.querySelector("#resumeButton");
const backToMenuButton = document.querySelector("#backToMenuButton");
const openSettingsButton = document.querySelector("#openSettingsButton");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const restartRunButton = document.querySelector("#restartRunButton");
const gameOverMenuButton = document.querySelector("#gameOverMenuButton");
const gameOverSummary = document.querySelector("#gameOverSummary");

const storage = createStorageAdapter();
const settings = storage.loadSettings();
const audioBus = createAudioBus();
audioBus.setEnabled(settings.soundEnabled);
soundToggle.checked = settings.soundEnabled;

audioBus.onEvent((event) => {
  console.debug("Audio hook:", event.type, event.payload);
});

const boardGenerator = createBoardGenerator(GAME_CONFIG);
const game = createGameController({
  config: GAME_CONFIG,
  boardGenerator,
  audioBus
});
const renderer = createRenderer(canvas, GAME_CONFIG);
let appScreen = "menu";
let overlayScreen = null;

function setStatus(message) {
  statusText.textContent = message;
}

function syncResponsiveLayout() {
  const viewportHeight = globalThis.innerHeight || document.documentElement.clientHeight;
  document.documentElement.style.setProperty("--viewport-height", `${viewportHeight}px`);

  const shellWidth = Math.min(globalThis.innerWidth || document.documentElement.clientWidth, 540);
  document.documentElement.style.setProperty("--phone-shell-width", `${shellWidth}px`);

  if (appScreen !== "game") {
    canvas.style.width = "";
    canvas.style.height = "";
    return;
  }

  const availableWidth = boardShell.clientWidth;
  const availableHeight = Math.max(
    120,
    gameScreen.clientHeight - topHud.offsetHeight - statusText.offsetHeight - 8
  );
  const boardWidth = Math.min(availableWidth, availableHeight * (GAME_CONFIG.width / GAME_CONFIG.height));
  const boardHeight = boardWidth * (GAME_CONFIG.height / GAME_CONFIG.width);

  canvas.style.width = `${boardWidth}px`;
  canvas.style.height = `${boardHeight}px`;
}

function toggleElement(element, shouldShow) {
  element.classList.toggle("is-hidden", !shouldShow);
  element.setAttribute("aria-hidden", String(!shouldShow));
}

function syncScreenState() {
  toggleElement(mainMenu, appScreen === "menu");
  toggleElement(gameScreen, appScreen === "game");
  toggleElement(pauseOverlay, overlayScreen === "pause");
  toggleElement(settingsOverlay, overlayScreen === "settings");
  toggleElement(gameOverOverlay, overlayScreen === "gameover");
  syncResponsiveLayout();
}

function isSimulationPaused() {
  return appScreen !== "game" || overlayScreen !== null;
}

function refreshBestScore() {
  const state = game.getState();
  const storedBest = storage.loadBestScore();
  state.bestScore = Math.max(storedBest, state.score);
  if (state.bestScore > storedBest) {
    storage.saveBestScore(state.bestScore);
  }
}

function syncHud() {
  const state = game.getState();
  roundValue.textContent = String(state.round);
  bestValue.textContent = String(Math.max(storage.loadBestScore(), state.bestScore, state.score));
  speedButton.classList.toggle("is-hidden", !state.speedUpAvailable || isSimulationPaused());
  gameOverSummary.textContent = `You made it to round ${state.round}.`;
}

function handleStatusMessages() {
  const state = game.getState();
  if (state.state === "gameover") {
    setStatus(`Run over at round ${state.round}. Press restart and chase ${Math.max(state.bestScore, state.score)}.`);
    return;
  }

  if (state.state === "aiming") {
    setStatus("Drag on the arena to aim. Release to fire.");
    return;
  }

  if (state.state === "launching") {
    setStatus("Volley away. Find the angle that opens the board.");
    return;
  }

  setStatus("Balls are resolving. Watch where the first return lands.");
}

createInputController(gameScreen, canvas, game, setStatus);

function startRun() {
  game.restart();
  appScreen = "game";
  overlayScreen = null;
  syncScreenState();
  syncHud();
  setStatus("Fresh run ready. Drag to line up the first shot.");
}

playButton.addEventListener("click", startRun);

pauseButton.addEventListener("click", () => {
  if (appScreen !== "game") {
    return;
  }

  overlayScreen = "pause";
  syncScreenState();
});

soundToggle.addEventListener("change", () => {
  audioBus.setEnabled(soundToggle.checked);
  storage.saveSettings({ soundEnabled: soundToggle.checked });
});

speedButton.addEventListener("click", () => {
  const activated = game.activateSpeedUp();
  if (activated) {
    setStatus("2x speed engaged.");
    syncHud();
  }
});

resumeButton.addEventListener("click", () => {
  overlayScreen = null;
  syncScreenState();
});

openSettingsButton.addEventListener("click", () => {
  overlayScreen = "settings";
  syncScreenState();
});

closeSettingsButton.addEventListener("click", () => {
  overlayScreen = "pause";
  syncScreenState();
});

backToMenuButton.addEventListener("click", () => {
  overlayScreen = null;
  appScreen = "menu";
  syncScreenState();
  syncHud();
});

restartRunButton.addEventListener("click", startRun);

gameOverMenuButton.addEventListener("click", () => {
  overlayScreen = null;
  appScreen = "menu";
  syncScreenState();
  syncHud();
});

globalThis.addEventListener("resize", () => {
  renderer.resize();
  syncResponsiveLayout();
});

let lastTime = performance.now();
function frame(now) {
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  if (!isSimulationPaused()) {
    game.update(deltaTime);
  }
  refreshBestScore();
  syncHud();
  if (appScreen === "game") {
    if (game.getState().state === "gameover" && overlayScreen !== "gameover") {
      overlayScreen = "gameover";
      syncScreenState();
    }
    handleStatusMessages();
    renderer.render(game.getState(), game.getEntityPosition);
  }
  requestAnimationFrame(frame);
}

syncScreenState();
syncHud();
syncResponsiveLayout();
requestAnimationFrame(frame);
