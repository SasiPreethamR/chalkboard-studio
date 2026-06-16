import { useScene } from '../state/sceneStore'

export default function StatusBar() {
  const scale = useScene((s) => s.camera.scale)
  const count = useScene((s) => s.objects.length)
  const canUndo = useScene((s) => s.past.length > 0)
  const canRedo = useScene((s) => s.future.length > 0)

  async function save() {
    const doc = useScene.getState().toDocument()
    await window.desktop?.saveDocument(JSON.stringify(doc, null, 2), 'board.board.json')
  }

  async function open() {
    const res = await window.desktop?.openDocument()
    if (res?.ok) {
      try {
        const doc = JSON.parse(res.data)
        useScene.getState().loadDocument(doc)
      } catch {
        // ignore malformed files
      }
    }
  }

  function exportPng() {
    const canvas = document.querySelector('.canvas-host canvas') as HTMLCanvasElement | null
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const buf = new Uint8Array(await blob.arrayBuffer())
      await window.desktop?.exportBinary(buf, 'board.png', 'png')
    }, 'image/png')
  }

  return (
    <div className="statusbar">
      <span>{count} objects</span>
      <span>{Math.round(scale * 100)}%</span>
      <div className="right">
        <button disabled={!canUndo} onClick={() => useScene.getState().undo()}>
          ↶ undo
        </button>
        <button disabled={!canRedo} onClick={() => useScene.getState().redo()}>
          ↷ redo
        </button>
        <button onClick={open}>open</button>
        <button onClick={save}>save</button>
        <button onClick={exportPng}>export png</button>
      </div>
    </div>
  )
}
