import { create } from 'zustand'
import type {
  AnimClip,
  BoardDocument,
  Camera,
  ClipKind,
  CurveSnapLevel,
  Layer,
  SceneObject,
  ShapeKind,
  ShapeObject,
  StrokeObject,
  StrokePoint,
  ToolType,
  Vec2
} from '../types'
import { clamp, objectBounds, screenToWorld, uid, worldToScreen } from '../geometry'
import { clipsEnd } from '../animation/engine'

const MIN_SCALE = 0.05
const MAX_SCALE = 16
const FIT_MAX_SCALE = 2

export interface PenStyle {
  color: string
  size: number
  opacity: number
}

export interface ShapeStyle {
  shape: ShapeKind
  color: string
  fill: string | null
  strokeWidth: number
  opacity: number
}

export interface AnimState {
  /** when true the timeline/playback overrides are active */
  enabled: boolean
  playing: boolean
  /** current playhead time, seconds */
  time: number
  /** total timeline length, seconds */
  duration: number
  fps: number
  loop: boolean
  /** animation clips keyed by object id */
  clips: Record<string, AnimClip[]>
  selectedClipId: string | null
}

interface SceneState {
  objects: SceneObject[]
  camera: Camera
  tool: ToolType
  pen: PenStyle
  highlighter: PenStyle
  curveSnap: CurveSnapLevel
  textColor: string
  textSize: number
  eraserRadius: number
  shape: ShapeStyle
  selectedId: string | null
  viewport: { w: number; h: number }

  layers: Layer[]
  activeLayerId: string

  anim: AnimState

  past: SceneObject[][]
  future: SceneObject[][]

  // ---- tool / style setters ----
  setTool: (t: ToolType) => void
  setPenColor: (c: string) => void
  setPenSize: (s: number) => void
  setPenOpacity: (o: number) => void
  setCurveSnap: (level: CurveSnapLevel) => void
  setTextColor: (c: string) => void
  setTextSize: (s: number) => void
  setEraserRadius: (r: number) => void
  setShapeKind: (k: ShapeKind) => void
  setShapeColor: (c: string) => void
  setShapeFill: (c: string | null) => void
  setShapeStrokeWidth: (w: number) => void

  // ---- camera ----
  setCamera: (c: Camera) => void
  setViewport: (w: number, h: number) => void
  panBy: (dx: number, dy: number) => void
  zoomAt: (screen: Vec2, factor: number) => void
  zoomBy: (factor: number) => void
  zoomTo: (scale: number) => void
  fitToContent: () => void
  centerOnWorld: (x: number, y: number) => void
  resetView: () => void

  // ---- objects (mutations push history) ----
  beginHistory: () => void
  addObject: (o: SceneObject) => void
  updateObject: (id: string, patch: Partial<SceneObject>) => void
  removeObject: (id: string) => void
  select: (id: string | null) => void
  togglePin: (id: string) => void
  toggleLock: (id: string) => void
  bringToFront: (id: string) => void
  sendToBack: (id: string) => void

  // ---- layers ----
  addLayer: () => void
  removeLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setActiveLayer: (id: string) => void
  toggleLayerVisible: (id: string) => void
  toggleLayerLock: (id: string) => void
  moveLayer: (id: string, dir: -1 | 1) => void

  // ---- animation -------------------------------------------------------
  toggleAnimMode: () => void
  animPlay: () => void
  animPause: () => void
  animStop: () => void
  animSetTime: (t: number) => void
  animSetDuration: (d: number) => void
  animSetFps: (n: number) => void
  animToggleLoop: () => void
  addClip: (objectId: string, kind: ClipKind) => void
  updateClip: (objectId: string, clipId: string, patch: Partial<AnimClip>) => void
  removeClip: (objectId: string, clipId: string) => void
  selectClip: (clipId: string | null) => void

  undo: () => void
  redo: () => void
  clearBoard: () => void

  loadDocument: (doc: BoardDocument) => void
  toDocument: () => BoardDocument
}

const initialCamera: Camera = { x: 0, y: 0, scale: 1 }

const firstLayerId = uid()

function nextZ(objects: SceneObject[]): number {
  return objects.reduce((m, o) => Math.max(m, o.zIndex), 0) + 1
}

export const useScene = create<SceneState>((set, get) => ({
  objects: [],
  camera: initialCamera,
  tool: 'pen',
  pen: { color: '#ffffff', size: 6, opacity: 1 },
  highlighter: { color: '#ffe14d', size: 28, opacity: 0.35 },
  curveSnap: 1,
  textColor: '#ffffff',
  textSize: 28,
  eraserRadius: 20,
  shape: { shape: 'rectangle', color: '#ffffff', fill: null, strokeWidth: 4, opacity: 1 },
  selectedId: null,
  viewport: { w: 1, h: 1 },
  layers: [{ id: firstLayerId, name: 'Layer 1', visible: true, locked: false }],
  activeLayerId: firstLayerId,
  anim: {
    enabled: false,
    playing: false,
    time: 0,
    duration: 5,
    fps: 30,
    loop: true,
    clips: {},
    selectedClipId: null
  },
  past: [],
  future: [],

  setTool: (tool) => set({ tool, selectedId: tool === 'select' ? get().selectedId : null }),
  setPenColor: (color) => set((s) => ({ pen: { ...s.pen, color } })),
  setPenSize: (size) => set((s) => ({ pen: { ...s.pen, size } })),
  setPenOpacity: (opacity) => set((s) => ({ pen: { ...s.pen, opacity } })),
  setCurveSnap: (curveSnap) => set({ curveSnap }),
  setTextColor: (textColor) => set({ textColor }),
  setTextSize: (textSize) => set({ textSize }),
  setEraserRadius: (eraserRadius) => set({ eraserRadius }),
  setShapeKind: (k) => set((s) => ({ shape: { ...s.shape, shape: k } })),
  setShapeColor: (color) => set((s) => ({ shape: { ...s.shape, color } })),
  setShapeFill: (fill) => set((s) => ({ shape: { ...s.shape, fill } })),
  setShapeStrokeWidth: (strokeWidth) => set((s) => ({ shape: { ...s.shape, strokeWidth } })),

  setCamera: (camera) => set({ camera }),
  setViewport: (w, h) => set({ viewport: { w, h } }),
  panBy: (dx, dy) =>
    set((s) => ({ camera: { ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy } })),
  zoomAt: (screen, factor) =>
    set((s) => {
      const newScale = clamp(s.camera.scale * factor, MIN_SCALE, MAX_SCALE)
      const worldBefore = screenToWorld(screen, s.camera)
      // Keep the world point under the cursor fixed after zooming.
      const camera: Camera = {
        scale: newScale,
        x: screen.x - worldBefore.x * newScale,
        y: screen.y - worldBefore.y * newScale
      }
      return { camera }
    }),
  zoomBy: (factor) =>
    set((s) => {
      const center = { x: s.viewport.w / 2, y: s.viewport.h / 2 }
      const newScale = clamp(s.camera.scale * factor, MIN_SCALE, MAX_SCALE)
      const worldBefore = screenToWorld(center, s.camera)
      return {
        camera: {
          scale: newScale,
          x: center.x - worldBefore.x * newScale,
          y: center.y - worldBefore.y * newScale
        }
      }
    }),
  zoomTo: (scale) =>
    set((s) => {
      const center = { x: s.viewport.w / 2, y: s.viewport.h / 2 }
      const newScale = clamp(scale, MIN_SCALE, MAX_SCALE)
      const worldBefore = screenToWorld(center, s.camera)
      return {
        camera: {
          scale: newScale,
          x: center.x - worldBefore.x * newScale,
          y: center.y - worldBefore.y * newScale
        }
      }
    }),
  fitToContent: () =>
    set((s) => {
      const world = s.objects.filter((o) => !o.pinned)
      if (world.length === 0) return { camera: initialCamera }
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const o of world) {
        const b = objectBounds(o)
        minX = Math.min(minX, b.minX)
        minY = Math.min(minY, b.minY)
        maxX = Math.max(maxX, b.maxX)
        maxY = Math.max(maxY, b.maxY)
      }
      const pad = 60
      const cw = Math.max(1, maxX - minX)
      const ch = Math.max(1, maxY - minY)
      const { w, h } = s.viewport
      const scale = clamp(Math.min((w - pad * 2) / cw, (h - pad * 2) / ch), MIN_SCALE, FIT_MAX_SCALE)
      const cx = (minX + maxX) / 2
      const cy = (minY + maxY) / 2
      return { camera: { scale, x: w / 2 - cx * scale, y: h / 2 - cy * scale } }
    }),
  centerOnWorld: (x, y) =>
    set((s) => ({
      camera: {
        ...s.camera,
        x: s.viewport.w / 2 - x * s.camera.scale,
        y: s.viewport.h / 2 - y * s.camera.scale
      }
    })),
  resetView: () => set({ camera: initialCamera }),

  beginHistory: () =>
    set((s) => ({ past: [...s.past, clone(s.objects)].slice(-100), future: [] })),

  addObject: (o) =>
    set((s) => ({
      past: [...s.past, clone(s.objects)].slice(-100),
      future: [],
      objects: [
        ...s.objects,
        { ...o, zIndex: o.zIndex || nextZ(s.objects), layerId: o.layerId || s.activeLayerId }
      ]
    })),

  updateObject: (id, patch) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? ({ ...o, ...patch } as SceneObject) : o))
    })),

  removeObject: (id) =>
    set((s) => {
      const clips = { ...s.anim.clips }
      delete clips[id]
      return {
        past: [...s.past, clone(s.objects)].slice(-100),
        future: [],
        objects: s.objects.filter((o) => o.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        anim: { ...s.anim, clips }
      }
    }),

  select: (selectedId) => set({ selectedId }),

  togglePin: (id) =>
    set((s) => {
      const obj = s.objects.find((o) => o.id === id)
      if (!obj) return {}
      const converted = convertPinSpace(obj, s.camera, !obj.pinned)
      return {
        past: [...s.past, clone(s.objects)].slice(-100),
        future: [],
        objects: s.objects.map((o) => (o.id === id ? converted : o))
      }
    }),

  toggleLock: (id) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o))
    })),

  bringToFront: (id) =>
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, zIndex: nextZ(s.objects) } : o))
    })),

  sendToBack: (id) =>
    set((s) => {
      const minZ = s.objects.reduce((m, o) => Math.min(m, o.zIndex), 0) - 1
      return { objects: s.objects.map((o) => (o.id === id ? { ...o, zIndex: minZ } : o)) }
    }),

  // ---- layers ----------------------------------------------------------
  addLayer: () =>
    set((s) => {
      const id = uid()
      const n = s.layers.length + 1
      return {
        layers: [...s.layers, { id, name: `Layer ${n}`, visible: true, locked: false }],
        activeLayerId: id
      }
    }),

  removeLayer: (id) =>
    set((s) => {
      if (s.layers.length <= 1) return {}
      const layers = s.layers.filter((l) => l.id !== id)
      const objects = s.objects.filter((o) => o.layerId !== id)
      const activeLayerId = s.activeLayerId === id ? layers[layers.length - 1].id : s.activeLayerId
      return {
        past: [...s.past, clone(s.objects)].slice(-100),
        future: [],
        layers,
        objects,
        activeLayerId,
        selectedId: null
      }
    }),

  renameLayer: (id, name) =>
    set((s) => ({ layers: s.layers.map((l) => (l.id === id ? { ...l, name } : l)) })),

  setActiveLayer: (id) => set({ activeLayerId: id }),

  toggleLayerVisible: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    })),

  toggleLayerLock: (id) =>
    set((s) => ({
      layers: s.layers.map((l) => (l.id === id ? { ...l, locked: !l.locked } : l))
    })),

  moveLayer: (id, dir) =>
    set((s) => {
      const i = s.layers.findIndex((l) => l.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= s.layers.length) return {}
      const layers = [...s.layers]
      ;[layers[i], layers[j]] = [layers[j], layers[i]]
      return { layers }
    }),

  // ---- animation -------------------------------------------------------
  toggleAnimMode: () =>
    set((s) => ({
      anim: { ...s.anim, enabled: !s.anim.enabled, playing: false, time: 0 },
      selectedId: s.anim.enabled ? s.selectedId : s.selectedId
    })),

  animPlay: () =>
    set((s) => {
      // Restart from 0 if at/near the end.
      const time = s.anim.time >= s.anim.duration - 0.001 ? 0 : s.anim.time
      return { anim: { ...s.anim, playing: true, time } }
    }),

  animPause: () => set((s) => ({ anim: { ...s.anim, playing: false } })),

  animStop: () => set((s) => ({ anim: { ...s.anim, playing: false, time: 0 } })),

  animSetTime: (t) =>
    set((s) => ({ anim: { ...s.anim, time: clamp(t, 0, s.anim.duration) } })),

  animSetDuration: (d) =>
    set((s) => {
      const duration = clamp(d, 0.5, 600)
      return { anim: { ...s.anim, duration, time: Math.min(s.anim.time, duration) } }
    }),

  animSetFps: (n) => set((s) => ({ anim: { ...s.anim, fps: clamp(Math.round(n), 1, 120) } })),

  animToggleLoop: () => set((s) => ({ anim: { ...s.anim, loop: !s.anim.loop } })),

  addClip: (objectId, kind) =>
    set((s) => {
      const clip = defaultClip(kind, s.anim.time)
      const existing = s.anim.clips[objectId] ?? []
      const clips = { ...s.anim.clips, [objectId]: [...existing, clip] }
      const end = clipsEnd(clips)
      const duration = Math.max(s.anim.duration, Math.ceil(end))
      return { anim: { ...s.anim, clips, duration, selectedClipId: clip.id } }
    }),

  updateClip: (objectId, clipId, patch) =>
    set((s) => {
      const list = s.anim.clips[objectId]
      if (!list) return {}
      const next = list.map((c) => (c.id === clipId ? { ...c, ...patch } : c))
      const clips = { ...s.anim.clips, [objectId]: next }
      const duration = Math.max(s.anim.duration, Math.ceil(clipsEnd(clips)))
      return { anim: { ...s.anim, clips, duration } }
    }),

  removeClip: (objectId, clipId) =>
    set((s) => {
      const list = s.anim.clips[objectId]
      if (!list) return {}
      const filtered = list.filter((c) => c.id !== clipId)
      const clips = { ...s.anim.clips }
      if (filtered.length > 0) clips[objectId] = filtered
      else delete clips[objectId]
      const selectedClipId = s.anim.selectedClipId === clipId ? null : s.anim.selectedClipId
      return { anim: { ...s.anim, clips, selectedClipId } }
    }),

  selectClip: (selectedClipId) => set((s) => ({ anim: { ...s.anim, selectedClipId } })),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return {}
      const previous = s.past[s.past.length - 1]
      return {
        objects: previous,
        past: s.past.slice(0, -1),
        future: [clone(s.objects), ...s.future].slice(0, 100),
        selectedId: null
      }
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return {}
      const next = s.future[0]
      return {
        objects: next,
        future: s.future.slice(1),
        past: [...s.past, clone(s.objects)].slice(-100),
        selectedId: null
      }
    }),

  clearBoard: () =>
    set((s) => ({
      past: [...s.past, clone(s.objects)].slice(-100),
      future: [],
      objects: [],
      selectedId: null,
      anim: { ...s.anim, clips: {}, time: 0, playing: false, selectedClipId: null }
    })),

  loadDocument: (doc) =>
    set(() => {
      // Migrate older documents that have no layers.
      let layers = doc.layers && doc.layers.length > 0 ? doc.layers : null
      let objects = doc.objects
      if (!layers) {
        const id = uid()
        layers = [{ id, name: 'Layer 1', visible: true, locked: false }]
        objects = doc.objects.map((o) => ({ ...o, layerId: o.layerId || id }))
      }
      const activeLayerId =
        doc.activeLayerId && layers.some((l) => l.id === doc.activeLayerId)
          ? doc.activeLayerId
          : layers[layers.length - 1].id
      const clips = doc.animations ?? {}
      const duration = doc.animDuration && doc.animDuration > 0 ? doc.animDuration : 5
      return {
        objects,
        camera: doc.camera,
        layers,
        activeLayerId,
        past: [],
        future: [],
        selectedId: null,
        anim: {
          ...get().anim,
          enabled: false,
          playing: false,
          time: 0,
          selectedClipId: null,
          clips,
          duration
        }
      }
    }),

  toDocument: () => ({
    version: 1,
    objects: get().objects,
    camera: get().camera,
    layers: get().layers,
    activeLayerId: get().activeLayerId,
    animations: get().anim.clips,
    animDuration: get().anim.duration
  })
}))

function clone(objects: SceneObject[]): SceneObject[] {
  return objects.map((o) => ({
    ...o,
    ...('points' in o ? { points: o.points.map((p: StrokePoint) => [...p] as StrokePoint) } : {})
  })) as SceneObject[]
}

/**
 * Convert an object between world space and screen space when toggling pin.
 * `toPinned` true => world -> screen; false => screen -> world.
 */
function convertPinSpace(obj: SceneObject, cam: Camera, toPinned: boolean): SceneObject {
  const map = (p: Vec2) => (toPinned ? worldToScreen(p, cam) : screenToWorld(p, cam))
  const sizeFactor = toPinned ? cam.scale : 1 / cam.scale

  if (obj.type === 'stroke') {
    const s = obj as StrokeObject
    return {
      ...s,
      pinned: toPinned,
      size: s.size * sizeFactor,
      points: s.points.map(([x, y, pr]: StrokePoint) => {
        const m = map({ x, y })
        return [m.x, m.y, pr] as StrokePoint
      })
    }
  }
  if (obj.type === 'text') {
    const m = map({ x: obj.x, y: obj.y })
    return { ...obj, pinned: toPinned, x: m.x, y: m.y, fontSize: obj.fontSize * sizeFactor }
  }
  if (obj.type === 'shape') {
    const m = map({ x: obj.x, y: obj.y })
    return {
      ...obj,
      pinned: toPinned,
      x: m.x,
      y: m.y,
      width: obj.width * sizeFactor,
      height: obj.height * sizeFactor,
      strokeWidth: obj.strokeWidth * sizeFactor
    }
  }
  // image
  const m = map({ x: obj.x, y: obj.y })
  return {
    ...obj,
    pinned: toPinned,
    x: m.x,
    y: m.y,
    width: obj.width * sizeFactor,
    height: obj.height * sizeFactor
  }
}

export function newStroke(style: PenStyle, highlighter: boolean, layerId: string): StrokeObject {
  return {
    id: uid(),
    type: 'stroke',
    points: [],
    color: style.color,
    size: style.size,
    opacity: style.opacity,
    highlighter,
    pinned: false,
    locked: false,
    zIndex: 0,
    layerId
  }
}

export function newShape(style: ShapeStyle, x: number, y: number, layerId: string): ShapeObject {
  return {
    id: uid(),
    type: 'shape',
    shape: style.shape,
    x,
    y,
    width: 0,
    height: 0,
    color: style.color,
    fill: style.fill,
    strokeWidth: style.strokeWidth,
    opacity: style.opacity,
    pinned: false,
    locked: false,
    zIndex: 0,
    layerId
  }
}

export function defaultClip(kind: ClipKind, start: number): AnimClip {
  const base = {
    id: uid(),
    kind,
    start: Math.max(0, Math.round(start * 100) / 100),
    duration: 1,
    easing: 'smooth' as const
  }
  switch (kind) {
    case 'slideIn':
      return { ...base, dx: -160, dy: 0 }
    case 'move':
      return { ...base, dx: 160, dy: 0 }
    case 'spin':
      return { ...base, turns: 1 }
    default:
      return base
  }
}
