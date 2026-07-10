import test from "node:test";
import assert from "node:assert/strict";

import { GAME_CONFIG } from "../src/config.js";
import { createGameController } from "../src/gameState.js";

function createBoardGenerator(rounds) {
  let index = 0;
  return {
    generateRound() {
      return rounds[index++] ?? { blocks: [], pickups: [] };
    }
  };
}

function createAudioBus() {
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

test("round resolves after all balls return and applies collected pickups", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([
      { blocks: [], pickups: [{ id: "p1", row: 0, column: 0, collected: false }] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createAudioBus()
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

test("later returned balls slide into the first landing position before round advance", () => {
  const customConfig = {
    ...GAME_CONFIG,
    spawn: { ...GAME_CONFIG.spawn, minBlocks: 0, maxBlocks: 0, pickupChance: 0, guaranteedPickupRounds: 0, coinChance: 0 },
    effects: { ...GAME_CONFIG.effects, returnSlideTime: 0.04 }
  };
  const game = createGameController({
    config: customConfig,
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [] }, { blocks: [], pickups: [] }]),
    audioBus: createAudioBus()
  });
  const state = game.getState();
  state.state = "resolving";
  state.ballsOwned = 2;
  state.ballsLaunched = 2;
  state.balls = [
    { x: 120, y: customConfig.settleThreshold + 1, vx: 0, vy: 0, active: true, returned: false, returnSlide: null },
    { x: 480, y: customConfig.settleThreshold + 1, vx: 0, vy: 0, active: true, returned: false, returnSlide: null }
  ];

  game.update(0.016);

  assert.equal(state.firstReturnX, 120);
  assert.equal(state.returnedBalls, 2);
  assert.equal(state.state, "resolving");
  assert.ok(state.balls[1].returnSlide);
  assert.equal(state.balls[1].x, 480);

  game.update(0.02);
  assert.ok(state.balls[1].x < 480);
  assert.ok(state.balls[1].x > 120);
  assert.equal(state.state, "resolving");

  game.update(0.02);
  assert.equal(state.launcherTargetX, 120);
  assert.equal(state.state, "aiming");
});

test("game state snapshot can be exported and restored", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([
      { blocks: [{ id: "b1", row: 0, column: 2, hp: 3, maxHp: 3 }], pickups: [] }
    ]),
    audioBus: createAudioBus()
  });

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: 500, y: 300 });
  game.releaseAim({ x: 500, y: 300 });
  game.update(0.016);

  const snapshot = game.exportSnapshot();
  assert.ok(snapshot);
  assert.equal(Object.hasOwn(snapshot, "bestScore"), false);

  const restored = createGameController({
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [] }]),
    audioBus: createAudioBus()
  });
  restored.getState().bestScore = 7;

  assert.equal(restored.importSnapshot(snapshot), true);
  assert.deepEqual(restored.getState().blocks, game.getState().blocks);
  assert.equal(restored.getState().state, game.getState().state);
  assert.equal(restored.getState().round, game.getState().round);
  assert.equal(restored.getState().bestScore, 7);
});

test("new rounds visually slide existing blocks down into their advanced rows", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([
      { blocks: [{ id: "existing", row: 0, column: 2, hp: 3, maxHp: 3 }], pickups: [] },
      { blocks: [{ id: "new", row: 0, column: 4, hp: 4, maxHp: 4 }], pickups: [] }
    ]),
    audioBus: createAudioBus()
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

test("progress snapshot omits volatile flight state and restores settled balls", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([
      { blocks: [{ id: "b1", row: 0, column: 2, hp: 3, maxHp: 3 }], pickups: [] }
    ]),
    audioBus: createAudioBus()
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
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [] }]),
    audioBus: createAudioBus()
  });

  assert.equal(restored.importSnapshot(snapshot), true);
  assert.equal(restored.getState().state, "aiming");
  assert.equal(restored.getState().ballsOwned, 3);
  assert.equal(restored.getState().balls.length, 3);
  assert.equal(restored.getState().ballsLaunched, 0);
  assert.equal(restored.getState().returnedBalls, 0);
});

test("clearLowestBlockRows removes only the lowest occupied block rows", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createAudioBus()
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

test("clearBlocksInArea removes bricks in a clipped 3x3 area only", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [], coins: [] }]),
    initialSkins: {
      selected: { brick: "brick-candy", ball: null },
      owned: { brick: ["brick-candy"], ball: [] }
    },
    audioBus: createAudioBus()
  });
  const state = game.getState();
  state.blocks = [
    { id: "center", row: 2, column: 2, hp: 1 },
    { id: "near", row: 3, column: 3, hp: 1 },
    { id: "far", row: 4, column: 4, hp: 1 },
    { id: "edge", row: 0, column: 0, hp: 1 }
  ];
  state.pickups = [{ id: "p1", row: 2, column: 3, collected: false }];
  state.coinsOnBoard = [{ id: "c1", row: 1, column: 1, collected: false }];

  const result = game.clearBlocksInArea(2, 2, 1);

  assert.deepEqual(result.removedBlocks.map((removed) => removed.block.id), ["center", "near"]);
  assert.deepEqual(state.blocks.map((block) => block.id), ["far", "edge"]);
  assert.deepEqual(state.pickups.map((pickup) => pickup.id), ["p1"]);
  assert.deepEqual(state.coinsOnBoard.map((coin) => coin.id), ["c1"]);
  assert.equal(state.particles.filter((particle) => particle.shape === "shard").length, 36);
  assert.ok(
    state.particles
      .filter((particle) => particle.shape === "shard")
      .every((particle) => ["rgba(255, 111, 97, 0.92)", "rgba(255, 209, 203, 0.82)"].includes(particle.color))
  );
});

test("clearBlocksInArea handles board edges", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createAudioBus()
  });
  const state = game.getState();
  state.blocks = [
    { id: "corner", row: 0, column: 0, hp: 1 },
    { id: "neighbor", row: 1, column: 1, hp: 1 },
    { id: "outside", row: 2, column: 2, hp: 1 }
  ];

  const result = game.clearBlocksInArea(0, 0, 1);

  assert.equal(result.removedBlocks.length, 2);
  assert.deepEqual(state.blocks.map((block) => block.id), ["outside"]);
});

test("clearBlocksInArea leaves state unchanged when no bricks are affected", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [], coins: [] }]),
    audioBus: createAudioBus()
  });
  const state = game.getState();
  state.blocks = [{ id: "far", row: 5, column: 5, hp: 1 }];

  const result = game.clearBlocksInArea(0, 0, 1);

  assert.deepEqual(result.removedBlocks, []);
  assert.deepEqual(state.blocks.map((block) => block.id), ["far"]);
});

test("activateFreeze emits a freeze audio event", () => {
  const audioBus = createRecordingAudioBus();
  const game = createGameController({
    boardGenerator: createBoardGenerator([{ blocks: [], pickups: [], coins: [] }]),
    audioBus
  });

  assert.equal(game.activateFreeze(), true);
  assert.deepEqual(audioBus.events.map((event) => event.type), ["freeze"]);
});

test("low launch angles hide the guide and do not fire", () => {
  const game = createGameController({
    boardGenerator: createBoardGenerator([
      { blocks: [], pickups: [] },
      { blocks: [], pickups: [] }
    ]),
    audioBus: createAudioBus()
  });

  game.startAim({ x: 360, y: 800 });
  game.updateAim({ x: 260, y: 810 });
  assert.equal(game.getState().aimPoint, null);

  game.releaseAim({ x: 260, y: 810 });
  const state = game.getState();
  assert.equal(state.state, "aiming");
  assert.equal(state.launchDirection, null);
});
