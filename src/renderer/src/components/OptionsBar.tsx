import { useRef } from 'react'
import { useScene } from '../state/sceneStore'
import type { CurveSnapLevel, ShapeKind } from '../types'
import {
  RectIcon,
  RoundRectIcon,
  EllipseIcon,
  LineIcon,
  ArrowIcon,
  DoubleArrowIcon,
  TriangleIcon,
  DiamondIcon,
  PentagonIcon,
  HexagonIcon,
  StarIcon,
  ParallelogramIcon,
  TrapezoidIcon,
  CrossIcon,
  HeartIcon
} from './icons'
import type { ComponentType } from 'react'

const PALETTE = [
  '#ffffff',
  '#ff5c5c',
  '#ffd24d',
  '#5cff8f',
  '#4cc9ff',
  '#b78bff',
  '#ff8bd1',
  '#9a9a9a'
]

const PEN_SIZES = [2, 4, 6, 10, 16]
const HIGHLIGHTER_SIZES = [12, 20, 28, 40, 60]
const OPACITIES = [1, 0.75, 0.5, 0.25]
const TEXT_SIZES = [12, 14, 16, 20, 24, 28, 32, 40, 48, 64, 80, 96]
const ERASER_SIZES = [10, 20, 40, 70]
const SHAPE_WIDTHS = [2, 4, 6, 10]
const CURVE_SNAP_LEVELS: { id: CurveSnapLevel; name: string }[] = [
  { id: 0, name: 'raw' },
  { id: 1, name: 'soft' },
  { id: 2, name: 'clean' }
]

const SHAPE_KINDS: { id: ShapeKind; name: string; Icon: ComponentType<{ size?: number }> }[] = [
  { id: 'rectangle', name: 'Rectangle', Icon: RectIcon },
  { id: 'roundRect', name: 'Rounded rectangle', Icon: RoundRectIcon },
  { id: 'ellipse', name: 'Ellipse', Icon: EllipseIcon },
  { id: 'triangle', name: 'Triangle', Icon: TriangleIcon },
  { id: 'diamond', name: 'Diamond', Icon: DiamondIcon },
  { id: 'pentagon', name: 'Pentagon', Icon: PentagonIcon },
  { id: 'hexagon', name: 'Hexagon', Icon: HexagonIcon },
  { id: 'star', name: 'Star', Icon: StarIcon },
  { id: 'parallelogram', name: 'Parallelogram', Icon: ParallelogramIcon },
  { id: 'trapezoid', name: 'Trapezoid', Icon: TrapezoidIcon },
  { id: 'cross', name: 'Cross', Icon: CrossIcon },
  { id: 'heart', name: 'Heart', Icon: HeartIcon },
  { id: 'line', name: 'Line', Icon: LineIcon },
  { id: 'arrow', name: 'Arrow', Icon: ArrowIcon },
  { id: 'doubleArrow', name: 'Double arrow', Icon: DoubleArrowIcon }
]

function ColorPicker({
  value,
  onChange,
  title = 'Custom color'
}: {
  value: string
  onChange: (c: string) => void
  title?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const isCustom = !PALETTE.includes(value)
  return (
    <label
      className={`swatch swatch-picker ${isCustom ? 'active' : ''}`}
      title={title}
      style={{ background: isCustom ? value : undefined }}
    >
      <input
        ref={ref}
        type="color"
        value={value.startsWith('#') ? value : '#ffffff'}
        onChange={(e) => onChange(e.target.value)}
        style={{ opacity: 0, position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
      />
      {!isCustom && <span className="swatch-picker-icon">⊕</span>}
    </label>
  )
}

function SizeChips({
  sizes,
  value,
  onChange
}: {
  sizes: number[]
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="chips">
      {sizes.map((s) => (
        <button
          key={s}
          className={`chip dot-chip ${value === s ? 'active' : ''}`}
          title={`${s} px`}
          onClick={() => onChange(s)}
        >
          <span className="dot" style={{ width: Math.min(s, 18), height: Math.min(s, 18) }} />
        </button>
      ))}
    </div>
  )
}

export default function OptionsBar() {
  const tool = useScene((s) => s.tool)
  const pen = useScene((s) => s.pen)
  const highlighter = useScene((s) => s.highlighter)
  const curveSnap = useScene((s) => s.curveSnap)
  const textColor = useScene((s) => s.textColor)
  const textSize = useScene((s) => s.textSize)
  const eraserRadius = useScene((s) => s.eraserRadius)
  const shape = useScene((s) => s.shape)
  const selectedId = useScene((s) => s.selectedId)
  const selected = useScene((s) => s.objects.find((o) => o.id === s.selectedId) ?? null)

  const {
    setPenColor,
    setPenSize,
    setPenOpacity,
    setCurveSnap,
    setTextColor,
    setTextSize,
    setEraserRadius,
    setShapeKind,
    setShapeColor,
    setShapeFill,
    setShapeStrokeWidth,
    togglePin,
    toggleLock,
    bringToFront,
    sendToBack,
    removeObject
  } = useScene.getState()

  if (tool === 'pen' || tool === 'highlighter') {
    const style = tool === 'highlighter' ? highlighter : pen
    const sizes = tool === 'highlighter' ? HIGHLIGHTER_SIZES : PEN_SIZES
    return (
      <div className="options-bar">
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${style.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setPenColor(c)}
            />
          ))}
          <ColorPicker value={style.color} onChange={setPenColor} title="Custom color" />
        </div>
        <span className="opt-sep" />
        <SizeChips sizes={sizes} value={style.size} onChange={setPenSize} />
        <span className="opt-sep" />
        <span className="opt-label">curve</span>
        <div className="chips">
          {CURVE_SNAP_LEVELS.map((level) => (
            <button
              key={level.id}
              className={`chip ${curveSnap === level.id ? 'active' : ''}`}
              title={`${level.name} curve snapping`}
              onClick={() => setCurveSnap(level.id)}
            >
              {level.name}
            </button>
          ))}
        </div>
        {tool === 'pen' && (
          <>
            <span className="opt-sep" />
            <div className="chips">
              {OPACITIES.map((o) => (
                <button
                  key={o}
                  className={`chip ${Math.abs(style.opacity - o) < 0.01 ? 'active' : ''}`}
                  title={`${Math.round(o * 100)}% opacity`}
                  onClick={() => setPenOpacity(o)}
                >
                  {Math.round(o * 100)}%
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  if (tool === 'text') {
    return (
      <div className="options-bar">
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${textColor === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setTextColor(c)}
            />
          ))}
          <ColorPicker value={textColor} onChange={setTextColor} title="Custom color" />
        </div>
        <span className="opt-sep" />
        <label className="opt-field">
          size
          <select
            className="opt-select"
            value={textSize}
            onChange={(e) => setTextSize(Number(e.target.value))}
          >
            {TEXT_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} px
              </option>
            ))}
          </select>
        </label>
      </div>
    )
  }

  if (tool === 'eraser') {
    return (
      <div className="options-bar">
        <span className="opt-label">radius</span>
        <SizeChips sizes={ERASER_SIZES} value={eraserRadius} onChange={setEraserRadius} />
      </div>
    )
  }

  if (tool === 'shape') {
    const filled = shape.fill != null
    return (
      <div className="options-bar">
        <div className="chips">
          {SHAPE_KINDS.map((k) => (
            <button
              key={k.id}
              className={`chip icon-chip ${shape.shape === k.id ? 'active' : ''}`}
              title={k.name}
              onClick={() => setShapeKind(k.id)}
            >
              <k.Icon size={18} />
            </button>
          ))}
        </div>
        <span className="opt-sep" />
        <span className="opt-label">line</span>
        <div className="swatches">
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${shape.color === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setShapeColor(c)}
            />
          ))}
          <ColorPicker value={shape.color} onChange={setShapeColor} title="Custom stroke color" />
        </div>
        <span className="opt-sep" />
        <SizeChips sizes={SHAPE_WIDTHS} value={shape.strokeWidth} onChange={setShapeStrokeWidth} />
        <span className="opt-sep" />
        <span className="opt-label">fill</span>
        <div className="swatches">
          <button
            className={`swatch swatch-none ${!filled ? 'active' : ''}`}
            title="No fill"
            onClick={() => setShapeFill(null)}
          />
          {PALETTE.map((c) => (
            <button
              key={c}
              className={`swatch ${shape.fill === c ? 'active' : ''}`}
              style={{ background: c }}
              onClick={() => setShapeFill(c)}
            />
          ))}
          <ColorPicker
            value={shape.fill ?? '#ffffff'}
            onChange={setShapeFill}
            title="Custom fill color"
          />
        </div>
      </div>
    )
  }

  if (tool === 'select' && selected && selectedId) {
    return (
      <div className="options-bar">
        <button className="tool-btn" title="Pin (float while scrolling)" onClick={() => togglePin(selectedId)}>
          {selected.pinned ? '📌 pinned' : '📍 pin'}
        </button>
        <button className="tool-btn" title="Lock editing" onClick={() => toggleLock(selectedId)}>
          {selected.locked ? '🔒' : '🔓'}
        </button>
        <button className="tool-btn" title="Bring to front" onClick={() => bringToFront(selectedId)}>
          ⤒
        </button>
        <button className="tool-btn" title="Send to back" onClick={() => sendToBack(selectedId)}>
          ⤓
        </button>
        <button className="tool-btn" title="Delete" onClick={() => removeObject(selectedId)}>
          🗑
        </button>
      </div>
    )
  }

  return null
}
