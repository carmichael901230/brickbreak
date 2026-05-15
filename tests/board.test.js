import test from "node:test";
import assert from "node:assert/strict";

import { createBoardGenerator } from "../src/board.js";
import { GAME_CONFIG } from "../src/config.js";

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
