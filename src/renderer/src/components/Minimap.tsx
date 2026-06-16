import { useCallback, useEffect, useRef } from 'react'
import { useScene } from '../state/sceneStore'
import { objectBounds, screenToWorld } from '../geometry'
import type { Vec2 } from '../types'

const MM_W = 208
const MM_H = 132

interface Box {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export default function Minimap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const boxRef = useRef<Box>({ minX: 0, minY: 0, maxX: 1, maxY: 1 })
  const draggingRef = useRef(false)
  const frameRef = useRef(0)

  const draw = useCallback(() => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== MM_W * dpr) {
        canvas.width = MM_W * dpr
        canvas.height = MM_H * dpr
      }
      const { objects, camera, viewport, layers } = useScene.getState()
      const hidden = new Set(layers.filter((l) => !l.visible).map((l) => l.id))

      // Viewport rectangle in world coordinates.
      const tl = screenToWorld({ x: 0, y: 0 }, camera)
      const br = screenToWorld({ x: viewport.w, y: viewport.h }, camera)

      // Union of content bounds (non-pinned) and the current viewport.
      let box: Box = { minX: tl.x, minY: tl.y, maxX: br.x, maxY: br.y }
      for (const o of objects) {
        if (o.pinned || hidden.has(o.layerId)) continue
        const b = objectBounds(o)
        box.minX = Math.min(box.minX, b.minX)
        box.minY = Math.min(box.minY, b.minY)
        box.maxX = Math.max(box.maxX, b.maxX)
        box.maxY = Math.max(box.maxY, b.maxY)
      }
      // Pad by 8%.
      const padX = (box.maxX - box.minX) * 0.08 + 20
      const padY = (box.maxY - box.minY) * 0.08 + 20
      box = { minX: box.minX - padX, minY: box.minY - padY, maxX: box.maxX + padX, maxY: box.maxY + padY }
      boxRef.current = box

      const bw = Math.max(1, box.maxX - box.minX)
      const bh = Math.max(1, box.maxY - box.minY)
      const scale = Math.min(MM_W / bw, MM_H / bh)
      const offX = (MM_W - bw * scale) / 2
      const offY = (MM_H - bh * scale) / 2
      const mapX = (wx: number) => (wx - box.minX) * scale + offX
      const mapY = (wy: number) => (wy - box.minY) * scale + offY

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, MM_W, MM_H)
      ctx.fillStyle = '#0c0c0c'
      ctx.fillRect(0, 0, MM_W, MM_H)

      for (const o of objects) {
        if (o.pinned || hidden.has(o.layerId)) continue
        if (o.type === 'stroke') {
          if (o.points.length < 2) continue
          ctx.strokeStyle = o.color
          ctx.globalAlpha = 0.9
          ctx.lineWidth = 1
          ctx.beginPath()
          const step = Math.max(1, Math.floor(o.points.length / 40))
          for (let i = 0; i < o.points.length; i += step) {
            const [x, y] = o.points[i]
            const mx = mapX(x)
            const my = mapY(y)
            if (i === 0) ctx.moveTo(mx, my)
            else ctx.lineTo(mx, my)
          }
          ctx.stroke()
        } else {
          const b = objectBounds(o)
          ctx.globalAlpha = 0.85
          ctx.fillStyle = o.type === 'image' ? '#3a6ea5' : o.color
          ctx.fillRect(mapX(b.minX), mapY(b.minY), (b.maxX - b.minX) * scale, (b.maxY - b.minY) * scale)
        }
      }

      // Viewport rectangle.
      ctx.globalAlpha = 1
      ctx.strokeStyle = '#4c8dff'
      ctx.lineWidth = 1.5
      ctx.strokeRect(mapX(tl.x), mapY(tl.y), (br.x - tl.x) * scale, (br.y - tl.y) * scale)
      ctx.fillStyle = 'rgba(76, 141, 255, 0.12)'
      ctx.fillRect(mapX(tl.x), mapY(tl.y), (br.x - tl.x) * scale, (br.y - tl.y) * scale)
      ctx.restore()
    })
  }, [])

  useEffect(() => {
    draw()
    return useScene.subscribe(draw)
  }, [draw])

  function navTo(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const box = boxRef.current
    const bw = Math.max(1, box.maxX - box.minX)
    const bh = Math.max(1, box.maxY - box.minY)
    const scale = Math.min(MM_W / bw, MM_H / bh)
    const offX = (MM_W - bw * scale) / 2
    const offY = (MM_H - bh * scale) / 2
    const world: Vec2 = { x: (mx - offX) / scale + box.minX, y: (my - offY) / scale + box.minY }
    useScene.getState().centerOnWorld(world.x, world.y)
  }

  const scale = useScene((s) => s.camera.scale)
  const pct = Math.round(scale * 100)
  const ZOOM_LEVELS = [10, 25, 50, 75, 100, 150, 200, 400]

  return (
    <div className="minimap-panel">
      <canvas
        ref={canvasRef}
        className="minimap-canvas"
        style={{ width: MM_W, height: MM_H }}
        onPointerDown={(e) => {
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          draggingRef.current = true
          navTo(e)
        }}
        onPointerMove={(e) => draggingRef.current && navTo(e)}
        onPointerUp={(e) => {
          draggingRef.current = false
          ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
        }}
      />
      <div className="zoom-controls">
        <button title="Zoom out" onClick={() => useScene.getState().zoomBy(1 / 1.25)}>
          −
        </button>
        <select
          className="zoom-select"
          title="Zoom level"
          value={ZOOM_LEVELS.includes(pct) ? pct : ''}
          onChange={(e) => useScene.getState().zoomTo(Number(e.target.value) / 100)}
        >
          {!ZOOM_LEVELS.includes(pct) && <option value="">{pct}%</option>}
          {ZOOM_LEVELS.map((z) => (
            <option key={z} value={z}>
              {z}%
            </option>
          ))}
        </select>
        <button title="Zoom in" onClick={() => useScene.getState().zoomBy(1.25)}>
          +
        </button>
        <button title="Fit all content (F)" onClick={() => useScene.getState().fitToContent()}>
          ⤢
        </button>
      </div>
    </div>
  )
}
