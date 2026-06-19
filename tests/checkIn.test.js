import test from "node:test";
import assert from "node:assert/strict";

import { resolveDailyCheckIn } from "../src/checkIn.js";

test("daily check-in grants day one on first login", () => {
  const result = resolveDailyCheckIn({}, "2026-06-17");

  assert.equal(result.claimed, true);
  assert.equal(result.reward.day, 1);
  assert.equal(result.reward.coins, 10);
  assert.equal(result.reward.hearts, 0);
});

test("daily check-in does not grant twice on the same day", () => {
  const result = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-17",
    checkInStreak: 2,
    lastRewardDay: 2
  }, "2026-06-17");

  assert.equal(result.claimed, false);
  assert.equal(result.alreadyClaimed, true);
});

test("daily check-in continues, resets, and grants day seven reward", () => {
  const continued = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-16",
    checkInStreak: 2,
    lastRewardDay: 2
  }, "2026-06-17");
  const reset = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-15",
    checkInStreak: 5,
    lastRewardDay: 5
  }, "2026-06-17");
  const bigReward = resolveDailyCheckIn({
    lastCheckInDate: "2026-06-16",
    checkInStreak: 6,
    lastRewardDay: 6
  }, "2026-06-17");

  assert.equal(continued.reward.day, 3);
  assert.equal(continued.reward.hearts, 1);
  assert.equal(reset.chainBroken, true);
  assert.equal(reset.reward.day, 1);
  assert.equal(bigReward.reward.day, 7);
  assert.equal(bigReward.reward.coins, 100);
  assert.equal(bigReward.reward.hearts, 1);
});
