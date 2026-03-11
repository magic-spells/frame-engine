export interface Keyframe {
  /** Position in the animation (0-100) */
  percent: number;
  /** CSS property/value pairs */
  styles: Record<string, string | number>;
}

export interface NumericValue {
  value: number;
  /** CSS unit (e.g. 'px', 'deg', '%', or '' for unitless) */
  unit: string;
}

export interface ColorValue {
  /** 0-255 */
  red: number;
  /** 0-255 */
  green: number;
  /** 0-255 */
  blue: number;
  /** 0-1 */
  alpha: number;
}

export interface DiscreteValue {
  discrete: true;
  value: unknown;
}

export interface MultiArgValue {
  args: NumericValue[];
}

/** CSS property names mapped to their computed string values */
export type InterpolatedStyles = Record<string, string>;

/**
 * Calculates tweened CSS styles between keyframes.
 * Parses all keyframe data upfront so `getFrame` is pure math on the hot path.
 */
export default class FrameEngine {
  /**
   * Create a new FrameEngine with the given keyframes.
   * @param keyframes Array of keyframes to interpolate between
   */
  constructor(keyframes: Keyframe[]);

  /**
   * Replace the current keyframes and re-parse all values.
   * @param keyframes Array of keyframes sorted by percent
   */
  setKeyframes(keyframes: Keyframe[]): void;

  /**
   * Calculate interpolated CSS styles at a given position.
   * @param pos Animation position where 0 = start, 1 = end. Values outside 0-1 extrapolate.
   * @returns An object of CSS property names to their computed string values.
   */
  getFrame(pos: number): InterpolatedStyles;
}
