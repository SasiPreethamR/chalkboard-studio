import type { Camera, SceneObject, StrokeObject, Vec2 } from './types'

export function worldToScreen(p: Vec2, cam: Camera): Vec2 {
  return { x: p.x * cam.scale + cam.x, y: p.y * cam.scale + cam.y }
}

export function screenToWorld(p: Vec2, cam: Camera): Vec2 {
  return { x: (p.x - cam.x) / cam.scale, y: (p.y - cam.y) / cam.scale }
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Axis-aligned bounding box of an object in its own coordinate space. */
export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function objectBounds(obj: SceneObject): Bounds {
  switch (obj.type) {
    case 'stroke': {
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const [x, y] of obj.points) {
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
      const pad = obj.size
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
    }
    case 'image':
      return { minX: obj.x, minY: obj.y, maxX: obj.x + obj.width, maxY: obj.y + obj.height }
    case 'shape': {
      const minX = Math.min(obj.x, obj.x + obj.width)
      const maxX = Math.max(obj.x, obj.x + obj.width)
      const minY = Math.min(obj.y, obj.y + obj.height)
      const maxY = Math.max(obj.y, obj.y + obj.height)
      const pad = obj.strokeWidth / 2 + 2
      return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad }
    }
    case 'text': {
      // Rough estimate; refined by measured width when available.
      const w = (obj.text.length || 1) * obj.fontSize * 0.6
      return { minX: obj.x, minY: obj.y, maxX: obj.x + w, maxY: obj.y + obj.fontSize * 1.3 }
    }
  }
}

export function pointInBounds(p: Vec2, b: Bounds): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY
}

/** Distance from a point to a stroke's polyline, in the stroke's own space. */
export function distanceToStroke(p: Vec2, obj: StrokeObject): number {
  const pts = obj.points
  if (pts.length === 0) return Infinity
  if (pts.length === 1) return Math.hypot(p.x - pts[0][0], p.y - pts[0][1])
  let min = Infinity
  for (let i = 1; i < pts.length; i++) {
    const d = distToSegment(p, pts[i - 1], pts[i])
    if (d < min) min = d
  }
  return min
}

function distToSegment(p: Vec2, a: number[], b: number[]): number {
  const ax = a[0]
  const ay = a[1]
  const bx = b[0]
  const by = b[1]
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((p.x - ax) * dx + (p.y - ay) * dy) / len2
  t = clamp(t, 0, 1)
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(p.x - cx, p.y - cy)
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}
