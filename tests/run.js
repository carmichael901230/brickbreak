import assert from "node:assert/strict";

import { createBoardGenerator } from "../src/board.js";
import { resolveDailyCheckIn } from "../src/checkIn.js";
import { GAME_CONFIG } from "../src/config.js";
import { createGameController } from "../src/gameState.js";
import { createLeaderboard, maskWeChatName } from "../src/leaderboard.js";
import { clampLaunchDirection, reflectBall, resolveBallBlockCollision } from "../src/physics.js";
import { createStorageAdapter } from "../src/storage.js";
import { createAudioBus as createRealAudioBus } from "../src/audio.js";

const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function assertClose(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
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

test("audio bus dispatches gameplay events while sound is disabled", () => {
  const audioBus = createRealAudioBus();
  const events = [];
  audioBus.setEnabled(false);
  audioBus.onEvent((event) => events.push(event));

  audioBus.emit("coin", { coins: 3 });

  assert.deepEqual(events, [{ type: "coin", payload: { coins: 3 } }]);
  assert.equal(audioBus.isEnabled(), false);
});

test("reflectBall bounces off arena walls and ceiling", () => {
  const ball = { x: 6, y: 6, vx: -120, vy: -240 };
  const hit = reflectBall(ball, { width: 720, height: 960 });
  assert.equal(ball.vx, 120);
  assert.equal(ball.vy, 240);
  assert.deepEqual(hit, { left: true, right: false, ceiling: true, any: true });
});

test("resolveBallBlockCollision flips velocity when a block is hit", () => {
  const ball = { x: 120, y: 120, vx: 140, vy: 0 };
  const hit = resolveBallBlockCollision(ball, { x: 124, y: 92, size: 80 });
  assert.equal(hit, true);
  assert.equal(ball.vx, -140);
});

test("resolveBallBlockCollision waits for visual contact on standalone sides", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const block = { x: 0, y: 0, size: 80 };
  const nearGapBall = { x: 83, y: 40, vx: -90, vy: 0 };
  const touchingBall = { x: 82, y: 40, vx: -90, vy: 0 };

  assert.equal(resolveBallBlockCollision(nearGapBall, block, customConfig), false);
  assert.equal(resolveBallBlockCollision(touchingBall, block, customConfig), true);
  assert.equal(touchingBall.vx, 90);
  assertClose(touchingBall.x, 82.01);
});

test("resolveBallBlockCollision closes horizontal gutters between side-by-side blocks", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const ball = { x: 80, y: -2, vx: 0, vy: 90 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig, { right: true });

  assert.equal(hit, true);
  assert.equal(ball.vx, 0);
  assert.equal(ball.vy, -90);
  assertClose(ball.y, -2.01);
});

test("resolveBallBlockCollision closes vertical gutters between stacked blocks", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const ball = { x: -2, y: 80, vx: 90, vy: 0 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig, { bottom: true });

  assert.equal(hit, true);
  assert.equal(ball.vx, -90);
  assert.equal(ball.vy, 0);
  assertClose(ball.x, -2.01);
});

test("resolveBallBlockCollision reflects corner hits along the corner normal", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const offset = customConfig.ballRadius / Math.SQRT2;
  const ball = { x: 4 - offset, y: 4 - offset, vx: 100, vy: 100 };
  const beforeSpeed = Math.hypot(ball.vx, ball.vy);
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig);

  assert.equal(hit, true);
  assertClose(ball.vx, -100);
  assertClose(ball.vy, -100);
  assertClose(Math.hypot(ball.vx, ball.vy), beforeSpeed);
  assertClose(Math.hypot(ball.x - 4, ball.y - 4), customConfig.ballRadius + 0.01);
});

test("resolveBallBlockCollision keeps near-corner side hits on the side normal", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const ball = { x: 40, y: -2, vx: 35, vy: 90 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig);

  assert.equal(hit, true);
  assert.equal(ball.vx, 35);
  assert.equal(ball.vy, -90);
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

test("board generator adds hp difficulty every 50 rounds", () => {
  const config = {
    ...GAME_CONFIG,
    spawn: {
      ...GAME_CONFIG.spawn,
      coinChance: 0
    }
  };

  assert.ok(createBoardGenerator(config, () => 0).generateRound(49, []).blocks.every((block) => block.hp === 49));
  assert.ok(createBoardGenerator(config, () => 0).generateRound(50, []).blocks.every((block) => block.hp === 53));
  assert.ok(createBoardGenerator(config, () => 0).generateRound(100, []).blocks.every((block) => block.hp === 110));
});

test("board generator avoids spawning into occupied top-row columns", () => {
  const generator = createBoardGenerator(GAME_CONFIG, 999);
  const generated = generator.generateRound(3, [{ row: 0, column: 2 }]);
  assert.equal(generated.blocks.some((block) => block.column === 2), false);
});

test("board generator spawns at least one block when a legal column exists", () => {
  const generator = createBoardGenerator({
    ...GAME_CONFIG,
    columns: 3,
    spawn: {
      ...GAME_CONFIG.spawn,
      coinChance: 0
    }
  }, () => 0);
  const generated = generator.generateRound(1, [{ row: 0, column: 1 }]);

  assert.equal(generated.pickups[0].column, 0);
  assert.deepEqual(generated.blocks.map((block) => block.column), [2]);
});

test("board generator returns no blocks when every legal column is occupied", () => {
  const generator = createBoardGenerator({
    ...GAME_CONFIG,
    columns: 3,
    spawn: {
      ...GAME_CONFIG.spawn,
      coinChance: 0
    }
  }, () => 0);
  const generated = generator.generateRound(1, [
    { row: 0, column: 1 },
    { row: 0, column: 2 }
  ]);

  assert.deepEqual(generated.blocks, []);
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

test("board generator does not create heart pickups", () => {
  const generator = createBoardGenerator(GAME_CONFIG, 1234);
  const generated = generator.generateRound(60, []);

  assert.equal("hearts" in generated, false);
});

test("storage adapter falls back safely on corrupt settings", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": "{bad"
  });
  const adapter = createStorageAdapter(storage);
  assert.deepEqual(adapter.loadSettings(), {
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    effectsEnabled: true,
    language: "zh-CN"
  });
});

test("storage adapter preserves omitted settings on partial save", () => {
  const storage = createMemoryStorage({
    "arc-cascade-settings": JSON.stringify({
      soundEnabled: true,
      musicEnabled: false,
      vibrationEnabled: false,
      effectsEnabled: true,
      language: "zh-CN"
    })
  });
  const adapter = createStorageAdapter(storage);
  adapter.saveSettings({ soundEnabled: false });
  assert.deepEqual(adapter.loadSettings(), {
    soundEnabled: false,
    musicEnabled: false,
    vibrationEnabled: false,
    effectsEnabled: true,
    language: "zh-CN"
  });
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

test("storage adapter persists and loads hearts", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  adapter.saveHearts(3);
  assert.equal(adapter.loadHearts(), 3);
});

test("storage adapter persists clear free item usage", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  assert.equal(adapter.loadClearFreeUsed(), false);
  adapter.saveClearFreeUsed(true);
  assert.equal(adapter.loadClearFreeUsed(), true);
});

test("storage adapter persists rage free item usage", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  assert.equal(adapter.loadRageFreeUsed(), false);
  adapter.saveRageFreeUsed(true);
  assert.equal(adapter.loadRageFreeUsed(), true);
});

test("storage adapter persists and loads daily check-in state", () => {
  const storage = createMemoryStorage();
  const adapter = createStorageAdapter(storage);
  const checkIn = {
    lastCheckInDate: "2026-06-17",
    checkInStreak: 4,
    lastRewardDay: 4
  };

  adapter.saveDailyCheckIn(checkIn);
  assert.deepEqual(adapter.loadDailyCheckIn(), checkIn);
});

test("storage adapter falls back safely on corrupt daily check-in state", () => {
  const storage = createMemoryStorage({
    "arc-cascade-daily-check-in": "{bad"
  });
  const adapter = createStorageAdapter(storage);

  assert.deepEqual(adapter.loadDailyCheckIn(), {
    lastCheckInDate: null,
    checkInStreak: 0,
    lastRewardDay: 0
  });
});

test("daily check-in grants day one on first login", () => {
  const result = resolveDailyCheckIn({}, "2026-06-17");

  assert.equal(result.claimed, true);
  assert.equal(result.reward.day, 1);
  assert.deepEqual(result.reward, { day: 1, coins: 10, hearts: 0 });
  assert.equal(result.state.lastCheckInDate, "2026-06-17");
});

test("daily check-in does not grant twice on the same day", () => {
  const result = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-17",
    checkInStreak: 2,
    lastRewardDay: 2
  }, "2026-06-17");

  assert.equal(result.claimed, false);
  assert.equal(result.alreadyClaimed, true);
});

test("daily check-in continues from yesterday", () => {
  const result = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-16",
    checkInStreak: 2,
    lastRewardDay: 2
  }, "2026-06-17");

  assert.equal(result.claimed, true);
  assert.equal(result.chainBroken, false);
  assert.equal(result.reward.day, 3);
  assert.equal(result.reward.hearts, 1);
});

test("daily check-in resets after a missed day", () => {
  const result = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-15",
    checkInStreak: 5,
    lastRewardDay: 5
  }, "2026-06-17");

  assert.equal(result.claimed, true);
  assert.equal(result.chainBroken, true);
  assert.equal(result.reward.day, 1);
});

test("daily check-in grants the day seven big reward", () => {
  const result = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-16",
    checkInStreak: 6,
    lastRewardDay: 6
  }, "2026-06-17");

  assert.equal(result.reward.day, 7);
  assert.equal(result.reward.coins, 100);
  assert.equal(result.reward.hearts, 1);
  assert.equal(result.reward.big, true);
});

test("leaderboard masks fake WeChat names", () => {
  assert.equal(maskWeChatName("Li"), "L*");
  assert.equal(maskWeChatName("Alice"), "A***e");
});

test("leaderboard estimates current user position", () => {
  const lowBoard = createLeaderboard({ currentBestLevel: 1, boardType: "total" });
  const highBoard = createLeaderboard({ currentBestLevel: 1500, boardType: "province" });

  assert.equal(lowBoard.currentUser.isCurrentUser, true);
  assert.equal(lowBoard.currentUser.rankLabel, "999+");
  assert.equal(highBoard.topRows.some((row) => row.isCurrentUser), true);
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

test("progress snapshot omits volatile flight state and restores settled balls", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [{ id: "b1", row: 0, column: 2, hp: 3, maxHp: 3 }], pickups: [], coins: [] }
    ]),
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  state.ballsOwned = 3;
  state.balls = Array.from({ length: 3 }, () => ({ ...state.balls[0] }));
  state.particles = [{ x: 10, y: 20, vx: 1, vy: 2, life: 1, maxLife: 1, tone: "hit" }];

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: 500, y: 300 });
  game.releaseAim({ x: 500, y: 300 });
  game.update(0.016);

  const snapshot = game.exportSnapshot({ includeVolatile: false });
  assert.equal(snapshot.state, "aiming");
  assert.equal(snapshot.ballsOwned, 3);
  assert.equal(snapshot.ballsLaunched, 0);
  assert.equal(snapshot.returnedBalls, 0);
  assert.equal(Object.hasOwn(snapshot, "balls"), false);
  assert.equal(Object.hasOwn(snapshot, "particles"), false);

  const restored = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });

  assert.equal(restored.importSnapshot(snapshot), true);
  assert.equal(restored.getState().state, "aiming");
  assert.equal(restored.getState().ballsOwned, 3);
  assert.equal(restored.getState().balls.length, 3);
  assert.equal(restored.getState().ballsLaunched, 0);
  assert.equal(restored.getState().returnedBalls, 0);
});

test("freeze suppresses exactly one board advance and new row", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      {
        blocks: [{ id: "existing", row: 0, column: 0, hp: 99 }],
        pickups: [{ id: "pickup", row: 0, column: 1, collected: false }],
        coins: [{ id: "coin", row: 0, column: 2, collected: false }]
      },
      {
        blocks: [{ id: "skipped", row: 0, column: 3, hp: 2 }],
        pickups: [],
        coins: []
      },
      {
        blocks: [{ id: "next", row: 0, column: 4, hp: 3 }],
        pickups: [],
        coins: []
      }
    ]),
    audioBus: createSilentAudioBus()
  });

  assert.equal(game.activateFreeze(), true);
  const beforeRows = {
    block: game.getState().blocks[0].row,
    pickup: game.getState().pickups[0].row,
    coin: game.getState().coinsOnBoard[0].row
  };
  game.getState().returnedBalls = game.getState().ballsOwned;
  game.getState().state = "resolving";
  game.update(0.016);

  const frozenRound = game.getState();
  assert.equal(frozenRound.round, 2);
  assert.equal(frozenRound.freezeActive, false);
  assert.equal(frozenRound.state, "aiming");
  assert.equal(frozenRound.blocks.find((block) => block.id === "existing").row, beforeRows.block);
  assert.equal(frozenRound.pickups.find((pickup) => pickup.id === "pickup").row, beforeRows.pickup);
  assert.equal(frozenRound.coinsOnBoard.find((coin) => coin.id === "coin").row, beforeRows.coin);
  assert.equal(frozenRound.blocks.some((block) => block.id === "skipped"), false);
  assert.equal(frozenRound.ballsLaunched, 0);
  assert.equal(frozenRound.returnedBalls, 0);

  frozenRound.returnedBalls = frozenRound.ballsOwned;
  frozenRound.state = "resolving";
  game.update(0.016);

  const normalRound = game.getState();
  assert.equal(normalRound.round, 3);
  assert.equal(normalRound.blocks.find((block) => block.id === "existing").row, beforeRows.block + 1);
  assert.equal(normalRound.blocks.some((block) => block.id === "skipped"), true);
});

test("new rounds visually slide existing blocks down into their advanced rows", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [{ id: "existing", row: 0, column: 2, hp: 3, maxHp: 3 }], pickups: [], coins: [] },
      { blocks: [{ id: "new", row: 0, column: 4, hp: 4, maxHp: 4 }], pickups: [], coins: [] }
    ]),
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  const laneHeight = state.arena.laneHeight;
  const originalY = game.getEntityPosition(state.blocks[0]).y;

  state.returnedBalls = state.ballsOwned;
  state.state = "resolving";
  game.update(0.016);

  const existing = state.blocks.find((block) => block.id === "existing");
  const newBlock = state.blocks.find((block) => block.id === "new");
  assert.equal(existing.row, 1);
  assert.equal(newBlock.row, 0);
  assert.ok(existing.rowAnimation);
  assert.ok(newBlock.rowAnimation?.spawn);
  assert.equal(game.getEntityPosition(existing).y < originalY + laneHeight, true);
  assert.equal(game.exportSnapshot({ includeVolatile: false }).blocks.some((block) => "rowAnimation" in block), false);

  for (let index = 0; index < 20; index += 1) {
    game.update(0.016);
  }

  assert.equal(existing.rowAnimation, undefined);
  assert.equal(newBlock.rowAnimation, undefined);
  assert.equal(game.getEntityPosition(existing).y, originalY + laneHeight);
});

test("freeze can only be activated while aiming and survives snapshots", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });

  game.getState().state = "launching";
  assert.equal(game.activateFreeze(), false);
  game.getState().state = "aiming";
  assert.equal(game.activateFreeze(), true);
  assert.equal(game.activateFreeze(), false);

  const snapshot = game.exportSnapshot();
  assert.equal(snapshot.freezeActive, true);
  const restored = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  assert.equal(restored.importSnapshot(snapshot), true);
  assert.equal(restored.getState().freezeActive, true);
});

test("activateFreeze emits a freeze audio event", () => {
  const audioBus = createRecordingAudioBus();
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus
  });

  assert.equal(game.activateFreeze(), true);
  assert.deepEqual(audioBus.events.map((event) => event.type), ["freeze"]);
});

test("rage doubles only the next volley and removes temporary balls afterward", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [], coins: [] },
      { blocks: [], pickups: [], coins: [] }
    ]),
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  const baseBall = state.balls[0];
  state.ballsOwned = 3;
  state.balls = Array.from({ length: 3 }, () => ({
    ...baseBall,
    active: false,
    returned: false,
    x: state.launcherX,
    y: state.arena.launcherY
  }));

  assert.equal(game.activateRage(), true);
  assert.equal(game.activateRage(), false);
  assert.equal(state.rageArmed, true);

  game.startAim({ x: 360, y: 500 });
  game.updateAim({ x: 200, y: 3900 });
  game.releaseAim({ x: 200, y: 3900 });

  assert.equal(state.rageArmed, false);
  assert.equal(state.rageVolleyActive, true);
  assert.equal(state.ballsOwned, 3);
  assert.equal(state.balls.length, 6);

  state.pickups = [{ id: "rage-pickup", row: 0, column: 0, collected: true }];
  state.returnedBalls = state.balls.length;
  state.state = "resolving";
  game.update(0.016);

  assert.equal(state.rageVolleyActive, false);
  assert.equal(state.ballsOwned, 4);
  assert.equal(state.balls.length, 4);
  assert.equal(state.state, "aiming");
});

test("rage armed and doubled volley state survive snapshots without permanent inflation", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  assert.equal(game.activateRage(), true);

  const armedSnapshot = game.exportSnapshot();
  const armedRestore = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  assert.equal(armedRestore.importSnapshot(armedSnapshot), true);
  assert.equal(armedRestore.getState().rageArmed, true);
  assert.equal(armedRestore.getState().rageVolleyActive, false);

  const state = game.getState();
  const baseBall = state.balls[0];
  state.ballsOwned = 3;
  state.balls = Array.from({ length: 3 }, () => ({ ...baseBall }));
  game.startAim({ x: 360, y: 500 });
  game.updateAim({ x: 200, y: 3900 });
  game.releaseAim({ x: 200, y: 3900 });
  game.update(0.016);

  const volleySnapshot = game.exportSnapshot();
  const volleyRestore = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  assert.equal(volleyRestore.importSnapshot(volleySnapshot), true);
  assert.equal(volleyRestore.getState().rageVolleyActive, true);
  assert.equal(volleyRestore.getState().ballsOwned, 3);
  assert.equal(volleyRestore.getState().balls.length, 6);
});

test("rage cannot activate outside aiming or while already active", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  state.state = "launching";
  assert.equal(game.activateRage(), false);
  state.state = "aiming";
  state.rageVolleyActive = true;
  assert.equal(game.activateRage(), false);
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
  const coinEvent = audioBus.events.find((event) => event.type === "coin");
  assert.ok(coinEvent);
  assert.equal(coinEvent.payload.coins, 1);
  assert.equal(coinEvent.payload.x, position.x + game.getState().arena.blockSize / 2);
  assert.equal(coinEvent.payload.y, position.y + game.getState().arena.blockSize / 2);
});

test("pickups are collected on contact and emit source coordinates", () => {
  const audioBus = createRecordingAudioBus();
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [{ id: "p1", row: 0, column: 2, collected: false }], coins: [] },
      { blocks: [], pickups: [], coins: [] }
    ]),
    audioBus
  });

  const pickup = game.getState().pickups[0];
  const position = game.getEntityPosition(pickup);
  const ball = game.getState().balls[0];
  ball.active = true;
  ball.returned = false;
  ball.x = position.x + game.getState().arena.blockSize / 2;
  ball.y = position.y + game.getState().arena.blockSize / 2;
  ball.vx = 0;
  ball.vy = 0;
  game.getState().state = "resolving";

  game.update(0.016);

  assert.equal(game.getState().pickups[0].collected, true);
  const pickupEvent = audioBus.events.find((event) => event.type === "pickup");
  assert.ok(pickupEvent);
  assert.equal(pickupEvent.payload.x, position.x + game.getState().arena.blockSize / 2);
  assert.equal(pickupEvent.payload.y, position.y + game.getState().arena.blockSize / 2);
});

test("clearLowestBlockRows removes only the lowest occupied block rows", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  state.blocks = [
    { id: "top", row: 0, column: 0, hp: 1 },
    { id: "middle", row: 3, column: 1, hp: 1 },
    { id: "low-a", row: 6, column: 2, hp: 1 },
    { id: "low-b", row: 7, column: 3, hp: 1 },
    { id: "lowest", row: 8, column: 4, hp: 1 }
  ];
  state.pickups = [{ id: "p1", row: 8, column: 0, collected: false }];
  state.coinsOnBoard = [{ id: "c1", row: 7, column: 6, collected: false }];

  const result = game.clearLowestBlockRows(3);

  assert.deepEqual(result.clearedRows, [8, 7, 6]);
  assert.deepEqual(state.blocks.map((block) => block.id), ["top", "middle"]);
  assert.deepEqual(state.pickups.map((pickup) => pickup.id), ["p1"]);
  assert.deepEqual(state.coinsOnBoard.map((coin) => coin.id), ["c1"]);
  assert.equal(result.removedBlocks.length, 3);
});

test("clearBlocksInArea emits break shards for removed bricks", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    initialSkins: {
      selected: { brick: "brick-candy", ball: null },
      owned: { brick: ["brick-candy"], ball: [] }
    },
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  state.blocks = [
    { id: "center", row: 2, column: 2, hp: 1 },
    { id: "near", row: 3, column: 3, hp: 1 },
    { id: "far", row: 4, column: 4, hp: 1 }
  ];

  const result = game.clearBlocksInArea(2, 2, 1);

  assert.deepEqual(result.removedBlocks.map((removed) => removed.block.id), ["center", "near"]);
  assert.deepEqual(state.blocks.map((block) => block.id), ["far"]);
  assert.equal(state.particles.filter((particle) => particle.shape === "shard").length, 36);
  assert.ok(
    state.particles
      .filter((particle) => particle.shape === "shard")
      .every((particle) => ["rgba(255, 111, 97, 0.92)", "rgba(255, 209, 203, 0.82)"].includes(particle.color))
  );
});

test("disabled effects suppress gameplay particles and break shards", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    effectsEnabled: false,
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  state.blocks = [
    { id: "center", row: 2, column: 2, hp: 1 },
    { id: "near", row: 3, column: 3, hp: 1 }
  ];

  const result = game.clearBlocksInArea(2, 2, 1);

  assert.deepEqual(result.removedBlocks.map((removed) => removed.block.id), ["center", "near"]);
  assert.equal(state.particles.length, 0);
  game.setEffectsEnabled(true);
  assert.equal(game.areEffectsEnabled(), true);
});

test("clear and bomb item effects are rejected during a volley", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createSilentAudioBus()
  });
  const state = game.getState();
  state.blocks = [
    { id: "row-clear", row: 6, column: 0, hp: 1 },
    { id: "bomb-clear", row: 2, column: 2, hp: 1 }
  ];
  state.state = "launching";

  assert.deepEqual(game.clearLowestBlockRows(3), { clearedRows: [], removedBlocks: [] });
  assert.deepEqual(game.clearBlocksInArea(2, 2, 1), { removedBlocks: [] });
  assert.deepEqual(state.blocks.map((block) => block.id), ["row-clear", "bomb-clear"]);
});

test("heart count is persistent and restart preserves it", () => {
  const game = createGameController({
    initialHearts: 3,
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.restart();

  assert.equal(game.getState().heartCount, 3);
});

test("snapshot leaves held hearts as a persistent wallet balance", () => {
  const game = createGameController({
    initialHearts: 0,
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  const snapshot = game.exportSnapshot();
  assert.equal(Object.hasOwn(snapshot, "heartCount"), false);

  const staleSnapshot = {
    ...snapshot,
    heartCount: 0
  };
  const restored = createGameController({
    initialHearts: 1,
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [] }]),
    audioBus: createSilentAudioBus()
  });

  assert.equal(restored.importSnapshot(staleSnapshot), true);
  assert.equal(restored.getState().heartCount, 1);
});

test("snapshot leaves best score as a persistent game balance", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  const snapshot = game.exportSnapshot();
  assert.equal(Object.hasOwn(snapshot, "bestScore"), false);

  const staleSnapshot = {
    ...snapshot,
    bestScore: 0
  };
  const restored = createGameController({
    boardGenerator: createRoundSequence([{ blocks: [], pickups: [] }]),
    audioBus: createSilentAudioBus()
  });
  restored.getState().bestScore = 12;

  assert.equal(restored.importSnapshot(staleSnapshot), true);
  assert.equal(restored.getState().bestScore, 12);
});

test("consumeHeartContinue spends one heart and resumes from gameover", () => {
  const audioBus = createRecordingAudioBus();
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus
  });

  const state = game.getState();
  state.heartCount = 2;
  state.round = 6;
  state.score = 5;
  state.ballsOwned = 3;
  state.state = "gameover";
  state.gameOver = true;
  state.blocks = [
    { id: "safe", row: 2, column: 0, hp: 2 },
    { id: "failed", row: 7, column: 1, hp: 4 }
  ];

  assert.equal(game.consumeHeartContinue(), true);

  const continued = game.getState();
  assert.equal(continued.heartCount, 1);
  assert.equal(continued.state, "aiming");
  assert.equal(continued.gameOver, false);
  assert.deepEqual(continued.blocks.map((block) => block.id), ["safe"]);
  assert.ok(continued.heartConsumeEffect);
  assert.equal(audioBus.events.some((event) => event.type === "revive"), true);
});

test("consumeHeartContinue is ignored without a held heart", () => {
  const game = createGameController({
    boardGenerator: createRoundSequence([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createSilentAudioBus()
  });

  game.getState().state = "gameover";
  game.getState().gameOver = true;

  assert.equal(game.consumeHeartContinue(), false);
  assert.equal(game.getState().state, "gameover");
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

test("speed up is limited to three uses per launch", () => {
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
  assert.equal(game.getState().speedUpsUsedThisLaunch, 2);

  for (let index = 0; index < 7; index += 1) {
    game.update(0.016);
  }

  assert.equal(game.getState().speedUpAvailable, true);

  const beforeThirdSpeedUp = game.getState().balls[0].vx;
  assert.equal(game.activateSpeedUp(), true);
  assert.equal(game.getState().balls[0].vx, beforeThirdSpeedUp * customConfig.speedUpMultiplier);
  assert.equal(
    game.getState().speedMultiplier,
    customConfig.speedUpMultiplier * customConfig.speedUpMultiplier * customConfig.speedUpMultiplier
  );
  assert.equal(game.getState().speedUpsUsedThisLaunch, 3);

  for (let index = 0; index < 12; index += 1) {
    game.update(0.016);
  }

  assert.equal(game.getState().speedUpAvailable, false);
  assert.equal(game.activateSpeedUp(), false);
  assert.equal(
    game.getState().speedMultiplier,
    customConfig.speedUpMultiplier * customConfig.speedUpMultiplier * customConfig.speedUpMultiplier
  );
});

test("long volleys strengthen weak bounces from block tops", () => {
  const customConfig = {
    ...GAME_CONFIG,
    width: 80,
    height: 240,
    columns: 1,
    topPadding: 80,
    bottomPadding: 40,
    ballRadius: 6,
    ballSpeed: 100,
    visualBrickGap: 8,
    trapEscapeDelay: 25,
    trapWeakVerticalRatio: 0.1,
    trapEscapeVerticalRatio: 0.2,
    settleThreshold: 230
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
  const visibleTop = customConfig.topPadding + customConfig.visualBrickGap / 2;
  state.state = "resolving";
  state.volleyElapsed = 25;
  state.blocks = [{ id: "roof", row: 0, column: 0, hp: 3, maxHp: 3 }];
  state.balls = [{
    x: customConfig.width / 2,
    y: visibleTop - customConfig.ballRadius,
    vx: 99.87492177719089,
    vy: 5,
    active: true,
    returned: false
  }];

  game.update(0.001);

  assertClose(state.balls[0].vy, -20);
  assertClose(Math.hypot(state.balls[0].vx, state.balls[0].vy), 100);
});

test("early volleys keep normal weak bounces from block tops", () => {
  const customConfig = {
    ...GAME_CONFIG,
    width: 80,
    height: 240,
    columns: 1,
    topPadding: 80,
    bottomPadding: 40,
    ballRadius: 6,
    ballSpeed: 100,
    visualBrickGap: 8,
    trapEscapeDelay: 25,
    trapWeakVerticalRatio: 0.1,
    trapEscapeVerticalRatio: 0.2,
    settleThreshold: 230
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
  const visibleTop = customConfig.topPadding + customConfig.visualBrickGap / 2;
  state.state = "resolving";
  state.volleyElapsed = 10;
  state.blocks = [{ id: "roof", row: 0, column: 0, hp: 3, maxHp: 3 }];
  state.balls = [{
    x: customConfig.width / 2,
    y: visibleTop - customConfig.ballRadius,
    vx: 99.87492177719089,
    vy: 5,
    active: true,
    returned: false
  }];

  game.update(0.001);

  assertClose(state.balls[0].vy, -5);
  assertClose(Math.hypot(state.balls[0].vx, state.balls[0].vy), 100);
});

test("ball collision checks nearby blocks without damaging far earlier blocks", () => {
  const customConfig = {
    ...GAME_CONFIG,
    width: 180,
    height: 260,
    columns: 2,
    sidePadding: 10,
    topPadding: 80,
    bottomPadding: 40,
    ballRadius: 6,
    ballSpeed: 100,
    visualBrickGap: 8,
    settleThreshold: 250
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
  const blockSize =
    (customConfig.width - customConfig.sidePadding * 2 - (customConfig.columns - 1) * customConfig.blockGap) /
    customConfig.columns;
  const visibleTop = customConfig.topPadding + customConfig.visualBrickGap / 2;
  state.state = "resolving";
  state.blocks = [
    { id: "far", row: 2, column: 1, hp: 3, maxHp: 3 },
    { id: "near", row: 0, column: 0, hp: 3, maxHp: 3 }
  ];
  state.balls = [{
    x: customConfig.sidePadding + blockSize / 2,
    y: visibleTop - customConfig.ballRadius,
    vx: 0,
    vy: 100,
    active: true,
    returned: false
  }];

  game.update(0.001);

  assert.equal(state.blocks.find((block) => block.id === "far").hp, 3);
  assert.equal(state.blocks.find((block) => block.id === "near").hp, 2);
});

test("long volleys strengthen weak vertical speed after wall bounces", () => {
  const customConfig = {
    ...GAME_CONFIG,
    width: 80,
    height: 240,
    columns: 1,
    topPadding: 80,
    bottomPadding: 40,
    ballRadius: 6,
    ballSpeed: 100,
    trapEscapeDelay: 25,
    trapWeakVerticalRatio: 0.1,
    trapEscapeVerticalRatio: 0.2,
    settleThreshold: 230
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
  state.state = "resolving";
  state.volleyElapsed = 25;
  state.blocks = [];
  state.balls = [{
    x: customConfig.width - customConfig.ballRadius,
    y: 120,
    vx: 99.87492177719089,
    vy: 5,
    active: true,
    returned: false
  }];

  game.update(0.001);

  assertClose(state.balls[0].vy, 20);
  assert.ok(state.balls[0].vx < 0);
  assertClose(Math.hypot(state.balls[0].vx, state.balls[0].vy), 100);
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
