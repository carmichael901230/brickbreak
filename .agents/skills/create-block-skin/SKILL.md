---
name: create-block-skin
description: Create new block/brick skins for this brick_break repo from screenshots or visual references. Use when Codex needs to make a transparent PNG overlay for a block face/details, add a `GAME_CONFIG.skins.brick` entry in `src/config.js`, reuse the existing `overlayImage` rendering path, choose HP badge placement, and validate gameplay/shop rendering.
---

# Create Block Skin

## Workflow

1. Inspect the current repo state before editing:
   - `git status --short`
   - `rg -n "brick-green-cyclops|overlayImage|storeImage|hpBadge|borderless|shape" src tests`
   - Read the relevant sections of `src/config.js`, `src/render.js`, and `src/miniGameApp.wx.js`.
2. If the user supplied a screenshot, create only an alpha PNG overlay:
   - Body fill/background pixels must be transparent.
   - Keep eyes, mouth, teeth, tongue, facial marks, outlines, highlights, and other character-defining details.
   - Do not bake the base body color into the PNG.
   - Do not add an outer block boundary unless it is truly part of the character design.
   - Center and scale the overlay to fill most of a square block.
3. Prefer deterministic extraction when the screenshot is simple:
   - Use `scripts/extract_block_overlay.py` for flat-color block screenshots.
   - Inspect the resulting alpha PNG and a composite preview before wiring it into config.
   - Use the built-in `imagegen` skill only when the screenshot/reference needs redrawing or creative simplification.
4. Add a new brick skin entry to `GAME_CONFIG.skins.brick` in `src/config.js`.
   - Use a unique `id`, Chinese `name`, base `color`, `price`, and the new PNG path.
   - Use `shape: "rounded"` for rounded screenshots.
   - Use `borderless: true` when there is no game-style border.
   - Set both `overlayImage` and `storeImage` to the transparent PNG.
   - Choose `hpBadge` so the number remains readable without covering the face.
5. Update rendering only if the selected `hpBadge` placement is not already supported.
   - Gameplay canvas path: `src/render.js`.
   - WeChat shop preview path: `src/miniGameApp.wx.js`.
   - Keep the existing `brick-green-cyclops` overlay path as the model.
6. Validate:
   - Confirm alpha: transparent corners and transparent body-color regions.
   - Confirm a composite over the base color looks like the intended character.
   - Run:
     - `node --check src\config.js`
     - `node --check src\render.js`
     - `node --check src\miniGameApp.wx.js`
     - `node tests\run.js`

## Config Pattern

Use this shape for overlay-based brick skins:

```js
{
  id: "brick-example",
  name: "中文砖名",
  color: "#ff9a3d",
  shape: "rounded",
  borderless: true,
  overlayImage: "src/assets/pic/bricks/example-overlay.png",
  storeImage: "src/assets/pic/bricks/example-overlay.png",
  hpBadge: "top-left",
  isNew: true,
  price: 200
}
```

## HP Badge Guidance

- Prefer an existing badge placement when possible.
- Use `bottom-right` for faces whose main details are in the upper/center area.
- Use `top-left` for faces with eyes near the middle and mouth/teeth near the bottom.
- Use `corner` only when a circular corner badge will not cover key artwork.
- If adding a placement, implement it in both `drawBlockHpText` in `src/render.js` and `drawShopPreviewBlockHp` in `src/miniGameApp.wx.js`.

## Asset Guidance

- Save final block overlays under `src/assets/pic/bricks/`.
- Use 512x512 PNG with alpha unless the repo establishes a newer size.
- Keep temporary composite previews out of the final repo unless the user asks to keep them.
- If a screenshot has a white app-frame border, remove it unless the border is part of the character.
- If anti-aliased teeth or highlights create a few low-alpha pixels, that is acceptable; body/background areas should still be fully transparent.
