#!/usr/bin/env python3
"""Extract a transparent block-skin overlay from a flat screenshot.

The script keeps dark details and light teeth/highlights, removes components
touching the source border, and scales the result onto a square transparent PNG.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Source screenshot path")
    parser.add_argument("--out", required=True, help="Output transparent PNG path")
    parser.add_argument("--size", type=int, default=512, help="Square output size")
    parser.add_argument("--dark-threshold", type=int, default=70, help="Max RGB channel for dark details")
    parser.add_argument("--light-threshold", type=int, default=210, help="Min RGB channel for light details")
    parser.add_argument("--min-component", type=int, default=8, help="Drop smaller connected components")
    parser.add_argument("--edge-strengthen", action="store_true", help="Slightly thicken antialiased details")
    return parser.parse_args()


def is_detail_pixel(r: int, g: int, b: int, dark: int, light: int) -> bool:
    is_dark = r < dark and g < dark and b < dark
    is_light = r > light and g > light - 5 and b > light - 25
    return is_dark or is_light


def extract_overlay(source: Image.Image, args: argparse.Namespace) -> Image.Image:
    image = source.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    candidates = [[False] * height for _ in range(width)]

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a and is_detail_pixel(r, g, b, args.dark_threshold, args.light_threshold):
                candidates[x][y] = True

    seen = [[False] * height for _ in range(width)]
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_pixels = overlay.load()

    for start_y in range(height):
        for start_x in range(width):
            if not candidates[start_x][start_y] or seen[start_x][start_y]:
                continue

            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen[start_x][start_y] = True
            component: list[tuple[int, int]] = []
            touches_border = False

            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                if x <= 1 or y <= 1 or x >= width - 2 or y >= height - 2:
                    touches_border = True

                for nx in (x - 1, x, x + 1):
                    for ny in (y - 1, y, y + 1):
                        if nx == x and ny == y:
                            continue
                        if 0 <= nx < width and 0 <= ny < height and candidates[nx][ny] and not seen[nx][ny]:
                            seen[nx][ny] = True
                            queue.append((nx, ny))

            if touches_border or len(component) < args.min_component:
                continue

            for x, y in component:
                r, g, b, _ = pixels[x, y]
                if r < args.dark_threshold and g < args.dark_threshold and b < args.dark_threshold:
                    overlay_pixels[x, y] = (8, 10, 12, 255)
                else:
                    overlay_pixels[x, y] = (255, 248, 232, 255)

    scaled_height = round(args.size * height / width)
    resized = overlay.resize((args.size, scaled_height), Image.Resampling.LANCZOS)
    result = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
    result.alpha_composite(resized, (0, round((args.size - scaled_height) / 2)))

    if args.edge_strengthen:
        alpha = result.getchannel("A").filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.35))
        result.putalpha(alpha)

    return result


def main() -> None:
    args = parse_args()
    result = extract_overlay(Image.open(args.input), args)
    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    result.save(output)

    alpha = result.getchannel("A")
    hist = alpha.histogram()
    total = result.width * result.height
    print(f"wrote {output}")
    print(f"size={result.size} mode={result.mode}")
    print(f"transparent={hist[0]} opaque={hist[255]} partial={sum(hist[1:255])} total={total}")
    print(f"corner={result.getpixel((0, 0))} center={result.getpixel((result.width // 2, result.height // 2))}")


if __name__ == "__main__":
    main()
