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
  aimSensitivity: 2.35,
  speedUpMultiplier: 2,
  speedUpDelay: 5,
  launchInterval: 0.06,
  maxLaunchAngle: Math.PI - 0.22,
  minLaunchAngle: 0.22,
  settleThreshold: 912,
  pickupRadius: 22,
  coinRadius: 22,
  failLineOffset: 110,
  spawn: {
    minBlocks: 2,
    maxBlocks: 5,
    blockChanceRamp: 0.025,
    pickupChance: 0.72,
    guaranteedPickupRounds: 2,
    coinChance: 0.35
  },
  effects: {
    hitFlashTime: 0.12,
    particleLife: 0.45,
    roundBannerTime: 0.8
  },
  skins: {
    brick: [
      { id: "brick-default", color: "#c8e0ff", price: 0, default: true },
      { id: "brick-sun", color: "#f2b400", price: 100 },
      { id: "brick-coral", color: "#ff6f61", price: 100 },
      { id: "brick-rose", color: "#f05a8a", price: 100 },
      { id: "brick-violet", color: "#9b5de5", price: 200 },
      { id: "brick-sky", color: "#38bdf8", price: 200 },
      { id: "brick-teal", color: "#2dd4bf", price: 200 },
      { id: "brick-lime", color: "#a3e635", price: 300 },
      { id: "brick-mint", color: "#52d273", price: 300 },
      { id: "brick-amber", color: "#f59e0b", price: 300 },
      { id: "brick-white", color: "#e5f7ff", price: 300 }
    ],
    ball: [
      { id: "ball-default", color: "#eff9ff", price: 0, default: true },
      { id: "ball-ice", color: "#eff9ff", price: 100 },
      { id: "ball-gold", color: "#ffcc80", price: 100 },
      { id: "ball-pink", color: "#ff8fab", price: 100 },
      { id: "ball-red", color: "#ff5252", price: 200 },
      { id: "ball-purple", color: "#c084fc", price: 200 },
      { id: "ball-blue", color: "#60a5fa", price: 200 },
      { id: "ball-cyan", color: "#22d3ee", price: 300 },
      { id: "ball-green", color: "#86efac", price: 300 },
      { id: "ball-orange", color: "#fb923c", price: 300 },
      { id: "ball-silver", color: "#dbeafe", price: 300 }
    ]
  }
};

export const STORAGE_KEYS = {
  bestScore: "arc-cascade-best-score",
  coins: "arc-cascade-coins",
  skins: "arc-cascade-skins",
  settings: "arc-cascade-settings",
  gameProgress: "arc-cascade-game-progress"
};
