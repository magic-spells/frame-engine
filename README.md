# @magic-spells/frame-engine

Calculate intermediate CSS styles between keyframes at any position. Parses keyframe data upfront so interpolation is pure math on the hot path — no string parsing at runtime.

## Install

```bash
npm install @magic-spells/frame-engine
```

## Usage

```js
import FrameEngine from '@magic-spells/frame-engine';

const tween = new FrameEngine([
  { percent: 0,   styles: { opacity: '0', transform: 'translateX(0px) scale(0.5)' } },
  { percent: 100, styles: { opacity: '1', transform: 'translateX(200px) scale(1)' } }
]);

// Get styles at 50% through the animation
const styles = tween.getFrame(0.5);
// → { opacity: '0.5', transform: 'translateX(100px) scale(0.75)' }

// Apply to an element
Object.assign(element.style, styles);
```

## Keyframe format

Each keyframe is an object with `percent` (0-100) and `styles` (CSS property/value pairs):

```js
{
  percent: 50,
  styles: {
    opacity: '0.5',
    transform: 'translateX(100px) rotate(45deg)',
    'background-color': '#ff0000'
  }
}
```

You can define as many keyframes as you need at any percent values.

## Supported CSS properties

| Type | Examples | Interpolation |
|------|----------|---------------|
| **Numeric** | `opacity`, `width`, `margin-left` | Linear interpolation with unit preservation |
| **Colors** | `color`, `background-color`, `border-color` | Per-channel RGBA interpolation (`#rgb`, `#rrggbb`, `rgb()`, `rgba()`) |
| **Transform functions** | `translateX`, `scale`, `rotate`, `skew`, `perspective` | Each function interpolated independently, order preserved |
| **Filter functions** | `blur`, `brightness`, `contrast`, `grayscale`, `sepia`, etc. | Same as transforms |
| **Backdrop-filter** | Same as filter | Same as filter |
| **Discrete** | `display`, `position`, `visibility`, `text-align`, etc. | Snaps to the most recent keyframe value (no interpolation) |

## Extrapolation

Positions outside 0-1 are extrapolated automatically. If you call `getFrame(-0.5)` or `getFrame(1.5)`, the calculator extends the interpolation line beyond the first/last keyframe pair.

## API reference

### `new FrameEngine(keyframes)`

Create a calculator and parse the keyframes.

- **keyframes** `Array<{ percent: number, styles: Object }>` — Keyframes in any order (sorted internally by percent).

### `setKeyframes(keyframes)`

Replace the current keyframes and re-parse.

- **keyframes** `Array<{ percent: number, styles: Object }>` — New keyframes.

### `getFrame(position) → Object`

Calculate interpolated styles at a position.

- **position** `number` — `0` = 0%, `1` = 100%. Values outside this range extrapolate.
- **Returns** `Object<string, string>` — CSS properties mapped to their computed string values. Ready to apply with `Object.assign(el.style, styles)`.

## License

MIT
