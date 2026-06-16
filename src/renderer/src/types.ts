// Core data model for the board. A single scene is an ordered list of objects.
// Both the editor and the animation timeline read from this same model.

export type ToolType = 'select' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'image' | 'shape'

export interface Vec2 {
  x: number
  y: number
}

/** Camera maps world coordinates to screen pixels: screen = world * scale + offset. */
export interface Camera {
  x: number
  y: number
  scale: number
}

export type StrokePoint = [number, number, number] // x, y, pressure

export type CurveSnapLevel = 0 | 1 | 2

interface CommonProps {
  id: string
  /** When true the object lives in screen space and floats while the board scrolls. */
  pinned: boolean
  /** When true the object cannot be selected or edited. */
  locked: boolean
  zIndex: number
  /** Id of the drawing layer this object belongs to. */
  layerId: string
}

export interface StrokeObject extends CommonProps {
  type: 'stroke'
  points: StrokePoint[]
  color: string
  size: number
  opacity: number
  /** highlighter strokes use 'multiply'-ish translucent blending */
  highlighter?: boolean
}

export interface TextObject extends CommonProps {
  type: 'text'
  x: number
  y: number
  text: string
  color: string
  fontSize: number
}

export interface ImageObject extends CommonProps {
  type: 'image'
  x: number
  y: number
  width: number
  height: number
  /** data URL */
  src: string
}

export type ShapeKind =
  | 'rectangle'
  | 'roundRect'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'parallelogram'
  | 'trapezoid'
  | 'cross'
  | 'heart'
  | 'line'
  | 'arrow'
  | 'doubleArrow'

export interface ShapeObject extends CommonProps {
  type: 'shape'
  shape: ShapeKind
  x: number
  y: number
  /** width/height may be negative while drawing; normalized on commit. */
  width: number
  height: number
  color: string
  /** fill color, or null for outline-only. */
  fill: string | null
  strokeWidth: number
  opacity: number
}

export type SceneObject = StrokeObject | TextObject | ImageObject | ShapeObject

/** A drawing layer groups objects and controls their visibility/locking. */
export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
}

// ---- Animation model -------------------------------------------------
// Each object can carry a list of animation "clips" (primitives) on a
// shared timeline. The playback engine composes them into a sample at time t.

export type Easing = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'smooth'

export type ClipKind =
  | 'fadeIn'
  | 'fadeOut'
  | 'draw'
  | 'grow'
  | 'slideIn'
  | 'move'
  | 'spin'
  | 'pulse'

export interface AnimClip {
  id: string
  kind: ClipKind
  /** seconds from timeline start */
  start: number
  /** seconds */
  duration: number
  easing: Easing
  /** world-space delta for slideIn / move */
  dx?: number
  dy?: number
  /** number of full turns for spin */
  turns?: number
}

/** The composed animation state applied to one object at a given time. */
export interface AnimSample {
  /** world-space translation */
  dx: number
  dy: number
  scale: number
  /** radians */
  rotate: number
  opacity: number
  /** 0..1 reveal — strokes draw on; others fade/scale in */
  reveal: number
}

export interface BoardDocument {
  version: 1
  objects: SceneObject[]
  camera: Camera
  layers?: Layer[]
  activeLayerId?: string
  animations?: Record<string, AnimClip[]>
  animDuration?: number
}
