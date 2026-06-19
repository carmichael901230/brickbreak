export const DAILY_CHECK_IN_REWARDS = [
  { day: 1, coins: 10, hearts: 0 },
  { day: 2, coins: 20, hearts: 0 },
  { day: 3, coins: 0, hearts: 1 },
  { day: 4, coins: 30, hearts: 0 },
  { day: 5, coins: 40, hearts: 0 },
  { day: 6, coins: 0, hearts: 1 },
  { day: 7, coins: 100, hearts: 1, big: true }
];

export function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString) {
  if (typeof dateString !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function dayDifference(leftDateString, rightDateString) {
  const left = parseLocalDate(leftDateString);
  const right = parseLocalDate(rightDateString);
  if (!left || !right) {
    return null;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((left.getTime() - right.getTime()) / dayMs);
}

function normalizeStreak(value) {
  const streak = Math.floor(Number(value));
  return Number.isFinite(streak) && streak > 0 ? Math.min(streak, 7) : 0;
}

export function resolveDailyCheckIn(state = {}, today = formatLocalDate()) {
  const lastCheckInDate = typeof state.lastCheckInDate === "string" ? state.lastCheckInDate : null;
  const currentStreak = normalizeStreak(state.checkInStreak);

  if (lastCheckInDate === today) {
    return {
      claimed: false,
      alreadyClaimed: true,
      chainBroken: false,
      reward: null,
      state: {
        lastCheckInDate,
        checkInStreak: currentStreak,
        lastRewardDay: normalizeStreak(state.lastRewardDay)
      }
    };
  }

  const diff = lastCheckInDate ? dayDifference(today, lastCheckInDate) : null;
  const isConsecutive = diff === 1;
  const chainBroken = lastCheckInDate !== null && !isConsecutive;
  const nextStreak = isConsecutive
    ? currentStreak >= 7 ? 1 : currentStreak + 1
    : 1;
  const reward = DAILY_CHECK_IN_REWARDS[nextStreak - 1];

  return {
    claimed: true,
    alreadyClaimed: false,
    chainBroken,
    reward,
    state: {
      lastCheckInDate: today,
      checkInStreak: nextStreak,
      lastRewardDay: reward.day
    }
  };
}
