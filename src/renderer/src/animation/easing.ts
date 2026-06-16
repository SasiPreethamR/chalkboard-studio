import type { Easing } from '../types'

/** Map a normalized progress 0..1 through the chosen easing curve. */
export function ease(t: number, kind: Easing): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t
  switch (kind) {
    case 'easeIn':
      return x * x
    case 'easeOut':
      return 1 - (1 - x) * (1 - x)
    case 'easeInOut':
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
    case 'smooth':
      // smootherstep — very gentle ends, like Manim's default.
      return x * x * x * (x * (x * 6 - 15) + 10)
    case 'linear':
    default:
      return x
  }
}

export const EASINGS: Easing[] = ['smooth', 'easeInOut', 'easeOut', 'easeIn', 'linear']
