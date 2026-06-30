import { createAudioBus } from "./audio.js";
import { createBoardGenerator } from "./board.js";
import { GAME_CONFIG } from "./config.js";
import { DAILY_CHECK_IN_REWARDS, formatLocalDate, resolveDailyCheckIn } from "./checkIn.js";
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
const heartCounter = document.querySelector("#heartCounter");
const heartValue = document.querySelector("#heartValue");
const menuCoinValue = document.querySelector("#menuCoinValue");
const menuHeartCounter = document.querySelector("#menuHeartCounter");
const menuHeartValue = document.querySelector("#menuHeartValue");
const statusText = document.querySelector("#statusText");
const soundToggle = document.querySelector("#soundToggle");
const effectsToggle = document.querySelector("#effectsToggle");
const speedButton = document.querySelector("#speedButton");
const pauseOverlay = document.querySelector("#pauseOverlay");
const settingsOverlay = document.querySelector("#settingsOverlay");
const gameOverOverlay = document.querySelector("#gameOverOverlay");
const heartContinueOverlay = document.querySelector("#heartContinueOverlay");
const checkInOverlay = document.querySelector("#checkInOverlay");
const shopOverlay = document.querySelector("#shopOverlay");
const resumeButton = document.querySelector("#resumeButton");
const backToMenuButton = document.querySelector("#backToMenuButton");
const openSettingsButton = document.querySelector("#openSettingsButton");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const restartRunButton = document.querySelector("#restartRunButton");
const gameOverMenuButton = document.querySelector("#gameOverMenuButton");
const gameOverSummary = document.querySelector("#gameOverSummary");
const useHeartButton = document.querySelector("#useHeartButton");
const declineHeartButton = document.querySelector("#declineHeartButton");
const claimCheckInButton = document.querySelector("#claimCheckInButton");
const checkInStreakText = document.querySelector("#checkInStreakText");
const checkInRewardRow = document.querySelector("#checkInRewardRow");
const checkInDays = document.querySelector("#checkInDays");
const checkInResetText = document.querySelector("#checkInResetText");
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
let effectsEnabled = settings.effectsEnabled !== false;
effectsToggle.checked = effectsEnabled;
const coinSound = typeof Audio === "undefined" ? null : new Audio("./src/assets/sound/coin.mp3");
const reviveSound = typeof Audio === "undefined" ? null : new Audio("./src/assets/sound/revive.mp3");

audioBus.onEvent((event) => {
  console.debug("Audio hook:", event.type, event.payload);
  if (!audioBus.isEnabled()) {
    return;
  }
  if (event.type === "coin" && coinSound) {
    coinSound.currentTime = 0;
    coinSound.play().catch(() => {});
  }
  if (event.type === "revive" && reviveSound) {
    reviveSound.currentTime = 0;
    reviveSound.play().catch(() => {});
  }
});

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
const renderer = createRenderer(canvas, GAME_CONFIG);
let appScreen = "menu";
let overlayScreen = null;
let hasStartedRun = false;
let shopCategory = "brick";
let pendingPurchase = null;
let shopBannerTimer = null;
let pendingCheckIn = null;
let checkInClaimAnimating = false;

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
  toggleElement(heartContinueOverlay, overlayScreen === "heart-continue");
  toggleElement(checkInOverlay, overlayScreen === "daily-checkin");
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
  heartValue.textContent = String(state.heartCount);
  menuHeartValue.textContent = String(state.heartCount);
  heartCounter.classList.toggle("is-hidden", appScreen !== "game");
  menuHeartCounter.classList.toggle("is-hidden", appScreen !== "menu");
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

function syncHearts() {
  const state = game.getState();
  const storedHearts = storage.loadHearts();
  if (state.heartCount !== storedHearts) {
    storage.saveHearts(state.heartCount);
  }
}

function renderCheckIn(result) {
  if (!result?.reward) {
    return;
  }

  checkInStreakText.textContent = `连续签到 ${result.reward.day} 天`;
  checkInRewardRow.innerHTML = "";
  checkInRewardRow.hidden = true;
  checkInDays.innerHTML = "";
  for (const reward of DAILY_CHECK_IN_REWARDS) {
    const day = document.createElement("span");
    day.className = "check-in-day";
    day.classList.toggle("is-active", reward.day === result.reward.day);
    day.classList.toggle("is-big", reward.big === true);
    day.textContent = `第${reward.day}天`;
    checkInDays.append(day);
  }
  checkInResetText.textContent = result.chainBroken
    ? "连续签到中断，从第 1 天开始。每天登录可保持连续奖励。"
    : "每天登录可保持连续奖励，中断一天将从第 1 天重新开始。";
}

function claimDailyCheckIn() {
  const result = resolveDailyCheckIn(storage.loadDailyCheckIn(), formatLocalDate());
  if (!result.claimed) {
    return;
  }

  pendingCheckIn = result;
  renderCheckIn(result);
  overlayScreen = "daily-checkin";
  syncScreenState();
}

function visibleResourceCounter(type) {
  const inGame = appScreen === "game";
  if (type === "coin") {
    return inGame ? coinValue.closest(".coin-counter") : menuCoinValue.closest(".coin-counter");
  }

  return inGame ? heartCounter : menuHeartCounter;
}

function animateBrowserCheckInReward(result) {
  const activeDay = checkInDays.querySelector(".check-in-day.is-active");
  const sourceRect = activeDay?.getBoundingClientRect() ?? checkInOverlay.getBoundingClientRect();
  const sourceX = sourceRect.left + sourceRect.width / 2;
  const sourceY = sourceRect.top + sourceRect.height / 2;
  const rewards = [
    { type: "coin", icon: "./src/assets/pic/dollar.png", amount: result.reward.coins },
    { type: "heart", icon: "./src/assets/pic/heart.png", amount: result.reward.hearts }
  ].filter((reward) => reward.amount > 0);

  if (rewards.length === 0) {
    return Promise.resolve();
  }

  return Promise.all(rewards.map((reward, index) => new Promise((resolve) => {
    const target = visibleResourceCounter(reward.type);
    const targetRect = target.getBoundingClientRect();
    const coinTargetRect = visibleResourceCounter("coin").getBoundingClientRect();
    const icon = document.createElement("img");
    icon.className = "check-in-fly-icon";
    icon.src = reward.icon;
    icon.alt = "";
    icon.style.left = `${sourceX - 17}px`;
    icon.style.top = `${sourceY - 17}px`;
    document.body.append(icon);

    const endX = targetRect.width > 0
      ? targetRect.left + targetRect.width / 2
      : coinTargetRect.left + coinTargetRect.width / 2;
    const endY = targetRect.height > 0
      ? targetRect.top + targetRect.height / 2
      : coinTargetRect.top + coinTargetRect.height / 2 + 38;
    if (typeof icon.animate !== "function") {
      setTimeout(() => {
        target.classList.add("is-claim-pop");
        setTimeout(() => target.classList.remove("is-claim-pop"), 240);
        icon.remove();
        resolve();
      }, 760 + index * 90);
      return;
    }

    const animation = icon.animate([
      { transform: "translate(0, 0) scale(1.25)", opacity: 1 },
      { transform: `translate(${(endX - sourceX) * 0.5}px, ${endY - sourceY - 46}px) scale(1)`, opacity: 0.95 },
      { transform: `translate(${endX - sourceX}px, ${endY - sourceY}px) scale(0.72)`, opacity: 0.2 }
    ], {
      duration: 760,
      delay: index * 90,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      fill: "forwards"
    });

    animation.addEventListener("finish", () => {
      target.classList.add("is-claim-pop");
      setTimeout(() => target.classList.remove("is-claim-pop"), 240);
      icon.remove();
      resolve();
    }, { once: true });
  })));
}

function collectDailyCheckInReward() {
  if (!pendingCheckIn || checkInClaimAnimating) {
    return;
  }

  checkInClaimAnimating = true;
  claimCheckInButton.disabled = true;
  const result = pendingCheckIn;

  animateBrowserCheckInReward(result).finally(() => {
    storage.saveDailyCheckIn(result.state);
    game.grantRewards(result.reward);
    storage.saveCoins(game.getState().coins);
    storage.saveHearts(game.getState().heartCount);
    pendingCheckIn = null;
    checkInClaimAnimating = false;
    claimCheckInButton.disabled = false;
    overlayScreen = null;
    syncScreenState();
    syncHud();
  });
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
    setStatus(state.heartConsumeEffect
      ? "Heart used. One more chance."
      : `Run over at round ${state.round}. Press restart and chase ${Math.max(state.bestScore, state.score)}.`);
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
  storage.saveSettings({ soundEnabled: soundToggle.checked, effectsEnabled });
});

effectsToggle.addEventListener("change", () => {
  effectsEnabled = effectsToggle.checked;
  game.setEffectsEnabled(effectsEnabled);
  storage.saveSettings({ soundEnabled: soundToggle.checked, effectsEnabled });
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

useHeartButton.addEventListener("click", () => {
  if (game.consumeHeartContinue()) {
    storage.saveHearts(game.getState().heartCount);
    overlayScreen = null;
    hasStartedRun = true;
    syncScreenState();
    syncHud();
    setStatus("Heart used. One more chance.");
  }
});

declineHeartButton.addEventListener("click", () => {
  overlayScreen = "gameover";
  syncScreenState();
});

claimCheckInButton.addEventListener("click", () => {
  collectDailyCheckInReward();
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
  syncHearts();
  syncHud();
  if (appScreen === "game") {
    if (game.getState().state === "gameover" && overlayScreen !== "gameover") {
      if (game.getState().heartCount > 0 && overlayScreen !== "heart-continue") {
        overlayScreen = "heart-continue";
        syncScreenState();
      } else {
        overlayScreen = "gameover";
        syncScreenState();
      }
    }
    handleStatusMessages();
    renderer.render(game.getState(), game.getEntityPosition);
  }
  requestAnimationFrame(frame);
}

syncScreenState();
syncHud();
syncResponsiveLayout();
claimDailyCheckIn();
requestAnimationFrame(frame);
