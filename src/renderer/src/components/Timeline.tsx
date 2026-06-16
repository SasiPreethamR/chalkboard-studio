import { useRef, useState } from 'react'
import { useScene } from '../state/sceneStore'
import type { AnimClip, ClipKind, Easing, SceneObject } from '../types'
import { CLIP_META, CLIP_ORDER } from '../animation/engine'
import { EASINGS } from '../animation/easing'
import { recordAnimation, downloadBlob, isRecordingSupported } from '../animation/recorder'

function objLabel(o: SceneObject): string {
  switch (o.type) {
    case 'text':
      return `“${(o.text || 'text').slice(0, 14)}”`
    case 'shape':
      return o.shape
    case 'image':
      return 'image'
    default:
      return o.highlighter ? 'highlight' : 'stroke'
  }
}

function fmt(t: number): string {
  return t.toFixed(1)
}

export default function Timeline() {
  const enabled = useScene((s) => s.anim.enabled)
  const playing = useScene((s) => s.anim.playing)
  const time = useScene((s) => s.anim.time)
  const duration = useScene((s) => s.anim.duration)
  const fps = useScene((s) => s.anim.fps)
  const loop = useScene((s) => s.anim.loop)
  const clips = useScene((s) => s.anim.clips)
  const selectedClipId = useScene((s) => s.anim.selectedClipId)
  const objects = useScene((s) => s.objects)
  const selectedId = useScene((s) => s.selectedId)

  const timeRef = useRef<HTMLDivElement>(null)
  const [recording, setRecording] = useState<number | null>(null)

  if (!enabled) return null

  const {
    animPlay,
    animPause,
    animStop,
    animSetTime,
    animSetDuration,
    animSetFps,
    animToggleLoop,
    addClip,
    updateClip,
    removeClip,
    selectClip,
    toggleAnimMode
  } = useScene.getState()

  const pct = (t: number): number => (duration > 0 ? (t / duration) * 100 : 0)

  const timeFromEvent = (clientX: number): number => {
    const el = timeRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    const x = Math.min(Math.max(0, clientX - r.left), r.width)
    return (x / r.width) * duration
  }

  const scrub = (e: React.PointerEvent): void => {
    if (playing) animPause()
    animSetTime(timeFromEvent(e.clientX))
    const move = (ev: PointerEvent): void => animSetTime(timeFromEvent(ev.clientX))
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const dragClip = (e: React.PointerEvent, objId: string, clip: AnimClip): void => {
    e.stopPropagation()
    selectClip(clip.id)
    const el = timeRef.current
    if (!el) return
    const startX = e.clientX
    const startVal = clip.start
    const width = el.getBoundingClientRect().width
    const move = (ev: PointerEvent): void => {
      const dt = ((ev.clientX - startX) / width) * duration
      updateClip(objId, clip.id, { start: Math.max(0, Math.round((startVal + dt) * 100) / 100) })
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const animatedObjects = objects.filter((o) => (clips[o.id]?.length ?? 0) > 0)
  const selectedObj = selectedId ? objects.find((o) => o.id === selectedId) ?? null : null
  const selClip: { objId: string; clip: AnimClip } | null = (() => {
    if (!selectedClipId) return null
    for (const id in clips) {
      const c = clips[id].find((x) => x.id === selectedClipId)
      if (c) return { objId: id, clip: c }
    }
    return null
  })()

  const doRecord = async (): Promise<void> => {
    const canvas = document.getElementById('board-canvas') as HTMLCanvasElement | null
    if (!canvas || !isRecordingSupported()) return
    animPause()
    setRecording(0)
    try {
      const blob = await recordAnimation(canvas, {
        duration,
        fps,
        setTime: (t) => useScene.getState().animSetTime(t),
        onProgress: (p) => setRecording(Math.round(p * 100))
      })
      downloadBlob(blob, `animation-${Date.now()}.webm`)
    } finally {
      setRecording(null)
      animSetTime(0)
    }
  }

  return (
    <div className="timeline">
      <div className="tl-transport">
        <button className="tl-btn" title="Stop" onClick={animStop}>
          ⏮
        </button>
        <button
          className="tl-btn tl-play"
          title={playing ? 'Pause' : 'Play'}
          onClick={() => (playing ? animPause() : animPlay())}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <span className="tl-time">
          {fmt(time)} / {fmt(duration)}s
        </span>
        <label className="tl-field" title="Timeline length (seconds)">
          len
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={duration}
            onChange={(e) => animSetDuration(parseFloat(e.target.value) || 0.5)}
          />
        </label>
        <label className="tl-field" title="Frames per second for export">
          fps
          <select value={fps} onChange={(e) => animSetFps(parseInt(e.target.value, 10))}>
            {[24, 30, 60].map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <button
          className={`tl-btn ${loop ? 'on' : ''}`}
          title="Loop playback"
          onClick={animToggleLoop}
        >
          🔁
        </button>
        <div className="tl-spacer" />
        <button
          className="tl-btn"
          title="Export animation to WebM video"
          disabled={recording != null}
          onClick={doRecord}
        >
          {recording != null ? `● ${recording}%` : '⤓ Export'}
        </button>
        <button className="tl-btn" title="Exit animation mode" onClick={toggleAnimMode}>
          ✕
        </button>
      </div>

      <div className="tl-ruler" ref={timeRef} onPointerDown={scrub}>
        {Array.from({ length: Math.floor(duration) + 1 }, (_, i) => (
          <span key={i} className="tl-tick" style={{ left: `${pct(i)}%` }}>
            {i}
          </span>
        ))}
        <div className="tl-playhead" style={{ left: `${pct(time)}%` }} />
      </div>

      <div className="tl-lanes">
        {animatedObjects.length === 0 && (
          <div className="tl-empty">
            Select an object and add an animation below to build your scene.
          </div>
        )}
        {animatedObjects.map((o) => (
          <div
            key={o.id}
            className={`tl-lane ${o.id === selectedId ? 'sel' : ''}`}
            onPointerDown={() => useScene.getState().select(o.id)}
          >
            <span className="tl-lane-name">{objLabel(o)}</span>
            <div className="tl-lane-track">
              <div className="tl-playhead lane" style={{ left: `${pct(time)}%` }} />
              {clips[o.id].map((c) => (
                <div
                  key={c.id}
                  className={`tl-clip ${c.id === selectedClipId ? 'sel' : ''}`}
                  style={{ left: `${pct(c.start)}%`, width: `${Math.max(2, pct(c.duration))}%` }}
                  title={`${CLIP_META[c.kind].label} @ ${fmt(c.start)}s`}
                  onPointerDown={(e) => dragClip(e, o.id, c)}
                >
                  <span className="tl-clip-ic">{CLIP_META[c.kind].icon}</span>
                  <span className="tl-clip-label">{CLIP_META[c.kind].label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="tl-editor">
        {selectedObj ? (
          <div className="tl-add">
            <span className="tl-add-label">+ {objLabel(selectedObj)}:</span>
            {CLIP_ORDER.map((k: ClipKind) => (
              <button
                key={k}
                className="tl-add-btn"
                title={`Add ${CLIP_META[k].label} at ${fmt(time)}s`}
                onClick={() => addClip(selectedObj.id, k)}
              >
                {CLIP_META[k].icon} {CLIP_META[k].label}
              </button>
            ))}
          </div>
        ) : (
          <div className="tl-add hint">Select an object to add animations.</div>
        )}

        {selClip && (
          <div className="tl-clip-edit">
            <strong>{CLIP_META[selClip.clip.kind].label}</strong>
            <label className="tl-field">
              start
              <input
                type="number"
                min={0}
                step={0.1}
                value={selClip.clip.start}
                onChange={(e) =>
                  updateClip(selClip.objId, selClip.clip.id, {
                    start: Math.max(0, parseFloat(e.target.value) || 0)
                  })
                }
              />
            </label>
            <label className="tl-field">
              dur
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={selClip.clip.duration}
                onChange={(e) =>
                  updateClip(selClip.objId, selClip.clip.id, {
                    duration: Math.max(0.1, parseFloat(e.target.value) || 0.1)
                  })
                }
              />
            </label>
            <label className="tl-field">
              ease
              <select
                value={selClip.clip.easing}
                onChange={(e) =>
                  updateClip(selClip.objId, selClip.clip.id, { easing: e.target.value as Easing })
                }
              >
                {EASINGS.map((es) => (
                  <option key={es} value={es}>
                    {es}
                  </option>
                ))}
              </select>
            </label>
            {(selClip.clip.kind === 'move' || selClip.clip.kind === 'slideIn') && (
              <>
                <label className="tl-field">
                  dx
                  <input
                    type="number"
                    step={20}
                    value={selClip.clip.dx ?? 0}
                    onChange={(e) =>
                      updateClip(selClip.objId, selClip.clip.id, {
                        dx: parseFloat(e.target.value) || 0
                      })
                    }
                  />
                </label>
                <label className="tl-field">
                  dy
                  <input
                    type="number"
                    step={20}
                    value={selClip.clip.dy ?? 0}
                    onChange={(e) =>
                      updateClip(selClip.objId, selClip.clip.id, {
                        dy: parseFloat(e.target.value) || 0
                      })
                    }
                  />
                </label>
              </>
            )}
            {selClip.clip.kind === 'spin' && (
              <label className="tl-field">
                turns
                <input
                  type="number"
                  step={0.5}
                  value={selClip.clip.turns ?? 1}
                  onChange={(e) =>
                    updateClip(selClip.objId, selClip.clip.id, {
                      turns: parseFloat(e.target.value) || 0
                    })
                  }
                />
              </label>
            )}
            <button
              className="tl-add-btn danger"
              onClick={() => removeClip(selClip.objId, selClip.clip.id)}
            >
              🗑 remove
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
