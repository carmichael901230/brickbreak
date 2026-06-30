export const LEADERBOARD_BOARD_TYPES = {
  total: "total",
  province: "province"
};

export const CURRENT_USER_PROVINCE = "广东";
export const TOTAL_PLAYER_COUNT = 200000;
export const PROVINCE_PLAYER_COUNT = 28000;
export const TOP_RECORD_LEVEL = 1219;

export const FAKE_LEADERBOARD_USERS = [
  { id: "nora-lin", nickname: "林小雨", province: "浙江", city: "杭州", country: "中国", avatar: "src/assets/pic/avatars/avatar-01.png", bestLevel: 2158 },
  { id: "jason-qiu", nickname: "小周", province: "上海", city: "上海", country: "中国", avatar: "src/assets/pic/avatars/avatar-02.png", bestLevel: 1812 },
  { id: "guangdong-yan", nickname: "Aki_广州", province: "广东", city: "广州", country: "中国", avatar: "src/assets/pic/avatars/avatar-04.png", bestLevel: 2195 },
  { id: "mika-chen", nickname: "Coffee不加糖", province: "北京", city: "北京", country: "中国", avatar: "src/assets/pic/avatars/avatar-03.png", bestLevel: 1987 },
  { id: "sarah-he", nickname: "砖块清空计划", province: "四川", city: "成都", country: "中国", avatar: "src/assets/pic/avatars/avatar-05.png", bestLevel: 2081 },
  { id: "guangdong-mo", nickname: "可可_深圳", province: "广东", city: "深圳", country: "中国", avatar: "src/assets/pic/avatars/avatar-06.png", bestLevel: 1638 },
  { id: "leo-wen", nickname: "Leo文", province: "江苏", city: "南京", country: "中国", avatar: "src/assets/pic/avatars/avatar-07.png", bestLevel: 1930 },
  { id: "guangdong-luo", nickname: "阿树·夜猫", province: "广东", city: "佛山", country: "中国", avatar: "src/assets/pic/avatars/avatar-08.png", bestLevel: 1823 },
  { id: "amy-tang", nickname: "Momo", province: "福建", city: "厦门", country: "中国", avatar: "src/assets/pic/avatars/avatar-09.png", bestLevel: 1765 },
  { id: "owen-xu", nickname: "7号玩家", province: "山东", city: "青岛", country: "中国", avatar: "src/assets/pic/avatars/avatar-10.png", bestLevel: 1903 },
  { id: "guangdong-zhao", nickname: "东莞Jacky", province: "广东", city: "东莞", country: "中国", avatar: "src/assets/pic/avatars/avatar-11.png", bestLevel: 1836 },
  { id: "ivy-jiang", nickname: "只差一颗球", province: "湖南", city: "长沙", country: "中国", avatar: "src/assets/pic/avatars/avatar-12.png", bestLevel: 1797 },
  { id: "guangdong-ye", nickname: "珠海不掉线", province: "广东", city: "珠海", country: "中国", avatar: "src/assets/pic/avatars/avatar-13.png", bestLevel: 1518 },
  { id: "max-han", nickname: "武汉稳住了", province: "湖北", city: "武汉", country: "中国", avatar: "src/assets/pic/avatars/avatar-14.png", bestLevel: 1649 },
  { id: "guangdong-su", nickname: "橘子汽水", province: "广东", city: "汕头", country: "中国", avatar: "src/assets/pic/avatars/avatar-15.png", bestLevel: 1677 },
  { id: "ella-zhou", nickname: "Lynn在路上", province: "河南", city: "郑州", country: "中国", avatar: "src/assets/pic/avatars/avatar-16.png", bestLevel: 1995 },
  { id: "guangdong-fang", nickname: "惠州再来局", province: "广东", city: "惠州", country: "中国", avatar: "src/assets/pic/avatars/avatar-17.png", bestLevel: 1578 },
  { id: "guangdong-xie", nickname: "中山弹射线", province: "广东", city: "中山", country: "中国", avatar: "src/assets/pic/avatars/avatar-18.png", bestLevel: 1467 },
  { id: "guangdong-lin", nickname: "Lin知夏", province: "广东", city: "江门", country: "中国", avatar: "src/assets/pic/avatars/avatar-19.png", bestLevel: 1481 },
  { id: "guangdong-yu", nickname: "阿Yu", province: "广东", city: "湛江", country: "中国", avatar: "src/assets/pic/avatars/avatar-20.png", bestLevel: 1318 }
];

const CURRENT_USER = {
  id: "current-user",
  nickname: "我",
  province: CURRENT_USER_PROVINCE,
  city: "广州",
  country: "中国",
  avatar: null,
  isCurrentUser: true
};

function normalizeLevel(value) {
  const level = Math.floor(Number(value));
  return Number.isFinite(level) && level > 0 ? level : 1;
}

function rowsForBoard(boardType) {
  return boardType === LEADERBOARD_BOARD_TYPES.province
    ? FAKE_LEADERBOARD_USERS.filter((user) => user.province === CURRENT_USER_PROVINCE)
    : FAKE_LEADERBOARD_USERS;
}

function compareRows(left, right) {
  if (right.bestLevel !== left.bestLevel) {
    return right.bestLevel - left.bestLevel;
  }
  if (left.isCurrentUser && !right.isCurrentUser) {
    return -1;
  }
  if (!left.isCurrentUser && right.isCurrentUser) {
    return 1;
  }
  return left.id.localeCompare(right.id);
}

export function maskWeChatName(name) {
  const chars = Array.from(String(name ?? "").trim());
  if (chars.length <= 1) {
    return chars.join("");
  }
  if (chars.length === 2) {
    return `${chars[0]}*`;
  }
  return `${chars[0]}${"*".repeat(chars.length - 2)}${chars[chars.length - 1]}`;
}

export function estimateHiddenPlayersAhead(currentBestLevel, boardType = LEADERBOARD_BOARD_TYPES.total) {
  const level = normalizeLevel(currentBestLevel);
  const normalizedBoardType = boardType === LEADERBOARD_BOARD_TYPES.province
    ? LEADERBOARD_BOARD_TYPES.province
    : LEADERBOARD_BOARD_TYPES.total;
  const population = normalizedBoardType === LEADERBOARD_BOARD_TYPES.province
    ? PROVINCE_PLAYER_COUNT
    : TOTAL_PLAYER_COUNT;
  const normalizedProgress = Math.min(1, Math.max(0, level / TOP_RECORD_LEVEL));
  const longTailShareAhead = Math.pow(1 - normalizedProgress, 3.15);
  return Math.floor(population * longTailShareAhead);
}

export function estimateCurrentRank(currentBestLevel, boardType = LEADERBOARD_BOARD_TYPES.total) {
  const level = normalizeLevel(currentBestLevel);
  const normalizedBoardType = boardType === LEADERBOARD_BOARD_TYPES.province
    ? LEADERBOARD_BOARD_TYPES.province
    : LEADERBOARD_BOARD_TYPES.total;
  const seededAhead = rowsForBoard(normalizedBoardType).filter((user) => user.bestLevel > level).length;
  const hiddenAhead = estimateHiddenPlayersAhead(level, normalizedBoardType);
  return Math.max(1, seededAhead + hiddenAhead + 1);
}

export function formatRank(rank) {
  if (rank > 1000) {
    return "999+";
  }
  if (rank >= 101) {
    return "99+";
  }
  return String(rank);
}

export function createLeaderboard({ currentBestLevel = 1, boardType = LEADERBOARD_BOARD_TYPES.total } = {}) {
  const normalizedBoardType = boardType === LEADERBOARD_BOARD_TYPES.province
    ? LEADERBOARD_BOARD_TYPES.province
    : LEADERBOARD_BOARD_TYPES.total;
  const currentLevel = normalizeLevel(currentBestLevel);
  const currentEstimatedRank = estimateCurrentRank(currentLevel, normalizedBoardType);
  const currentUser = {
    ...CURRENT_USER,
    nickname: "我",
    displayName: "我",
    bestLevel: currentLevel,
    rank: currentEstimatedRank,
    rankLabel: formatRank(currentEstimatedRank)
  };
  const rows = [
    ...rowsForBoard(normalizedBoardType).map((user) => ({
      ...user,
      displayName: maskWeChatName(user.nickname),
      isCurrentUser: false
    })),
    currentUser
  ].sort(compareRows);
  const rankedRows = rows.map((row, index) => ({
    ...row,
    rank: index + 1,
    rankLabel: String(index + 1)
  }));
  const topRows = rankedRows.slice(0, 10);
  const topCurrentRow = topRows.find((row) => row.isCurrentUser);

  return {
    boardType: normalizedBoardType,
    rankedRows,
    topRows,
    currentUser: topCurrentRow ?? currentUser,
    fakeUsers: rowsForBoard(normalizedBoardType)
  };
}
