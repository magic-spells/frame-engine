/**
 * @typedef {Object<number, Object<string, string|number>>} Keyframes
 * Keyframe map where keys are percent positions (0-100) and values are CSS property/value pairs.
 */

/**
 * @typedef {Object} NumericValue
 * @property {number} value - The numeric portion
 * @property {string} unit - The CSS unit (e.g. 'px', 'deg', '%', or '' for unitless)
 */

/**
 * @typedef {Object} ColorValue
 * @property {number} red   - 0-255
 * @property {number} green - 0-255
 * @property {number} blue  - 0-255
 * @property {number} alpha - 0-1
 */

/**
 * @typedef {Object} DiscreteValue
 * @property {true} discrete
 * @property {*} value
 */

/**
 * @typedef {Object} MultiArgValue
 * @property {NumericValue[]} args
 */

/**
 * @typedef {Object<string, string>} InterpolatedStyles
 * CSS property names mapped to their interpolated string values.
 */

// Fix #1: Module-level constants (removed font-weight and background-position from discrete)
const DISCRETE_PROPERTIES = new Set([
  'display', 'position', 'float', 'clear', 'visibility', 'overflow', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow',
  'z-index',
  'table-layout', 'empty-cells', 'caption-side',
  'list-style-type', 'list-style-position',
  'pointer-events', 'user-select', 'box-sizing', 'resize',
  'text-align', 'text-transform', 'white-space', 'word-break', 'word-wrap', 'font-style', 'font-variant',
  'background-repeat', 'background-attachment',
  'border-style', 'border-collapse',
  'content',
  'page-break-before', 'page-break-after', 'page-break-inside'
]);

const FUNCTION_LIST_PROPERTIES = new Set(['transform', 'filter', 'backdrop-filter']);

const DEFAULTS = {
  translateX:    [{ value: 0, unit: 'px' }],
  translateY:    [{ value: 0, unit: 'px' }],
  translateZ:    [{ value: 0, unit: 'px' }],
  translate:     [{ value: 0, unit: 'px' }, { value: 0, unit: 'px' }],
  scale:         [{ value: 1, unit: '' }],
  scaleX:        [{ value: 1, unit: '' }],
  scaleY:        [{ value: 1, unit: '' }],
  scaleZ:        [{ value: 1, unit: '' }],
  scale3d:       [{ value: 1, unit: '' }, { value: 1, unit: '' }, { value: 1, unit: '' }],
  rotate:        [{ value: 0, unit: 'deg' }],
  rotateX:       [{ value: 0, unit: 'deg' }],
  rotateY:       [{ value: 0, unit: 'deg' }],
  rotateZ:       [{ value: 0, unit: 'deg' }],
  skew:          [{ value: 0, unit: 'deg' }, { value: 0, unit: 'deg' }],
  skewX:         [{ value: 0, unit: 'deg' }],
  skewY:         [{ value: 0, unit: 'deg' }],
  perspective:   [{ value: 0, unit: 'px' }],
  blur:          [{ value: 0, unit: 'px' }],
  brightness:    [{ value: 1, unit: '' }],
  contrast:      [{ value: 1, unit: '' }],
  grayscale:     [{ value: 0, unit: '' }],
  'hue-rotate':  [{ value: 0, unit: 'deg' }],
  invert:        [{ value: 0, unit: '' }],
  opacity:       [{ value: 1, unit: '' }],
  saturate:      [{ value: 1, unit: '' }],
  sepia:         [{ value: 0, unit: '' }],
  'drop-shadow-1': [{ value: 0, unit: 'px' }, { value: 0, unit: 'px' }, { value: 0, unit: 'px' }],
  'drop-shadow-2': [{ value: 0, unit: 'px' }, { value: 0, unit: 'px' }, { value: 0, unit: 'px' }],
};

const CLAMP_RANGES = {
  opacity:    [0, 1],
  blur:       [0, Infinity],
  brightness: [0, Infinity],
  contrast:   [0, Infinity],
  grayscale:  [0, 1],
  invert:     [0, 1],
  sepia:      [0, 1],
  saturate:   [0, Infinity],
};

const DROP_SHADOW_DEFAULT_COLOR = { red: 0, green: 0, blue: 0, alpha: 0 };

/**
 * Calculates tweened CSS styles between keyframes.
 * Parses all keyframe data upfront so getFrame is pure math on the hot path.
 */
export default class FrameEngine {
  /**
   * @param {Keyframes} keyframes - Object mapping percent positions to CSS styles
   */
  constructor(keyframes) {
    this.setKeyframes(keyframes);
  }

  // -- Setup (parse once) --

  /**
   * Replace the current keyframes and re-parse all values.
   * @param {Keyframes} keyframes - Object mapping percent positions (0-100) to CSS styles
   */
  setKeyframes(keyframes) {
    this.keyframes = Object.keys(keyframes)
      .map(Number)
      .sort((a, b) => a - b)
      .map(pct => ({ percent: pct, values: this.flatten(keyframes[pct]) }));

    // Fix #7: Inject defaults for missing function-list sub-keys
    const allSubKeys = {};
    for (const parent of FUNCTION_LIST_PROPERTIES) {
      allSubKeys[parent] = new Set();
    }
    for (const kf of this.keyframes) {
      for (const key in kf.values) {
        const colon = key.indexOf(':');
        if (colon === -1) continue;
        const parent = key.substring(0, colon);
        const func = key.substring(colon + 1);
        if (func === '__order') continue;
        if (FUNCTION_LIST_PROPERTIES.has(parent)) {
          allSubKeys[parent].add(func);
        }
      }
    }
    for (const parent of FUNCTION_LIST_PROPERTIES) {
      if (allSubKeys[parent].size === 0) continue;
      const orderKey = `${parent}:__order`;
      for (const kf of this.keyframes) {
        const hasParent = orderKey in kf.values;
        if (!hasParent) {
          kf.values[orderKey] = { discrete: true, value: [...allSubKeys[parent]] };
          for (const func of allSubKeys[parent]) {
            const subKey = `${parent}:${func}`;
            const defaults = DEFAULTS[func] || [{ value: 0, unit: '' }];
            kf.values[subKey] = { args: defaults.map(d => ({ ...d })) };
            if (func.startsWith('drop-shadow-')) {
              kf.values[subKey].color = { ...DROP_SHADOW_DEFAULT_COLOR };
            }
          }
          continue;
        }
        for (const func of allSubKeys[parent]) {
          const subKey = `${parent}:${func}`;
          if (!(subKey in kf.values)) {
            const defaults = DEFAULTS[func] || [{ value: 0, unit: '' }];
            kf.values[subKey] = { args: defaults.map(d => ({ ...d })) };
            if (func.startsWith('drop-shadow-')) {
              kf.values[subKey].color = { ...DROP_SHADOW_DEFAULT_COLOR };
            }
            if (!kf.values[orderKey].value.includes(func)) {
              kf.values[orderKey].value.push(func);
            }
          }
        }
      }
    }

    // Fix #8: Pre-compute hot path data
    this._allKeys = new Set();
    for (const kf of this.keyframes) {
      for (const key in kf.values) {
        if (!key.endsWith(':__order')) this._allKeys.add(key);
      }
    }

    this._keyFrames = {};
    for (const key of this._allKeys) {
      this._keyFrames[key] = this.keyframes.filter(kf => key in kf.values);
    }

    this._orders = {};
    for (const parent of FUNCTION_LIST_PROPERTIES) {
      const orderKey = `${parent}:__order`;
      const frames = this.keyframes.filter(kf => orderKey in kf.values);
      if (frames.length === 0) continue;
      const seen = new Set();
      const merged = [];
      for (const frame of frames) {
        for (const name of frame.values[orderKey].value) {
          if (!seen.has(name)) { seen.add(name); merged.push(name); }
        }
      }
      this._orders[parent] = merged;
    }
  }

  /**
   * Parse a keyframe's style object into an internal representation.
   * Function-list properties (transform, filter) are expanded into individual
   * keyed entries. Colors are parsed to RGBA. Discrete properties are wrapped.
   * @param {Object<string, string|number>} styles - Raw CSS property/value pairs
   * @returns {Object<string, NumericValue|ColorValue|DiscreteValue|MultiArgValue>}
   */
  flatten(styles) {
    const out = {};
    for (const prop in styles) {
      if (FUNCTION_LIST_PROPERTIES.has(prop)) {
        Object.assign(out, this.flattenFunctions(prop, styles[prop]));
      } else if (this.isColor(styles[prop])) {
        out[prop] = this.parseColor(styles[prop]);
      } else if (DISCRETE_PROPERTIES.has(prop)) {
        out[prop] = { discrete: true, value: styles[prop] };
      } else {
        const parsed = this.parseValue(styles[prop]);
        out[prop] = parsed || { discrete: true, value: styles[prop] };
      }
    }
    return out;
  }

  /**
   * Expand a function-list property (e.g. "transform") into individual keyed entries.
   * "transform:translateX", "transform:scale", etc., plus a "__order" key.
   * @param {string} parent - The parent property name (e.g. "transform")
   * @param {string} str - The raw CSS function string (e.g. "translateX(10px) scale(2)")
   * @returns {Object<string, MultiArgValue|DiscreteValue>}
   */
  flattenFunctions(parent, str) {
    const out = {};
    const order = [];
    const counts = {};
    for (const { name, args, color } of this.parseFunctions(str)) {
      let flatName = name;
      if (name === 'drop-shadow') {
        counts[name] = (counts[name] || 0) + 1;
        if (counts[name] > 2) continue;
        flatName = `${name}-${counts[name]}`;
      }
      const entry = { args };
      if (color) entry.color = color;
      out[`${parent}:${flatName}`] = entry;
      order.push(flatName);
    }
    out[`${parent}:__order`] = { discrete: true, value: order };
    return out;
  }

  // -- Parsing (only used in setKeyframes) --

  /**
   * Parse a CSS function string into an array of function name/arg pairs.
   * Uses a character-walking parser to handle nested parentheses.
   * @param {string} str - e.g. "translateX(10px) rotate(45deg)"
   * @returns {{ name: string, args: NumericValue[] }[]}
   */
  parseFunctions(str) {
    // Fix #5: Character-walking parser for nested parentheses
    const results = [];
    let i = 0;
    const len = str.length;

    while (i < len) {
      // Skip whitespace
      while (i < len && /\s/.test(str[i])) i++;
      if (i >= len) break;

      // Collect function name (letters, digits, hyphens)
      let name = '';
      while (i < len && /[\w-]/.test(str[i])) {
        name += str[i];
        i++;
      }
      if (!name || i >= len || str[i] !== '(') continue;

      // Skip opening paren, track depth
      i++;
      let depth = 1;
      let argStr = '';
      while (i < len && depth > 0) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') {
          depth--;
          if (depth === 0) { i++; break; }
        }
        argStr += str[i];
        i++;
      }

      if (name === 'drop-shadow') {
        const parts = this.splitArgs(argStr);
        const numericArgs = [];
        let color = null;
        for (const part of parts) {
          if (this.isColor(part)) {
            color = this.parseColor(part);
          } else {
            const parsed = part.match(/^(-?\d*\.?\d+)(\D*)$/);
            numericArgs.push(parsed ? { value: parseFloat(parsed[1]), unit: parsed[2] } : { value: 0, unit: '' });
          }
        }
        results.push({ name, args: numericArgs, color });
      } else {
        const args = argStr.split(/\s*,\s*|\s+/).map(part => {
          const parsed = part.match(/^(-?\d*\.?\d+)(\D*)$/);
          return parsed ? { value: parseFloat(parsed[1]), unit: parsed[2] } : { value: 0, unit: '' };
        });
        results.push({ name, args });
      }
    }
    return results;
  }

  /**
   * Paren-aware argument splitter for CSS functions.
   * Splits on spaces/commas at depth 0, preserving nested parens.
   * @param {string} argStr
   * @returns {string[]}
   */
  splitArgs(argStr) {
    const parts = [];
    let current = '';
    let depth = 0;
    for (let i = 0; i < argStr.length; i++) {
      const ch = argStr[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (depth === 0 && (ch === ' ' || ch === ',')) {
        if (current.trim()) parts.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  /**
   * Parse a single CSS value into a numeric value and unit.
   * @param {string|number} value - e.g. "10px", "45deg", 42
   * @returns {NumericValue|null} Parsed value or null if not numeric
   */
  parseValue(value) {
    if (typeof value === 'number') return { value, unit: '' };
    const match = String(value).match(/^(-?\d*\.?\d+)(\D*)$/);
    return match ? { value: parseFloat(match[1]), unit: match[2] } : null;
  }

  /**
   * Parse a CSS color string into a ColorValue object.
   * @param {string} color - e.g. "#ff0", "#ff0000", "rgb(255,0,0)", "rgba(255,0,0,0.5)", "hsl(120,50%,50%)"
   * @returns {ColorValue}
   */
  parseColor(color) {
    const [red, green, blue, alpha] = this.colorToRGBA(color);
    return { red, green, blue, alpha };
  }

  /**
   * Convert a CSS color string to an [r, g, b, a] tuple.
   * Supports #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla() formats.
   * @param {string} color
   * @returns {[number, number, number, number]}
   */
  colorToRGBA(color) {
    if (typeof color !== 'string') return [0, 0, 0, 1];

    // #rgb
    if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
      return [
        parseInt(color[1] + color[1], 16),
        parseInt(color[2] + color[2], 16),
        parseInt(color[3] + color[3], 16),
        1
      ];
    }

    // Fix #4: #rgba
    if (/^#[0-9A-Fa-f]{4}$/.test(color)) {
      return [
        parseInt(color[1] + color[1], 16),
        parseInt(color[2] + color[2], 16),
        parseInt(color[3] + color[3], 16),
        parseInt(color[4] + color[4], 16) / 255
      ];
    }

    // #rrggbb
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
        1
      ];
    }

    // Fix #4: #rrggbbaa
    if (/^#[0-9A-Fa-f]{8}$/.test(color)) {
      return [
        parseInt(color.slice(1, 3), 16),
        parseInt(color.slice(3, 5), 16),
        parseInt(color.slice(5, 7), 16),
        parseInt(color.slice(7, 9), 16) / 255
      ];
    }

    // rgb() / rgba()
    const rgbMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1], 10),
        parseInt(rgbMatch[2], 10),
        parseInt(rgbMatch[3], 10),
        rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
      ];
    }

    // Fix #3: hsl() / hsla()
    const hslMatch = color.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (hslMatch) {
      const h = parseFloat(hslMatch[1]) / 360;
      const s = parseFloat(hslMatch[2]) / 100;
      const l = parseFloat(hslMatch[3]) / 100;
      const a = hslMatch[4] !== undefined ? parseFloat(hslMatch[4]) : 1;

      if (s === 0) {
        const val = Math.round(l * 255);
        return [val, val, val, a];
      }

      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;

      const hueToRgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };

      return [
        Math.round(hueToRgb(p, q, h + 1/3) * 255),
        Math.round(hueToRgb(p, q, h) * 255),
        Math.round(hueToRgb(p, q, h - 1/3) * 255),
        a
      ];
    }

    return [0, 0, 0, 1];
  }

  /**
   * Test whether a value looks like a CSS color.
   * @param {*} value
   * @returns {boolean}
   */
  isColor(value) {
    if (typeof value !== 'string') return false;
    // Fix #3: More precise hex matching (exact lengths 3,4,6,8)
    return /^(#[0-9A-Fa-f]{3}$|#[0-9A-Fa-f]{4}$|#[0-9A-Fa-f]{6}$|#[0-9A-Fa-f]{8}$|rgba?\s*\(|hsla?\s*\()/.test(value);
  }

  // -- Math --

  /**
   * Linear interpolation between two numbers.
   * @param {number} start
   * @param {number} end
   * @param {number} factor - 0 = start, 1 = end, extrapolates outside [0,1]
   * @returns {number}
   */
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  /**
   * Interpolate between two colors, clamping each channel.
   * @param {ColorValue} start
   * @param {ColorValue} end
   * @param {number} factor
   * @returns {ColorValue}
   */
  lerpColor(start, end, factor) {
    const clamp = (val, min, max) => Math.min(max, Math.max(min, val));
    return {
      red:   Math.round(clamp(this.lerp(start.red, end.red, factor), 0, 255)),
      green: Math.round(clamp(this.lerp(start.green, end.green, factor), 0, 255)),
      blue:  Math.round(clamp(this.lerp(start.blue, end.blue, factor), 0, 255)),
      alpha: parseFloat(clamp(this.lerp(start.alpha, end.alpha, factor), 0, 1).toFixed(4))
    };
  }

  /**
   * Format a number to at most 4 decimal places, stripping trailing zeros.
   * @param {number} num
   * @returns {string}
   */
  format(num) {
    return parseFloat(Number(num).toFixed(4)).toString();
  }

  /**
   * Find the two surrounding keyframes and the interpolation factor for a given percent.
   * Extrapolates when percent is outside the keyframe range.
   * @param {{ percent: number, values: Object }[]} frames - Keyframes that contain a given property
   * @param {number} percent - The current position (0-100)
   * @returns {{ from: Object, to: Object, factor: number }|null}
   */
  findFramesAndFactor(frames, percent) {
    if (frames.length === 0) return null;
    if (frames.length === 1) return { from: frames[0], to: frames[0], factor: 0 };

    const first = frames[0];
    const last = frames[frames.length - 1];

    if (percent <= first.percent) {
      const range = frames[1].percent - first.percent;
      return { from: first, to: frames[1], factor: range === 0 ? 1 : (percent - first.percent) / range };
    }

    if (percent >= last.percent) {
      const prev = frames[frames.length - 2];
      const range = last.percent - prev.percent;
      return { from: prev, to: last, factor: range === 0 ? 1 : (percent - prev.percent) / range };
    }

    for (let i = 0; i < frames.length - 1; i++) {
      if (percent >= frames[i].percent && percent <= frames[i + 1].percent) {
        const range = frames[i + 1].percent - frames[i].percent;
        return { from: frames[i], to: frames[i + 1], factor: range === 0 ? 1 : (percent - frames[i].percent) / range };
      }
    }

    return { from: last, to: last, factor: 0 };
  }

  /**
   * Get the active discrete value for a property at a given percent.
   * Returns the value from the last keyframe at or before the percent.
   * @param {string} key - The flattened property key
   * @param {number} percent - The current position (0-100)
   * @returns {*}
   */
  getDiscrete(key, percent) {
    const frames = this._keyFrames[key] || this.keyframes.filter(kf => key in kf.values);
    if (frames.length === 0) return null;

    let active = frames[0];
    for (const frame of frames) {
      if (frame.percent <= percent) active = frame;
      else break;
    }
    return active.values[key].value;
  }

  /**
   * Get the default (identity) value for a CSS function.
   * Used as a fallback when a function appears in one keyframe but not another.
   * @param {string} key - The flattened key (e.g. "transform:translateX")
   * @returns {NumericValue[]}
   */
  getDefault(key) {
    const func = key.split(':')[1];
    return func && DEFAULTS[func] ? DEFAULTS[func] : [{ value: 0, unit: '' }];
  }

  // -- Main --

  /**
   * Calculate interpolated CSS styles at a given position.
   * @param {number} pos - Animation position where 0 = start, 1 = end. Values outside 0-1 extrapolate.
   * @returns {InterpolatedStyles} An object of CSS property names to their computed string values.
   */
  getFrame(pos) {
    const percent = pos * 100;

    // Fix #8: Use pre-computed keys
    const keys = this._allKeys;

    const results = {};

    for (const key of keys) {
      // Fix #8: Use pre-computed per-key frame lists
      const frames = this._keyFrames[key];
      if (!frames || frames.length === 0) continue;

      const sample = frames[0].values[key];

      if (sample && sample.discrete) {
        results[key] = this.getDiscrete(key, percent);
        continue;
      }

      const { from, to, factor } = this.findFramesAndFactor(frames, percent);
      const start = from.values[key];
      const end = to.values[key];

      // Color
      if (start && 'red' in start) {
        results[key] = this.lerpColor(start, end, factor);
        continue;
      }

      // Multi-arg function (e.g. translate with x,y)
      if (start && start.args) {
        const endArgs = end.args || this.getDefault(key);
        // Fix #6: Use Math.max of both lengths
        const defaultArgs = this.getDefault(key);
        const maxLen = Math.max(start.args.length, endArgs.length);
        const interpolated = [];
        for (let i = 0; i < maxLen; i++) {
          const s = start.args[i] || defaultArgs[i] || { value: 0, unit: '' };
          const e = endArgs[i] || defaultArgs[i] || { value: 0, unit: '' };
          interpolated.push({ value: this.lerp(s.value, e.value, factor), unit: s.unit || e.unit });
        }
        // Clamp bounded properties
        const funcName = key.includes(':') ? key.substring(key.indexOf(':') + 1) : key;
        const clampRange = CLAMP_RANGES[funcName];
        if (clampRange) {
          for (const arg of interpolated) {
            arg.value = Math.min(clampRange[1], Math.max(clampRange[0], arg.value));
          }
        }
        const result = { args: interpolated };
        if (start.color || end.color) {
          result.color = this.lerpColor(
            start.color || DROP_SHADOW_DEFAULT_COLOR,
            end.color || DROP_SHADOW_DEFAULT_COLOR,
            factor
          );
        }
        results[key] = result;
        continue;
      }

      // Single numeric (non-function-list properties only)
      if (start && 'value' in start) {
        const fallback = end || this.getDefault(key)[0];
        let value = this.lerp(start.value, fallback.value, factor);
        const clampRange = CLAMP_RANGES[key];
        if (clampRange) {
          value = Math.min(clampRange[1], Math.max(clampRange[0], value));
        }
        results[key] = { value, unit: start.unit };
      }
    }

    return this.toStyles(results);
  }

  // -- Output --

  /**
   * Convert the internal interpolated results into a flat CSS styles object.
   * Reassembles function-list properties (transform, filter) from their individual parts.
   * @param {Object<string, NumericValue|ColorValue|MultiArgValue|*>} results
   * @returns {InterpolatedStyles}
   */
  toStyles(results) {
    const styles = {};
    const groups = {};

    for (const key in results) {
      const val = results[key];
      const colon = key.indexOf(':');

      // Function property (e.g. "transform:translateX")
      if (colon !== -1) {
        const parent = key.substring(0, colon);
        const func = key.substring(colon + 1);
        if (FUNCTION_LIST_PROPERTIES.has(parent)) {
          if (!groups[parent]) groups[parent] = {};
          if (val.args) {
            if (func.startsWith('drop-shadow-')) {
              const displayName = func.replace(/-\d+$/, '');
              const argsStr = val.args.map(arg => `${this.format(arg.value)}${arg.unit}`).join(' ');
              if (val.color) {
                const c = val.color;
                const colorStr = c.alpha < 1
                  ? `rgba(${c.red},${c.green},${c.blue},${c.alpha})`
                  : `rgb(${c.red},${c.green},${c.blue})`;
                groups[parent][func] = `${displayName}(${argsStr} ${colorStr})`;
              } else {
                groups[parent][func] = `${displayName}(${argsStr})`;
              }
            } else {
              groups[parent][func] = `${func}(${val.args.map(arg => `${this.format(arg.value)}${arg.unit}`).join(', ')})`;
            }
          } else {
            groups[parent][func] = `${func}(${this.format(val.value)}${val.unit})`;
          }
          continue;
        }
      }

      // Fix #2: Discrete (string/primitive) — must check before object checks
      if (typeof val === 'string' || typeof val === 'number') {
        styles[key] = val;
        continue;
      }

      // Color
      if (val && 'red' in val) {
        styles[key] = val.alpha < 1
          ? `rgba(${val.red},${val.green},${val.blue},${val.alpha})`
          : `rgb(${val.red},${val.green},${val.blue})`;
        continue;
      }

      // Numeric
      if (val && 'value' in val) {
        styles[key] = `${this.format(val.value)}${val.unit}`;
        continue;
      }

      // Fallback
      styles[key] = val;
    }

    // Rebuild function strings in order using pre-computed orders
    for (const parent in groups) {
      const group = groups[parent];
      const order = this._orders[parent] || Object.keys(group);
      const parts = order.filter(func => group[func]).map(func => group[func]);
      if (parts.length > 0) styles[parent] = parts.join(' ');
    }

    return styles;
  }
}
