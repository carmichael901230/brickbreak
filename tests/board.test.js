import test from "node:test";
import assert from "node:assert/strict";

import { createBoardGenerator } from "../src/board.js";
import { GAME_CONFIG } from "../src/config.js";

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
