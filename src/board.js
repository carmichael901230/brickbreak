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

  function chooseColumns(count, candidates = Array.from({ length: config.columns }, (_, index) => index)) {
    const available = [...candidates];
    const selected = [];

    while (selected.length < count && available.length > 0) {
      const pickIndex = Math.floor(rng() * available.length);
      selected.push(available.splice(pickIndex, 1)[0]);
    }

    return selected.sort((left, right) => left - right);
  }

  function createBlockHp(round) {
    const baseHp = Math.max(1, round + Math.floor(rng() * Math.max(2, Math.ceil(round * 0.35))));
    const difficultyTier = Math.floor(Math.max(1, Math.floor(round)) / 50);
    const difficultyPercent = 100 + difficultyTier * 5;
    return Math.ceil((baseHp * difficultyPercent) / 100);
  }

  return {
    generateRound(round, boardBlocks) {
      // Keep the logical board dense and gapless; rendering can add visual spacing later.
      const normalizedRound = Math.max(1, Math.floor(round));
      const pickupColumn = Math.floor(rng() * config.columns);
      const coinAllowed = rng() < (config.spawn.coinChance ?? 0);
      const reservedColumns = new Set([pickupColumn]);
      const coinCandidates = Array.from({ length: config.columns }, (_, index) => index).filter(
        (column) => !reservedColumns.has(column)
      );
      const coinColumn = coinAllowed && coinCandidates.length > 0
        ? coinCandidates[Math.floor(rng() * coinCandidates.length)]
        : null;
      if (coinColumn !== null) {
        reservedColumns.add(coinColumn);
      }

      const occupied = new Set();
      for (const block of boardBlocks) {
        if (block.row === 0) {
          occupied.add(block.column);
        }
      }

      const legalBlockColumns = Array.from({ length: config.columns }, (_, index) => index).filter(
        (column) => !reservedColumns.has(column) && !occupied.has(column)
      );
      const maxSpawnableBlocks = legalBlockColumns.length;
      const minBlocks = maxSpawnableBlocks > 0 ? Math.max(1, Math.min(maxSpawnableBlocks, normalizedRound)) : 0;
      const maxBlocks = Math.min(maxSpawnableBlocks, normalizedRound * 2);
      const blockCount = minBlocks + Math.floor(rng() * (maxBlocks - minBlocks + 1));
      const columns = chooseColumns(blockCount, legalBlockColumns);

      const blocks = columns
        .map((column, index) => {
          const hp = createBlockHp(normalizedRound);
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

      const coins = coinColumn === null
        ? []
        : [
            {
              id: `coin-${round}-${coinColumn}`,
              column: coinColumn,
              row: 0,
              collected: false
            }
          ];

      return { blocks, pickups, coins };
    }
  };
}
