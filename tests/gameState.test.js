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
