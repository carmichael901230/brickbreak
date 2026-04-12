import { createAudioBus } from "./audio.js";
import { createBoardGenerator } from "./board.js";
import { GAME_CONFIG } from "./config.js";
import { createGameController } from "./gameState.js";
import { createInputController } from "./input.js";
import { createRenderer } from "./render.js";
import { createStorageAdapter } from "./storage.js";

const canvas = document.querySelector("#gameCanvas");
const roundValue = document.querySelector("#roundValue");
const ballsValue = document.querySelector("#ballsValue");
const scoreValue = document.querySelector("#scoreValue");
const bestValue = document.querySelector("#bestValue");
const statusText = document.querySelector("#statusText");
const restartButton = document.querySelector("#restartButton");
const soundToggle = document.querySelector("#soundToggle");
const speedButton = document.querySelector("#speedButton");

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

function setStatus(message) {
  statusText.textContent = message;
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
  ballsValue.textContent = String(state.ballsOwned);
  scoreValue.textContent = String(state.score);
  bestValue.textContent = String(Math.max(storage.loadBestScore(), state.bestScore, state.score));
  speedButton.classList.toggle("is-hidden", !state.speedUpAvailable);
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

createInputController(canvas, game, setStatus);

restartButton.addEventListener("click", () => {
  game.restart();
  syncHud();
  setStatus("Fresh run ready. Drag to line up the first shot.");
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

globalThis.addEventListener("resize", () => renderer.resize());

let lastTime = performance.now();
function frame(now) {
  const deltaTime = (now - lastTime) / 1000;
  lastTime = now;

  game.update(deltaTime);
  refreshBestScore();
  syncHud();
  handleStatusMessages();
  renderer.render(game.getState(), game.getEntityPosition);
  requestAnimationFrame(frame);
}

syncHud();
handleStatusMessages();
requestAnimationFrame(frame);
