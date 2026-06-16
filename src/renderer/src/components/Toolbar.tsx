import type { ComponentType } from 'react'
import type { ToolType } from '../types'
import { useScene } from '../state/sceneStore'
import {
  SelectIcon,
  PenIcon,
  HighlighterIcon,
  EraserIcon,
  TextIcon,
  ImageIcon,
  ShapesIcon,
  FitIcon,
  ResetIcon,
  TrashIcon
} from './icons'

interface ToolDef {
  id: ToolType
  name: string
  key: string
  Icon: ComponentType<{ size?: number }>
}

const TOOLS: ToolDef[] = [
  { id: 'select', name: 'Select / Move', key: 'V', Icon: SelectIcon },
  { id: 'pen', name: 'Pen', key: 'P', Icon: PenIcon },
  { id: 'highlighter', name: 'Highlighter', key: 'H', Icon: HighlighterIcon },
  { id: 'eraser', name: 'Eraser', key: 'E', Icon: EraserIcon },
  { id: 'shape', name: 'Shapes', key: 'S', Icon: ShapesIcon },
  { id: 'text', name: 'Text', key: 'T', Icon: TextIcon },
  { id: 'image', name: 'Image', key: 'I', Icon: ImageIcon }
]

export default function Toolbar() {
  const tool = useScene((s) => s.tool)
  const setTool = useScene((s) => s.setTool)
  const fitToContent = useScene((s) => s.fitToContent)
  const resetView = useScene((s) => s.resetView)
  const clearBoard = useScene((s) => s.clearBoard)

  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={`tool-btn ${tool === t.id ? 'active' : ''}`}
          title={`${t.name}  (${t.key})`}
          onClick={() => setTool(t.id)}
        >
          <t.Icon />
          <span className="kbd">{t.key}</span>
        </button>
      ))}
      <div className="toolbar-spacer" />
      <button className="tool-btn" title="Fit all content  (F)" onClick={fitToContent}>
        <FitIcon />
        <span className="kbd">F</span>
      </button>
      <button className="tool-btn" title="Reset view  (0)" onClick={resetView}>
        <ResetIcon />
        <span className="kbd">0</span>
      </button>
      <button className="tool-btn danger" title="Clear board" onClick={clearBoard}>
        <TrashIcon />
      </button>
    </div>
  )
}
