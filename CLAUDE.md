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
- `demo/index.html` — Manual testing page with physics engine integration (served on port 3009 in dev mode)
- `rollup.config.mjs` — Builds to both `dist/` and `demo/` directories

## Commands

- `npm run build` — Production build (minified, no sourcemaps)
- `npm run dev` — Dev build with watch, livereload, and local server at localhost:3009
- `npm run prod` — Production build with watch

## Internal data model

- `DEFAULTS` — Identity values for CSS functions (e.g. `translateX` defaults to `0px`, `scale` defaults to `1`). Used as fallbacks when a function appears in one keyframe but not another.
- `DISCRETE_PROPERTIES` — CSS properties that snap rather than interpolate (e.g. `display`, `position`, `visibility`).
- `FUNCTION_LIST_PROPERTIES` — Properties whose values are lists of CSS functions: `transform`, `filter`, `backdrop-filter`. These get special flatten/reassemble handling.

## Method naming conventions

Methods follow a simple verb pattern:
- `parse*` — String → internal representation (only called during `setKeyframes`)
- `flatten*` — Expand compound properties into individual keyed entries
- `lerp*` — Linear interpolation math
- `get*` — Retrieve a computed value
- `format` — Number → string with up to 4 decimal places
- `toStyles` — Internal representation → CSS string object

## Testing

No test suite yet. Use the demo page (`npm run dev`) for manual testing.
