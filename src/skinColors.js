export const DEFAULT_RAINBOW_HP_COLORS = [
  "#ef4444",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#3b82f6",
  "#4f46e5",
  "#8b5cf6"
];

export const DEFAULT_RAINBOW_SEQUENCE_COLORS = DEFAULT_RAINBOW_HP_COLORS;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function mixChannel(start, end, progress) {
  return Math.round(start + (end - start) * progress);
}

export function parseHexColor(color) {
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

export function rgbaFromHex(color, alpha = 1) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  return rgbaFromRgb(rgb, alpha);
}

export function rgbaFromRgb(rgb, alpha = 1) {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function darkenParsedSkinColor(rgb, lifeRatio) {
  const shade = 0.36 + clamp01(lifeRatio) * 0.64;
  return `rgba(${Math.round(rgb.r * shade)}, ${Math.round(rgb.g * shade)}, ${Math.round(rgb.b * shade)}, 0.92)`;
}

export function darkenSkinColor(color, lifeRatio) {
  const rgb = parseHexColor(color);
  if (!rgb) {
    return color;
  }

  return darkenParsedSkinColor(rgb, lifeRatio);
}

export function defaultBrickFillColor(lifeRatio) {
  const progress = clamp01(lifeRatio);
  return `rgba(${mixChannel(74, 200, progress)}, ${mixChannel(102, 224, progress)}, ${mixChannel(132, 255, progress)}, 0.92)`;
}

export function resolveRainbowHpColor(colors = DEFAULT_RAINBOW_HP_COLORS, lifeRatio = 1) {
  const palette = colors
    .map((color) => parseHexColor(color))
    .filter(Boolean);

  if (palette.length === 0) {
    return rgbaFromHex(DEFAULT_RAINBOW_HP_COLORS[0], 0.92);
  }
  if (palette.length === 1) {
    return rgbaFromRgb(palette[0], 0.92);
  }

  const progress = 1 - clamp01(lifeRatio);
  const scaled = progress * (palette.length - 1);
  const startIndex = Math.min(palette.length - 2, Math.floor(scaled));
  const localProgress = scaled - startIndex;
  const start = palette[startIndex];
  const end = palette[startIndex + 1];

  return rgbaFromRgb({
    r: mixChannel(start.r, end.r, localProgress),
    g: mixChannel(start.g, end.g, localProgress),
    b: mixChannel(start.b, end.b, localProgress)
  }, 0.92);
}

export function resolveRainbowSequenceColor(colors = DEFAULT_RAINBOW_SEQUENCE_COLORS, index = 0) {
  const palette = colors?.length ? colors : DEFAULT_RAINBOW_SEQUENCE_COLORS;
  return palette[Math.abs(Math.floor(index)) % palette.length];
}

export function resolveBrickFillColor(skin, lifeRatio) {
  if (skin?.colorMode === "rainbowHp") {
    return resolveRainbowHpColor(skin.rainbowColors, lifeRatio);
  }

  if (skin?.color) {
    return darkenSkinColor(skin.color, lifeRatio);
  }

  return defaultBrickFillColor(lifeRatio);
}

export function brickShopSampleBackground(skin) {
  if (skin?.colorMode === "rainbowHp" || skin?.colorMode === "rainbowLaunch") {
    const colors = skin.rainbowColors?.length ? skin.rainbowColors : DEFAULT_RAINBOW_SEQUENCE_COLORS;
    return `linear-gradient(135deg, ${colors.join(", ")})`;
  }

  return skin?.color ?? "#c8e0ff";
}
