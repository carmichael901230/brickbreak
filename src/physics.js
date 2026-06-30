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

  const distances = [
    { value: Math.abs(ball.x - rect.x), normal: { x: -1, y: 0 }, closestX: rect.x, closestY: ball.y },
    { value: Math.abs(right - ball.x), normal: { x: 1, y: 0 }, closestX: right, closestY: ball.y },
    { value: Math.abs(ball.y - rect.y), normal: { x: 0, y: -1 }, closestX: ball.x, closestY: rect.y },
    { value: Math.abs(bottom - ball.y), normal: { x: 0, y: 1 }, closestX: ball.x, closestY: bottom }
  ];
  distances.sort((a, b) => {
    if (a.value !== b.value) {
      return a.value - b.value;
    }
    const aDot = ball.vx * a.normal.x + ball.vy * a.normal.y;
    const bDot = ball.vx * b.normal.x + ball.vy * b.normal.y;
    return aDot - bDot;
  });

  return {
    distance: -distances[0].value,
    normal: distances[0].normal,
    closestX: distances[0].closestX,
    closestY: distances[0].closestY
  };
}

function segmentCollisionCandidate(ball, segment, config) {
  const vx = segment.x2 - segment.x1;
  const vy = segment.y2 - segment.y1;
  const lengthSquared = vx * vx + vy * vy;
  if (lengthSquared <= 0) {
    return null;
  }

  const t = Math.max(0, Math.min(1, ((ball.x - segment.x1) * vx + (ball.y - segment.y1) * vy) / lengthSquared));
  const closestX = segment.x1 + vx * t;
  const closestY = segment.y1 + vy * t;
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > config.ballRadius * config.ballRadius) {
    return null;
  }

  const distance = Math.sqrt(distanceSquared);
  const normal = distance > 0
    ? { x: dx / distance, y: dy / distance }
    : segment.normal;

  return {
    distance,
    normal,
    closestX,
    closestY
  };
}

function gutterSegments(rect, neighbors) {
  const left = rect.x;
  const right = rect.x + rect.size;
  const top = rect.y;
  const bottom = rect.y + rect.size;
  const x1 = neighbors.left ? left - rect.inset : left;
  const x2 = neighbors.right ? right + rect.inset : right;
  const y1 = neighbors.top ? top - rect.inset : top;
  const y2 = neighbors.bottom ? bottom + rect.inset : bottom;
  const segments = [];

  if (neighbors.left || neighbors.right) {
    segments.push(
      { x1, y1: top, x2, y2: top, normal: { x: 0, y: -1 } },
      { x1, y1: bottom, x2, y2: bottom, normal: { x: 0, y: 1 } }
    );
  }

  if (neighbors.top || neighbors.bottom) {
    segments.push(
      { x1: left, y1, x2: left, y2, normal: { x: -1, y: 0 } },
      { x1: right, y1, x2: right, y2, normal: { x: 1, y: 0 } }
    );
  }

  return segments;
}

export function resolveBallBlockCollision(ball, blockRect, config = GAME_CONFIG, neighbors = {}) {
  const rect = visibleBrickRect(blockRect, config);
  const candidates = [
    rectCollisionCandidate(ball, rect, config),
    ...gutterSegments(rect, neighbors).map((segment) => segmentCollisionCandidate(ball, segment, config))
  ].filter(Boolean);

  if (candidates.length === 0) {
    return false;
  }

  candidates.sort((a, b) => a.distance - b.distance);
  const hit = candidates[0];
  ball.x = hit.closestX + hit.normal.x * (config.ballRadius + 0.01);
  ball.y = hit.closestY + hit.normal.y * (config.ballRadius + 0.01);
  reflectVelocity(ball, hit.normal);

  return true;
}
