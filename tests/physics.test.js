import test from "node:test";
import assert from "node:assert/strict";

import { GAME_CONFIG } from "../src/config.js";
import { clampLaunchDirection, reflectBall, resolveBallBlockCollision } from "../src/physics.js";

function assertClose(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
}

test("clampLaunchDirection prevents near-horizontal down shots", () => {
  const direction = clampLaunchDirection({ x: 1, y: 0.01 });
  assert.ok(direction.y < 0);
  assert.ok(direction.x > 0);
});

test("reflectBall bounces off arena walls and ceiling", () => {
  const ball = { x: 6, y: 6, vx: -120, vy: -240 };
  reflectBall(ball, { width: 720, height: 960 });
  assert.equal(ball.vx, 120);
  assert.equal(ball.vy, 240);
});

test("resolveBallBlockCollision flips velocity when a block is hit", () => {
  const ball = { x: 120, y: 120, vx: 140, vy: 0 };
  const hit = resolveBallBlockCollision(ball, { x: 124, y: 92, size: 80 });
  assert.equal(hit, true);
  assert.equal(ball.vx, -140);
});

test("resolveBallBlockCollision waits for visual contact on standalone sides", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const block = { x: 0, y: 0, size: 80 };
  const nearGapBall = { x: 83, y: 40, vx: -90, vy: 0 };
  const touchingBall = { x: 82, y: 40, vx: -90, vy: 0 };

  assert.equal(resolveBallBlockCollision(nearGapBall, block, customConfig), false);
  assert.equal(resolveBallBlockCollision(touchingBall, block, customConfig), true);
  assert.equal(touchingBall.vx, 90);
  assertClose(touchingBall.x, 82.01);
});

test("resolveBallBlockCollision closes horizontal gutters between side-by-side blocks", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const ball = { x: 80, y: -2, vx: 0, vy: 90 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig, { right: true });

  assert.equal(hit, true);
  assert.equal(ball.vx, 0);
  assert.equal(ball.vy, -90);
  assertClose(ball.y, -2.01);
});

test("resolveBallBlockCollision closes vertical gutters between stacked blocks", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const ball = { x: -2, y: 80, vx: 90, vy: 0 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig, { bottom: true });

  assert.equal(hit, true);
  assert.equal(ball.vx, -90);
  assert.equal(ball.vy, 0);
  assertClose(ball.x, -2.01);
});

test("resolveBallBlockCollision reflects corner hits along the corner normal", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const offset = customConfig.ballRadius / Math.SQRT2;
  const ball = { x: 4 - offset, y: 4 - offset, vx: 100, vy: 100 };
  const beforeSpeed = Math.hypot(ball.vx, ball.vy);
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig);

  assert.equal(hit, true);
  assertClose(ball.vx, -100);
  assertClose(ball.vy, -100);
  assertClose(Math.hypot(ball.vx, ball.vy), beforeSpeed);
  assertClose(Math.hypot(ball.x - 4, ball.y - 4), customConfig.ballRadius + 0.01);
});

test("resolveBallBlockCollision keeps near-corner side hits on the side normal", () => {
  const customConfig = {
    ...GAME_CONFIG,
    visualBrickGap: 8,
    ballRadius: 6
  };
  const ball = { x: 40, y: -2, vx: 35, vy: 90 };
  const hit = resolveBallBlockCollision(ball, { x: 0, y: 0, size: 80 }, customConfig);

  assert.equal(hit, true);
  assert.equal(ball.vx, 35);
  assert.equal(ball.vy, -90);
});
