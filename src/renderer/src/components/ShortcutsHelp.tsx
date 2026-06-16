interface Row {
  keys: string[]
  label: string
}

interface Group {
  title: string
  rows: Row[]
}

const isMac = navigator.platform.toLowerCase().includes('mac')
const mod = isMac ? '⌘' : 'Ctrl'

const GROUPS: Group[] = [
  {
    title: 'Tools',
    rows: [
      { keys: ['V'], label: 'Select / Move' },
      { keys: ['P'], label: 'Pen' },
      { keys: ['H'], label: 'Highlighter' },
      { keys: ['E'], label: 'Eraser' },
      { keys: ['S'], label: 'Shapes' },
      { keys: ['T'], label: 'Text' },
      { keys: ['I'], label: 'Image' }
    ]
  },
  {
    title: 'View',
    rows: [
      { keys: ['F'], label: 'Fit all content' },
      { keys: ['0'], label: 'Reset view to 100%' },
      { keys: ['Space', 'drag'], label: 'Pan around' },
      { keys: [mod, 'scroll'], label: 'Zoom in / out' },
      { keys: ['scroll'], label: 'Pan vertically' }
    ]
  },
  {
    title: 'Edit',
    rows: [
      { keys: [mod, 'Z'], label: 'Undo' },
      { keys: [mod, '⇧', 'Z'], label: 'Redo' },
      { keys: ['Delete'], label: 'Remove selected' },
      { keys: ['double-click'], label: 'Edit a text object' },
      { keys: ['paste', '/', 'drop'], label: 'Insert an image' }
    ]
  }
]

export default function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  return (
    <div className="help-backdrop" onClick={onClose}>
      <div className="help-card" onClick={(e) => e.stopPropagation()}>
        <div className="help-head">
          <span>Keyboard shortcuts</span>
          <button className="help-close" title="Close (Esc)" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="help-cols">
          {GROUPS.map((g) => (
            <div key={g.title} className="help-group">
              <h4>{g.title}</h4>
              {g.rows.map((r) => (
                <div key={r.label} className="help-row">
                  <span className="help-keys">
                    {r.keys.map((k, i) => (
                      <kbd key={i}>{k}</kbd>
                    ))}
                  </span>
                  <span className="help-label">{r.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="help-foot">Press ? anytime to toggle this panel</div>
      </div>
    </div>
  )
}
