import assert from "node:assert/strict";

import { createBoardGenerator } from "../src/board.js";
import { GAME_CONFIG } from "../src/config.js";
import { createGameController } from "../src/gameState.js";
import { clampLaunchDirection, reflectBall, resolveBallBlockCollision } from "../src/physics.js";
import { createStorageAdapter } from "../src/storage.js";

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function createMemoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

function createRoundSequence(rounds) {
  let index = 0;
  return {
    generateRound() {
      return rounds[index++] ?? { blocks: [], pickups: [] };
    }
  };
}

function createSilentAudioBus() {
  return {
    emit() {}
  };
}

function createRecordingAudioBus() {
  const events = [];
  return {
    events,
    emit(type, payload = {}) {
      events.push({ type, payload });
    }
  };
}

test("clampLaunchDirection prevents near-horizontal down shots", () => {
  const direction = clampLaunchDirection({ x: 1, y: 0.01 });
  assert.ok(direction.y < 0);
  assert.ok(direction.x > 0);
});

test("reflectBall bounces off arena walls and ceiling", () => {
  const ball = { x: 6, y: 6, vx: -120, vy: -240 };
  reflectBall(ball, { width: 720, height: 960 });
  assert.equal(ball.vx, 120);
  assert.equal(ball.vy, 240);
});

test("resolveBallBlockCollision flips velocity when a block is hit", () => {
  const ball = { x: 120, y: 120, vx: 140, vy: 0 };
  const hit = resolveBallBlockCollision(ball, { x: 124, y: 92, size: 80 });
  assert.equal(hit, true);
  assert.equal(ball.vx, -140);
});

test("resolveBallBlockCollision treats the visual gutter as solid space", () => {
  const customConfig = {
    ...GAME_CONFIG,
    collisionPadding: 5,
    ballRadius: 6
  };
  const ball = { x: 82, y: 40, vx: 90, vy: 0 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig);
  assert.equal(hit, true);
  assert.equal(ball.vx, -90);
});

test("board generator creates bounded early-round spawns", () => {
  const generator = createBoardGenerator(GAME_CONFIG, 1234);
  const generated = generator.generateRound(1, []);

  assert.ok(generated.blocks.length >= 1);
  assert.ok(generated.blocks.length <= 2);
  assert.ok(generated.blocks.every((block) => block.hp >= 1));
  assert.equal(generated.pickups.length, 1);
  assert.equal(generated.blocks.some((block) => block.column === generated.pickups[0].column), false);
});

test("board generator scales brick count by current round and keeps hp gentle", () => {
  const generator = createBoardGenerator(GAME_CONFIG, 4321);
  const generated = generator.generateRound(3, []);

  assert.ok(generated.blocks.length >= 3);
  assert.ok(generated.blocks.length <= 6);
  assert.ok(generated.blocks.every((block) => block.hp >= 3 && block.hp <= 4));
  assert.equal(generated.pickups.length, 1);
});

test("board generator avoids spawning into occupied top-row columns", () => {
  const generator = createBoardGenerator(GAME_CONFIG, 999);
  const generated = generator.generateRound(3, [{ row: 0, column: 2 }]);
  assert.equal(generated.blocks.some((block) => block.column === 2), false);
});

test("board generator can spawn a coin without overlapping blocks or pickups", () => {
  const generator = createBoardGenerator({
    ...GAME_CONFIG,
    spawn: {
      ...GAME_CONFIG.spawn,
      coinChance: 1
    }
  }, 1234);
  const generated = generator.generateRound(1, []);

  assert.equal(generated.coins.length, 1);
  assert.equal(generated.pickups.length, 1);
  assert.equal(generated.coins[0].column === generated.pickups[0].column, false);
  assert.equal(generated.blocks.some((block) => block.column === generated.coins[0].column), false);
});

test("storage adapter falls back safely on corrupt settings", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": "{bad"
  });
  const adapter = createStorageAdapter(storage);
  assert.deepEqual(adapter.loadSettings(), { soundEnabled: true, language: "zh-CN" });
});

test("storage adapter persists and loads best score", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveBestScore(12);
  assert.equal(adapter.loadBestScore(), 12);
});

test("storage adapter persists and loads coins", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveCoins(7);
  assert.equal(adapter.loadCoins(), 7);
});

test("storage adapter persists and loads skin ownership", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  const skins = {
    owned: {
      brick: ["brick-sun"],
      ball: ["ball-ice"]
    },
    selected: {
      brick: "brick-sun",
      ball: "ball-ice"
    }
  };

  adapter.saveSkins(skins);
  assert.deepEqual(adapter.loadSkins(), skins);
});

test("round resolves after all balls return and applies collected pickups", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [{ id: "p1", row: 0, column: 0, collected: false }] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 400 });
  game.updateAim({ x: 220, y: 920 });
  game.releaseAim({ x: 220, y: 920 });

  for (let index = 0; index < 500; index += 1) {
    game.update(0.016);
  }

  const state = game.getState();
  assert.equal(state.round, 2);
  assert.ok(state.ballsOwned >= 1);
  assert.equal(state.state, "aiming");
});

test("coins are collected on contact and emit a coin event", () => {
  const audioBus = createRecordingAudioBus();
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [], coins: [{ id: "c1", row: 0, column: 3, collected: false }] },
      { blocks: [], pickups: [], coins: [] }
    ]),
    audioBus
  });

  const coin = game.getState().coinsOnBoard[0];
  const position = game.getEntityPosition(coin);
  const ball = game.getState().balls[0];
  ball.active = true;
  ball.returned = false;
  ball.x = position.x + game.getState().arena.blockSize / 2;
  ball.y = position.y + game.getState().arena.blockSize / 2;
  ball.vx = 0;
  ball.vy = 0;
  game.getState().state = "resolving";

  game.update(0.016);

  assert.equal(game.getState().coins, 1);
  assert.equal(game.getState().coinsOnBoard[0].collected, true);
  assert.equal(audioBus.events.some((event) => event.type === "coin"), true);
});

test("continueFromGameOver returns the game to aiming and removes fail-line blocks", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  const state = game.getState();
  state.round = 6;
  state.score = 5;
  state.ballsOwned = 3;
  state.state = "gameover";
  state.gameOver = true;
  state.blocks = [
    { id: "safe", row: 2, column: 0, hp: 2 },
    { id: "failed", row: 7, column: 1, hp: 4 }
  ];

  assert.equal(game.continueFromGameOver(), true);

  const continued = game.getState();
  assert.equal(continued.state, "aiming");
  assert.equal(continued.gameOver, false);
  assert.deepEqual(continued.blocks.map((block) => block.id), ["safe"]);
  assert.equal(continued.round, 6);
  assert.equal(continued.score, 5);
  assert.equal(continued.balls.length, 3);
  assert.equal(continued.ballsLaunched, 0);
  assert.equal(continued.returnedBalls, 0);
});

test("continueFromGameOver is ignored before gameover", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  const before = game.exportSnapshot();

  assert.equal(game.continueFromGameOver(), false);
  assert.deepEqual(game.exportSnapshot(), before);
});

test("releaseAim fires opposite to the drag direction", () => {
  const customConfig = {
    ...GAME_CONFIG,
    ballSpeed: 100,
    launchInterval: 0.01,
    settleThreshold: 5000,
    height: 5200
  };
  const game = createGameController({
    config: customConfig,
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: 300, y: 960 });
  game.releaseAim({ x: 300, y: 960 });

  const state = game.getState();
  assert.ok(state.launchDirection.x > 0);
  assert.ok(state.launchDirection.y < 0);
});

test("dragging downward hides the guide and cancels the shot", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 500 });
  game.updateAim({ x: 360, y: 360 });
  assert.equal(game.getState().aimPoint, null);

  game.releaseAim({ x: 360, y: 360 });
  const state = game.getState();
  assert.equal(state.state, "aiming");
  assert.equal(state.launchDirection, null);
});

test("aiming below the minimum launch angle hides the guide and cancels the shot", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: 260, y: 810 });
  assert.equal(game.getState().aimPoint, null);

  game.releaseAim({ x: 260, y: 810 });
  const state = game.getState();
  assert.equal(state.state, "aiming");
  assert.equal(state.launchDirection, null);
});

test("aim guide length is capped by the space above the launcher", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: -1000, y: 3000 });

  const state = game.getState();
  const guideLength = Math.hypot(state.aimPoint.x - state.launcherX, state.aimPoint.y - state.arena.launcherY);
  assert.ok(guideLength <= state.arena.launcherY - GAME_CONFIG.topPadding + 0.001);
});

test("destroyed bricks are removed before the volley ends", () => {
  const customConfig = {
    ...GAME_CONFIG,
    width: 160,
    height: 1200,
    columns: 1,
    topPadding: 0,
    bottomPadding: 80,
    sidePadding: 0,
    blockGap: 0,
    ballSpeed: 1000,
    settleThreshold: 1180
  };
  const game = createGameController({
    config: customConfig,
    boardGenerator: createRoundSequence([
      { blocks: [{ id: "b1", row: 0, column: 0, hp: 1 }], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 80, y: 120 });
  game.updateAim({ x: 80, y: 1100 });
  game.releaseAim({ x: 80, y: 1100 });

  for (let index = 0; index < 70; index += 1) {
    game.update(0.016);
  }

  const state = game.getState();
  assert.equal(state.blocks.some((block) => block.id === "b1"), false);
  assert.equal(state.returnedBalls, 0);
});

test("speed up becomes available again after its cooldown", () => {
  const customConfig = {
    ...GAME_CONFIG,
    speedUpDelay: 0.1,
    ballSpeed: 100,
    settleThreshold: 5000,
    height: 4200
  };
  const game = createGameController({
    config: customConfig,
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 500 });
  game.updateAim({ x: 200, y: 3900 });
  game.releaseAim({ x: 200, y: 3900 });

  for (let index = 0; index < 12; index += 1) {
    game.update(0.016);
  }

  const beforeSpeedUp = game.getState().balls[0].vx;
  assert.equal(game.getState().speedUpAvailable, true);
  assert.equal(game.activateSpeedUp(), true);
  assert.equal(game.getState().speedUpUsed, true);
  assert.equal(game.getState().balls[0].vx, beforeSpeedUp * customConfig.speedUpMultiplier);
  assert.equal(game.getState().speedUpAvailable, false);
  assert.equal(game.activateSpeedUp(), false);

  for (let index = 0; index < 7; index += 1) {
    game.update(0.016);
  }

  assert.equal(game.getState().speedUpAvailable, true);

  const beforeSecondSpeedUp = game.getState().balls[0].vx;
  assert.equal(game.activateSpeedUp(), true);
  assert.equal(game.getState().balls[0].vx, beforeSecondSpeedUp * customConfig.speedUpMultiplier);
  assert.equal(game.getState().speedMultiplier, customConfig.speedUpMultiplier * customConfig.speedUpMultiplier);
});

test("speed up increases queued ball launch frequency", () => {
  const customConfig = {
    ...GAME_CONFIG,
    speedUpDelay: 0,
    launchInterval: 0.12,
    ballSpeed: 100,
    settleThreshold: 5000,
    height: 4200
  };
  const game = createGameController({
    config: customConfig,
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  const state = game.getState();
  const baseBall = state.balls[0];
  state.ballsOwned = 3;
  state.balls = Array.from({ length: state.ballsOwned }, () => ({
    ...baseBall,
    active: false,
    returned: false,
    x: state.launcherX,
    y: state.arena.launcherY,
    vx: 0,
    vy: 0
  }));

  game.startAim({ x: 360, y: 500 });
  game.updateAim({ x: 200, y: 3900 });
  game.releaseAim({ x: 200, y: 3900 });
  game.update(0.016);

  assert.equal(game.getState().ballsLaunched, 1);
  assert.equal(game.getState().speedUpAvailable, true);
  assert.equal(game.activateSpeedUp(), true);

  for (let index = 0; index < 3; index += 1) {
    game.update(0.016);
  }

  assert.equal(game.getState().ballsLaunched, 1);
  game.update(0.016);
  assert.equal(game.getState().ballsLaunched, 2);
});

test("pickups disappear when they reach the dotted bottom line", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  const state = game.getState();
  state.pickups = [{ id: "late", row: 8, column: 0, collected: false }];
  state.returnedBalls = state.ballsOwned;
  state.state = "resolving";

  game.update(0.016);

  assert.equal(game.getState().pickups.length, 0);
});

let failed = 0;

for (const { name, run } of tests) {
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error.stack);
  }
}

if (failed > 0) {
  process.exitCode = 1;
} else {
  console.log(`All ${tests.length} tests passed.`);
}
