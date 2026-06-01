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
const shopButton = document.querySelector("#shopButton");
const pauseButton = document.querySelector("#pauseButton");
const roundValue = document.querySelector("#roundValue");
const bestValue = document.querySelector("#bestValue");
const coinValue = document.querySelector("#coinValue");
const menuCoinValue = document.querySelector("#menuCoinValue");
const statusText = document.querySelector("#statusText");
const soundToggle = document.querySelector("#soundToggle");
const speedButton = document.querySelector("#speedButton");
const pauseOverlay = document.querySelector("#pauseOverlay");
const settingsOverlay = document.querySelector("#settingsOverlay");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const shopOverlay = document.querySelector("#shopOverlay");
const resumeButton = document.querySelector("#resumeButton");
const backToMenuButton = document.querySelector("#backToMenuButton");
const openSettingsButton = document.querySelector("#openSettingsButton");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const restartRunButton = document.querySelector("#restartRunButton");
const gameOverMenuButton = document.querySelector("#gameOverMenuButton");
const gameOverSummary = document.querySelector("#gameOverSummary");
const closeShopButton = document.querySelector("#closeShopButton");
const shopGrid = document.querySelector("#shopGrid");
const shopBanner = document.querySelector("#shopBanner");
const brickShopTab = document.querySelector("#brickShopTab");
const ballShopTab = document.querySelector("#ballShopTab");
const shopMessage = document.querySelector("#shopMessage");

const storage = createStorageAdapter();
const settings = storage.loadSettings();
const audioBus = createAudioBus();
audioBus.setEnabled(settings.soundEnabled);
soundToggle.checked = settings.soundEnabled;
const coinSound = typeof Audio === "undefined" ? null : new Audio("./src/assets/sound/coin.mp3");

audioBus.onEvent((event) => {
  console.debug("Audio hook:", event.type, event.payload);
  if (event.type === "coin" && coinSound) {
    coinSound.currentTime = 0;
    coinSound.play().catch(() => {});
  }
});

const boardGenerator = createBoardGenerator(GAME_CONFIG);
const game = createGameController({
  config: GAME_CONFIG,
  initialCoins: storage.loadCoins(),
  initialSkins: storage.loadSkins(),
  boardGenerator,
  audioBus
});
const renderer = createRenderer(canvas, GAME_CONFIG);
let appScreen = "menu";
let overlayScreen = null;
let hasStartedRun = false;
let shopCategory = "brick";
let pendingPurchase = null;
let shopBannerTimer = null;

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
  toggleElement(shopOverlay, overlayScreen === "shop");
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
  coinValue.textContent = String(state.coins);
  menuCoinValue.textContent = String(state.coins);
  speedButton.classList.toggle("is-hidden", !state.speedUpAvailable || isSimulationPaused());
  gameOverSummary.textContent = `You made it to round ${state.round}.`;
}

function syncCoins() {
  const state = game.getState();
  const storedCoins = storage.loadCoins();
  if (state.coins !== storedCoins) {
    storage.saveCoins(state.coins);
  }
}

function syncSkins() {
  storage.saveSkins(game.getState().skins);
}

function isOwned(category, skinId) {
  return game.getState().skins.owned[category].includes(skinId);
}

function renderShop() {
  const state = game.getState();
  const skins = GAME_CONFIG.skins[shopCategory];
  brickShopTab.classList.toggle("is-active", shopCategory === "brick");
  ballShopTab.classList.toggle("is-active", shopCategory === "ball");
  shopGrid.innerHTML = "";

  for (const skin of skins) {
    const owned = isOwned(shopCategory, skin.id);
    const selected = skin.default
      ? state.skins.selected[shopCategory] === null
      : state.skins.selected[shopCategory] === skin.id;
    const isPending = pendingPurchase?.category === shopCategory && pendingPurchase.skinId === skin.id;
    const item = document.createElement("button");
    item.className = "skin-item";
    item.type = "button";
    item.dataset.skinId = skin.id;
    item.setAttribute("aria-label", skin.id);

    const sample = document.createElement("span");
    sample.className = `skin-sample ${shopCategory}`;
    sample.style.background = skin.color;
    sample.style.color = skin.color;
    sample.style.setProperty("--skin-accent", skin.accent ?? "rgba(255,255,255,0.72)");
    if (skin.pattern) {
      sample.dataset.pattern = skin.pattern;
    }
    const storeImage = skin.storeImage ?? skin.image;
    if (storeImage) {
      sample.style.backgroundImage = `url("./${storeImage}")`;
    }
    item.append(sample);

    const action = document.createElement("span");
    action.className = "skin-price";
    if (selected) {
      action.classList.add("selected");
      action.textContent = "Selected";
    } else if (skin.default || owned) {
      action.classList.add("owned");
      action.textContent = "Use";
    } else if (isPending) {
      action.textContent = "购买";
    } else {
      const icon = document.createElement("img");
      icon.src = "./src/assets/pic/dollar.png";
      icon.alt = "";
      action.append(icon, document.createTextNode(String(skin.price)));
    }
    item.append(action);
    shopGrid.append(item);
  }
}

function openShop() {
  pendingPurchase = null;
  shopMessage.textContent = "";
  overlayScreen = "shop";
  renderShop();
  syncScreenState();
  syncHud();
}

function showShopBanner(message = "金币不足") {
  shopBanner.textContent = message;
  shopBanner.classList.remove("is-hidden");
  if (shopBannerTimer) {
    clearTimeout(shopBannerTimer);
  }
  shopBannerTimer = setTimeout(() => {
    shopBanner.classList.add("is-hidden");
    shopBannerTimer = null;
  }, 2000);
}

function setShopCategory(category) {
  shopCategory = category;
  pendingPurchase = null;
  shopMessage.textContent = "";
  renderShop();
}

function handleSkinTap(skinId) {
  const skin = GAME_CONFIG.skins[shopCategory].find((candidate) => candidate.id === skinId);
  if (!skin) {
    return;
  }

  const state = game.getState();
  const skins = structuredClone(state.skins);
  if (skin.default || skins.owned[shopCategory].includes(skin.id)) {
    skins.selected[shopCategory] = skin.default ? null : skin.id;
    game.setSkins(skins);
    syncSkins();
    shopMessage.textContent = "Skin equipped.";
    pendingPurchase = null;
    renderShop();
    return;
  }

  if (pendingPurchase?.category !== shopCategory || pendingPurchase.skinId !== skin.id) {
    pendingPurchase = { category: shopCategory, skinId: skin.id };
    shopMessage.textContent = "Tap 购买 to confirm purchase.";
    renderShop();
    return;
  }

  if (!game.spendCoins(skin.price)) {
    shopMessage.textContent = "";
    showShopBanner();
    pendingPurchase = null;
    renderShop();
    return;
  }

  skins.owned[shopCategory].push(skin.id);
  skins.selected[shopCategory] = skin.id;
  game.setSkins(skins);
  storage.saveCoins(game.getState().coins);
  syncSkins();
  pendingPurchase = null;
  shopMessage.textContent = "Purchased and equipped.";
  syncHud();
  renderShop();
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
  hasStartedRun = true;
  appScreen = "game";
  overlayScreen = null;
  syncScreenState();
  syncHud();
  setStatus("Fresh run ready. Drag to line up the first shot.");
}

playButton.addEventListener("click", () => {
  if (hasStartedRun && game.getState().state !== "gameover") {
    appScreen = "game";
    overlayScreen = null;
    syncScreenState();
    syncHud();
    setStatus("Run resumed. Drag to line up the next shot.");
    return;
  }

  startRun();
});

shopButton.addEventListener("click", openShop);

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

closeShopButton.addEventListener("click", () => {
  overlayScreen = null;
  pendingPurchase = null;
  syncScreenState();
});

brickShopTab.addEventListener("click", () => setShopCategory("brick"));
ballShopTab.addEventListener("click", () => setShopCategory("ball"));
shopGrid.addEventListener("click", (event) => {
  const item = event.target.closest(".skin-item");
  if (item) {
    handleSkinTap(item.dataset.skinId);
  }
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
  syncCoins();
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
