import test from "node:test";
import assert from "node:assert/strict";

import { clampLaunchDirection, reflectBall, resolveBallBlockCollision } from "../src/physics.js";

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
