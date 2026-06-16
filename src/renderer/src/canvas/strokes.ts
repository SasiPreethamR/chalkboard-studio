import { getStroke } from 'perfect-freehand'
import type { CurveSnapLevel, StrokePoint } from '../types'

export interface StrokeRenderOptions {
  size: number
  thinning?: number
  smoothing?: number
  streamline?: number
}

const average = (a: number, b: number) => (a + b) / 2

interface CurveSnapOptions {
  level: CurveSnapLevel
  size: number
}

function distanceBetween(first: StrokePoint, second: StrokePoint): number {
  return Math.hypot(first[0] - second[0], first[1] - second[1])
}

function interpolatePoint(first: StrokePoint, second: StrokePoint, amount: number): StrokePoint {
  const inverse = 1 - amount
  return [
    first[0] * inverse + second[0] * amount,
    first[1] * inverse + second[1] * amount,
    first[2] * inverse + second[2] * amount
  ]
}

function perpendicularDistance(
  point: StrokePoint,
  start: StrokePoint,
  end: StrokePoint
): number {
  const segmentX = end[0] - start[0]
  const segmentY = end[1] - start[1]
  const lengthSquared = segmentX * segmentX + segmentY * segmentY
  if (lengthSquared === 0) return distanceBetween(point, start)
  const amount = Math.max(
    0,
    Math.min(1, ((point[0] - start[0]) * segmentX + (point[1] - start[1]) * segmentY) / lengthSquared)
  )
  const projectedX = start[0] + segmentX * amount
  const projectedY = start[1] + segmentY * amount
  return Math.hypot(point[0] - projectedX, point[1] - projectedY)
}

function dedupePoints(points: StrokePoint[], minimumDistance: number): StrokePoint[] {
  if (points.length < 3) return points.map((point) => [...point] as StrokePoint)
  const clean: StrokePoint[] = [points[0]]
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index]
    if (distanceBetween(point, clean[clean.length - 1]) >= minimumDistance) {
      clean.push(point)
    }
  }
  const last = points[points.length - 1]
  if (distanceBetween(last, clean[clean.length - 1]) > 0) clean.push(last)
  return clean
}

function simplifyRdp(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length <= 2 || epsilon <= 0) return points
  let farthestIndex = 0
  let farthestDistance = 0
  const first = points[0]
  const last = points[points.length - 1]
  for (let index = 1; index < points.length - 1; index++) {
    const candidateDistance = perpendicularDistance(points[index], first, last)
    if (candidateDistance > farthestDistance) {
      farthestDistance = candidateDistance
      farthestIndex = index
    }
  }
  if (farthestDistance <= epsilon) return [first, last]
  const left = simplifyRdp(points.slice(0, farthestIndex + 1), epsilon)
  const right = simplifyRdp(points.slice(farthestIndex), epsilon)
  return [...left.slice(0, -1), ...right]
}

function smoothChaikin(points: StrokePoint[]): StrokePoint[] {
  if (points.length < 3) return points
  const smooth: StrokePoint[] = [points[0]]
  for (let index = 0; index < points.length - 1; index++) {
    const current = points[index]
    const next = points[index + 1]
    smooth.push(interpolatePoint(current, next, 0.25), interpolatePoint(current, next, 0.75))
  }
  smooth.push(points[points.length - 1])
  return smooth
}

/** Clean up raw pen input into smoother, more continuous curves after commit. */
export function snapStrokeToCurve(points: StrokePoint[], options: CurveSnapOptions): StrokePoint[] {
  if (options.level === 0 || points.length < 4) return points.map((point) => [...point] as StrokePoint)
  const level = options.level
  const minimumDistance = Math.max(0.15, options.size * (level === 1 ? 0.07 : 0.11))
  const epsilon = Math.max(0.2, options.size * (level === 1 ? 0.12 : 0.2))
  let snapped = dedupePoints(points, minimumDistance)
  snapped = simplifyRdp(snapped, epsilon)
  const passes = level === 1 ? 1 : 2
  for (let pass = 0; pass < passes; pass++) snapped = smoothChaikin(snapped)
  return snapped
}

/** Convert perfect-freehand outline points into an SVG/Path2D path string. */
export function outlineToPath(points: number[][]): string {
  const len = points.length
  if (len < 4) return ''
  let a = points[0]
  let b = points[1]
  const c = points[2]
  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(2)},${b[1].toFixed(
    2
  )} ${average(b[0], c[0]).toFixed(2)},${average(b[1], c[1]).toFixed(2)} T`
  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i]
    b = points[i + 1]
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(2)} `
  }
  result += 'Z'
  return result
}

/**
 * Build a filled Path2D for a pressure-sensitive stroke.
 * `points` are already in the target (screen) coordinate space.
 */
export function strokeToPath2D(points: StrokePoint[], opts: StrokeRenderOptions): Path2D | null {
  if (points.length === 0) return null
  const outline = getStroke(points as number[][], {
    size: opts.size,
    thinning: opts.thinning ?? 0.6,
    smoothing: opts.smoothing ?? 0.5,
    streamline: opts.streamline ?? 0.5,
    simulatePressure: false,
    last: true
  })
  const d = outlineToPath(outline)
  if (!d) {
    // Fall back to a dot for very short strokes.
    const dot = new Path2D()
    const [x, y, pr] = points[0]
    dot.arc(x, y, Math.max(1, (opts.size * (pr || 0.5)) / 2), 0, Math.PI * 2)
    return dot
  }
  return new Path2D(d)
}
