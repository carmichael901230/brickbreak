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

function parseHexColor(color) {
  const normalized = color?.replace("#", "");
  if (!normalized || !/^[\da-f]{6}$/i.test(normalized)) {
    return null;
  }

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function darkenSkinColor(color, lifeRatio) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  const shade = 0.36 + Math.max(0, Math.min(1, lifeRatio)) * 0.64;
  return `rgba(${Math.round(rgb.r * shade)}, ${Math.round(rgb.g * shade)}, ${Math.round(rgb.b * shade)}, 0.92)`;
}

function rgbaFromHex(color, alpha = 1) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function createImageAsset(src) {
  if (typeof Image === "undefined") {
    return { image: null, loaded: false };
  }

  const image = new Image();
  const asset = { image, loaded: false };
  image.onload = () => {
    asset.loaded = true;
  };
  image.onerror = () => {
    asset.loaded = false;
  };
  image.src = src;
  return asset;
}

function createSkinAssetMap(config, providedAssets = {}) {
  const assets = { ...providedAssets };
  for (const skin of config.skins?.ball ?? []) {
    const image = skin.gameImage ?? skin.image;
    if (image && !assets[image]) {
      assets[image] = createImageAsset(image);
    }
  }
  return assets;
}

function findSkin(config, type, skinId) {
  return config.skins?.[type]?.find((skin) => skin.id === skinId) ?? null;
}

function findSkinColor(config, type, skinId) {
  return findSkin(config, type, skinId)?.color ?? null;
}

function selectedBrickSkin(state, config) {
  return findSkin(config, "brick", state.skins?.selected?.brick);
}

function selectedBallSkin(state, config) {
  return findSkin(config, "ball", state.skins?.selected?.ball);
}

export function createRenderer(canvas, config = GAME_CONFIG, options = {}) {
  const context = canvas.getContext("2d");
  const autoResize = options.autoResize !== false;
  const pixelRatio = options.pixelRatio || globalThis.devicePixelRatio || 1;
  const showRoundBanner = options.showRoundBanner !== false;
  const coinAsset = options.coinAsset || createImageAsset("src/assets/pic/dollar.png");
  const heartAsset = options.heartAsset || createImageAsset("src/assets/pic/heart.png");
  const ballSkinAssets = createSkinAssetMap(config, options.ballSkinAssets);

  function drawScene(state, resolveEntityPosition) {
    drawBackground();
    drawGrid(state);
    drawFailLine(state);
    drawBlocks(state, resolveEntityPosition);
    drawPickups(state, resolveEntityPosition);
    drawCoins(state, resolveEntityPosition);
    drawAimGuide(state);
    drawBalls(state);
    drawParticles(state);
    drawLauncher(state);
    drawDangerGlow(state, resolveEntityPosition);
    drawHeartConsumeEffect(state);
    if (showRoundBanner) {
      drawBanner(state);
    }
    drawGameOverMessage(state);
  }

  function resize() {
    if (!autoResize) {
      return;
    }

    canvas.width = config.width * pixelRatio;
    canvas.height = config.height * pixelRatio;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function render(state, resolveEntityPosition, overlayRenderer = null, viewport = null) {
    if (viewport) {
      context.clearRect(0, 0, viewport.screenWidth, viewport.screenHeight);
      context.save();
      context.translate(viewport.x, viewport.y);
      context.scale(viewport.width / config.width, viewport.height / config.height);
      drawScene(state, resolveEntityPosition);
      context.restore();
    } else {
      context.clearRect(0, 0, config.width, config.height);
      drawScene(state, resolveEntityPosition);
    }

    if (overlayRenderer) {
      overlayRenderer(context, state, viewport);
    }
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

  function hasBrickNearFailLine(state, resolveEntityPosition) {
    if (state.state === "gameover") {
      return false;
    }

    return state.blocks.some((block) => {
      if (block.hp <= 0) {
        return false;
      }

      const position = resolveEntityPosition(block);
      const blockBottom = position.y + state.arena.blockSize;
      return blockBottom >= state.arena.failLineY - state.arena.blockSize;
    });
  }

  function drawDangerGlow(state, resolveEntityPosition) {
    if (!hasBrickNearFailLine(state, resolveEntityPosition)) {
      return;
    }

    const timeNow = globalThis.performance?.now?.() ?? Date.now();
    const pulse = 0.72 + Math.sin(timeNow * 0.008) * 0.18;
    const edgeSize = 54;
    const red = `rgba(255, 54, 54, ${0.34 * pulse})`;
    const clear = "rgba(255, 54, 54, 0)";

    context.save();
    context.globalCompositeOperation = "screen";

    const top = context.createLinearGradient(0, 0, 0, edgeSize);
    top.addColorStop(0, red);
    top.addColorStop(1, clear);
    context.fillStyle = top;
    context.fillRect(0, 0, config.width, edgeSize);

    const bottom = context.createLinearGradient(0, config.height, 0, config.height - edgeSize);
    bottom.addColorStop(0, red);
    bottom.addColorStop(1, clear);
    context.fillStyle = bottom;
    context.fillRect(0, config.height - edgeSize, config.width, edgeSize);

    const left = context.createLinearGradient(0, 0, edgeSize, 0);
    left.addColorStop(0, red);
    left.addColorStop(1, clear);
    context.fillStyle = left;
    context.fillRect(0, 0, edgeSize, config.height);

    const right = context.createLinearGradient(config.width, 0, config.width - edgeSize, 0);
    right.addColorStop(0, red);
    right.addColorStop(1, clear);
    context.fillStyle = right;
    context.fillRect(config.width - edgeSize, 0, edgeSize, config.height);

    context.strokeStyle = `rgba(255, 88, 88, ${0.45 * pulse})`;
    context.lineWidth = 8;
    context.strokeRect(4, 4, config.width - 8, config.height - 8);
    context.restore();
  }

  function drawBlocks(state, resolveEntityPosition) {
    for (const block of state.blocks) {
      const { x, y } = resolveEntityPosition(block);
      const visibleRect = getVisibleBrickRect(state, config, x, y);
      const lifeRatio = Math.max(0, Math.min(1, block.hp / Math.max(1, block.maxHp ?? block.hp)));
      const brickSkin = selectedBrickSkin(state, config);
      const brickSkinColor = brickSkin?.color;
      const fill = brickSkinColor
        ? darkenSkinColor(brickSkinColor, lifeRatio)
        : `rgba(${mixChannel(74, 200, lifeRatio)}, ${mixChannel(102, 224, lifeRatio)}, ${mixChannel(132, 255, lifeRatio)}, 0.92)`;
      drawBrickSkin(visibleRect, fill, brickSkin, lifeRatio);

      if (block.hitFlash > 0) {
        context.fillStyle = alphaColor("#ffffff", block.hitFlash * 1.6);
        context.fillRect(visibleRect.x, visibleRect.y, visibleRect.size, visibleRect.size);
      }

      context.strokeStyle = "rgba(255,255,255,0.16)";
      context.lineWidth = 2;
      context.strokeRect(visibleRect.x, visibleRect.y, visibleRect.size, visibleRect.size);

      context.fillStyle = "#eef8ff";
      context.font = "700 36px 'Segoe UI'";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(String(block.hp), visibleRect.x + visibleRect.size / 2, visibleRect.y + visibleRect.size / 2 + 2);
    }
  }

  function drawBrickSkin(rect, fill, skin, lifeRatio) {
    const { x, y, size } = rect;
    const accent = skin?.accent ?? "#ffffff";
    const pattern = skin?.pattern ?? "plain";
    const centerX = x + size / 2;
    const centerY = y + size / 2;

    context.save();
    context.fillStyle = fill;
    context.fillRect(x, y, size, size);
    context.beginPath();
    context.rect(x, y, size, size);
    context.clip();

    context.globalAlpha = 0.55 + lifeRatio * 0.28;
    context.strokeStyle = rgbaFromHex(accent, 0.72);
    context.fillStyle = rgbaFromHex(accent, 0.5);
    context.lineWidth = Math.max(2, size * 0.045);

    if (pattern === "sunburst") {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.lineTo(centerX + Math.cos(angle) * size, centerY + Math.sin(angle) * size);
        context.stroke();
      }
      context.beginPath();
      context.arc(centerX, centerY, size * 0.22, 0, Math.PI * 2);
      context.fill();
    } else if (pattern === "candy") {
      context.lineWidth = Math.max(8, size * 0.16);
      for (let offset = -size; offset < size * 2; offset += size * 0.42) {
        context.beginPath();
        context.moveTo(x + offset, y + size);
        context.lineTo(x + offset + size, y);
        context.stroke();
      }
    } else if (pattern === "heart") {
      context.beginPath();
      context.moveTo(centerX, centerY + size * 0.2);
      context.bezierCurveTo(x + size * 0.18, y + size * 0.02, x + size * 0.1, y + size * 0.44, centerX, y + size * 0.68);
      context.bezierCurveTo(x + size * 0.9, y + size * 0.44, x + size * 0.82, y + size * 0.02, centerX, centerY + size * 0.2);
      context.fill();
    } else if (pattern === "prism") {
      context.beginPath();
      context.moveTo(x + size * 0.5, y + size * 0.12);
      context.lineTo(x + size * 0.84, y + size * 0.5);
      context.lineTo(x + size * 0.5, y + size * 0.88);
      context.lineTo(x + size * 0.16, y + size * 0.5);
      context.closePath();
      context.stroke();
      context.beginPath();
      context.moveTo(x + size * 0.5, y + size * 0.12);
      context.lineTo(x + size * 0.5, y + size * 0.88);
      context.moveTo(x + size * 0.16, y + size * 0.5);
      context.lineTo(x + size * 0.84, y + size * 0.5);
      context.stroke();
    } else if (pattern === "ice") {
      context.lineWidth = Math.max(1.5, size * 0.026);
      context.beginPath();
      context.moveTo(x + size * 0.18, y + size * 0.22);
      context.lineTo(x + size * 0.82, y + size * 0.38);
      context.lineTo(x + size * 0.58, y + size * 0.86);
      context.moveTo(x + size * 0.28, y + size * 0.78);
      context.lineTo(x + size * 0.48, y + size * 0.16);
      context.lineTo(x + size * 0.88, y + size * 0.72);
      context.stroke();
    } else if (pattern === "circuit") {
      context.lineWidth = Math.max(2, size * 0.035);
      const tracks = [
        [0.16, 0.28, 0.78, 0.28],
        [0.22, 0.54, 0.68, 0.54],
        [0.34, 0.78, 0.84, 0.78]
      ];
      for (const [x1, y1, x2, y2] of tracks) {
        context.beginPath();
        context.moveTo(x + size * x1, y + size * y1);
        context.lineTo(x + size * x2, y + size * y2);
        context.stroke();
        context.beginPath();
        context.arc(x + size * x2, y + size * y2, size * 0.045, 0, Math.PI * 2);
        context.fill();
      }
    } else if (pattern === "slime") {
      context.beginPath();
      context.arc(x + size * 0.28, y + size * 0.32, size * 0.1, 0, Math.PI * 2);
      context.arc(x + size * 0.7, y + size * 0.26, size * 0.07, 0, Math.PI * 2);
      context.arc(x + size * 0.58, y + size * 0.72, size * 0.12, 0, Math.PI * 2);
      context.fill();
    } else if (pattern === "leaf") {
      context.beginPath();
      context.ellipse(centerX, centerY, size * 0.18, size * 0.34, Math.PI / 4, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(x + size * 0.28, y + size * 0.72);
      context.lineTo(x + size * 0.72, y + size * 0.28);
      context.stroke();
    } else if (pattern === "lava") {
      context.lineWidth = Math.max(4, size * 0.07);
      context.beginPath();
      context.moveTo(x + size * 0.22, y);
      context.lineTo(x + size * 0.38, y + size * 0.34);
      context.lineTo(x + size * 0.3, y + size * 0.58);
      context.lineTo(x + size * 0.52, y + size);
      context.moveTo(x + size * 0.72, y + size * 0.04);
      context.lineTo(x + size * 0.6, y + size * 0.44);
      context.lineTo(x + size * 0.82, y + size * 0.78);
      context.stroke();
    } else if (pattern === "marble") {
      context.lineWidth = Math.max(2, size * 0.032);
      for (let offset = -0.1; offset < 1.2; offset += 0.28) {
        context.beginPath();
        context.moveTo(x + size * offset, y + size);
        context.bezierCurveTo(
          x + size * (offset + 0.18),
          y + size * 0.72,
          x + size * (offset - 0.05),
          y + size * 0.36,
          x + size * (offset + 0.22),
          y
        );
        context.stroke();
      }
    }

    context.globalAlpha = 1;
    const shine = context.createLinearGradient(x, y, x + size, y + size);
    shine.addColorStop(0, "rgba(255,255,255,0.22)");
    shine.addColorStop(0.5, "rgba(255,255,255,0)");
    shine.addColorStop(1, "rgba(0,0,0,0.18)");
    context.fillStyle = shine;
    context.fillRect(x, y, size, size);
    context.restore();
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
      const plusArm = Math.max(8, config.pickupRadius * 0.48);
      const plusWidth = Math.max(5, config.pickupRadius * 0.24);
      context.beginPath();
      context.moveTo(centerX - plusArm, centerY);
      context.lineTo(centerX + plusArm, centerY);
      context.moveTo(centerX, centerY - plusArm);
      context.lineTo(centerX, centerY + plusArm);
      context.strokeStyle = "#fff8ed";
      context.lineWidth = plusWidth;
      context.lineCap = "round";
      context.stroke();
    }
  }

  function drawCoins(state, resolveEntityPosition) {
    for (const coin of state.coinsOnBoard ?? []) {
      if (coin.collected) {
        continue;
      }

      const { x, y } = resolveEntityPosition(coin);
      const centerX = x + state.arena.blockSize / 2;
      const centerY = y + state.arena.blockSize / 2;
      const iconSize = config.coinRadius * 2.2;

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, config.coinRadius * 1.1, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 215, 96, 0.18)";
      context.fill();

      if (coinAsset.loaded && coinAsset.image) {
        context.drawImage(
          coinAsset.image,
          centerX - iconSize / 2,
          centerY - iconSize / 2,
          iconSize,
          iconSize
        );
      } else {
        context.beginPath();
        context.arc(centerX, centerY, config.coinRadius, 0, Math.PI * 2);
        context.fillStyle = "#f2b400";
        context.fill();
        context.fillStyle = "#1d1d1d";
        context.font = "700 24px 'Segoe UI'";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("$", centerX, centerY + 1);
      }

      context.restore();
    }
  }

  function drawAimGuide(state) {
    if (!state.aiming || !state.aimPoint) {
      return;
    }

    const startX = state.launcherX;
    const startY = state.arena.launcherY;
    const dx = state.aimPoint.x - startX;
    const dy = state.aimPoint.y - startY;
    const length = Math.hypot(dx, dy);
    if (length <= 0) {
      return;
    }

    const spacing = Math.max(18, config.ballRadius * 1.35);
    const radius = Math.max(3.2, config.ballRadius * 0.24);
    const firstDotOffset = Math.max(20, config.ballRadius * 1.5);
    const unitX = dx / length;
    const unitY = dy / length;

    context.save();
    context.fillStyle = "rgba(255,255,255,0.92)";
    context.shadowColor = "rgba(255,255,255,0.55)";
    context.shadowBlur = 5;

    for (let distance = firstDotOffset; distance < length; distance += spacing) {
      context.beginPath();
      context.arc(startX + unitX * distance, startY + unitY * distance, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function drawHeartShape(centerX, centerY, size, fill) {
    context.beginPath();
    context.moveTo(centerX, centerY + size * 0.56);
    context.bezierCurveTo(centerX - size * 1.05, centerY - size * 0.05, centerX - size * 0.72, centerY - size * 0.78, centerX, centerY - size * 0.28);
    context.bezierCurveTo(centerX + size * 0.72, centerY - size * 0.78, centerX + size * 1.05, centerY - size * 0.05, centerX, centerY + size * 0.56);
    context.fillStyle = fill;
    context.fill();
  }

  function drawBalls(state) {
    for (const ball of state.balls) {
      // Only active balls should render in-flight; settled or queued balls are represented by the launcher.
      if (!ball.active || ball.returned) {
        continue;
      }

      context.beginPath();
      context.arc(ball.x, ball.y, config.ballRadius, 0, Math.PI * 2);
      drawBallSkin(ball.x, ball.y, config.ballRadius, state, 18);
    }
  }

  function drawBallSkin(centerX, centerY, radius, state, shadowBlur = 0) {
    const skin = selectedBallSkin(state, config);
    const image = skin?.gameImage ?? skin?.image;
    const asset = image ? ballSkinAssets[image] : null;

    context.save();
    if (shadowBlur > 0) {
      context.shadowBlur = shadowBlur;
      context.shadowColor = "rgba(121, 224, 255, 0.75)";
    }

    if (asset?.loaded && asset.image) {
      const diameter = radius * 2;
      context.drawImage(asset.image, centerX - radius, centerY - radius, diameter, diameter);
    } else {
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.fillStyle = skin?.color ?? "#eff9ff";
      context.fill();
    }

    context.restore();
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      context.beginPath();
      context.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
      const alpha = particle.life / particle.maxLife;
      context.fillStyle = particle.tone === "heart"
        ? alphaColor("#ff6f8e", alpha)
        : particle.tone === "pickup" || particle.tone === "coin"
          ? alphaColor("#ffcf8c", alpha)
          : alphaColor("#a8efff", alpha);
      context.fill();
    }
  }

  function drawHeartConsumeEffect(state) {
    const effect = state.heartConsumeEffect;
    if (!effect) {
      return;
    }

    const progress = 1 - effect.life / effect.maxLife;
    const alpha = Math.max(0, 1 - progress);
    const iconScale = progress < 0.55
      ? 1.35 - (progress / 0.55) * 0.45
      : 0.9 + ((progress - 0.55) / 0.45) * 0.5;
    const ringRadius = 44 + progress * 130;
    const centerX = config.width / 2;
    const centerY = config.height / 2;
    const iconSize = 86 * iconScale;

    context.save();
    context.globalCompositeOperation = "screen";
    context.strokeStyle = `rgba(255, 111, 142, ${0.75 * alpha})`;
    context.lineWidth = 8 * alpha;
    context.beginPath();
    context.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
    context.stroke();

    const flash = context.createLinearGradient(0, state.arena.failLineY - 42, 0, state.arena.failLineY + 42);
    flash.addColorStop(0, "rgba(255, 111, 142, 0)");
    flash.addColorStop(0.5, `rgba(255, 111, 142, ${0.26 * alpha})`);
    flash.addColorStop(1, "rgba(255, 111, 142, 0)");
    context.fillStyle = flash;
    context.fillRect(0, state.arena.failLineY - 42, config.width, 84);

    context.globalCompositeOperation = "source-over";
    context.globalAlpha = Math.min(1, alpha + 0.15);
    context.shadowColor = "rgba(255, 111, 142, 0.78)";
    context.shadowBlur = 22;
    if (heartAsset.loaded && heartAsset.image) {
      context.drawImage(heartAsset.image, centerX - iconSize / 2, centerY - iconSize / 2, iconSize, iconSize);
    } else {
      drawHeartShape(centerX, centerY, iconSize / 2, "#ff6f8e");
    }
    context.restore();
  }

  function drawLauncher(state) {
    const timeNow = globalThis.performance?.now?.() ?? Date.now();
    const pulse = 0.5 + Math.sin(timeNow * 0.005) * 0.12;
    const launcherRadius = config.ballRadius;
    const queuedBalls = Math.max(0, state.ballsOwned - state.ballsLaunched);
    context.beginPath();
    context.arc(state.launcherX, state.arena.launcherY, launcherRadius + 3 + pulse * 2, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 179, 71, 0.18)";
    context.fill();
    context.beginPath();
    context.arc(state.launcherX, state.arena.launcherY, launcherRadius, 0, Math.PI * 2);
    drawBallSkin(state.launcherX, state.arena.launcherY, launcherRadius, state);

    // Count down queued balls during launch so the volley size reads like remaining ammo.
    context.fillStyle = "#d8f1ff";
    context.font = "700 28px 'Segoe UI'";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText(`x${queuedBalls}`, state.launcherX + launcherRadius + 18, state.arena.launcherY + 1);
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

  if (autoResize) {
    resize();
  }

  return {
    context,
    resize,
    render
  };
}
