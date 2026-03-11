# @magic-spells/frame-engine

**~5 KB** gzipped · zero dependencies

Calculate intermediate CSS styles between keyframes at any position. Parses keyframe data upfront so interpolation is pure math on the hot path — no string parsing at runtime.

🔍 **[Live Demo](https://magic-spells.github.io/frame-engine/demo/)** - See it in action!

## Install

```bash
npm install @magic-spells/frame-engine
```

## Usage

```js
import FrameEngine from '@magic-spells/frame-engine';

const tween = new FrameEngine({
  0:   { opacity: '0', transform: 'translateX(0px) scale(0.5)' },
  100: { opacity: '1', transform: 'translateX(200px) scale(1)' },
});

// Get styles at 50% through the animation
const styles = tween.getFrame(0.5);
// → { opacity: '0.5', transform: 'translateX(100px) scale(0.75)' }

// Apply to an element
Object.assign(element.style, styles);
```

## Keyframe format

Keyframes are an object where keys are percent positions (0-100) and values are CSS property/value pairs. Use **camelCase** property names (e.g. `backgroundColor`, not `background-color`) — the engine passes them through as-is, and `element.style` expects camelCase.

```js
{
  0:  { opacity: '1' },
  50: {
    opacity: '0.5',
    transform: 'translateX(100px) rotate(45deg)',
    backgroundColor: '#ff0000',
  },
  100: { opacity: '0' },
}
```

You can define as many keyframes as you need at any percent values.

## Supported CSS properties

| Type | Examples | Interpolation |
|------|----------|---------------|
| **Numeric** | `opacity`, `width`, `margin-left` | Linear interpolation with unit preservation |
| **Colors** | `color`, `background-color`, `border-color` | Per-channel RGBA interpolation (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()`, `hsl()`, `hsla()`, [named colors](https://developer.mozilla.org/en-US/docs/Web/CSS/named-color)) |
| **Transform functions** | `translateX`, `scale`, `rotate`, `skew`, `perspective` | Each function interpolated independently, order preserved |
| **Filter functions** | `blur`, `brightness`, `contrast`, `grayscale`, `sepia`, `drop-shadow`, etc. | Same as transforms (up to 2 `drop-shadow` per keyframe, with color interpolation) |
| **Backdrop-filter** | Same as filter | Same as filter |
| **Discrete** | `display`, `position`, `visibility`, `text-align`, etc. | Snaps to the most recent keyframe value (no interpolation) |

## Extrapolation

Positions outside 0-1 are extrapolated automatically. If you call `getFrame(-0.5)` or `getFrame(1.5)`, the calculator extends the interpolation line beyond the first/last keyframe pair.

## API reference

### `new FrameEngine(keyframes)`

Create a calculator and parse the keyframes.

- **keyframes** `Record<number, Object>` — Object mapping percent positions (0-100) to CSS style objects.

### `setKeyframes(keyframes)`

Replace the current keyframes and re-parse.

- **keyframes** `Record<number, Object>` — Object mapping percent positions (0-100) to CSS style objects.

### `getFrame(position) → Object`

Calculate interpolated styles at a position.

- **position** `number` — `0` = 0%, `1` = 100%. Values outside this range extrapolate.
- **Returns** `Object<string, string>` — CSS properties mapped to their computed string values. Ready to apply with `Object.assign(el.style, styles)`.

## License

MIT

---

<p align="center">
  Made by <a href="https://github.com/coryschulz">Cory Schulz</a>
</p>
