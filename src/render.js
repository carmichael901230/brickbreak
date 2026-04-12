import { GAME_CONFIG } from "./config.js";

function alphaColor(color, alpha) {
  return `${color}${Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function getVisibleBrickRect(state, config, x, y) {
  const inset = Math.min(config.visualBrickGap / 2, state.arena.blockSize * 0.18);
  return {
    x: x + inset,
    y: y + inset,
    size: state.arena.blockSize - inset * 2
  };
}

function mixChannel(start, end, progress) {
  return Math.round(start + (end - start) * progress);
}

export function createRenderer(canvas, config = GAME_CONFIG) {
  const context = canvas.getContext("2d");

  function resize() {
    const ratio = globalThis.devicePixelRatio || 1;
    canvas.width = config.width * ratio;
    canvas.height = config.height * ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function render(state, resolveEntityPosition) {
    context.clearRect(0, 0, config.width, config.height);
    drawBackground();
    drawGrid(state);
    drawFailLine(state);
    drawBlocks(state, resolveEntityPosition);
    drawPickups(state, resolveEntityPosition);
    drawAimGuide(state);
    drawBalls(state);
    drawParticles(state);
    drawLauncher(state);
    drawBanner(state);
    drawGameOverMessage(state);
  }

  function drawBackground() {
    const gradient = context.createLinearGradient(0, 0, 0, config.height);
    gradient.addColorStop(0, "#0b1626");
    gradient.addColorStop(1, "#112742");
    context.fillStyle = gradient;
    context.fillRect(0, 0, config.width, config.height);
  }

  function drawGrid(state) {
    context.save();
    context.strokeStyle = "rgba(255,255,255,0.05)";
    context.lineWidth = 1;
    for (let row = 0; row <= config.visibleRows; row += 1) {
      const y = config.topPadding + row * state.arena.laneHeight;
      context.beginPath();
      context.moveTo(config.sidePadding, y);
      context.lineTo(config.width - config.sidePadding, y);
      context.stroke();
    }
    context.restore();
  }

  function drawFailLine(state) {
    context.save();
    context.strokeStyle = "rgba(255, 127, 127, 0.35)";
    context.setLineDash([12, 10]);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(config.sidePadding, state.arena.failLineY);
    context.lineTo(config.width - config.sidePadding, state.arena.failLineY);
    context.stroke();
    context.restore();
  }

  function drawBlocks(state, resolveEntityPosition) {
    for (const block of state.blocks) {
      const { x, y } = resolveEntityPosition(block);
      const visibleRect = getVisibleBrickRect(state, config, x, y);
      const lifeRatio = Math.max(0, Math.min(1, block.hp / Math.max(1, block.maxHp ?? block.hp)));
      const fill = `rgba(${mixChannel(74, 200, lifeRatio)}, ${mixChannel(102, 224, lifeRatio)}, ${mixChannel(132, 255, lifeRatio)}, 0.92)`;
      context.fillStyle = fill;
      context.fillRect(visibleRect.x, visibleRect.y, visibleRect.size, visibleRect.size);

      if (block.hitFlash > 0) {
        context.fillStyle = alphaColor("#ffffff", block.hitFlash * 1.6);
        context.fillRect(visibleRect.x, visibleRect.y, visibleRect.size, visibleRect.size);
      }

      context.strokeStyle = "rgba(255,255,255,0.16)";
      context.lineWidth = 2;
      context.strokeRect(visibleRect.x, visibleRect.y, visibleRect.size, visibleRect.size);

      context.fillStyle = "#eef8ff";
      context.font = "700 30px 'Segoe UI'";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(block.hp), visibleRect.x + visibleRect.size / 2, visibleRect.y + visibleRect.size / 2 + 2);
    }
  }

  function drawPickups(state, resolveEntityPosition) {
    for (const pickup of state.pickups) {
      if (pickup.collected) {
        continue;
      }
      const { x, y } = resolveEntityPosition(pickup);
      const centerX = x + state.arena.blockSize / 2;
      const centerY = y + state.arena.blockSize / 2;
      context.beginPath();
      context.arc(centerX, centerY, config.pickupRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 179, 71, 0.18)";
      context.fill();
      context.lineWidth = 3;
      context.strokeStyle = "#ffcf8c";
      context.stroke();
      context.beginPath();
      context.moveTo(centerX - 6, centerY);
      context.lineTo(centerX + 6, centerY);
      context.moveTo(centerX, centerY - 6);
      context.lineTo(centerX, centerY + 6);
      context.strokeStyle = "#fff8ed";
      context.lineWidth = 2;
      context.stroke();
    }
  }

  function drawAimGuide(state) {
    if (!state.aiming || !state.aimPoint) {
      return;
    }

    context.save();
    context.strokeStyle = "rgba(255,255,255,0.45)";
    context.setLineDash([8, 12]);
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(state.launcherX, state.arena.launcherY);
    context.lineTo(state.aimPoint.x, state.aimPoint.y);
    context.stroke();
    context.restore();
  }

  function drawBalls(state) {
    for (const ball of state.balls) {
      context.beginPath();
      context.arc(ball.x, ball.y, config.ballRadius, 0, Math.PI * 2);
      context.fillStyle = "#eff9ff";
      context.shadowBlur = 18;
      context.shadowColor = "rgba(121, 224, 255, 0.75)";
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      context.beginPath();
      context.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      const alpha = particle.life / particle.maxLife;
      context.fillStyle = particle.tone === "pickup"
        ? alphaColor("#ffcf8c", alpha)
        : alphaColor("#a8efff", alpha);
      context.fill();
    }
  }

  function drawLauncher(state) {
    const pulse = 0.5 + Math.sin(performance.now() * 0.005) * 0.12;
    context.beginPath();
    context.arc(state.launcherX, state.arena.launcherY, 13 + pulse * 2, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 179, 71, 0.18)";
    context.fill();
    context.beginPath();
    context.arc(state.launcherX, state.arena.launcherY, 10, 0, Math.PI * 2);
    context.fillStyle = "#ffcc80";
    context.fill();

    // Keep the ball count anchored to the launcher so the player can read volley size at a glance.
    context.fillStyle = "#d8f1ff";
    context.font = "700 20px 'Segoe UI'";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(`x${state.ballsOwned}`, state.launcherX + 22, state.arena.launcherY);
  }

  function drawBanner(state) {
    if (state.bannerTimer <= 0) {
      return;
    }

    const alpha = Math.min(1, state.bannerTimer / config.effects.roundBannerTime);
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = "rgba(7, 14, 22, 0.55)";
    drawRoundedRect(context, config.width / 2 - 84, 32, 168, 54, 18);
    context.fill();
    context.fillStyle = "#d8f0ff";
    context.font = "700 24px 'Segoe UI'";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(`Round ${state.round}`, config.width / 2, 59);
    context.restore();
  }

  function drawGameOverMessage(state) {
    if (state.state !== "gameover") {
      return;
    }

    context.save();
    context.fillStyle = "rgba(4, 10, 18, 0.72)";
    context.fillRect(0, 0, config.width, config.height);

    drawRoundedRect(context, config.width / 2 - 190, config.height / 2 - 96, 380, 192, 24);
    context.fillStyle = "rgba(15, 29, 48, 0.94)";
    context.fill();
    context.strokeStyle = "rgba(255, 255, 255, 0.14)";
    context.lineWidth = 2;
    context.stroke();

    context.fillStyle = "#f5fbff";
    context.font = "700 42px 'Segoe UI'";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("Run Over", config.width / 2, config.height / 2 - 28);

    context.fillStyle = "#c9e7ff";
    context.font = "500 24px 'Segoe UI'";
    context.fillText(`Reached round ${state.round}`, config.width / 2, config.height / 2 + 16);
    context.fillText("Press Restart Run to play again", config.width / 2, config.height / 2 + 54);
    context.restore();
  }

  resize();

  return {
    resize,
    render
  };
}
