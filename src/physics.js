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
  if (ball.x <= config.ballRadius && ball.vx < 0) {
    ball.x = config.ballRadius;
    ball.vx *= -1;
  } else if (ball.x >= arena.width - config.ballRadius && ball.vx > 0) {
    ball.x = arena.width - config.ballRadius;
    ball.vx *= -1;
  }

  if (ball.y <= config.ballRadius && ball.vy < 0) {
    ball.y = config.ballRadius;
    ball.vy *= -1;
  }
}

export function resolveBallBlockCollision(ball, blockRect, config = GAME_CONFIG) {
  // Expand the hidden collision box so the visible gutter between bricks never becomes a playable tunnel.
  const expandedRect = {
    x: blockRect.x - config.collisionPadding,
    y: blockRect.y - config.collisionPadding,
    size: blockRect.size + config.collisionPadding * 2
  };
  const closestX = Math.max(expandedRect.x, Math.min(ball.x, expandedRect.x + expandedRect.size));
  const closestY = Math.max(expandedRect.y, Math.min(ball.y, expandedRect.y + expandedRect.size));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distanceSquared = dx * dx + dy * dy;

  if (distanceSquared > config.ballRadius * config.ballRadius) {
    return false;
  }

  const overlapLeft = Math.abs(ball.x + config.ballRadius - expandedRect.x);
  const overlapRight = Math.abs(expandedRect.x + expandedRect.size - (ball.x - config.ballRadius));
  const overlapTop = Math.abs(ball.y + config.ballRadius - expandedRect.y);
  const overlapBottom = Math.abs(expandedRect.y + expandedRect.size - (ball.y - config.ballRadius));
  const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

  if (minOverlap === overlapLeft || minOverlap === overlapRight) {
    ball.vx *= -1;
    if (minOverlap === overlapLeft) {
      ball.x = expandedRect.x - config.ballRadius - 1;
    } else {
      ball.x = expandedRect.x + expandedRect.size + config.ballRadius + 1;
    }
  } else {
    ball.vy *= -1;
    if (minOverlap === overlapTop) {
      ball.y = expandedRect.y - config.ballRadius - 1;
    } else {
      ball.y = expandedRect.y + expandedRect.size + config.ballRadius + 1;
    }
  }

  return true;
}
