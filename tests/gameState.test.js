import test from "node:test";
import assert from "node:assert/strict";

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
