const I = /* @__PURE__ */ new Set([
  "display",
  "position",
  "float",
  "clear",
  "visibility",
  "overflow",
  "overflow-x",
  "overflow-y",
  "flex-direction",
  "flex-wrap",
  "justify-content",
  "align-items",
  "align-content",
  "order",
  "grid-template-columns",
  "grid-template-rows",
  "grid-template-areas",
  "grid-auto-flow",
  "z-index",
  "table-layout",
  "empty-cells",
  "caption-side",
  "list-style-type",
  "list-style-position",
  "pointer-events",
  "user-select",
  "box-sizing",
  "resize",
  "text-align",
  "text-transform",
  "white-space",
  "word-break",
  "word-wrap",
  "font-style",
  "font-variant",
  "background-repeat",
  "background-attachment",
  "border-style",
  "border-collapse",
  "content",
  "page-break-before",
  "page-break-after",
  "page-break-inside"
]), g = /* @__PURE__ */ new Set(["transform", "filter", "backdrop-filter"]), m = {
  translateX: [{ value: 0, unit: "px" }],
  translateY: [{ value: 0, unit: "px" }],
  translateZ: [{ value: 0, unit: "px" }],
  translate: [{ value: 0, unit: "px" }, { value: 0, unit: "px" }],
  scale: [{ value: 1, unit: "" }],
  scaleX: [{ value: 1, unit: "" }],
  scaleY: [{ value: 1, unit: "" }],
  scaleZ: [{ value: 1, unit: "" }],
  scale3d: [{ value: 1, unit: "" }, { value: 1, unit: "" }, { value: 1, unit: "" }],
  rotate: [{ value: 0, unit: "deg" }],
  rotateX: [{ value: 0, unit: "deg" }],
  rotateY: [{ value: 0, unit: "deg" }],
  rotateZ: [{ value: 0, unit: "deg" }],
  skew: [{ value: 0, unit: "deg" }, { value: 0, unit: "deg" }],
  skewX: [{ value: 0, unit: "deg" }],
  skewY: [{ value: 0, unit: "deg" }],
  perspective: [{ value: 0, unit: "px" }],
  blur: [{ value: 0, unit: "px" }],
  brightness: [{ value: 1, unit: "" }],
  contrast: [{ value: 1, unit: "" }],
  grayscale: [{ value: 0, unit: "" }],
  "hue-rotate": [{ value: 0, unit: "deg" }],
  invert: [{ value: 0, unit: "" }],
  opacity: [{ value: 1, unit: "" }],
  saturate: [{ value: 1, unit: "" }],
  sepia: [{ value: 0, unit: "" }],
  "drop-shadow-1": [{ value: 0, unit: "px" }, { value: 0, unit: "px" }, { value: 0, unit: "px" }],
  "drop-shadow-2": [{ value: 0, unit: "px" }, { value: 0, unit: "px" }, { value: 0, unit: "px" }]
}, w = {
  opacity: [0, 1],
  blur: [0, 1 / 0],
  brightness: [0, 1 / 0],
  contrast: [0, 1 / 0],
  grayscale: [0, 1],
  invert: [0, 1],
  sepia: [0, 1],
  saturate: [0, 1 / 0]
}, $ = { red: 0, green: 0, blue: 0, alpha: 0 };
class S {
  /**
   * @param {Keyframes} keyframes - Object mapping percent positions to CSS styles
   */
  constructor(t) {
    this.setKeyframes(t);
  }
  // -- Setup (parse once) --
  /**
   * Replace the current keyframes and re-parse all values.
   * @param {Keyframes} keyframes - Object mapping percent positions (0-100) to CSS styles
   */
  setKeyframes(t) {
    this.keyframes = Object.keys(t).map(Number).sort((n, s) => n - s).map((n) => ({ percent: n, values: this.flatten(t[n]) }));
    const r = {};
    for (const n of g)
      r[n] = /* @__PURE__ */ new Set();
    for (const n of this.keyframes)
      for (const s in n.values) {
        const e = s.indexOf(":");
        if (e === -1) continue;
        const a = s.substring(0, e), i = s.substring(e + 1);
        i !== "__order" && g.has(a) && r[a].add(i);
      }
    for (const n of g) {
      if (r[n].size === 0) continue;
      const s = `${n}:__order`;
      for (const e of this.keyframes) {
        if (!(s in e.values)) {
          e.values[s] = { discrete: !0, value: [...r[n]] };
          for (const i of r[n]) {
            const u = `${n}:${i}`, l = m[i] || [{ value: 0, unit: "" }];
            e.values[u] = { args: l.map((c) => ({ ...c })) }, i.startsWith("drop-shadow-") && (e.values[u].color = { ...$ });
          }
          continue;
        }
        for (const i of r[n]) {
          const u = `${n}:${i}`;
          if (!(u in e.values)) {
            const l = m[i] || [{ value: 0, unit: "" }];
            e.values[u] = { args: l.map((c) => ({ ...c })) }, i.startsWith("drop-shadow-") && (e.values[u].color = { ...$ }), e.values[s].value.includes(i) || e.values[s].value.push(i);
          }
        }
      }
    }
    this._allKeys = /* @__PURE__ */ new Set();
    for (const n of this.keyframes)
      for (const s in n.values)
        s.endsWith(":__order") || this._allKeys.add(s);
    this._keyFrames = {};
    for (const n of this._allKeys)
      this._keyFrames[n] = this.keyframes.filter((s) => n in s.values);
    this._orders = {};
    for (const n of g) {
      const s = `${n}:__order`, e = this.keyframes.filter((u) => s in u.values);
      if (e.length === 0) continue;
      const a = /* @__PURE__ */ new Set(), i = [];
      for (const u of e)
        for (const l of u.values[s].value)
          a.has(l) || (a.add(l), i.push(l));
      this._orders[n] = i;
    }
  }
  /**
   * Parse a keyframe's style object into an internal representation.
   * Function-list properties (transform, filter) are expanded into individual
   * keyed entries. Colors are parsed to RGBA. Discrete properties are wrapped.
   * @param {Object<string, string|number>} styles - Raw CSS property/value pairs
   * @returns {Object<string, NumericValue|ColorValue|DiscreteValue|MultiArgValue>}
   */
  flatten(t) {
    const r = {};
    for (const n in t)
      if (g.has(n))
        Object.assign(r, this.flattenFunctions(n, t[n]));
      else if (this.isColor(t[n]))
        r[n] = this.parseColor(t[n]);
      else if (I.has(n))
        r[n] = { discrete: !0, value: t[n] };
      else {
        const s = this.parseValue(t[n]);
        r[n] = s || { discrete: !0, value: t[n] };
      }
    return r;
  }
  /**
   * Expand a function-list property (e.g. "transform") into individual keyed entries.
   * "transform:translateX", "transform:scale", etc., plus a "__order" key.
   * @param {string} parent - The parent property name (e.g. "transform")
   * @param {string} str - The raw CSS function string (e.g. "translateX(10px) scale(2)")
   * @returns {Object<string, MultiArgValue|DiscreteValue>}
   */
  flattenFunctions(t, r) {
    const n = {}, s = [], e = {};
    for (const { name: a, args: i, color: u } of this.parseFunctions(r)) {
      let l = a;
      if (a === "drop-shadow") {
        if (e[a] = (e[a] || 0) + 1, e[a] > 2) continue;
        l = `${a}-${e[a]}`;
      }
      const c = { args: i };
      u && (c.color = u), n[`${t}:${l}`] = c, s.push(l);
    }
    return n[`${t}:__order`] = { discrete: !0, value: s }, n;
  }
  // -- Parsing (only used in setKeyframes) --
  /**
   * Parse a CSS function string into an array of function name/arg pairs.
   * Uses a character-walking parser to handle nested parentheses.
   * @param {string} str - e.g. "translateX(10px) rotate(45deg)"
   * @returns {{ name: string, args: NumericValue[] }[]}
   */
  parseFunctions(t) {
    const r = [];
    let n = 0;
    const s = t.length;
    for (; n < s; ) {
      for (; n < s && /\s/.test(t[n]); ) n++;
      if (n >= s) break;
      let e = "";
      for (; n < s && /[\w-]/.test(t[n]); )
        e += t[n], n++;
      if (!e || n >= s || t[n] !== "(") continue;
      n++;
      let a = 1, i = "";
      for (; n < s && a > 0; ) {
        if (t[n] === "(") a++;
        else if (t[n] === ")" && (a--, a === 0)) {
          n++;
          break;
        }
        i += t[n], n++;
      }
      if (e === "drop-shadow") {
        const u = this.splitArgs(i), l = [];
        let c = null;
        for (const o of u)
          if (this.isColor(o))
            c = this.parseColor(o);
          else {
            const f = o.match(/^(-?\d*\.?\d+)(\D*)$/);
            l.push(f ? { value: parseFloat(f[1]), unit: f[2] } : { value: 0, unit: "" });
          }
        r.push({ name: e, args: l, color: c });
      } else {
        const u = i.split(/\s*,\s*|\s+/).map((l) => {
          const c = l.match(/^(-?\d*\.?\d+)(\D*)$/);
          return c ? { value: parseFloat(c[1]), unit: c[2] } : { value: 0, unit: "" };
        });
        r.push({ name: e, args: u });
      }
    }
    return r;
  }
  /**
   * Paren-aware argument splitter for CSS functions.
   * Splits on spaces/commas at depth 0, preserving nested parens.
   * @param {string} argStr
   * @returns {string[]}
   */
  splitArgs(t) {
    const r = [];
    let n = "", s = 0;
    for (let e = 0; e < t.length; e++) {
      const a = t[e];
      a === "(" ? s++ : a === ")" && s--, s === 0 && (a === " " || a === ",") ? (n.trim() && r.push(n.trim()), n = "") : n += a;
    }
    return n.trim() && r.push(n.trim()), r;
  }
  /**
   * Parse a single CSS value into a numeric value and unit.
   * @param {string|number} value - e.g. "10px", "45deg", 42
   * @returns {NumericValue|null} Parsed value or null if not numeric
   */
  parseValue(t) {
    if (typeof t == "number") return { value: t, unit: "" };
    const r = String(t).match(/^(-?\d*\.?\d+)(\D*)$/);
    return r ? { value: parseFloat(r[1]), unit: r[2] } : null;
  }
  /**
   * Parse a CSS color string into a ColorValue object.
   * @param {string} color - e.g. "#ff0", "#ff0000", "rgb(255,0,0)", "rgba(255,0,0,0.5)", "hsl(120,50%,50%)"
   * @returns {ColorValue}
   */
  parseColor(t) {
    const [r, n, s, e] = this.colorToRGBA(t);
    return { red: r, green: n, blue: s, alpha: e };
  }
  /**
   * Convert a CSS color string to an [r, g, b, a] tuple.
   * Supports #rgb, #rgba, #rrggbb, #rrggbbaa, rgb(), rgba(), hsl(), hsla() formats.
   * @param {string} color
   * @returns {[number, number, number, number]}
   */
  colorToRGBA(t) {
    if (typeof t != "string") return [0, 0, 0, 1];
    if (/^#[0-9A-Fa-f]{3}$/.test(t))
      return [
        parseInt(t[1] + t[1], 16),
        parseInt(t[2] + t[2], 16),
        parseInt(t[3] + t[3], 16),
        1
      ];
    if (/^#[0-9A-Fa-f]{4}$/.test(t))
      return [
        parseInt(t[1] + t[1], 16),
        parseInt(t[2] + t[2], 16),
        parseInt(t[3] + t[3], 16),
        parseInt(t[4] + t[4], 16) / 255
      ];
    if (/^#[0-9A-Fa-f]{6}$/.test(t))
      return [
        parseInt(t.slice(1, 3), 16),
        parseInt(t.slice(3, 5), 16),
        parseInt(t.slice(5, 7), 16),
        1
      ];
    if (/^#[0-9A-Fa-f]{8}$/.test(t))
      return [
        parseInt(t.slice(1, 3), 16),
        parseInt(t.slice(3, 5), 16),
        parseInt(t.slice(5, 7), 16),
        parseInt(t.slice(7, 9), 16) / 255
      ];
    const r = t.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (r)
      return [
        parseInt(r[1], 10),
        parseInt(r[2], 10),
        parseInt(r[3], 10),
        r[4] !== void 0 ? parseFloat(r[4]) : 1
      ];
    const n = t.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/);
    if (n) {
      const s = parseFloat(n[1]) / 360, e = parseFloat(n[2]) / 100, a = parseFloat(n[3]) / 100, i = n[4] !== void 0 ? parseFloat(n[4]) : 1;
      if (e === 0) {
        const o = Math.round(a * 255);
        return [o, o, o, i];
      }
      const u = a < 0.5 ? a * (1 + e) : a + e - a * e, l = 2 * a - u, c = (o, f, p) => (p < 0 && (p += 1), p > 1 && (p -= 1), p < 1 / 6 ? o + (f - o) * 6 * p : p < 1 / 2 ? f : p < 2 / 3 ? o + (f - o) * (2 / 3 - p) * 6 : o);
      return [
        Math.round(c(l, u, s + 1 / 3) * 255),
        Math.round(c(l, u, s) * 255),
        Math.round(c(l, u, s - 1 / 3) * 255),
        i
      ];
    }
    return [0, 0, 0, 1];
  }
  /**
   * Test whether a value looks like a CSS color.
   * @param {*} value
   * @returns {boolean}
   */
  isColor(t) {
    return typeof t != "string" ? !1 : /^(#[0-9A-Fa-f]{3}$|#[0-9A-Fa-f]{4}$|#[0-9A-Fa-f]{6}$|#[0-9A-Fa-f]{8}$|rgba?\s*\(|hsla?\s*\()/.test(t);
  }
  // -- Math --
  /**
   * Linear interpolation between two numbers.
   * @param {number} start
   * @param {number} end
   * @param {number} factor - 0 = start, 1 = end, extrapolates outside [0,1]
   * @returns {number}
   */
  lerp(t, r, n) {
    return t + (r - t) * n;
  }
  /**
   * Interpolate between two colors, clamping each channel.
   * @param {ColorValue} start
   * @param {ColorValue} end
   * @param {number} factor
   * @returns {ColorValue}
   */
  lerpColor(t, r, n) {
    const s = (e, a, i) => Math.min(i, Math.max(a, e));
    return {
      red: Math.round(s(this.lerp(t.red, r.red, n), 0, 255)),
      green: Math.round(s(this.lerp(t.green, r.green, n), 0, 255)),
      blue: Math.round(s(this.lerp(t.blue, r.blue, n), 0, 255)),
      alpha: parseFloat(s(this.lerp(t.alpha, r.alpha, n), 0, 1).toFixed(4))
    };
  }
  /**
   * Format a number to at most 4 decimal places, stripping trailing zeros.
   * @param {number} num
   * @returns {string}
   */
  format(t) {
    return parseFloat(Number(t).toFixed(4)).toString();
  }
  /**
   * Find the two surrounding keyframes and the interpolation factor for a given percent.
   * Extrapolates when percent is outside the keyframe range.
   * @param {{ percent: number, values: Object }[]} frames - Keyframes that contain a given property
   * @param {number} percent - The current position (0-100)
   * @returns {{ from: Object, to: Object, factor: number }|null}
   */
  findFramesAndFactor(t, r) {
    if (t.length === 0) return null;
    if (t.length === 1) return { from: t[0], to: t[0], factor: 0 };
    const n = t[0], s = t[t.length - 1];
    if (r <= n.percent) {
      const e = t[1].percent - n.percent;
      return { from: n, to: t[1], factor: e === 0 ? 1 : (r - n.percent) / e };
    }
    if (r >= s.percent) {
      const e = t[t.length - 2], a = s.percent - e.percent;
      return { from: e, to: s, factor: a === 0 ? 1 : (r - e.percent) / a };
    }
    for (let e = 0; e < t.length - 1; e++)
      if (r >= t[e].percent && r <= t[e + 1].percent) {
        const a = t[e + 1].percent - t[e].percent;
        return { from: t[e], to: t[e + 1], factor: a === 0 ? 1 : (r - t[e].percent) / a };
      }
    return { from: s, to: s, factor: 0 };
  }
  /**
   * Get the active discrete value for a property at a given percent.
   * Returns the value from the last keyframe at or before the percent.
   * @param {string} key - The flattened property key
   * @param {number} percent - The current position (0-100)
   * @returns {*}
   */
  getDiscrete(t, r) {
    const n = this._keyFrames[t] || this.keyframes.filter((e) => t in e.values);
    if (n.length === 0) return null;
    let s = n[0];
    for (const e of n)
      if (e.percent <= r) s = e;
      else break;
    return s.values[t].value;
  }
  /**
   * Get the default (identity) value for a CSS function.
   * Used as a fallback when a function appears in one keyframe but not another.
   * @param {string} key - The flattened key (e.g. "transform:translateX")
   * @returns {NumericValue[]}
   */
  getDefault(t) {
    const r = t.split(":")[1];
    return r && m[r] ? m[r] : [{ value: 0, unit: "" }];
  }
  // -- Main --
  /**
   * Calculate interpolated CSS styles at a given position.
   * @param {number} pos - Animation position where 0 = start, 1 = end. Values outside 0-1 extrapolate.
   * @returns {InterpolatedStyles} An object of CSS property names to their computed string values.
   */
  getFrame(t) {
    const r = t * 100, n = this._allKeys, s = {};
    for (const e of n) {
      const a = this._keyFrames[e];
      if (!a || a.length === 0) continue;
      const i = a[0].values[e];
      if (i && i.discrete) {
        s[e] = this.getDiscrete(e, r);
        continue;
      }
      const { from: u, to: l, factor: c } = this.findFramesAndFactor(a, r), o = u.values[e], f = l.values[e];
      if (o && "red" in o) {
        s[e] = this.lerpColor(o, f, c);
        continue;
      }
      if (o && o.args) {
        const p = f.args || this.getDefault(e), d = this.getDefault(e), v = Math.max(o.args.length, p.length), b = [];
        for (let h = 0; h < v; h++) {
          const k = o.args[h] || d[h] || { value: 0, unit: "" }, x = p[h] || d[h] || { value: 0, unit: "" };
          b.push({ value: this.lerp(k.value, x.value, c), unit: k.unit || x.unit });
        }
        const _ = e.includes(":") ? e.substring(e.indexOf(":") + 1) : e, y = w[_];
        if (y)
          for (const h of b)
            h.value = Math.min(y[1], Math.max(y[0], h.value));
        const F = { args: b };
        (o.color || f.color) && (F.color = this.lerpColor(
          o.color || $,
          f.color || $,
          c
        )), s[e] = F;
        continue;
      }
      if (o && "value" in o) {
        const p = f || this.getDefault(e)[0];
        let d = this.lerp(o.value, p.value, c);
        const v = w[e];
        v && (d = Math.min(v[1], Math.max(v[0], d))), s[e] = { value: d, unit: o.unit };
      }
    }
    return this.toStyles(s);
  }
  // -- Output --
  /**
   * Convert the internal interpolated results into a flat CSS styles object.
   * Reassembles function-list properties (transform, filter) from their individual parts.
   * @param {Object<string, NumericValue|ColorValue|MultiArgValue|*>} results
   * @returns {InterpolatedStyles}
   */
  toStyles(t) {
    const r = {}, n = {};
    for (const s in t) {
      const e = t[s], a = s.indexOf(":");
      if (a !== -1) {
        const i = s.substring(0, a), u = s.substring(a + 1);
        if (g.has(i)) {
          if (n[i] || (n[i] = {}), e.args)
            if (u.startsWith("drop-shadow-")) {
              const l = u.replace(/-\d+$/, ""), c = e.args.map((o) => `${this.format(o.value)}${o.unit}`).join(" ");
              if (e.color) {
                const o = e.color, f = o.alpha < 1 ? `rgba(${o.red},${o.green},${o.blue},${o.alpha})` : `rgb(${o.red},${o.green},${o.blue})`;
                n[i][u] = `${l}(${c} ${f})`;
              } else
                n[i][u] = `${l}(${c})`;
            } else
              n[i][u] = `${u}(${e.args.map((l) => `${this.format(l.value)}${l.unit}`).join(", ")})`;
          else
            n[i][u] = `${u}(${this.format(e.value)}${e.unit})`;
          continue;
        }
      }
      if (typeof e == "string" || typeof e == "number") {
        r[s] = e;
        continue;
      }
      if (e && "red" in e) {
        r[s] = e.alpha < 1 ? `rgba(${e.red},${e.green},${e.blue},${e.alpha})` : `rgb(${e.red},${e.green},${e.blue})`;
        continue;
      }
      if (e && "value" in e) {
        r[s] = `${this.format(e.value)}${e.unit}`;
        continue;
      }
      r[s] = e;
    }
    for (const s in n) {
      const e = n[s], i = (this._orders[s] || Object.keys(e)).filter((u) => e[u]).map((u) => e[u]);
      i.length > 0 && (r[s] = i.join(" "));
    }
    return r;
  }
}
export {
  S as default
};
