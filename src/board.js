import { GAME_CONFIG } from "./config.js";

function createRng(seedValue) {
  let seed = seedValue >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

export function createBoardGenerator(config = GAME_CONFIG, random = Math.random) {
  const rng = typeof random === "number" ? createRng(random) : random;

  function chooseColumns(count) {
    const available = Array.from({ length: config.columns }, (_, index) => index);
    const selected = [];

    while (selected.length < count && available.length > 0) {
      const pickIndex = Math.floor(rng() * available.length);
      selected.push(available.splice(pickIndex, 1)[0]);
    }

    return selected.sort((left, right) => left - right);
  }

  return {
    generateRound(round, boardBlocks) {
      // Keep the logical board dense and gapless; rendering can add visual spacing later.
      const normalizedRound = Math.max(1, Math.floor(round));
      const pickupColumn = Math.floor(rng() * config.columns);
      const maxSpawnableBlocks = Math.max(0, config.columns - 1);
      const minBlocks = Math.min(maxSpawnableBlocks, normalizedRound);
      const maxBlocks = Math.min(maxSpawnableBlocks, normalizedRound * 2);
      const blockCount = minBlocks + Math.floor(rng() * (maxBlocks - minBlocks + 1));
      const columns = chooseColumns(blockCount + 1)
        .filter((column) => column !== pickupColumn)
        .slice(0, blockCount);

      const occupied = new Set();
      for (const block of boardBlocks) {
        if (block.row === 0) {
          occupied.add(block.column);
        }
      }

      const blocks = columns
        .filter((column) => !occupied.has(column))
        .map((column, index) => {
          const hp = Math.max(1, round + Math.floor(rng() * Math.max(2, Math.ceil(round * 0.35))));
          return {
            id: `block-${round}-${column}-${index}`,
            column,
            row: 0,
            hp,
            maxHp: hp
          };
        });

      const pickups = pickupColumn === null
        ? []
        : [
            {
              id: `pickup-${round}-${pickupColumn}`,
              column: pickupColumn,
              row: 0,
              collected: false
            }
          ];

      return { blocks, pickups };
    }
  };
}
