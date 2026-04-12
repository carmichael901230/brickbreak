export const GAME_CONFIG = {
  width: 720,
  height: 960,
  columns: 7,
  visibleRows: 10,
  topPadding: 120,
  sidePadding: 0,
  bottomPadding: 110,
  blockGap: 0,
  visualBrickGap: 8,
  collisionPadding: 5,
  ballRadius: 8,
  ballSpeed: 860,
  speedUpMultiplier: 2,
  speedUpDelay: 5,
  launchInterval: 0.06,
  maxLaunchAngle: Math.PI - 0.22,
  minLaunchAngle: 0.22,
  settleThreshold: 912,
  pickupRadius: 11,
  failLineOffset: 110,
  spawn: {
    minBlocks: 2,
    maxBlocks: 4,
    blockChanceRamp: 0.025,
    pickupChance: 0.72,
    guaranteedPickupRounds: 2
  },
  effects: {
    hitFlashTime: 0.12,
    particleLife: 0.45,
    roundBannerTime: 0.8
  }
};

export const STORAGE_KEYS = {
  bestScore: "arc-cascade-best-score",
  settings: "arc-cascade-settings"
};
