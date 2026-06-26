export const LEADERBOARD_BOARD_TYPES = {
  total: "total",
  province: "province"
};

export const CURRENT_USER_PROVINCE = "广东";
export const TOTAL_PLAYER_COUNT = 200000;
export const PROVINCE_PLAYER_COUNT = 28000;
export const TOP_RECORD_LEVEL = 1219;

export const FAKE_LEADERBOARD_USERS = [
  { id: "nora-lin", nickname: "林小雨", province: "浙江", city: "杭州", country: "中国", avatar: "src/assets/pic/avatars/avatar-01.png", bestLevel: 1382 },
  { id: "jason-qiu", nickname: "QiuJason", province: "上海", city: "上海", country: "中国", avatar: "src/assets/pic/avatars/avatar-02.png", bestLevel: 1220 },
  { id: "guangdong-yan", nickname: "阿Yan", province: "广东", city: "广州", country: "中国", avatar: "src/assets/pic/avatars/avatar-04.png", bestLevel: 1339 },
  { id: "mika-chen", nickname: "陈Mika", province: "北京", city: "北京", country: "中国", avatar: "src/assets/pic/avatars/avatar-03.png", bestLevel: 1309 },
  { id: "sarah-he", nickname: "何小敏", province: "四川", city: "成都", country: "中国", avatar: "src/assets/pic/avatars/avatar-05.png", bestLevel: 1295 },
  { id: "guangdong-mo", nickname: "可可_深圳", province: "广东", city: "深圳", country: "中国", avatar: "src/assets/pic/avatars/avatar-06.png", bestLevel: 1136 },
  { id: "leo-wen", nickname: "Leo文", province: "江苏", city: "南京", country: "中国", avatar: "src/assets/pic/avatars/avatar-07.png", bestLevel: 1218 },
  { id: "guangdong-luo", nickname: "罗阿杰", province: "广东", city: "佛山", country: "中国", avatar: "src/assets/pic/avatars/avatar-08.png", bestLevel: 1246 },
  { id: "amy-tang", nickname: "Amy唐", province: "福建", city: "厦门", country: "中国", avatar: "src/assets/pic/avatars/avatar-09.png", bestLevel: 1146 },
  { id: "owen-xu", nickname: "徐同学", province: "山东", city: "青岛", country: "中国", avatar: "src/assets/pic/avatars/avatar-10.png", bestLevel: 1169 },
  { id: "guangdong-zhao", nickname: "赵先生", province: "广东", city: "东莞", country: "中国", avatar: "src/assets/pic/avatars/avatar-11.png", bestLevel: 1227 },
  { id: "ivy-jiang", nickname: "Jiang Ivy", province: "湖南", city: "长沙", country: "中国", avatar: "src/assets/pic/avatars/avatar-12.png", bestLevel: 1126 },
  { id: "guangdong-ye", nickname: "叶子", province: "广东", city: "珠海", country: "中国", avatar: "src/assets/pic/avatars/avatar-13.png", bestLevel: 1045 },
  { id: "max-han", nickname: "韩小北", province: "湖北", city: "武汉", country: "中国", avatar: "src/assets/pic/avatars/avatar-14.png", bestLevel: 1078 },
  { id: "guangdong-su", nickname: "苏打", province: "广东", city: "汕头", country: "中国", avatar: "src/assets/pic/avatars/avatar-15.png", bestLevel: 1037 },
  { id: "ella-zhou", nickname: "周甜甜", province: "河南", city: "郑州", country: "中国", avatar: "src/assets/pic/avatars/avatar-16.png", bestLevel: 1081 },
  { id: "guangdong-fang", nickname: "方可乐", province: "广东", city: "惠州", country: "中国", avatar: "src/assets/pic/avatars/avatar-17.png", bestLevel: 956 },
  { id: "guangdong-xie", nickname: "谢小满", province: "广东", city: "中山", country: "中国", avatar: "src/assets/pic/avatars/avatar-18.png", bestLevel: 974 },
  { id: "guangdong-lin", nickname: "Lin知夏", province: "广东", city: "江门", country: "中国", avatar: "src/assets/pic/avatars/avatar-19.png", bestLevel: 942 },
  { id: "guangdong-yu", nickname: "阿Yu", province: "广东", city: "湛江", country: "中国", avatar: "src/assets/pic/avatars/avatar-20.png", bestLevel: 922 }
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
