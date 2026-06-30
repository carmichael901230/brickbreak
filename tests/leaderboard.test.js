import test from "node:test";
import assert from "node:assert/strict";

import {
  createLeaderboard,
  CURRENT_USER_PROVINCE,
  estimateCurrentRank,
  FAKE_LEADERBOARD_USERS,
  formatRank,
  maskWeChatName
} from "../src/leaderboard.js";

test("maskWeChatName keeps edges and hides middle characters", () => {
  assert.equal(maskWeChatName("Li"), "L*");
  assert.equal(maskWeChatName("Alice"), "A***e");
  assert.equal(maskWeChatName("A"), "A");
});

test("leaderboard returns top 10 rows", () => {
  const board = createLeaderboard({ currentBestLevel: 1, boardType: "total" });

  assert.equal(board.topRows.length, 10);
  assert.equal(board.topRows[0].rankLabel, "1");
  assert.ok(board.topRows.every((row) => row.bestLevel > 0));
});

test("current user is summarized separately when outside top 10", () => {
  const board = createLeaderboard({ currentBestLevel: 1, boardType: "total" });

  assert.equal(board.topRows.some((row) => row.isCurrentUser), false);
  assert.equal(board.currentUser.isCurrentUser, true);
  assert.equal(board.currentUser.rankLabel, "999+");
});

test("current user can appear inside top 10", () => {
  const board = createLeaderboard({ currentBestLevel: 1900, boardType: "total" });

  assert.equal(board.topRows.some((row) => row.isCurrentUser), true);
  assert.equal(board.currentUser.rankLabel, "8");
});

test("province board only uses Guangdong fake records", () => {
  const total = createLeaderboard({ currentBestLevel: 12, boardType: "total" });
  const province = createLeaderboard({ currentBestLevel: 12, boardType: "province" });

  assert.deepEqual(total.fakeUsers.map((user) => user.id), FAKE_LEADERBOARD_USERS.map((user) => user.id));
  assert.ok(province.fakeUsers.length >= 10);
  assert.ok(province.fakeUsers.every((user) => user.province === CURRENT_USER_PROVINCE));
  assert.notDeepEqual(total.topRows.map((row) => row.id), province.topRows.map((row) => row.id));
});

test("national fake records stay elevated at the top", () => {
  const board = createLeaderboard({ currentBestLevel: 1, boardType: "total" });

  assert.ok(board.topRows[0].bestLevel >= 1100);
  assert.ok(board.topRows[9].bestLevel >= 900);
});

test("rank labels use exact, 99+, and 999+ buckets", () => {
  assert.equal(formatRank(100), "100");
  assert.equal(formatRank(101), "99+");
  assert.equal(formatRank(1000), "99+");
  assert.equal(formatRank(1001), "999+");
});

test("long-tail ranking improves as best level rises", () => {
  const lowRank = estimateCurrentRank(100, "total");
  const middleRank = estimateCurrentRank(800, "total");
  const highRank = estimateCurrentRank(1200, "total");

  assert.ok(lowRank > 1000);
  assert.ok(middleRank > 100);
  assert.ok(highRank < 100);
  assert.ok(lowRank > middleRank);
  assert.ok(middleRank > highRank);
});
