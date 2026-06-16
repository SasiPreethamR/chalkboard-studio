import { useEffect, useState } from 'react'
import InfiniteCanvas from './canvas/InfiniteCanvas'
import Toolbar from './components/Toolbar'
import OptionsBar from './components/OptionsBar'
import StatusBar from './components/StatusBar'
import Minimap from './components/Minimap'
import LayersPanel from './components/LayersPanel'
import ShortcutsHelp from './components/ShortcutsHelp'
import Timeline from './components/Timeline'
import WeylusStatus from './components/WeylusStatus'
import VideoRecorder from './components/VideoRecorder'
import SaveLoadMenu from './components/SaveLoadMenu'
import { useScene } from './state/sceneStore'
import type { ToolType } from './types'

const KEY_TOOL: Record<string, ToolType> = {
  v: 'select',
  p: 'pen',
  h: 'highlighter',
  e: 'eraser',
  s: 'shape',
  t: 'text',
  i: 'image'
}

const PEN_PALETTE_SHORTCUTS = [
  '#ffffff',
  '#ff5c5c',
  '#ffd24d',
  '#5cff8f',
  '#4cc9ff',
  '#b78bff',
  '#ff8bd1',
  '#9a9a9a'
]

export default function App() {
  const [showHelp, setShowHelp] = useState(false)
  const animEnabled = useScene((s) => s.anim.enabled)

  // Single-key tool shortcuts (ignored while typing in an input).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT') return
      if (e.key === '?') {
        setShowHelp((v) => !v)
        return
      }
      if (e.key === 'Escape') {
        setShowHelp(false)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const digit = Number.parseInt(e.key, 10)
      if (!Number.isNaN(digit)) {
        const scene = useScene.getState()
        if (scene.tool === 'pen' && digit >= 1 && digit <= PEN_PALETTE_SHORTCUTS.length) {
          scene.setPenColor(PEN_PALETTE_SHORTCUTS[digit - 1])
          return
        }
      }
      const tool = KEY_TOOL[e.key.toLowerCase()]
      if (tool) {
        useScene.getState().setTool(tool)
        return
      }
      if (e.key === 'a' || e.key === 'A') useScene.getState().toggleAnimMode()
      else if (e.key === 'f' || e.key === 'F') useScene.getState().fitToContent()
      else if (e.key === '0') useScene.getState().resetView()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app">
      <Toolbar />
      <div className="canvas-region">
        <InfiniteCanvas />
        <OptionsBar />
        <LayersPanel />
        <Minimap />
        <WeylusStatus />
        <SaveLoadMenu />
        <VideoRecorder />
        <button className="help-pill" title="Keyboard shortcuts (?)" onClick={() => setShowHelp(true)}>
          <span className="help-pill-key">?</span> shortcuts
        </button>
        <button
          className={`anim-pill ${animEnabled ? 'on' : ''}`}
          title="Toggle animation studio (A)"
          onClick={() => useScene.getState().toggleAnimMode()}
        >
          🎬 animate
        </button>
        {showHelp && <ShortcutsHelp onClose={() => setShowHelp(false)} />}
        {animEnabled && <Timeline />}
      </div>
      <StatusBar />
    </div>
  )
}
