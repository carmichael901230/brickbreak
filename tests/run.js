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

  assert.ok(generated.blocks.length >= GAME_CONFIG.spawn.minBlocks);
  assert.ok(generated.blocks.length <= GAME_CONFIG.spawn.maxBlocks);
  assert.ok(generated.blocks.every((block) => block.hp >= 1));
});

test("board generator avoids spawning into occupied top-row columns", () => {
  const generator = createBoardGenerator(GAME_CONFIG, 999);
  const generated = generator.generateRound(3, [{ row: 0, column: 2 }]);
  assert.equal(generated.blocks.some((block) => block.column === 2), false);
});

test("storage adapter falls back safely on corrupt settings", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": "{bad"
  });
  const adapter = createStorageAdapter(storage);
  assert.deepEqual(adapter.loadSettings(), { soundEnabled: false });
});

test("storage adapter persists and loads best score", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveBestScore(12);
  assert.equal(adapter.loadBestScore(), 12);
});

test("round resolves after all balls return and applies collected pickups", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [{ id: "p1", row: 0, column: 0, collected: false }] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: 500, y: 300 });
  game.releaseAim({ x: 500, y: 300 });

  for (let index = 0; index < 500; index += 1) {
    game.update(0.016);
  }

  const state = game.getState();
  assert.equal(state.round, 2);
  assert.ok(state.ballsOwned >= 1);
  assert.equal(state.state, "aiming");
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

  game.startAim({ x: 80, y: 1100 });
  game.updateAim({ x: 80, y: 120 });
  game.releaseAim({ x: 80, y: 120 });

  for (let index = 0; index < 70; index += 1) {
    game.update(0.016);
  }

  const state = game.getState();
  assert.equal(state.blocks.some((block) => block.id === "b1"), false);
  assert.equal(state.returnedBalls, 0);
});

test("speed up becomes available after the configured delay and doubles velocity", () => {
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

  game.startAim({ x: 360, y: 3900 });
  game.updateAim({ x: 520, y: 300 });
  game.releaseAim({ x: 520, y: 300 });

  for (let index = 0; index < 12; index += 1) {
    game.update(0.016);
  }

  const beforeSpeedUp = game.getState().balls[0].vx;
  assert.equal(game.getState().speedUpAvailable, true);
  assert.equal(game.activateSpeedUp(), true);
  assert.equal(game.getState().speedUpUsed, true);
  assert.equal(game.getState().balls[0].vx, beforeSpeedUp * customConfig.speedUpMultiplier);
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
