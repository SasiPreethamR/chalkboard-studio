import { useCallback, useEffect, useRef, useState } from 'react'
import { useScene, newStroke, newShape } from '../state/sceneStore'
import type {
  ImageObject,
  SceneObject,
  ShapeObject,
  StrokeObject,
  StrokePoint,
  TextObject,
  Vec2
} from '../types'
import { screenToWorld, uid, worldToScreen } from '../geometry'
import { drawScene, screenBounds } from './render'
import { hitTest, strokesNear } from './hitTest'
import { sampleAll } from '../animation/engine'
import { snapStrokeToCurve } from './strokes'

type Mode = 'idle' | 'draw' | 'erase' | 'pan' | 'move' | 'resize' | 'shape'

interface TextEdit {
  screenX: number
  screenY: number
  fontPx: number
  color: string
  value: string
  editingId: string | null
}

export default function InfiniteCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const frameRef = useRef(0)

  // Interaction state kept in refs so handlers don't re-create every render.
  const modeRef = useRef<Mode>('idle')
  const livePointsRef = useRef<StrokePoint[]>([])
  const liveStrokeRef = useRef<StrokeObject | null>(null)
  const liveShapeRef = useRef<ShapeObject | null>(null)
  const shapeStartRef = useRef<Vec2>({ x: 0, y: 0 })
  const lastScreenRef = useRef<Vec2>({ x: 0, y: 0 })
  const moveSnapshotRef = useRef<SceneObject | null>(null)
  const resizeRef = useRef<{ snapshot: SceneObject; anchor: Vec2; start: Vec2 } | null>(null)
  // History is only snapshotted once the user actually drags (move/resize),
  // never on a plain select-click, so the undo stack isn't polluted by no-ops.
  const pendingHistoryRef = useRef(false)
  const spaceDownRef = useRef(false)

  const [textEdit, setTextEdit] = useState<TextEdit | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)

  // ---- render loop (redraw on demand) ---------------------------------
  const scheduleRender = useCallback(() => {
    if (frameRef.current) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) return
      const { w, h, dpr } = sizeRef.current
      const { objects, camera, selectedId, layers, anim } = useScene.getState()
      const samples = anim.enabled ? sampleAll(anim.clips, anim.time) : null
      drawScene(ctx, {
        objects,
        camera,
        selectedId: anim.enabled && anim.playing ? null : selectedId,
        width: w,
        height: h,
        dpr,
        layers,
        liveStroke: liveStrokeRef.current,
        liveShape: liveShapeRef.current,
        anim: samples,
        onImageLoad: scheduleRender
      })
    })
  }, [])

  // Resize handling
  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const w = host.clientWidth
      const h = host.clientHeight
      sizeRef.current = { w, h, dpr }
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      useScene.getState().setViewport(w, h)
      scheduleRender()
    })
    ro.observe(host)
    return () => ro.disconnect()
  }, [scheduleRender])

  // Redraw whenever the store changes
  useEffect(() => useScene.subscribe(scheduleRender), [scheduleRender])

  // Animation playback: advance the playhead with a rAF loop while playing.
  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (now: number): void => {
      const st = useScene.getState()
      if (!st.anim.playing) {
        raf = 0
        return
      }
      if (!last) last = now
      const dt = (now - last) / 1000
      last = now
      let t = st.anim.time + dt
      if (t >= st.anim.duration) {
        if (st.anim.loop) {
          t = st.anim.duration > 0 ? t % st.anim.duration : 0
        } else {
          st.animSetTime(st.anim.duration)
          st.animPause()
          return
        }
      }
      st.animSetTime(t)
      raf = requestAnimationFrame(tick)
    }
    const start = (): void => {
      last = 0
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const unsub = useScene.subscribe((s, prev) => {
      if (s.anim.playing && !prev.anim.playing) start()
    })
    if (useScene.getState().anim.playing) start()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      unsub()
    }
  }, [])

  // Spacebar = temporary pan; Delete/undo/redo shortcuts
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = true
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) useScene.getState().redo()
        else useScene.getState().undo()
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        useScene.getState().redo()
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !textEdit) {
        const { selectedId, removeObject } = useScene.getState()
        if (selectedId) {
          e.preventDefault()
          removeObject(selectedId)
        }
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceDownRef.current = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [textEdit])

  // ---- helpers ---------------------------------------------------------
  function localPoint(e: { clientX: number; clientY: number }): Vec2 {
    const rect = hostRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function onResizeHandleHit(screen: Vec2, obj: SceneObject): boolean {
    const b = screenBounds(obj, useScene.getState().camera)
    const hx = b.x + b.w
    const hy = b.y + b.h
    return Math.abs(screen.x - hx) <= 10 && Math.abs(screen.y - hy) <= 10
  }

  // ---- pointer handlers ------------------------------------------------
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (textEdit) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    const screen = localPoint(e)
    lastScreenRef.current = screen
    const state = useScene.getState()
    const { tool, camera } = state

    const wantsPan = spaceDownRef.current || e.button === 1
    if (wantsPan) {
      modeRef.current = 'pan'
      return
    }

    if (tool === 'pen' || tool === 'highlighter') {
      const style = tool === 'highlighter' ? state.highlighter : state.pen
      const stroke = newStroke(style, tool === 'highlighter', state.activeLayerId)
      const w = screenToWorld(screen, camera)
      livePointsRef.current = [[w.x, w.y, pressureOf(e)]]
      stroke.points = livePointsRef.current
      liveStrokeRef.current = stroke
      modeRef.current = 'draw'
      scheduleRender()
      return
    }

    if (tool === 'shape') {
      const w = screenToWorld(screen, camera)
      shapeStartRef.current = w
      liveShapeRef.current = newShape(state.shape, w.x, w.y, state.activeLayerId)
      modeRef.current = 'shape'
      scheduleRender()
      return
    }

    if (tool === 'eraser') {
      modeRef.current = 'erase'
      eraseAt(screen)
      return
    }

    if (tool === 'text') {
      placeText(screen, null)
      return
    }

    if (tool === 'image') {
      pickImage(screen)
      return
    }

    // select tool
    const sel = state.selectedId ? state.objects.find((o) => o.id === state.selectedId) : null
    if (sel && onResizeHandleHit(screen, sel)) {
      const anchor = objectAnchor(sel)
      const start = sel.pinned ? screen : screenToWorld(screen, camera)
      resizeRef.current = { snapshot: cloneObj(sel), anchor, start }
      pendingHistoryRef.current = true
      modeRef.current = 'resize'
      return
    }
    const hit = hitTest(state.objects, screen, camera, state.layers)
    if (hit) {
      state.select(hit.id)
      moveSnapshotRef.current = cloneObj(hit)
      pendingHistoryRef.current = true
      modeRef.current = 'move'
    } else {
      state.select(null)
      modeRef.current = 'pan'
    }
    scheduleRender()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const screen = localPoint(e)
    const state = useScene.getState()
    const mode = modeRef.current

    if (mode === 'draw' && liveStrokeRef.current) {
      const events = (e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent]) as PointerEvent[]
      for (const ce of events) {
        const sp = localPoint(ce)
        const w = screenToWorld(sp, state.camera)
        livePointsRef.current.push([w.x, w.y, pressureOf(ce)])
      }
      scheduleRender()
      return
    }
    if (mode === 'erase') {
      eraseAt(screen)
      lastScreenRef.current = screen
      return
    }
    if (mode === 'shape' && liveShapeRef.current) {
      const w = screenToWorld(screen, state.camera)
      const start = shapeStartRef.current
      liveShapeRef.current = {
        ...liveShapeRef.current,
        width: w.x - start.x,
        height: w.y - start.y
      }
      scheduleRender()
      return
    }
    if (mode === 'pan') {
      const dx = screen.x - lastScreenRef.current.x
      const dy = screen.y - lastScreenRef.current.y
      state.panBy(dx, dy)
      lastScreenRef.current = screen
      return
    }
    if (mode === 'move' && state.selectedId && moveSnapshotRef.current) {
      const dxScreen = screen.x - lastScreenRef.current.x
      const dyScreen = screen.y - lastScreenRef.current.y
      const sel = state.objects.find((o) => o.id === state.selectedId)
      if (sel) {
        if (pendingHistoryRef.current) {
          state.beginHistory()
          pendingHistoryRef.current = false
        }
        const f = sel.pinned ? 1 : 1 / state.camera.scale
        applyTranslate(state.selectedId, dxScreen * f, dyScreen * f)
      }
      lastScreenRef.current = screen
      return
    }
    if (mode === 'resize' && resizeRef.current && state.selectedId) {
      if (pendingHistoryRef.current) {
        state.beginHistory()
        pendingHistoryRef.current = false
      }
      const r = resizeRef.current
      const cur = r.snapshot.pinned ? screen : screenToWorld(screen, state.camera)
      const denomX = r.start.x - r.anchor.x || 1
      const denomY = r.start.y - r.anchor.y || 1
      let fx = (cur.x - r.anchor.x) / denomX
      let fy = (cur.y - r.anchor.y) / denomY
      fx = clampFactor(fx)
      fy = clampFactor(fy)
      applyResize(state.selectedId, r.snapshot, r.anchor, fx, fy)
      return
    }
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    const mode = modeRef.current
    if (mode === 'draw' && liveStrokeRef.current) {
      const stroke = liveStrokeRef.current
      const { curveSnap } = useScene.getState()
      stroke.points = snapStrokeToCurve(livePointsRef.current, {
        level: curveSnap,
        size: stroke.size
      })
      if (stroke.points.length > 0) useScene.getState().addObject(stroke)
      liveStrokeRef.current = null
      livePointsRef.current = []
    }
    if (mode === 'shape' && liveShapeRef.current) {
      const shape = liveShapeRef.current
      liveShapeRef.current = null
      // Normalize so width/height are positive (anchor at top-left).
      const nx = Math.min(shape.x, shape.x + shape.width)
      const ny = Math.min(shape.y, shape.y + shape.height)
      const nw = Math.abs(shape.width)
      const nh = Math.abs(shape.height)
      const isLine =
        shape.shape === 'line' || shape.shape === 'arrow' || shape.shape === 'doubleArrow'
      const big = Math.max(nw, nh)
      if (big >= 4) {
        const state = useScene.getState()
        const committed: ShapeObject = isLine
          ? shape // lines keep their directional width/height
          : { ...shape, x: nx, y: ny, width: nw, height: nh }
        state.addObject(committed)
        state.setTool('select')
        state.select(committed.id)
      }
    }
    modeRef.current = 'idle'
    moveSnapshotRef.current = null
    resizeRef.current = null
    pendingHistoryRef.current = false
    scheduleRender()
  }

  const onWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const screen = localPoint(e)
    const state = useScene.getState()
    if (e.ctrlKey || e.metaKey) {
      // Gentle, smooth zoom. Clamp per-event factor so a single trackpad
      // pinch or notch never jumps more than ~25%.
      const raw = Math.exp(-e.deltaY * 0.0015)
      const factor = Math.max(0.8, Math.min(1.25, raw))
      state.zoomAt(screen, factor)
    } else {
      state.panBy(-e.deltaX, -e.deltaY)
    }
  }

  // ---- eraser ----------------------------------------------------------
  function eraseAt(screen: Vec2): void {
    const state = useScene.getState()
    // The eraser only affects the active layer (and never hidden/locked ones).
    const onActiveLayer = state.objects.filter((o) => o.layerId === state.activeLayerId)
    const ids = strokesNear(onActiveLayer, screen, state.camera, state.eraserRadius, state.layers)
    if (ids.length === 0) return
    if (modeRef.current === 'erase' && !erasedThisStroke.current) {
      state.beginHistory()
      erasedThisStroke.current = true
    }
    for (const id of ids) {
      useScene.setState((s) => ({ objects: s.objects.filter((o) => o.id !== id) }))
    }
  }
  const erasedThisStroke = useRef(false)
  useEffect(() => {
    if (modeRef.current !== 'erase') erasedThisStroke.current = false
  })

  // ---- text ------------------------------------------------------------
  function placeText(screen: Vec2, editing: TextObject | null): void {
    const state = useScene.getState()
    setTextEdit({
      screenX: editing ? worldToScreen(editing, state.camera).x : screen.x,
      screenY: editing ? worldToScreen(editing, state.camera).y : screen.y,
      fontPx: (editing ? editing.fontSize : state.textSize) * state.camera.scale,
      color: editing ? editing.color : state.textColor,
      value: editing ? editing.text : '',
      editingId: editing ? editing.id : null
    })
    setTimeout(() => textRef.current?.focus(), 0)
  }

  function commitText(): void {
    const edit = textEdit
    setTextEdit(null)
    if (!edit) return
    const state = useScene.getState()
    const value = edit.value.replace(/\n+$/, '')
    if (!value.trim()) {
      if (edit.editingId) state.removeObject(edit.editingId)
      return
    }
    const world = screenToWorld({ x: edit.screenX, y: edit.screenY }, state.camera)
    if (edit.editingId) {
      state.beginHistory()
      state.updateObject(edit.editingId, { text: value })
    } else {
      const obj: TextObject = {
        id: uid(),
        type: 'text',
        x: world.x,
        y: world.y,
        text: value,
        color: state.textColor,
        fontSize: state.textSize,
        pinned: false,
        locked: false,
        zIndex: 0,
        layerId: state.activeLayerId
      }
      state.addObject(obj)
    }
  }

  // ---- image insertion -------------------------------------------------
  function pickImage(screen: Vec2): void {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) insertImageFile(file, screen)
    }
    input.click()
  }

  function insertImageFile(file: File, screen: Vec2): void {
    const reader = new FileReader()
    reader.onload = () => {
      const src = reader.result as string
      const img = new Image()
      img.onload = () => {
        const state = useScene.getState()
        const maxW = 480
        const scale = img.width > maxW ? maxW / img.width : 1
        const wWorld = (img.width * scale) / state.camera.scale
        const hWorld = (img.height * scale) / state.camera.scale
        const world = screenToWorld(screen, state.camera)
        const obj: ImageObject = {
          id: uid(),
          type: 'image',
          x: world.x,
          y: world.y,
          width: wWorld,
          height: hWorld,
          src,
          pinned: false,
          locked: false,
          zIndex: 0,
          layerId: state.activeLayerId
        }
        state.addObject(obj)
        state.setTool('select')
        state.select(obj.id)
      }
      img.src = src
    }
    reader.readAsDataURL(file)
  }

  // Paste images from clipboard
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'))
      const file = item?.getAsFile()
      if (file) {
        const { w, h } = sizeRef.current
        insertImageFile(file, { x: w / 2, y: h / 2 })
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  // Drag & drop images
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (file) insertImageFile(file, localPoint(e))
  }

  // Double click with select tool edits text
  const onDoubleClick = (e: React.MouseEvent) => {
    const state = useScene.getState()
    if (state.tool !== 'select' && state.tool !== 'text') return
    const hit = hitTest(state.objects, localPoint(e), state.camera, state.layers)
    if (hit && hit.type === 'text') {
      state.select(hit.id)
      placeText(localPoint(e), hit)
    }
  }

  return (
    <div
      ref={hostRef}
      className="canvas-host"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onDoubleClick={onDoubleClick}
    >
      <canvas ref={canvasRef} id="board-canvas" />
      {textEdit && (
        <textarea
          ref={textRef}
          className="text-input"
          style={{
            left: textEdit.screenX,
            top: textEdit.screenY,
            fontSize: textEdit.fontPx,
            color: textEdit.color,
            lineHeight: 1.25,
            minWidth: 40
          }}
          value={textEdit.value}
          onChange={(e) => setTextEdit({ ...textEdit, value: e.target.value })}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              commitText()
            }
            if (e.key === 'Escape') {
              e.preventDefault()
              setTextEdit(null)
            }
          }}
        />
      )}
    </div>
  )
}

// ---- module helpers ----------------------------------------------------
function pressureOf(e: { pressure?: number; pointerType?: string }): number {
  if (e.pointerType === 'pen') return e.pressure && e.pressure > 0 ? e.pressure : 0.5
  return 0.5
}

function clampFactor(f: number): number {
  if (!Number.isFinite(f)) return 1
  return Math.max(0.05, Math.min(20, f))
}

function objectAnchor(obj: SceneObject): Vec2 {
  if (obj.type === 'stroke') {
    let minX = Infinity
    let minY = Infinity
    for (const [x, y] of obj.points) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
    }
    return { x: minX, y: minY }
  }
  return { x: obj.x, y: obj.y }
}

function cloneObj(obj: SceneObject): SceneObject {
  return obj.type === 'stroke'
    ? { ...obj, points: obj.points.map((p: StrokePoint) => [...p] as StrokePoint) }
    : { ...obj }
}

function applyTranslate(id: string, dx: number, dy: number): void {
  useScene.setState((s) => ({
    objects: s.objects.map((o) => {
      if (o.id !== id) return o
      if (o.type === 'stroke') {
        return { ...o, points: o.points.map(([x, y, p]: StrokePoint) => [x + dx, y + dy, p] as StrokePoint) }
      }
      return { ...o, x: o.x + dx, y: o.y + dy }
    })
  }))
}

function applyResize(id: string, snap: SceneObject, anchor: Vec2, fx: number, fy: number): void {
  useScene.setState((s) => ({
    objects: s.objects.map((o) => {
      if (o.id !== id) return o
      if (snap.type === 'stroke' && o.type === 'stroke') {
        const f = (Math.abs(fx) + Math.abs(fy)) / 2
        return {
          ...o,
          size: snap.size * f,
          points: snap.points.map(
            ([x, y, p]: StrokePoint) =>
              [anchor.x + (x - anchor.x) * fx, anchor.y + (y - anchor.y) * fy, p] as StrokePoint
          )
        }
      }
      if (snap.type === 'image' && o.type === 'image') {
        return { ...o, width: Math.max(8, snap.width * fx), height: Math.max(8, snap.height * fy) }
      }
      if (snap.type === 'shape' && o.type === 'shape') {
        return { ...o, width: snap.width * fx, height: snap.height * fy }
      }
      if (snap.type === 'text' && o.type === 'text') {
        return { ...o, fontSize: Math.max(6, snap.fontSize * fy) }
      }
      return o
    })
  }))
}
