import { GAME_CONFIG } from "./config.js";

export function normalizeVector(vector) {
  const magnitude = Math.hypot(vector.x, vector.y) || 1;
  return {
    x: vector.x / magnitude,
    y: vector.y / magnitude
  };
}

export function clampLaunchDirection(vector, config = GAME_CONFIG) {
  const normalized = normalizeVector(vector);
  let angle = Math.atan2(-normalized.y, normalized.x);
  angle = Math.max(config.minLaunchAngle, Math.min(config.maxLaunchAngle, angle));

  return {
    x: Math.cos(angle),
    y: -Math.sin(angle)
  };
}

export function reflectBall(ball, arena, config = GAME_CONFIG) {
  const hit = {
    left: false,
    right: false,
    ceiling: false,
    any: false
  };

  if (ball.x <= config.ballRadius && ball.vx < 0) {
    ball.x = config.ballRadius;
    ball.vx *= -1;
    hit.left = true;
  } else if (ball.x >= arena.width - config.ballRadius && ball.vx > 0) {
    ball.x = arena.width - config.ballRadius;
    ball.vx *= -1;
    hit.right = true;
  }

  if (ball.y <= config.ballRadius && ball.vy < 0) {
    ball.y = config.ballRadius;
    ball.vy *= -1;
    hit.ceiling = true;
  }

  hit.any = hit.left || hit.right || hit.ceiling;
  return hit;
}

function visibleBrickRect(blockRect, config) {
  const inset = Math.min(config.visualBrickGap / 2, blockRect.size * 0.18);
  return {
    x: blockRect.x + inset,
    y: blockRect.y + inset,
    size: blockRect.size - inset * 2,
    inset
  };
}

function reflectVelocity(ball, normal) {
  const dot = ball.vx * normal.x + ball.vy * normal.y;
  if (dot >= 0) {
    return;
  }

  ball.vx -= 2 * dot * normal.x;
  ball.vy -= 2 * dot * normal.y;
}

function isBetterInsideSide(ball, value, normalX, normalY, closestValue, closestNormalX, closestNormalY) {
  return (
    value < closestValue ||
    (
      value === closestValue &&
      ball.vx * normalX + ball.vy * normalY < ball.vx * closestNormalX + ball.vy * closestNormalY
    )
  );
}

function rectCollisionCandidate(ball, rect, config) {
  const right = rect.x + rect.size;
  const bottom = rect.y + rect.size;
  const closestX = Math.max(rect.x, Math.min(ball.x, right));
  const closestY = Math.max(rect.y, Math.min(ball.y, bottom));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > config.ballRadius * config.ballRadius) {
    return null;
  }

  if (distanceSquared > 0) {
    const distance = Math.sqrt(distanceSquared);
    return {
      distance,
      normal: { x: dx / distance, y: dy / distance },
      closestX,
      closestY
    };
  }

  let closestValue = Math.abs(ball.x - rect.x);
  let normalX = -1;
  let normalY = 0;
  let hitX = rect.x;
  let hitY = ball.y;

  const rightDistance = Math.abs(right - ball.x);
  if (isBetterInsideSide(ball, rightDistance, 1, 0, closestValue, normalX, normalY)) {
    closestValue = rightDistance;
    normalX = 1;
    normalY = 0;
    hitX = right;
    hitY = ball.y;
  }

  const topDistance = Math.abs(ball.y - rect.y);
  if (isBetterInsideSide(ball, topDistance, 0, -1, closestValue, normalX, normalY)) {
    closestValue = topDistance;
    normalX = 0;
    normalY = -1;
    hitX = ball.x;
    hitY = rect.y;
  }

  const bottomDistance = Math.abs(bottom - ball.y);
  if (isBetterInsideSide(ball, bottomDistance, 0, 1, closestValue, normalX, normalY)) {
    closestValue = bottomDistance;
    normalX = 0;
    normalY = 1;
    hitX = ball.x;
    hitY = bottom;
  }

  return {
    distance: -closestValue,
    normal: { x: normalX, y: normalY },
    closestX: hitX,
    closestY: hitY
  };
}

function segmentCollisionCandidate(ball, x1, y1, x2, y2, normal, config) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lengthSquared = vx * vx + vy * vy;
  if (lengthSquared <= 0) {
    return null;
  }

  const t = Math.max(0, Math.min(1, ((ball.x - x1) * vx + (ball.y - y1) * vy) / lengthSquared));
  const closestX = x1 + vx * t;
  const closestY = y1 + vy * t;
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > config.ballRadius * config.ballRadius) {
    return null;
  }

  const distance = Math.sqrt(distanceSquared);
  const hitNormal = distance > 0
    ? { x: dx / distance, y: dy / distance }
    : normal;

  return {
    distance,
    normal: hitNormal,
    closestX,
    closestY
  };
}

function nearerCollision(left, right) {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return right.distance < left.distance ? right : left;
}

function gutterCollisionCandidate(ball, rect, neighbors, config) {
  const left = rect.x;
  const right = rect.x + rect.size;
  const top = rect.y;
  const bottom = rect.y + rect.size;
  const x1 = neighbors.left ? left - rect.inset : left;
  const x2 = neighbors.right ? right + rect.inset : right;
  const y1 = neighbors.top ? top - rect.inset : top;
  const y2 = neighbors.bottom ? bottom + rect.inset : bottom;
  let hit = null;

  if (neighbors.left || neighbors.right) {
    hit = nearerCollision(
      hit,
      segmentCollisionCandidate(ball, x1, top, x2, top, { x: 0, y: -1 }, config)
    );
    hit = nearerCollision(
      hit,
      segmentCollisionCandidate(ball, x1, bottom, x2, bottom, { x: 0, y: 1 }, config)
    );
  }

  if (neighbors.top || neighbors.bottom) {
    hit = nearerCollision(
      hit,
      segmentCollisionCandidate(ball, left, y1, left, y2, { x: -1, y: 0 }, config)
    );
    hit = nearerCollision(
      hit,
      segmentCollisionCandidate(ball, right, y1, right, y2, { x: 1, y: 0 }, config)
    );
  }

  return hit;
}

export function resolveBallBlockCollision(ball, blockRect, config = GAME_CONFIG, neighbors = {}) {
  const rect = visibleBrickRect(blockRect, config);
  const hit = nearerCollision(
    rectCollisionCandidate(ball, rect, config),
    gutterCollisionCandidate(ball, rect, neighbors, config)
  );

  if (!hit) {
    return false;
  }

  ball.x = hit.closestX + hit.normal.x * (config.ballRadius + 0.01);
  ball.y = hit.closestY + hit.normal.y * (config.ballRadius + 0.01);
  reflectVelocity(ball, hit.normal);

  return true;
}
