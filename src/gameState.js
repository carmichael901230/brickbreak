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

function normalizeSkins(skins) {
  return {
    owned: {
      brick: Array.isArray(skins?.owned?.brick) ? skins.owned.brick.filter((id) => typeof id === "string") : [],
      ball: Array.isArray(skins?.owned?.ball) ? skins.owned.ball.filter((id) => typeof id === "string") : []
    },
    selected: {
      brick: typeof skins?.selected?.brick === "string" ? skins.selected.brick : null,
      ball: typeof skins?.selected?.ball === "string" ? skins.selected.ball : null
    }
  };
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

export function createInitialGameState(config = GAME_CONFIG, coins = 0, skins = null) {
  const arena = buildArena(config);

  return {
    config,
    arena,
    round: 1,
    score: 0,
    bestScore: 0,
    coins: Math.max(0, Math.floor(coins)),
    skins: normalizeSkins(skins),
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
    speedUpAvailable: false,
    speedUpUsed: false,
    state: "aiming",
    blocks: [],
    pickups: [],
    coinsOnBoard: [],
    balls: [createBall(config.width / 2, arena.launcherY)],
    particles: [],
    bannerTimer: config.effects.roundBannerTime,
    firstReturnX: null,
    gameOver: false
  };
}

export function createGameController({
  config = GAME_CONFIG,
  initialCoins = 0,
  initialSkins = null,
  boardGenerator,
  audioBus
}) {
  let gameState = createInitialGameState(config, initialCoins, initialSkins);

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
    const canFire = launchVector.y < -18;

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

    if (gameState.blocks.some((block) => {
      const position = getEntityPosition(gameState.arena, config, block);
      return position.y + gameState.arena.blockSize >= gameState.arena.failLineY;
    })) {
      gameState.state = "gameover";
      gameState.gameOver = true;
      audioBus.emit("gameOver", { score: gameState.score });
      return;
    }

    resetRoundEntities();
  }

  function restart() {
    gameState = createInitialGameState(config, gameState.coins, gameState.skins);
    spawnRound();
  }

  function exportSnapshot() {
    if (gameState.state === "gameover") {
      return null;
    }

    return cloneSerializable({
      round: gameState.round,
      score: gameState.score,
      bestScore: gameState.bestScore,
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
      speedUpAvailable: gameState.speedUpAvailable,
      speedUpUsed: gameState.speedUpUsed,
      state: gameState.state,
      blocks: gameState.blocks,
      pickups: gameState.pickups,
      coinsOnBoard: gameState.coinsOnBoard,
      balls: gameState.balls,
      particles: gameState.particles,
      bannerTimer: gameState.bannerTimer,
      firstReturnX: gameState.firstReturnX
    });
  }

  function importSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    const nextState = createInitialGameState(config, gameState.coins, gameState.skins);
    const allowedStates = new Set(["aiming", "launching", "resolving"]);
    if (!allowedStates.has(snapshot.state)) {
      return false;
    }

    nextState.round = Math.max(1, Math.floor(restoreNumber(snapshot.round, nextState.round)));
    nextState.score = Math.max(0, Math.floor(restoreNumber(snapshot.score, nextState.score)));
    nextState.bestScore = Math.max(0, Math.floor(restoreNumber(snapshot.bestScore, nextState.bestScore)));
    nextState.skins = normalizeSkins(snapshot.skins ?? nextState.skins);
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
    nextState.speedUpAvailable = restoreBoolean(snapshot.speedUpAvailable, nextState.speedUpAvailable);
    nextState.speedUpUsed = restoreBoolean(snapshot.speedUpUsed, nextState.speedUpUsed);
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

    nextState.ballsOwned = Math.max(nextState.ballsOwned, nextState.balls.length);
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
    if (gameState.state !== "aiming") {
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
    if (!gameState.aiming || gameState.state !== "aiming") {
      return;
    }

    const preview = resolveAimPreview(point);
    gameState.aimPoint = preview.aimPoint;
  }

  function releaseAim(point) {
    if (!gameState.aiming || gameState.state !== "aiming") {
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
    gameState.state = "launching";
    gameState.launchCooldown = 0;
    gameState.volleyElapsed = 0;
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

  function tickParticles(deltaTime) {
    for (const particle of gameState.particles) {
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.vy += 180 * deltaTime;
      particle.life -= deltaTime;
    }

    gameState.particles = gameState.particles.filter((particle) => particle.life > 0);
  }

  function collectPickup(pickup, ball) {
    pickup.collected = true;
    addParticle(ball.x, ball.y, "pickup");
    audioBus.emit("pickup");
  }

  function collectCoin(coin, ball) {
    coin.collected = true;
    gameState.coins += 1;
    addParticle(ball.x, ball.y, "coin");
    audioBus.emit("coin", { coins: gameState.coins });
  }

  function damageBlock(block, position) {
    block.hp -= 1;
    block.hitFlash = config.effects.hitFlashTime;
    addParticle(position.x + gameState.arena.blockSize / 2, position.y + gameState.arena.blockSize / 2, "hit");
    audioBus.emit("hit");

    if (block.hp <= 0) {
      addParticle(position.x + gameState.arena.blockSize / 2, position.y + gameState.arena.blockSize / 2, "clear");
      audioBus.emit("clear");
    }
  }

  function removeBlock(blockId) {
    gameState.blocks = gameState.blocks.filter((block) => block.id !== blockId);
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
      for (let index = 0; index < gameState.blocks.length; index += 1) {
        const block = gameState.blocks[index];
        if (block.hp <= 0) {
          continue;
        }

        const position = getEntityPosition(gameState.arena, config, block);
        const hit = resolveBallBlockCollision(
          ball,
          { x: position.x, y: position.y, size: gameState.arena.blockSize },
          config
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
          collectPickup(pickup, ball);
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
          collectCoin(coin, ball);
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

    if (gameState.returnedBalls < gameState.ballsOwned) {
      return;
    }

    const collected = gameState.pickups.filter((pickup) => pickup.collected).length;
    gameState.pickups = gameState.pickups.filter((pickup) => !pickup.collected);
    gameState.coinsOnBoard = gameState.coinsOnBoard.filter((coin) => !coin.collected);
    gameState.ballsOwned += collected;
    gameState.round += 1;
    gameState.launcherTargetX = gameState.firstReturnX ?? gameState.launcherX;
    syncLauncher();
    spawnRound();
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

    if (gameState.state === "launching" || gameState.state === "resolving") {
      gameState.volleyElapsed += cappedDelta;
      if (
        !gameState.speedUpAvailable &&
        !gameState.speedUpUsed &&
        gameState.volleyElapsed >= config.speedUpDelay
      ) {
        gameState.speedUpAvailable = true;
      }
    }

    if (gameState.state === "launching") {
      gameState.launchCooldown -= cappedDelta;
      if (gameState.launchCooldown <= 0 && gameState.ballsLaunched < gameState.ballsOwned) {
        emitBall();
        gameState.launchCooldown = config.launchInterval;
      }

      if (gameState.ballsLaunched >= gameState.ballsOwned) {
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
    if (!gameState.speedUpAvailable || gameState.speedUpUsed) {
      return false;
    }

    // Existing balls need an immediate velocity bump, while later emissions read the new multiplier.
    gameState.speedMultiplier = config.speedUpMultiplier;
    gameState.speedUpAvailable = false;
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

  function setSkins(skins) {
    gameState.skins = normalizeSkins(skins);
  }

  spawnRound();

  return {
    activateSpeedUp,
    exportSnapshot,
    importSnapshot,
    restart,
    setSkins,
    spendCoins,
    startAim,
    updateAim,
    releaseAim,
    update,
    getState,
    getEntityPosition: (entity) => getEntityPosition(gameState.arena, config, entity)
  };
}
