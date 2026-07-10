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
  ballRadius: 14,
  ballSpeed: 900,
  aimSensitivity: 2.35,
  trapEscapeDelay: 20,
  trapWeakVerticalRatio: 0.15,
  trapEscapeVerticalRatio: 0.3,
  speedUpMultiplier: 2,
  speedUpDelay: 5,
  maxSpeedUpsPerLaunch: 3,
  launchInterval: 0.12,
  maxLaunchAngle: Math.PI - 0.0872665,
  minLaunchAngle: 0.12,
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
    coinChance: 0.2
  },
  effects: {
    hitFlashTime: 0.12,
    particleLife: 0.45,
    roundBannerTime: 0.8,
    rowAdvanceTime: 0.28
  },
  skins: {
    brick: [
      { id: "brick-default", color: "#c8e0ff", price: 0, default: true },
      { id: "brick-sun", color: "#f2b400", price: 50 },
      { id: "brick-coral", color: "#ff6f61", price: 50 },
      { id: "brick-rose", color: "#f05a8a", price: 50 },
      { id: "brick-violet", color: "#9b5de5", price: 50 },
      { id: "brick-sky", color: "#38bdf8", price: 50 },
      { id: "brick-teal", color: "#2dd4bf", price: 50 },
      { id: "brick-lime", color: "#a3e635", price: 50 },
      { id: "brick-mint", color: "#52d273", price: 50 },
      { id: "brick-amber", color: "#f59e0b", price: 50 },
      { id: "brick-white", color: "#e5f7ff", price: 50 },
      { id: "brick-sunburst", color: "#f2b400", accent: "#ffe08a", pattern: "sunburst", price: 100 },
      { id: "brick-candy", color: "#ff6f61", accent: "#ffd1cb", pattern: "candy", price: 100 },
      { id: "brick-heart", color: "#f05a8a", accent: "#ffc2d7", pattern: "heart", price: 100 },
      { id: "brick-prism", color: "#9b5de5", accent: "#d8b4fe", pattern: "prism", price: 100 },
      { id: "brick-ice", color: "#38bdf8", accent: "#e0f2fe", pattern: "ice", price: 100 },
      { id: "brick-circuit", color: "#2dd4bf", accent: "#99f6e4", pattern: "circuit", price: 100 },
      { id: "brick-slime", color: "#a3e635", accent: "#ecfccb", pattern: "slime", price: 100 },
      { id: "brick-leaf", color: "#52d273", accent: "#bbf7d0", pattern: "leaf", price: 100 },
      { id: "brick-lava", color: "#f59e0b", accent: "#fed7aa", pattern: "lava", price: 100 },
      { id: "brick-marble", color: "#e5f7ff", accent: "#94a3b8", pattern: "marble", price: 100 }
    ],
    ball: [
      { id: "ball-default", color: "#eff9ff", price: 0, default: true },
      { id: "ball-ice", color: "#eff9ff", price: 20 },
      { id: "ball-gold", color: "#ffcc80", price: 20 },
      { id: "ball-pink", color: "#ff8fab", price: 20 },
      { id: "ball-red", color: "#ff5252", price: 20 },
      { id: "ball-purple", color: "#c084fc", price: 20 },
      { id: "ball-blue", color: "#60a5fa", price: 20 },
      { id: "ball-cyan", color: "#22d3ee", price: 20 },
      { id: "ball-green", color: "#86efac", price: 20 },
      { id: "ball-orange", color: "#fb923c", price: 20 },
      { id: "ball-silver", color: "#dbeafe", price: 20 },
      {
        id: "ball-baseball",
        color: "#f8fafc",
        storeImage: "src/assets/pic/balls/baseball.png",
        gameImage: "src/assets/pic/balls/baseball_small.png",
        price: 50
      },
      {
        id: "ball-basketball",
        color: "#f97316",
        storeImage: "src/assets/pic/balls/basketball.png",
        gameImage: "src/assets/pic/balls/basketball_small.png",
        price: 50
      },
      {
        id: "ball-football",
        color: "#7c2d12",
        storeImage: "src/assets/pic/balls/football.png",
        gameImage: "src/assets/pic/balls/football_small.png",
        price: 50
      },
      {
        id: "ball-tennis",
        color: "#d9f99d",
        storeImage: "src/assets/pic/balls/tennis.png",
        gameImage: "src/assets/pic/balls/tennis_small.png",
        price: 50
      },
      {
        id: "ball-volleyball",
        color: "#f8fafc",
        storeImage: "src/assets/pic/balls/volleyball.png",
        gameImage: "src/assets/pic/balls/volleyball_small.png",
        price: 50
      },
      {
        id: "ball-sun",
        color: "#facc15",
        storeImage: "src/assets/pic/balls/sun.png",
        gameImage: "src/assets/pic/balls/sun_small.png",
        price: 100
      },
      {
        id: "ball-mercury",
        color: "#94a3b8",
        storeImage: "src/assets/pic/balls/mercury.png",
        gameImage: "src/assets/pic/balls/mercury_small.png",
        price: 100
      },
      {
        id: "ball-venus",
        color: "#f59e0b",
        storeImage: "src/assets/pic/balls/venus.png",
        gameImage: "src/assets/pic/balls/venus_small.png",
        price: 100
      },
      {
        id: "ball-earth",
        color: "#38bdf8",
        storeImage: "src/assets/pic/balls/earth.png",
        gameImage: "src/assets/pic/balls/earth_small.png",
        price: 100
      },
      {
        id: "ball-moon",
        color: "#cbd5e1",
        storeImage: "src/assets/pic/balls/moon.png",
        gameImage: "src/assets/pic/balls/moon_small.png",
        price: 100
      },
      {
        id: "ball-mars",
        color: "#ef4444",
        storeImage: "src/assets/pic/balls/mars.png",
        gameImage: "src/assets/pic/balls/mars_small.png",
        price: 100
      },
      {
        id: "ball-jupiter",
        color: "#d97706",
        storeImage: "src/assets/pic/balls/jupiter.png",
        gameImage: "src/assets/pic/balls/jupiter_small.png",
        price: 100
      },
      {
        id: "ball-blackhole",
        color: "#111827",
        storeImage: "src/assets/pic/balls/blackhole.png",
        gameImage: "src/assets/pic/balls/blackhole_small.png",
        price: 100
      },
      {
        id: "ball-bear",
        color: "#a16207",
        storeImage: "src/assets/pic/balls/bear.png",
        gameImage: "src/assets/pic/balls/bear_small.png",
        price: 150
      },
      {
        id: "ball-bunny",
        color: "#f8fafc",
        storeImage: "src/assets/pic/balls/bunny.png",
        gameImage: "src/assets/pic/balls/bunny_small.png",
        price: 150
      },
      {
        id: "ball-frog",
        color: "#65a30d",
        storeImage: "src/assets/pic/balls/frog.png",
        gameImage: "src/assets/pic/balls/frog_small.png",
        price: 150
      },
      {
        id: "ball-koala",
        color: "#94a3b8",
        storeImage: "src/assets/pic/balls/koala.png",
        gameImage: "src/assets/pic/balls/koala_small.png",
        price: 150
      },
      {
        id: "ball-lion",
        color: "#f59e0b",
        storeImage: "src/assets/pic/balls/lion.png",
        gameImage: "src/assets/pic/balls/lion_small.png",
        price: 150
      },
      {
        id: "ball-pig",
        color: "#f9a8d4",
        storeImage: "src/assets/pic/balls/pig.png",
        gameImage: "src/assets/pic/balls/pig_small.png",
        price: 150
      }
    ]
  }
};

export const STORAGE_KEYS = {
  bestScore: "arc-cascade-best-score",
  coins: "arc-cascade-coins",
  hearts: "arc-cascade-hearts",
  skins: "arc-cascade-skins",
  settings: "arc-cascade-settings",
  gameProgress: "arc-cascade-game-progress",
  dailyCheckIn: "arc-cascade-daily-check-in",
  clearFreeUsed: "arc-cascade-clear-free-used",
  bombFreeUsed: "arc-cascade-bomb-free-used",
  freezeFreeUsed: "arc-cascade-freeze-free-used",
  rageFreeUsed: "arc-cascade-rage-free-used"
};
