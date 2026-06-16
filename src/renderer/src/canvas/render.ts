import type { AnimSample, Camera, Layer, SceneObject, ShapeObject, StrokeObject, Vec2 } from '../types'
import { worldToScreen } from '../geometry'
import { strokeToPath2D } from './strokes'
import { getImage } from './imageCache'

export interface RenderState {
  objects: SceneObject[]
  camera: Camera
  selectedId: string | null
  width: number
  height: number
  dpr: number
  layers?: Layer[]
  /** A live stroke being drawn (already in world space unless pinnedDraw). */
  liveStroke?: StrokeObject | null
  /** A shape currently being dragged out. */
  liveShape?: ShapeObject | null
  /** Per-object animation overrides at the current time (animation mode). */
  anim?: Record<string, AnimSample> | null
  onImageLoad: () => void
}

export function drawScene(ctx: CanvasRenderingContext2D, s: RenderState): void {
  ctx.save()
  ctx.scale(s.dpr, s.dpr)
  ctx.clearRect(0, 0, s.width, s.height)

  const layers = s.layers ?? []
  const layerIndex = new Map(layers.map((l, i) => [l.id, i]))
  const hidden = new Set(layers.filter((l) => !l.visible).map((l) => l.id))

  const visible = s.objects.filter((o) => !hidden.has(o.layerId))
  const ordered = [...visible].sort((a, b) => {
    const la = layerIndex.get(a.layerId) ?? 0
    const lb = layerIndex.get(b.layerId) ?? 0
    if (la !== lb) return la - lb
    return a.zIndex - b.zIndex
  })
  // World objects first (they scroll), then pinned objects on top (they float).
  for (const obj of ordered) if (!obj.pinned) drawObjectSampled(ctx, obj, s)
  if (s.liveStroke) drawStroke(ctx, s.liveStroke, s.camera)
  if (s.liveShape) drawShape(ctx, s.liveShape, s.camera)
  for (const obj of ordered) if (obj.pinned) drawObjectSampled(ctx, obj, s)

  if (s.selectedId && !hidden.has(s.objects.find((o) => o.id === s.selectedId)?.layerId ?? '')) {
    const sel = s.objects.find((o) => o.id === s.selectedId)
    if (sel) drawSelection(ctx, sel, s.camera)
  }
  ctx.restore()
}

/** Draw an object, applying its animation sample (transform + opacity + reveal) if any. */
function drawObjectSampled(ctx: CanvasRenderingContext2D, obj: SceneObject, s: RenderState): void {
  const sample = s.anim ? s.anim[obj.id] : undefined
  if (!sample) {
    drawObject(ctx, obj, s, 1, 1)
    return
  }
  if (sample.opacity <= 0.001 || sample.scale <= 0.0001 || sample.reveal <= 0.001) return
  const identity =
    sample.dx === 0 && sample.dy === 0 && sample.scale === 1 && sample.rotate === 0
  ctx.save()
  if (!identity) {
    const b = screenBounds(obj, s.camera)
    const cx = b.x + b.w / 2
    const cy = b.y + b.h / 2
    const sscale = obj.pinned ? 1 : s.camera.scale
    ctx.translate(cx + sample.dx * sscale, cy + sample.dy * sscale)
    ctx.rotate(sample.rotate)
    ctx.scale(sample.scale, sample.scale)
    ctx.translate(-cx, -cy)
  }
  drawObject(ctx, obj, s, sample.opacity, sample.reveal)
  ctx.restore()
}

function drawObject(
  ctx: CanvasRenderingContext2D,
  obj: SceneObject,
  s: RenderState,
  alpha: number,
  reveal: number
): void {
  switch (obj.type) {
    case 'stroke':
      drawStroke(ctx, obj, s.camera, alpha, reveal)
      break
    case 'text':
      drawText(ctx, obj, s.camera, alpha * reveal)
      break
    case 'image':
      drawImageObj(ctx, obj, s, alpha * reveal)
      break
    case 'shape':
      drawShape(ctx, obj, s.camera, alpha, reveal)
      break
  }
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  obj: StrokeObject,
  cam: Camera,
  alpha = 1,
  reveal = 1
): void {
  if (obj.points.length === 0) return
  const scale = obj.pinned ? 1 : cam.scale
  let pts = obj.pinned
    ? obj.points.map((p) => [...p] as [number, number, number])
    : obj.points.map(([x, y, pr]) => {
        const sp = worldToScreen({ x, y }, cam)
        return [sp.x, sp.y, pr] as [number, number, number]
      })
  if (reveal < 1) {
    // Draw-on: reveal a leading fraction of the stroke (3b1b "Write").
    const n = Math.max(2, Math.round(reveal * pts.length))
    pts = pts.slice(0, n)
  }
  const path = strokeToPath2D(pts, { size: obj.size * scale })
  if (!path) return
  ctx.save()
  ctx.globalAlpha = obj.opacity * alpha
  if (obj.highlighter) ctx.globalCompositeOperation = 'lighten'
  ctx.fillStyle = obj.color
  ctx.fill(path)
  ctx.restore()
}

function drawText(
  ctx: CanvasRenderingContext2D,
  obj: Extract<SceneObject, { type: 'text' }>,
  cam: Camera,
  alpha = 1
): void {
  const pos: Vec2 = obj.pinned ? { x: obj.x, y: obj.y } : worldToScreen({ x: obj.x, y: obj.y }, cam)
  const fontPx = obj.pinned ? obj.fontSize : obj.fontSize * cam.scale
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = obj.color
  ctx.textBaseline = 'top'
  ctx.font = `${fontPx}px -apple-system, "Segoe UI", Roboto, sans-serif`
  const lines = obj.text.split('\n')
  lines.forEach((line, i) => ctx.fillText(line, pos.x, pos.y + i * fontPx * 1.25))
  ctx.restore()
}

function polyPath(ctx: CanvasRenderingContext2D, pts: [number, number][]): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
}

/** Vertices of a regular polygon inscribed in the given box (point-up by default). */
function regularPoly(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  n: number,
  rot = -Math.PI / 2
): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = rot + (i * 2 * Math.PI) / n
    pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return pts
}

/** Vertices of an n-point star inscribed in the given box. */
function starPoly(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points: number,
  inner = 0.5
): [number, number][] {
  const pts: [number, number][] = []
  const rot = -Math.PI / 2
  for (let i = 0; i < points * 2; i++) {
    const k = i % 2 === 0 ? 1 : inner
    const a = rot + (i * Math.PI) / points
    pts.push([cx + rx * k * Math.cos(a), cy + ry * k * Math.sin(a)])
  }
  return pts
}

function arrowHead(
  ctx: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  ang: number,
  len: number
): void {
  const a = Math.PI / 7
  ctx.beginPath()
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - len * Math.cos(ang - a), tipY - len * Math.sin(ang - a))
  ctx.moveTo(tipX, tipY)
  ctx.lineTo(tipX - len * Math.cos(ang + a), tipY - len * Math.sin(ang + a))
  ctx.stroke()
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  obj: ShapeObject,
  cam: Camera,
  alpha = 1,
  reveal = 1
): void {
  const scale = obj.pinned ? 1 : cam.scale
  const p0 = obj.pinned ? { x: obj.x, y: obj.y } : worldToScreen({ x: obj.x, y: obj.y }, cam)
  const x = p0.x
  const y = p0.y
  const w = obj.width * scale
  const h = obj.height * scale
  // Normalized box.
  const nx = Math.min(x, x + w)
  const ny = Math.min(y, y + h)
  const nw = Math.abs(w)
  const nh = Math.abs(h)
  const cx = nx + nw / 2
  const cy = ny + nh / 2

  ctx.save()
  ctx.globalAlpha = obj.opacity * alpha * reveal
  ctx.lineWidth = Math.max(1, obj.strokeWidth * scale)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.strokeStyle = obj.color
  const doFill = obj.fill != null
  if (doFill) ctx.fillStyle = obj.fill as string
  const fillStroke = (): void => {
    if (doFill) ctx.fill()
    ctx.stroke()
  }

  switch (obj.shape) {
    case 'rectangle': {
      if (doFill) ctx.fillRect(nx, ny, nw, nh)
      ctx.strokeRect(nx, ny, nw, nh)
      break
    }
    case 'roundRect': {
      const r = Math.min(nw, nh) * 0.18
      ctx.beginPath()
      ctx.roundRect(nx, ny, nw, nh, r)
      fillStroke()
      break
    }
    case 'ellipse': {
      ctx.beginPath()
      ctx.ellipse(cx, cy, nw / 2, nh / 2, 0, 0, Math.PI * 2)
      fillStroke()
      break
    }
    case 'triangle': {
      ctx.beginPath()
      ctx.moveTo(nx + nw / 2, ny)
      ctx.lineTo(nx, ny + nh)
      ctx.lineTo(nx + nw, ny + nh)
      ctx.closePath()
      fillStroke()
      break
    }
    case 'diamond': {
      polyPath(ctx, [
        [nx + nw / 2, ny],
        [nx + nw, ny + nh / 2],
        [nx + nw / 2, ny + nh],
        [nx, ny + nh / 2]
      ])
      fillStroke()
      break
    }
    case 'pentagon': {
      polyPath(ctx, regularPoly(cx, cy, nw / 2, nh / 2, 5))
      fillStroke()
      break
    }
    case 'hexagon': {
      polyPath(ctx, regularPoly(cx, cy, nw / 2, nh / 2, 6, 0))
      fillStroke()
      break
    }
    case 'star': {
      polyPath(ctx, starPoly(cx, cy, nw / 2, nh / 2, 5))
      fillStroke()
      break
    }
    case 'parallelogram': {
      const off = nw * 0.25
      polyPath(ctx, [
        [nx + off, ny],
        [nx + nw, ny],
        [nx + nw - off, ny + nh],
        [nx, ny + nh]
      ])
      fillStroke()
      break
    }
    case 'trapezoid': {
      const off = nw * 0.22
      polyPath(ctx, [
        [nx + off, ny],
        [nx + nw - off, ny],
        [nx + nw, ny + nh],
        [nx, ny + nh]
      ])
      fillStroke()
      break
    }
    case 'cross': {
      const tx = nw / 3
      const ty = nh / 3
      polyPath(ctx, [
        [nx + tx, ny],
        [nx + nw - tx, ny],
        [nx + nw - tx, ny + ty],
        [nx + nw, ny + ty],
        [nx + nw, ny + nh - ty],
        [nx + nw - tx, ny + nh - ty],
        [nx + nw - tx, ny + nh],
        [nx + tx, ny + nh],
        [nx + tx, ny + nh - ty],
        [nx, ny + nh - ty],
        [nx, ny + ty],
        [nx + tx, ny + ty]
      ])
      fillStroke()
      break
    }
    case 'heart': {
      const topY = ny + nh * 0.3
      ctx.beginPath()
      ctx.moveTo(cx, ny + nh)
      ctx.bezierCurveTo(nx - nw * 0.08, ny + nh * 0.45, nx + nw * 0.18, ny, cx, topY)
      ctx.bezierCurveTo(nx + nw - nw * 0.18, ny, nx + nw + nw * 0.08, ny + nh * 0.45, cx, ny + nh)
      ctx.closePath()
      fillStroke()
      break
    }
    case 'line': {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y + h)
      ctx.stroke()
      break
    }
    case 'arrow': {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y + h)
      ctx.stroke()
      const ang = Math.atan2(h, w)
      const len = Math.max(10, Math.min(28, Math.hypot(w, h) * 0.25))
      arrowHead(ctx, x + w, y + h, ang, len)
      break
    }
    case 'doubleArrow': {
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + w, y + h)
      ctx.stroke()
      const ang = Math.atan2(h, w)
      const len = Math.max(10, Math.min(28, Math.hypot(w, h) * 0.25))
      arrowHead(ctx, x + w, y + h, ang, len)
      arrowHead(ctx, x, y, ang + Math.PI, len)
      break
    }
  }
  ctx.restore()
}

function drawImageObj(
  ctx: CanvasRenderingContext2D,
  obj: Extract<SceneObject, { type: 'image' }>,
  s: RenderState,
  alpha = 1
): void {
  const img = getImage(obj.src, s.onImageLoad)
  const pos: Vec2 = obj.pinned ? { x: obj.x, y: obj.y } : worldToScreen({ x: obj.x, y: obj.y }, s.camera)
  const scale = obj.pinned ? 1 : s.camera.scale
  const w = obj.width * scale
  const h = obj.height * scale
  if (!img) {
    ctx.save()
    ctx.strokeStyle = '#444'
    ctx.strokeRect(pos.x, pos.y, w, h)
    ctx.restore()
    return
  }
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.drawImage(img, pos.x, pos.y, w, h)
  ctx.restore()
}

function drawSelection(ctx: CanvasRenderingContext2D, obj: SceneObject, cam: Camera): void {
  const b = screenBounds(obj, cam)
  ctx.save()
  ctx.strokeStyle = obj.pinned ? '#ffb84d' : '#4c8dff'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 4])
  ctx.strokeRect(b.x, b.y, b.w, b.h)
  ctx.setLineDash([])
  // resize handle (bottom-right)
  ctx.fillStyle = '#fff'
  ctx.fillRect(b.x + b.w - 5, b.y + b.h - 5, 10, 10)
  ctx.restore()
}

export interface ScreenRect {
  x: number
  y: number
  w: number
  h: number
}

export function screenBounds(obj: SceneObject, cam: Camera): ScreenRect {
  const scale = obj.pinned ? 1 : cam.scale
  if (obj.type === 'stroke') {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const [x, y] of obj.points) {
      const p = obj.pinned ? { x, y } : worldToScreen({ x, y }, cam)
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    }
    const pad = obj.size * scale
    return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
  }
  if (obj.type === 'image') {
    const p = obj.pinned ? { x: obj.x, y: obj.y } : worldToScreen({ x: obj.x, y: obj.y }, cam)
    return { x: p.x, y: p.y, w: obj.width * scale, h: obj.height * scale }
  }
  if (obj.type === 'shape') {
    const p = obj.pinned ? { x: obj.x, y: obj.y } : worldToScreen({ x: obj.x, y: obj.y }, cam)
    const w = obj.width * scale
    const h = obj.height * scale
    const pad = (obj.strokeWidth * scale) / 2 + 2
    return {
      x: Math.min(p.x, p.x + w) - pad,
      y: Math.min(p.y, p.y + h) - pad,
      w: Math.abs(w) + pad * 2,
      h: Math.abs(h) + pad * 2
    }
  }
  // text
  const p = obj.pinned ? { x: obj.x, y: obj.y } : worldToScreen({ x: obj.x, y: obj.y }, cam)
  const fontPx = obj.fontSize * scale
  const lines = obj.text.split('\n')
  const w = Math.max(...lines.map((l) => l.length), 1) * fontPx * 0.6
  return { x: p.x, y: p.y, w, h: lines.length * fontPx * 1.25 }
}
