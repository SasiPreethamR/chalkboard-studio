import { useState } from 'react'
import { useScene } from '../state/sceneStore'
import {
  LayersIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UnlockIcon,
  PlusIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  TrashIcon
} from './icons'

export default function LayersPanel() {
  const layers = useScene((s) => s.layers)
  const activeLayerId = useScene((s) => s.activeLayerId)
  const objects = useScene((s) => s.objects)
  const [collapsed, setCollapsed] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const {
    addLayer,
    removeLayer,
    renameLayer,
    setActiveLayer,
    toggleLayerVisible,
    toggleLayerLock,
    moveLayer
  } = useScene.getState()

  const count = (id: string) => objects.filter((o) => o.layerId === id).length

  // Front-most layer is the last in the array; show top → bottom.
  const ordered = [...layers].map((l, i) => ({ l, i })).reverse()

  return (
    <div className={`layers-panel ${collapsed ? 'collapsed' : ''}`}>
      <div className="layers-head">
        <button
          className="layers-title"
          title={collapsed ? 'Expand layers' : 'Collapse layers'}
          onClick={() => setCollapsed((v) => !v)}
        >
          <LayersIcon size={16} />
          <span>Layers</span>
        </button>
        {!collapsed && (
          <button className="layers-add" title="New layer" onClick={() => addLayer()}>
            <PlusIcon size={16} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="layers-list">
          {ordered.map(({ l, i }) => (
            <div
              key={l.id}
              className={`layer-row ${l.id === activeLayerId ? 'active' : ''}`}
              onClick={() => setActiveLayer(l.id)}
            >
              <button
                className={`layer-icon-btn ${!l.visible ? 'off' : ''}`}
                title={l.visible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLayerVisible(l.id)
                }}
              >
                {l.visible ? <EyeIcon size={15} /> : <EyeOffIcon size={15} />}
              </button>

              {editingId === l.id ? (
                <input
                  className="layer-name-input"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    if (draft.trim()) renameLayer(l.id, draft.trim())
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (draft.trim()) renameLayer(l.id, draft.trim())
                      setEditingId(null)
                    } else if (e.key === 'Escape') {
                      setEditingId(null)
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span
                  className="layer-name"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    setEditingId(l.id)
                    setDraft(l.name)
                  }}
                >
                  {l.name}
                  <span className="layer-count">{count(l.id)}</span>
                </span>
              )}

              <div className="layer-actions">
                <button
                  className="layer-icon-btn"
                  title="Move up"
                  disabled={i === layers.length - 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    moveLayer(l.id, 1)
                  }}
                >
                  <ChevronUpIcon size={14} />
                </button>
                <button
                  className="layer-icon-btn"
                  title="Move down"
                  disabled={i === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    moveLayer(l.id, -1)
                  }}
                >
                  <ChevronDownIcon size={14} />
                </button>
                <button
                  className={`layer-icon-btn ${l.locked ? 'on' : ''}`}
                  title={l.locked ? 'Unlock layer' : 'Lock layer'}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleLayerLock(l.id)
                  }}
                >
                  {l.locked ? <LockIcon size={14} /> : <UnlockIcon size={14} />}
                </button>
                <button
                  className="layer-icon-btn danger"
                  title="Delete layer"
                  disabled={layers.length <= 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    removeLayer(l.id)
                  }}
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
