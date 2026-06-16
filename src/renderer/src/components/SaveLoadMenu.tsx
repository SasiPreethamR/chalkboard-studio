import { useRef, useState } from 'react'
import { useScene } from '../state/sceneStore'

export default function SaveLoadMenu() {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)

  const handleSave = async (): Promise<void> => {
    const doc = useScene.getState().toDocument()
    const json = JSON.stringify(doc, null, 2)
    try {
      const result = await (window as any).desktop.saveDocument(json, 'drawing')
      if (result.ok) console.log('Saved to', result.filePath)
    } catch (err) {
      console.error('Save failed:', err)
    }
    setOpen(false)
  }

  const handleLoad = async (): Promise<void> => {
    try {
      const result = await (window as any).desktop.openDocument()
      if (result.ok) {
        const doc = JSON.parse(result.data)
        useScene.getState().loadDocument(doc)
        console.log('Loaded from', result.filePath)
      }
    } catch (err) {
      console.error('Load failed:', err)
    }
    setOpen(false)
  }

  const handleNewBoard = (): void => {
    if (useScene.getState().objects.length > 0) {
      if (!window.confirm('Clear all objects and start fresh?')) return
    }
    useScene.getState().clearBoard()
    setOpen(false)
  }

  return (
    <div className="save-load-menu">
      <button
        ref={buttonRef}
        className="file-btn"
        title="Save / Load / New"
        onClick={() => setOpen(!open)}
      >
        📋
      </button>
      {open && (
        <div className="menu-dropdown">
          <button className="menu-item" onClick={() => void handleSave()}>
            Save
          </button>
          <button className="menu-item" onClick={() => void handleLoad()}>
            Load
          </button>
          <div className="menu-sep" />
          <button className="menu-item" onClick={handleNewBoard}>
            New
          </button>
        </div>
      )}
    </div>
  )
}
