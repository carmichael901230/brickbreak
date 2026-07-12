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
    coinChance: 0.2,
    hpRandomGrowthRatio: 0.25,
    hpDifficultyPercentPerTier: 5
  },
  effects: {
    hitFlashTime: 0.12,
    particleLife: 0.45,
    roundBannerTime: 0.8,
    rowAdvanceTime: 0.28,
    returnSlideTime: 0.3
  },
  skins: {
    brick: [
      { id: "brick-default", name: "经典砖块", color: "#c8e0ff", price: 0, default: true },
      {
        id: "brick-green-cyclops",
        name: "碧眼怪砖",
        color: "#8bd13a",
        accent: "#f8f8f2",
        shape: "rounded",
        borderless: true,
        overlayImage: "src/assets/pic/bricks/green-cyclops-overlay.png",
        storeImage: "src/assets/pic/bricks/green-cyclops-overlay.png",
        hpBadge: "bottom-right",
        isNew: true,
        price: 200
      },
      {
        id: "brick-orange-grin",
        name: "橙牙怪砖",
        color: "#ff9a3d",
        shape: "rounded",
        borderless: true,
        overlayImage: "src/assets/pic/bricks/orange-grin-overlay.png",
        storeImage: "src/assets/pic/bricks/orange-grin-overlay.png",
        hpBadge: "top-left",
        isNew: true,
        price: 200
      },
      { id: "brick-sun", name: "阳光砖", color: "#f2b400", price: 50 },
      { id: "brick-coral", name: "珊瑚砖", color: "#ff6f61", price: 50 },
      { id: "brick-rose", name: "玫瑰砖", color: "#f05a8a", price: 50 },
      { id: "brick-violet", name: "紫晶砖", color: "#9b5de5", price: 50 },
      { id: "brick-sky", name: "天空砖", color: "#38bdf8", price: 50 },
      { id: "brick-teal", name: "青玉砖", color: "#2dd4bf", price: 50 },
      { id: "brick-lime", name: "青柠砖", color: "#a3e635", price: 50 },
      { id: "brick-mint", name: "薄荷砖", color: "#52d273", price: 50 },
      { id: "brick-amber", name: "琥珀砖", color: "#f59e0b", price: 50 },
      { id: "brick-white", name: "雪白砖", color: "#e5f7ff", price: 50 },
      { id: "brick-sunburst", name: "日芒砖", color: "#f2b400", accent: "#ffe08a", pattern: "sunburst", price: 100 },
      { id: "brick-candy", name: "糖果砖", color: "#ff6f61", accent: "#ffd1cb", pattern: "candy", price: 100 },
      { id: "brick-heart", name: "爱心砖", color: "#f05a8a", accent: "#ffc2d7", pattern: "heart", price: 100 },
      { id: "brick-prism", name: "棱镜砖", color: "#9b5de5", accent: "#d8b4fe", pattern: "prism", price: 100 },
      { id: "brick-ice", name: "冰晶砖", color: "#38bdf8", accent: "#e0f2fe", pattern: "ice", price: 100 },
      { id: "brick-circuit", name: "电路砖", color: "#2dd4bf", accent: "#99f6e4", pattern: "circuit", price: 100 },
      { id: "brick-slime", name: "史莱姆砖", color: "#a3e635", accent: "#ecfccb", pattern: "slime", price: 100 },
      { id: "brick-leaf", name: "绿叶砖", color: "#52d273", accent: "#bbf7d0", pattern: "leaf", price: 100 },
      { id: "brick-lava", name: "熔岩砖", color: "#f59e0b", accent: "#fed7aa", pattern: "lava", price: 100 },
      { id: "brick-marble", name: "大理石砖", color: "#e5f7ff", accent: "#94a3b8", pattern: "marble", price: 100 }
    ],
    ball: [
      { id: "ball-default", name: "经典弹球", color: "#eff9ff", price: 0, default: true },
      { id: "ball-ice", name: "冰霜球", color: "#eff9ff", price: 20 },
      { id: "ball-gold", name: "金币球", color: "#ffcc80", price: 20 },
      { id: "ball-pink", name: "粉桃球", color: "#ff8fab", price: 20 },
      { id: "ball-red", name: "火焰球", color: "#ff5252", price: 20 },
      { id: "ball-purple", name: "紫光球", color: "#c084fc", price: 20 },
      { id: "ball-blue", name: "蓝星球", color: "#60a5fa", price: 20 },
      { id: "ball-cyan", name: "青蓝球", color: "#22d3ee", price: 20 },
      { id: "ball-green", name: "翠绿球", color: "#86efac", price: 20 },
      { id: "ball-orange", name: "橙光球", color: "#fb923c", price: 20 },
      { id: "ball-silver", name: "银月球", color: "#dbeafe", price: 20 },
      {
        id: "ball-baseball",
        name: "棒球",
        color: "#f8fafc",
        storeImage: "src/assets/pic/balls/baseball.png",
        gameImage: "src/assets/pic/balls/baseball_small.png",
        price: 50
      },
      {
        id: "ball-basketball",
        name: "篮球",
        color: "#f97316",
        storeImage: "src/assets/pic/balls/basketball.png",
        gameImage: "src/assets/pic/balls/basketball_small.png",
        price: 50
      },
      {
        id: "ball-football",
        name: "足球",
        color: "#7c2d12",
        storeImage: "src/assets/pic/balls/football.png",
        gameImage: "src/assets/pic/balls/football_small.png",
        price: 50
      },
      {
        id: "ball-tennis",
        name: "网球",
        color: "#d9f99d",
        storeImage: "src/assets/pic/balls/tennis.png",
        gameImage: "src/assets/pic/balls/tennis_small.png",
        price: 50
      },
      {
        id: "ball-volleyball",
        name: "排球",
        color: "#f8fafc",
        storeImage: "src/assets/pic/balls/volleyball.png",
        gameImage: "src/assets/pic/balls/volleyball_small.png",
        price: 50
      },
      {
        id: "ball-sun",
        name: "太阳球",
        color: "#facc15",
        storeImage: "src/assets/pic/balls/sun.png",
        gameImage: "src/assets/pic/balls/sun_small.png",
        price: 100
      },
      {
        id: "ball-mercury",
        name: "水星球",
        color: "#94a3b8",
        storeImage: "src/assets/pic/balls/mercury.png",
        gameImage: "src/assets/pic/balls/mercury_small.png",
        price: 100
      },
      {
        id: "ball-venus",
        name: "金星球",
        color: "#f59e0b",
        storeImage: "src/assets/pic/balls/venus.png",
        gameImage: "src/assets/pic/balls/venus_small.png",
        price: 100
      },
      {
        id: "ball-earth",
        name: "地球",
        color: "#38bdf8",
        storeImage: "src/assets/pic/balls/earth.png",
        gameImage: "src/assets/pic/balls/earth_small.png",
        price: 100
      },
      {
        id: "ball-moon",
        name: "月球",
        color: "#cbd5e1",
        storeImage: "src/assets/pic/balls/moon.png",
        gameImage: "src/assets/pic/balls/moon_small.png",
        price: 100
      },
      {
        id: "ball-mars",
        name: "火星球",
        color: "#ef4444",
        storeImage: "src/assets/pic/balls/mars.png",
        gameImage: "src/assets/pic/balls/mars_small.png",
        price: 100
      },
      {
        id: "ball-jupiter",
        name: "木星球",
        color: "#d97706",
        storeImage: "src/assets/pic/balls/jupiter.png",
        gameImage: "src/assets/pic/balls/jupiter_small.png",
        price: 100
      },
      {
        id: "ball-blackhole",
        name: "黑洞球",
        color: "#111827",
        storeImage: "src/assets/pic/balls/blackhole.png",
        gameImage: "src/assets/pic/balls/blackhole_small.png",
        price: 100
      },
      {
        id: "ball-bear",
        name: "小熊球",
        color: "#a16207",
        storeImage: "src/assets/pic/balls/bear.png",
        gameImage: "src/assets/pic/balls/bear_small.png",
        price: 150
      },
      {
        id: "ball-bunny",
        name: "兔兔球",
        color: "#f8fafc",
        storeImage: "src/assets/pic/balls/bunny.png",
        gameImage: "src/assets/pic/balls/bunny_small.png",
        price: 150
      },
      {
        id: "ball-frog",
        name: "青蛙球",
        color: "#65a30d",
        storeImage: "src/assets/pic/balls/frog.png",
        gameImage: "src/assets/pic/balls/frog_small.png",
        price: 150
      },
      {
        id: "ball-koala",
        name: "考拉球",
        color: "#94a3b8",
        storeImage: "src/assets/pic/balls/koala.png",
        gameImage: "src/assets/pic/balls/koala_small.png",
        price: 150
      },
      {
        id: "ball-lion",
        name: "狮子球",
        color: "#f59e0b",
        storeImage: "src/assets/pic/balls/lion.png",
        gameImage: "src/assets/pic/balls/lion_small.png",
        price: 150
      },
      {
        id: "ball-pig",
        name: "小猪球",
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
  viewedNewSkins: "arc-cascade-viewed-new-skins",
  settings: "arc-cascade-settings",
  gameProgress: "arc-cascade-game-progress",
  dailyCheckIn: "arc-cascade-daily-check-in",
  clearFreeUsed: "arc-cascade-clear-free-used",
  bombFreeUsed: "arc-cascade-bomb-free-used",
  freezeFreeUsed: "arc-cascade-freeze-free-used",
  rageFreeUsed: "arc-cascade-rage-free-used"
};
