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
      const blockCap = Math.min(
        config.spawn.maxBlocks,
        config.spawn.minBlocks + Math.floor(round * config.spawn.blockChanceRamp * config.columns) + 1
      );
      const blockCount = Math.max(
        config.spawn.minBlocks,
        Math.min(blockCap, 1 + Math.floor(rng() * (blockCap + 1)))
      );
      const columns = chooseColumns(blockCount);

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

      const pickupAllowed = round <= config.spawn.guaranteedPickupRounds || rng() < config.spawn.pickupChance;
      const freeColumns = Array.from({ length: config.columns }, (_, index) => index).filter(
        (column) => !blocks.some((block) => block.column === column)
      );
      const pickupColumn = pickupAllowed && freeColumns.length > 0
        ? freeColumns[Math.floor(rng() * freeColumns.length)]
        : null;

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
