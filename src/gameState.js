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

export function createInitialGameState(config = GAME_CONFIG) {
  const arena = buildArena(config);

  return {
    config,
    arena,
    round: 1,
    score: 0,
    bestScore: 0,
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
    balls: [createBall(config.width / 2, arena.launcherY)],
    particles: [],
    bannerTimer: config.effects.roundBannerTime,
    firstReturnX: null,
    gameOver: false
  };
}

export function createGameController({
  config = GAME_CONFIG,
  boardGenerator,
  audioBus
}) {
  let gameState = createInitialGameState(config);

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
    gameState.pickups = gameState.pickups.filter((pickup) => {
      const position = getEntityPosition(gameState.arena, config, pickup);
      return position.y + gameState.arena.blockSize < gameState.arena.failLineY;
    });

    gameState.blocks.push(...generated.blocks);
    gameState.pickups.push(...generated.pickups);
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
    gameState = createInitialGameState(config);
    spawnRound();
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

  spawnRound();

  return {
    activateSpeedUp,
    restart,
    startAim,
    updateAim,
    releaseAim,
    update,
    getState,
    getEntityPosition: (entity) => getEntityPosition(gameState.arena, config, entity)
  };
}
