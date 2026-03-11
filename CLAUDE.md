# @magic-spells/frame-engine

## Purpose

Calculates intermediate CSS styles between keyframes at any position (0-1). Used by animation systems that need to compute per-frame styles without CSS animations or the Web Animations API.

## Architecture

**Pre-flatten model**: All keyframe data is parsed once in `setKeyframes` into an internal numeric representation. `getFrame` then does pure math — no string parsing on the hot path.

Function-list properties (transform, filter, backdrop-filter) are "flattened" into individual keyed entries like `transform:translateX`, `transform:scale`, with a `transform:__order` key to track reassembly order.

## Keyframe format

Keyframes are passed as an object where keys are percent positions (0-100) and values are CSS style objects. Property names must use **camelCase** (e.g. `backgroundColor`, not `background-color`) — the engine passes them through as-is to `element.style`, which expects camelCase.

```js
new FrameEngine({
  0:   { opacity: '1', transform: 'translateX(0px)' },
  50:  { opacity: '0.5', transform: 'translateX(200px)' },
  100: { opacity: '0', transform: 'translateX(400px)' },
})
```

## Key files

- `src/frame-engine.js` — The entire library (single class, no dependencies)
- `src/frame-engine.d.ts` — TypeScript declarations for the public API
- `dist/frame-engine.min.js` — UMD build (production)
- `dist/frame-engine.esm.js` — ESM build (production)
- `demo/index.html` — Manual testing page with physics engine integration (served on port 3009 in dev mode)
- `vite.config.js` — Vite config: builds UMD + ESM to `dist/`, copies type declarations, dev server on port 3009

## Commands

- `npm run build` — Production build via Vite (UMD + ESM, minified)
- `npm run dev` — Vite dev server with HMR at localhost:3009 (opens demo/index.html)
- `npm run prod` — Production build with watch via Vite

## Internal data model

- `DEFAULTS` — Identity values for CSS functions (e.g. `translateX` defaults to `0px`, `scale` defaults to `1`). Used as fallbacks when a function appears in one keyframe but not another.
- `DISCRETE_PROPERTIES` — CSS properties that snap rather than interpolate (e.g. `display`, `position`, `visibility`).
- `FUNCTION_LIST_PROPERTIES` — Properties whose values are lists of CSS functions: `transform`, `filter`, `backdrop-filter`. These get special flatten/reassemble handling.
- `CLAMP_RANGES` — Min/max bounds for properties that must stay in valid CSS ranges (e.g. `opacity` clamps to 0-1, `blur` clamps to 0+). Applied during interpolation and extrapolation.
- `NAMED_COLORS` — Lookup table mapping all 148 CSS named colors (including `transparent`) to `[r, g, b, a]` tuples.
- `DROP_SHADOW_DEFAULT_COLOR` — Default `rgba(0,0,0,0)` used when a `drop-shadow` in one keyframe has no color match in another. Up to 2 `drop-shadow` functions per keyframe are supported.

### Pre-computed hot path data (set in `setKeyframes`)

- `_allKeys` — `Set` of all flattened property keys across all keyframes (excluding `__order` keys).
- `_keyFrames` — Object mapping each key to the subset of keyframes that contain it, so `getFrame` doesn't re-filter on every call.
- `_orders` — Merged function ordering per parent property (`transform`, `filter`, `backdrop-filter`), used during reassembly in `toStyles`.

## Method naming conventions

Methods follow a simple verb pattern:
- `parse*` — String → internal representation (only called during `setKeyframes`): `parseValue`, `parseColor`, `parseFunctions`
- `flatten*` — Expand compound properties into individual keyed entries: `flatten`, `flattenFunctions`
- `lerp*` — Linear interpolation math: `lerp`, `lerpColor`
- `get*` — Retrieve a computed value: `getFrame`, `getDiscrete`, `getDefault`
- `find*` — Locate surrounding keyframes: `findFramesAndFactor`
- `is*` — Type detection: `isColor`
- `colorToRGBA` — Unified color string → `[r,g,b,a]` converter (hex, rgb, rgba, hsl, hsla, named colors)
- `splitArgs` — Paren-aware argument splitter for CSS function args (handles nested parens)
- `format` — Number → string with up to 4 decimal places
- `toStyles` — Internal representation → CSS string object

## Testing

No test suite yet. Use the demo page (`npm run dev`) for manual testing.
