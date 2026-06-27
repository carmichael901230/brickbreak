import { GAME_CONFIG } from "./config.js";
import { clampLaunchDirection, reflectBall, resolveBallBlockCollision } from "./physics.js";

function limitVectorLength(vector, maxLength) {
  const length = Math.hypot(vector.x, vector.y);
  if (length === 0 || length <= maxLength) {
    return vector;
  }

  const scale = maxLength / length;
  return {
    x: vector.x * scale,
    y: vector.y * scale
  };
}

function isLaunchAngleAllowed(vector, config) {
  if (vector.y >= 0) {
    return false;
  }

  const angle = Math.atan2(-vector.y, vector.x);
  return angle >= config.minLaunchAngle && angle <= config.maxLaunchAngle;
}

function buildArena(config) {
  const playableWidth = config.width - config.sidePadding * 2;
  const blockSize =
    (playableWidth - (config.columns - 1) * config.blockGap) / config.columns;

  return {
    width: config.width,
    height: config.height,
    blockSize,
    laneHeight: blockSize + config.blockGap,
    launcherY: config.height - config.bottomPadding * 0.58,
    failLineY: config.height - config.failLineOffset
  };
}

function getEntityPosition(arena, config, entity) {
  // Entity positions describe the full collision cell, not the smaller visible brick.
  return {
    x: config.sidePadding + entity.column * (arena.blockSize + config.blockGap),
    y: config.topPadding + entity.row * arena.laneHeight
  };
}

function entityCellKey(row, column) {
  return `${row}:${column}`;
}

function isEntityAtFailLine(arena, config, entity) {
  const position = getEntityPosition(arena, config, entity);
  return position.y + arena.blockSize >= arena.failLineY;
}

function createBall(launcherX, launcherY) {
  return {
    x: launcherX,
    y: launcherY,
    vx: 0,
    vy: 0,
    active: false,
    returned: false
  };
}

function cloneSerializable(value) {
  return JSON.parse(JSON.stringify(value));
}

function getValidSkinIds(config, type) {
  return new Set((config.skins?.[type] ?? []).filter((skin) => !skin.default).map((skin) => skin.id));
}

function normalizeSkins(skins, config = GAME_CONFIG) {
  const validBrickIds = getValidSkinIds(config, "brick");
  const validBallIds = getValidSkinIds(config, "ball");
  const selectedBrick = typeof skins?.selected?.brick === "string" && validBrickIds.has(skins.selected.brick)
    ? skins.selected.brick
    : null;
  const selectedBall = typeof skins?.selected?.ball === "string" && validBallIds.has(skins.selected.ball)
    ? skins.selected.ball
    : null;

  return {
    owned: {
      brick: Array.isArray(skins?.owned?.brick) ? skins.owned.brick.filter((id) => validBrickIds.has(id)) : [],
      ball: Array.isArray(skins?.owned?.ball) ? skins.owned.ball.filter((id) => validBallIds.has(id)) : []
    },
    selected: {
      brick: selectedBrick,
      ball: selectedBall
    }
  };
}

function parseHexColor(color) {
  const normalized = color?.replace("#", "");
  if (!normalized || !/^[\da-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbaFromHex(color, alpha = 1) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function darkenSkinColor(color, lifeRatio) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  const shade = 0.36 + Math.max(0, Math.min(1, lifeRatio)) * 0.64;
  return `rgba(${Math.round(rgb.r * shade)}, ${Math.round(rgb.g * shade)}, ${Math.round(rgb.b * shade)}, 0.92)`;
}

function mixChannel(start, end, progress) {
  return Math.round(start + (end - start) * progress);
}

function restoreNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function restoreBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function restorePoint(value, fallback = null) {
  if (!value || typeof value !== "object") {
    return fallback;
  }

  const x = restoreNumber(value.x, NaN);
  const y = restoreNumber(value.y, NaN);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return fallback;
  }

  return { x, y };
}

export function createInitialGameState(config = GAME_CONFIG, coins = 0, skins = null, hearts = 0) {
  const arena = buildArena(config);

  return {
    config,
    arena,
    round: 1,
    score: 0,
    bestScore: 0,
    coins: Math.max(0, Math.floor(coins)),
    heartCount: Math.max(0, Math.floor(hearts)),
    skins: normalizeSkins(skins, config),
    ballsOwned: 1,
    ballsLaunched: 0,
    returnedBalls: 0,
    launcherX: config.width / 2,
    launcherTargetX: config.width / 2,
    aiming: false,
    aimDragOrigin: null,
    aimPoint: null,
    launchDirection: null,
    launchCooldown: 0,
    speedMultiplier: 1,
    volleyElapsed: 0,
    nextSpeedUpAt: config.speedUpDelay,
    speedUpAvailable: false,
    speedUpUsed: false,
    state: "aiming",
    blocks: [],
    pickups: [],
    coinsOnBoard: [],
    balls: [createBall(config.width / 2, arena.launcherY)],
    particles: [],
    heartConsumeEffect: null,
    freezeActive: false,
    rageArmed: false,
    rageVolleyActive: false,
    rageActivationEffect: null,
    bannerTimer: config.effects.roundBannerTime,
    firstReturnX: null,
    gameOver: false
  };
}

export function createGameController({
  config = GAME_CONFIG,
  initialCoins = 0,
  initialHearts = 0,
  initialSkins = null,
  effectsEnabled = true,
  boardGenerator,
  audioBus
}) {
  let gameState = createInitialGameState(config, initialCoins, initialSkins, initialHearts);
  let visualEffectsEnabled = effectsEnabled !== false;

  function resolveAimPreview(point) {
    const dragVector = {
      x: (point.x - gameState.aimDragOrigin.x) * config.aimSensitivity,
      y: (point.y - gameState.aimDragOrigin.y) * config.aimSensitivity
    };
    const rawLaunchVector = {
      x: -dragVector.x,
      y: -dragVector.y
    };
    const maxGuideLength = gameState.arena.launcherY - config.topPadding;
    const launchVector = limitVectorLength(rawLaunchVector, maxGuideLength);
    const canFire = isLaunchAngleAllowed(launchVector, config);

    return {
      canFire,
      aimPoint: canFire
        ? {
            x: gameState.launcherX + launchVector.x,
            y: gameState.arena.launcherY + launchVector.y
          }
        : null,
      launchVector
    };
  }

  function resetRoundEntities() {
    // A round reset re-seeds all launcher-related state while preserving score and board progress.
    gameState.balls = Array.from({ length: gameState.ballsOwned }, () =>
      createBall(gameState.launcherX, gameState.arena.launcherY)
    );
    gameState.ballsLaunched = 0;
    gameState.returnedBalls = 0;
    gameState.launchCooldown = 0;
    gameState.firstReturnX = null;
    gameState.speedMultiplier = 1;
    gameState.volleyElapsed = 0;
    gameState.nextSpeedUpAt = config.speedUpDelay;
    gameState.speedUpAvailable = false;
    gameState.speedUpUsed = false;
  }

  function syncLauncher() {
    gameState.launcherX += (gameState.launcherTargetX - gameState.launcherX) * 0.22;
    if (Math.abs(gameState.launcherTargetX - gameState.launcherX) < 0.5) {
      gameState.launcherX = gameState.launcherTargetX;
    }
  }

  function spawnRound() {
    const generated = boardGenerator.generateRound(gameState.round, gameState.blocks);

    // The board advances first, then we add the new top row so every round feels like downward pressure.
    gameState.blocks = gameState.blocks.map((block) => ({ ...block, row: block.row + 1 }));
    gameState.pickups = gameState.pickups.map((pickup) => ({ ...pickup, row: pickup.row + 1 }));
    gameState.coinsOnBoard = gameState.coinsOnBoard.map((coin) => ({ ...coin, row: coin.row + 1 }));
    gameState.pickups = gameState.pickups.filter((pickup) => {
      const position = getEntityPosition(gameState.arena, config, pickup);
      return position.y + gameState.arena.blockSize < gameState.arena.failLineY;
    });
    gameState.coinsOnBoard = gameState.coinsOnBoard.filter((coin) => {
      const position = getEntityPosition(gameState.arena, config, coin);
      return position.y + gameState.arena.blockSize < gameState.arena.failLineY;
    });

    gameState.blocks.push(...generated.blocks);
    gameState.pickups.push(...generated.pickups);
    gameState.coinsOnBoard.push(...(generated.coins ?? []));
    gameState.bannerTimer = config.effects.roundBannerTime;
    gameState.score = Math.max(gameState.score, gameState.round - 1);

    if (gameState.blocks.some((block) => isEntityAtFailLine(gameState.arena, config, block))) {
      gameState.state = "gameover";
      gameState.gameOver = true;
      audioBus.emit("gameOver", { score: gameState.score });
      return;
    }

    resetRoundEntities();
  }

  function restart() {
    gameState = createInitialGameState(config, gameState.coins, gameState.skins, gameState.heartCount);
    spawnRound();
  }

  function continueFromGameOver() {
    if (gameState.state !== "gameover") {
      return false;
    }

    gameState.blocks = gameState.blocks.filter((block) => !isEntityAtFailLine(gameState.arena, config, block));
    gameState.state = "aiming";
    gameState.gameOver = false;
    gameState.aiming = false;
    gameState.aimDragOrigin = null;
    gameState.aimPoint = null;
    gameState.launchDirection = null;
    resetRoundEntities();
    return true;
  }

  function consumeHeartContinue() {
    if (gameState.state !== "gameover" || gameState.heartCount <= 0) {
      return false;
    }

    gameState.heartCount = Math.max(0, gameState.heartCount - 1);
    if (!continueFromGameOver()) {
      return false;
    }

    gameState.heartConsumeEffect = {
      life: 1.05,
      maxLife: 1.05
    };
    const centerX = gameState.arena.width / 2;
    const centerY = gameState.arena.height / 2;
    for (let index = 0; index < 18; index += 1) {
      const angle = (Math.PI * 2 * index) / 18;
      gameState.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * (80 + Math.random() * 80),
        vy: Math.sin(angle) * (80 + Math.random() * 80),
        life: config.effects.particleLife * 2.1,
        maxLife: config.effects.particleLife * 2.1,
        tone: "heart"
      });
    }
    audioBus.emit("revive");
    return true;
  }

  function exportSnapshot() {
    if (gameState.state === "gameover") {
      return null;
    }

    return cloneSerializable({
      round: gameState.round,
      score: gameState.score,
      skins: gameState.skins,
      ballsOwned: gameState.ballsOwned,
      ballsLaunched: gameState.ballsLaunched,
      returnedBalls: gameState.returnedBalls,
      launcherX: gameState.launcherX,
      launcherTargetX: gameState.launcherTargetX,
      aiming: gameState.aiming,
      aimDragOrigin: gameState.aimDragOrigin,
      aimPoint: gameState.aimPoint,
      launchDirection: gameState.launchDirection,
      launchCooldown: gameState.launchCooldown,
      speedMultiplier: gameState.speedMultiplier,
      volleyElapsed: gameState.volleyElapsed,
      nextSpeedUpAt: gameState.nextSpeedUpAt,
      speedUpAvailable: gameState.speedUpAvailable,
      speedUpUsed: gameState.speedUpUsed,
      state: gameState.state,
      blocks: gameState.blocks,
      pickups: gameState.pickups,
      coinsOnBoard: gameState.coinsOnBoard,
      balls: gameState.balls,
      particles: gameState.particles,
      freezeActive: gameState.freezeActive,
      rageArmed: gameState.rageArmed,
      rageVolleyActive: gameState.rageVolleyActive,
      bannerTimer: gameState.bannerTimer,
      firstReturnX: gameState.firstReturnX
    });
  }

  function importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    const nextState = createInitialGameState(config, gameState.coins, gameState.skins, gameState.heartCount);
    const allowedStates = new Set(["aiming", "launching", "resolving"]);
    if (!allowedStates.has(snapshot.state)) {
      return false;
    }

    nextState.round = Math.max(1, Math.floor(restoreNumber(snapshot.round, nextState.round)));
    nextState.score = Math.max(0, Math.floor(restoreNumber(snapshot.score, nextState.score)));
    nextState.bestScore = Math.max(0, Math.floor(gameState.bestScore));
    nextState.skins = normalizeSkins(snapshot.skins ?? nextState.skins, config);
    nextState.ballsOwned = Math.max(1, Math.floor(restoreNumber(snapshot.ballsOwned, nextState.ballsOwned)));
    nextState.ballsLaunched = Math.max(0, Math.floor(restoreNumber(snapshot.ballsLaunched, nextState.ballsLaunched)));
    nextState.returnedBalls = Math.max(0, Math.floor(restoreNumber(snapshot.returnedBalls, nextState.returnedBalls)));
    nextState.launcherX = restoreNumber(snapshot.launcherX, nextState.launcherX);
    nextState.launcherTargetX = restoreNumber(snapshot.launcherTargetX, nextState.launcherTargetX);
    nextState.aiming = restoreBoolean(snapshot.aiming, nextState.aiming);
    nextState.aimDragOrigin = restorePoint(snapshot.aimDragOrigin);
    nextState.aimPoint = restorePoint(snapshot.aimPoint);
    nextState.launchDirection = restorePoint(snapshot.launchDirection);
    nextState.launchCooldown = restoreNumber(snapshot.launchCooldown, nextState.launchCooldown);
    nextState.speedMultiplier = restoreNumber(snapshot.speedMultiplier, nextState.speedMultiplier);
    nextState.volleyElapsed = restoreNumber(snapshot.volleyElapsed, nextState.volleyElapsed);
    nextState.nextSpeedUpAt = restoreNumber(snapshot.nextSpeedUpAt, nextState.nextSpeedUpAt);
    nextState.speedUpAvailable = restoreBoolean(snapshot.speedUpAvailable, nextState.speedUpAvailable);
    nextState.speedUpUsed = restoreBoolean(snapshot.speedUpUsed, nextState.speedUpUsed);
    nextState.freezeActive = restoreBoolean(snapshot.freezeActive, false);
    nextState.rageArmed = restoreBoolean(snapshot.rageArmed, false);
    nextState.rageVolleyActive = restoreBoolean(snapshot.rageVolleyActive, false);
    nextState.state = snapshot.state;
    nextState.bannerTimer = restoreNumber(snapshot.bannerTimer, nextState.bannerTimer);
    nextState.firstReturnX = snapshot.firstReturnX === null ? null : restoreNumber(snapshot.firstReturnX, null);
    nextState.gameOver = false;

    if (Array.isArray(snapshot.blocks)) {
      nextState.blocks = cloneSerializable(snapshot.blocks);
    }
    if (Array.isArray(snapshot.pickups)) {
      nextState.pickups = cloneSerializable(snapshot.pickups);
    }
    if (Array.isArray(snapshot.coinsOnBoard)) {
      nextState.coinsOnBoard = cloneSerializable(snapshot.coinsOnBoard);
    }
    if (Array.isArray(snapshot.balls) && snapshot.balls.length > 0) {
      nextState.balls = cloneSerializable(snapshot.balls);
    }
    if (Array.isArray(snapshot.particles)) {
      nextState.particles = cloneSerializable(snapshot.particles);
    }

    if (!nextState.rageVolleyActive) {
      nextState.ballsOwned = Math.max(nextState.ballsOwned, nextState.balls.length);
    }
    nextState.ballsLaunched = Math.min(nextState.ballsLaunched, nextState.balls.length);
    nextState.returnedBalls = Math.min(nextState.returnedBalls, nextState.balls.length);
    if (nextState.state === "aiming") {
      nextState.aiming = false;
      nextState.aimDragOrigin = null;
    }

    gameState = nextState;
    return true;
  }

  function startAim(point) {
    if (gameState.state !== "aiming" || gameState.heartConsumeEffect) {
      return;
    }

    gameState.aiming = true;
    gameState.aimDragOrigin = point;
    gameState.aimPoint = {
      x: gameState.launcherX,
      y: gameState.arena.launcherY - 80
    };
  }

  function updateAim(point) {
    if (!gameState.aiming || gameState.state !== "aiming" || gameState.heartConsumeEffect) {
      return;
    }

    const preview = resolveAimPreview(point);
    gameState.aimPoint = preview.aimPoint;
  }

  function releaseAim(point) {
    if (!gameState.aiming || gameState.state !== "aiming" || gameState.heartConsumeEffect) {
      return;
    }

    gameState.aiming = false;
    const preview = resolveAimPreview(point);
    gameState.aimPoint = preview.aimPoint;
    const vector = preview.launchVector;
    gameState.aimDragOrigin = null;

    if (!preview.canFire) {
      gameState.aimPoint = null;
      return;
    }

    gameState.launchDirection = clampLaunchDirection(vector, config);
    if (gameState.rageArmed) {
      const temporaryBalls = Array.from({ length: gameState.ballsOwned }, () =>
        createBall(gameState.launcherX, gameState.arena.launcherY)
      );
      gameState.balls.push(...temporaryBalls);
      gameState.rageArmed = false;
      gameState.rageVolleyActive = true;
    }
    gameState.state = "launching";
    gameState.launchCooldown = 0;
    gameState.volleyElapsed = 0;
    gameState.nextSpeedUpAt = config.speedUpDelay;
    gameState.speedUpAvailable = false;
    gameState.speedUpUsed = false;
  }

  function emitBall() {
    if (!gameState.launchDirection || gameState.ballsLaunched >= gameState.balls.length) {
      return;
    }

    const ball = gameState.balls[gameState.ballsLaunched];
    ball.active = true;
    ball.returned = false;
    ball.x = gameState.launcherX;
    ball.y = gameState.arena.launcherY;
    const speed = config.ballSpeed * gameState.speedMultiplier;
    ball.vx = gameState.launchDirection.x * speed;
    ball.vy = gameState.launchDirection.y * speed;
    gameState.ballsLaunched += 1;
    audioBus.emit("launch");
  }

  function addParticle(x, y, tone) {
    if (!visualEffectsEnabled) {
      return;
    }

    gameState.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 90,
      vy: -40 - Math.random() * 80,
      life: config.effects.particleLife,
      maxLife: config.effects.particleLife,
      tone
    });
  }

  function blockBreakPalette(block) {
    const lifeRatio = Math.max(0, Math.min(1, (block?.hp ?? 1) / Math.max(1, block?.maxHp ?? block?.hp ?? 1)));
    const brickSkin = config.skins?.brick?.find((skin) => skin.id === gameState.skins?.selected?.brick);
    if (brickSkin?.color) {
      const palette = [darkenSkinColor(brickSkin.color, lifeRatio)];
      if (brickSkin.accent) {
        palette.push(rgbaFromHex(brickSkin.accent, 0.82));
      }
      return palette;
    }

    return [
      `rgba(${mixChannel(74, 200, lifeRatio)}, ${mixChannel(102, 224, lifeRatio)}, ${mixChannel(132, 255, lifeRatio)}, 0.92)`,
      "rgba(238,248,255,0.82)"
    ];
  }

  function addBlockBreakParticles(x, y, size, block = null) {
    if (!visualEffectsEnabled) {
      return;
    }

    const inset = Math.min(config.visualBrickGap / 2, size * 0.18);
    const visibleX = x + inset;
    const visibleY = y + inset;
    const visibleSize = size - inset * 2;
    const centerX = visibleX + visibleSize / 2;
    const centerY = visibleY + visibleSize / 2;
    const shardCount = 18;
    const palette = blockBreakPalette(block);

    for (let index = 0; index < shardCount; index += 1) {
      const column = index % 6;
      const row = Math.floor(index / 6);
      const shardX = visibleX + (column + 0.5) * (visibleSize / 6);
      const shardY = visibleY + (row + 0.5) * (visibleSize / 3);
      const angle = Math.atan2(shardY - centerY, shardX - centerX) + (Math.random() - 0.5) * 0.75;
      const speed = 95 + Math.random() * 160;
      const shardSize = Math.max(5, Math.min(13, visibleSize * (0.08 + Math.random() * 0.05)));
      const color = palette[Math.floor(Math.random() * palette.length)];

      gameState.particles.push({
        x: shardX,
        y: shardY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: config.effects.particleLife * 1.65,
        maxLife: config.effects.particleLife * 1.65,
        tone: "block-break",
        shape: "shard",
        color,
        strokeColor: rgbaFromHex("#ffffff", 0.45),
        size: shardSize,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 9
      });
    }
  }

  function tickParticles(deltaTime) {
    if (!visualEffectsEnabled) {
      gameState.particles = [];
      return;
    }

    for (const particle of gameState.particles) {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += 180 * deltaTime;
      if (Number.isFinite(particle.rotationSpeed)) {
        particle.rotation = (particle.rotation ?? 0) + particle.rotationSpeed * deltaTime;
      }
      particle.life -= deltaTime;
    }

    gameState.particles = gameState.particles.filter((particle) => particle.life > 0);
  }

  function collectPickup(pickup, ball, centerX, centerY) {
    pickup.collected = true;
    addParticle(ball.x, ball.y, "pickup");
    audioBus.emit("pickup", { x: centerX, y: centerY });
  }

  function collectCoin(coin, ball, centerX, centerY) {
    coin.collected = true;
    gameState.coins += 1;
    addParticle(ball.x, ball.y, "coin");
    audioBus.emit("coin", { coins: gameState.coins, x: centerX, y: centerY });
  }

  function setEffectsEnabled(enabled) {
    visualEffectsEnabled = enabled !== false;
    if (!visualEffectsEnabled) {
      gameState.particles = [];
    }
  }

  function areEffectsEnabled() {
    return visualEffectsEnabled;
  }

  function damageBlock(block, position) {
    block.hp -= 1;
    block.hitFlash = config.effects.hitFlashTime;
    addParticle(position.x + gameState.arena.blockSize / 2, position.y + gameState.arena.blockSize / 2, "hit");
    audioBus.emit("hit");

    if (block.hp <= 0) {
      addParticle(position.x + gameState.arena.blockSize / 2, position.y + gameState.arena.blockSize / 2, "clear");
      addBlockBreakParticles(position.x, position.y, gameState.arena.blockSize, block);
      audioBus.emit("clear");
    }
  }

  function removeBlock(blockId) {
    gameState.blocks = gameState.blocks.filter((block) => block.id !== blockId);
  }

  function clearLowestBlockRows(rowCount = 3) {
    if (gameState.state !== "aiming") {
      return { clearedRows: [], removedBlocks: [] };
    }

    const normalizedRowCount = Math.max(0, Math.floor(rowCount));
    if (normalizedRowCount <= 0) {
      return { clearedRows: [], removedBlocks: [] };
    }

    const clearedRows = Array.from(new Set(gameState.blocks.map((block) => block.row)))
      .sort((a, b) => b - a)
      .slice(0, normalizedRowCount);
    const clearedRowSet = new Set(clearedRows);
    const removedBlocks = gameState.blocks
      .filter((block) => clearedRowSet.has(block.row))
      .map((block) => {
        const position = getEntityPosition(gameState.arena, config, block);
        return {
          block: cloneSerializable(block),
          x: position.x,
          y: position.y,
          size: gameState.arena.blockSize
        };
      });

    if (removedBlocks.length === 0) {
      return { clearedRows: [], removedBlocks: [] };
    }

    gameState.blocks = gameState.blocks.filter((block) => !clearedRowSet.has(block.row));
    for (const removed of removedBlocks) {
      addParticle(removed.x + removed.size / 2, removed.y + removed.size / 2, "clear");
      addBlockBreakParticles(removed.x, removed.y, removed.size, removed.block);
    }
    audioBus.emit("clearRows", {
      rows: clearedRows,
      count: removedBlocks.length
    });

    return { clearedRows, removedBlocks };
  }

  function clearBlocksInArea(centerRow, centerColumn, radius = 1) {
    if (gameState.state !== "aiming") {
      return { removedBlocks: [] };
    }

    const row = Math.floor(Number(centerRow));
    const column = Math.floor(Number(centerColumn));
    const normalizedRadius = Math.max(0, Math.floor(Number(radius) || 0));
    if (!Number.isFinite(row) || !Number.isFinite(column)) {
      return { removedBlocks: [] };
    }

    const removedBlocks = gameState.blocks
      .filter((block) =>
        Math.abs(block.row - row) <= normalizedRadius &&
        Math.abs(block.column - column) <= normalizedRadius
      )
      .map((block) => {
        const position = getEntityPosition(gameState.arena, config, block);
        return {
          block: cloneSerializable(block),
          x: position.x,
          y: position.y,
          size: gameState.arena.blockSize
        };
      });

    if (removedBlocks.length === 0) {
      return { removedBlocks: [] };
    }

    const removedIds = new Set(removedBlocks.map((removed) => removed.block.id));
    gameState.blocks = gameState.blocks.filter((block) => !removedIds.has(block.id));
    for (const removed of removedBlocks) {
      addParticle(removed.x + removed.size / 2, removed.y + removed.size / 2, "clear");
      addBlockBreakParticles(removed.x, removed.y, removed.size, removed.block);
    }
    audioBus.emit("bomb", {
      row,
      column,
      count: removedBlocks.length
    });

    return { removedBlocks };
  }

  function activateFreeze() {
    if (gameState.state !== "aiming" || gameState.freezeActive) {
      return false;
    }

    gameState.freezeActive = true;
    return true;
  }

  function activateRage() {
    if (
      gameState.state !== "aiming" ||
      gameState.rageArmed ||
      gameState.rageVolleyActive
    ) {
      return false;
    }

    gameState.rageArmed = true;
    gameState.rageActivationEffect = {
      life: 0.8,
      duration: 0.8
    };
    return true;
  }

  function updateBall(ball, deltaTime) {
    if (!ball.active || ball.returned) {
      return;
    }

    // Fast balls are simulated in substeps so they cannot tunnel through the hidden collision gutters.
    const travelDistance = Math.hypot(ball.vx * deltaTime, ball.vy * deltaTime);
    const substeps = Math.max(1, Math.ceil(travelDistance / Math.max(4, config.ballRadius * 0.75)));
    const stepTime = deltaTime / substeps;

    for (let step = 0; step < substeps; step += 1) {
      ball.x += ball.vx * stepTime;
      ball.y += ball.vy * stepTime;
      reflectBall(ball, gameState.arena, config);

      let collided = false;
      const liveBlockCells = new Set(
        gameState.blocks
          .filter((block) => block.hp > 0)
          .map((block) => entityCellKey(block.row, block.column))
      );
      for (let index = 0; index < gameState.blocks.length; index += 1) {
        const block = gameState.blocks[index];
        if (block.hp <= 0) {
          continue;
        }

        const position = getEntityPosition(gameState.arena, config, block);
        const hit = resolveBallBlockCollision(
          ball,
          { x: position.x, y: position.y, size: gameState.arena.blockSize },
          config,
          {
            left: liveBlockCells.has(entityCellKey(block.row, block.column - 1)),
            right: liveBlockCells.has(entityCellKey(block.row, block.column + 1)),
            top: liveBlockCells.has(entityCellKey(block.row - 1, block.column)),
            bottom: liveBlockCells.has(entityCellKey(block.row + 1, block.column))
          }
        );

        if (hit) {
          damageBlock(block, position);
          if (block.hp <= 0) {
            removeBlock(block.id);
          }
          collided = true;
          break;
        }
      }

      for (const pickup of gameState.pickups) {
        if (pickup.collected) {
          continue;
        }

        const position = getEntityPosition(gameState.arena, config, pickup);
        const centerX = position.x + gameState.arena.blockSize / 2;
        const centerY = position.y + gameState.arena.blockSize / 2;
        if (Math.hypot(ball.x - centerX, ball.y - centerY) <= config.ballRadius + config.pickupRadius) {
          collectPickup(pickup, ball, centerX, centerY);
        }
      }

      for (const coin of gameState.coinsOnBoard) {
        if (coin.collected) {
          continue;
        }

        const position = getEntityPosition(gameState.arena, config, coin);
        const centerX = position.x + gameState.arena.blockSize / 2;
        const centerY = position.y + gameState.arena.blockSize / 2;
        if (Math.hypot(ball.x - centerX, ball.y - centerY) <= config.ballRadius + config.coinRadius) {
          collectCoin(coin, ball, centerX, centerY);
        }
      }

      if (ball.y >= config.settleThreshold) {
        ball.y = gameState.arena.launcherY;
        ball.active = false;
        ball.returned = true;
        ball.vx = 0;
        ball.vy = 0;
        gameState.returnedBalls += 1;

        if (gameState.firstReturnX === null) {
          gameState.firstReturnX = Math.max(config.ballRadius, Math.min(gameState.arena.width - config.ballRadius, ball.x));
        }

        ball.x = gameState.firstReturnX;
        break;
      }

      if (collided) {
        continue;
      }
    }
  }

  function finishRoundIfNeeded() {
    if (gameState.state === "gameover") {
      return;
    }

    if (gameState.returnedBalls < gameState.balls.length) {
      return;
    }

    const collected = gameState.pickups.filter((pickup) => pickup.collected).length;
    gameState.pickups = gameState.pickups.filter((pickup) => !pickup.collected);
    gameState.coinsOnBoard = gameState.coinsOnBoard.filter((coin) => !coin.collected);
    gameState.ballsOwned += collected;
    gameState.rageVolleyActive = false;
    gameState.round += 1;
    gameState.launcherTargetX = gameState.firstReturnX ?? gameState.launcherX;
    syncLauncher();
    if (gameState.freezeActive) {
      gameState.freezeActive = false;
      gameState.bannerTimer = config.effects.roundBannerTime;
      gameState.score = Math.max(gameState.score, gameState.round - 1);
      resetRoundEntities();
    } else {
      spawnRound();
    }
    if (!gameState.gameOver) {
      gameState.state = "aiming";
    }
  }

  function update(deltaTime) {
    const cappedDelta = Math.min(0.02, deltaTime);
    syncLauncher();
    tickParticles(cappedDelta);

    for (const block of gameState.blocks) {
      if (block.hitFlash) {
        block.hitFlash = Math.max(0, block.hitFlash - cappedDelta);
      }
    }

    if (gameState.bannerTimer > 0) {
      gameState.bannerTimer = Math.max(0, gameState.bannerTimer - cappedDelta);
    }

    if (gameState.heartConsumeEffect) {
      gameState.heartConsumeEffect.life = Math.max(0, gameState.heartConsumeEffect.life - cappedDelta);
      if (gameState.heartConsumeEffect.life <= 0) {
        gameState.heartConsumeEffect = null;
      }
    }

    if (gameState.rageActivationEffect) {
      gameState.rageActivationEffect.life = Math.max(
        0,
        gameState.rageActivationEffect.life - cappedDelta
      );
      if (gameState.rageActivationEffect.life <= 0) {
        gameState.rageActivationEffect = null;
      }
    }

    if (gameState.state === "launching" || gameState.state === "resolving") {
      gameState.volleyElapsed += cappedDelta;
      if (!gameState.speedUpAvailable && gameState.volleyElapsed >= gameState.nextSpeedUpAt) {
        gameState.speedUpAvailable = true;
      }
    }

    if (gameState.state === "launching") {
      gameState.launchCooldown -= cappedDelta * gameState.speedMultiplier;
      if (gameState.launchCooldown <= 0 && gameState.ballsLaunched < gameState.balls.length) {
        emitBall();
        gameState.launchCooldown = config.launchInterval;
      }

      if (gameState.ballsLaunched >= gameState.balls.length) {
        gameState.state = "resolving";
      }
    }

    if (gameState.state === "resolving" || gameState.state === "launching") {
      for (const ball of gameState.balls) {
        updateBall(ball, cappedDelta);
      }
      finishRoundIfNeeded();
    }
  }

  function getState() {
    return gameState;
  }

  function activateSpeedUp() {
    if (!gameState.speedUpAvailable) {
      return false;
    }

    // Existing balls need an immediate velocity bump, while later emissions read the accumulated multiplier.
    gameState.speedMultiplier *= config.speedUpMultiplier;
    gameState.speedUpAvailable = false;
    gameState.nextSpeedUpAt = gameState.volleyElapsed + config.speedUpDelay;
    gameState.speedUpUsed = true;

    for (const ball of gameState.balls) {
      if (!ball.active || ball.returned) {
        continue;
      }

      ball.vx *= config.speedUpMultiplier;
      ball.vy *= config.speedUpMultiplier;
    }

    return true;
  }

  function spendCoins(amount) {
    const normalizedAmount = Math.max(0, Math.floor(amount));
    if (gameState.coins < normalizedAmount) {
      return false;
    }

    gameState.coins -= normalizedAmount;
    return true;
  }

  function grantRewards({ coins = 0, hearts = 0 } = {}) {
    gameState.coins += Math.max(0, Math.floor(coins));
    gameState.heartCount += Math.max(0, Math.floor(hearts));
  }

  function setSkins(skins) {
    gameState.skins = normalizeSkins(skins, config);
  }

  spawnRound();

  return {
    activateSpeedUp,
    activateFreeze,
    activateRage,
    clearLowestBlockRows,
    clearBlocksInArea,
    consumeHeartContinue,
    continueFromGameOver,
    exportSnapshot,
    importSnapshot,
    grantRewards,
    restart,
    setEffectsEnabled,
    setSkins,
    spendCoins,
    startAim,
    updateAim,
    releaseAim,
    update,
    areEffectsEnabled,
    getState,
    getEntityPosition: (entity) => getEntityPosition(gameState.arena, config, entity)
  };
}
