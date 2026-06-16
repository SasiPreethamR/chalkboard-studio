import { useEffect, useMemo, useRef, useState } from 'react'

type PanelMode = 'small' | 'large' | 'full'

interface Point {
  x: number
  y: number
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export default function VideoRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<PanelMode>('small')
  const [pos, setPos] = useState<Point>({ x: 16, y: 74 })
  const [cameraOn, setCameraOn] = useState(false)
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const panelSize = useMemo(() => {
    if (mode === 'small') return { w: 260, h: 182 }
    if (mode === 'large') return { w: 420, h: 296 }
    return { w: 0, h: 0 }
  }, [mode])

  useEffect(() => {
    return () => {
      recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const startCamera = async (): Promise<void> => {
    try {
      setError(null)
      if (streamRef.current) return
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
      setError('Camera permission denied or unavailable.')
      setCameraOn(false)
    }
  }

  const stopCamera = (): void => {
    if (recording) stopRecording()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
  }

  const startRecording = (): void => {
    const stream = streamRef.current
    if (!stream || recording) return

    const mimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
    const mimeType = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || ''
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' })
      if (blob.size === 0) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `recording-${Date.now()}.webm`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    }

    recorderRef.current = recorder
    recorder.start(300)
    setRecording(true)
  }

  const stopRecording = (): void => {
    if (!recording) return
    recorderRef.current?.stop()
    recorderRef.current = null
    setRecording(false)
  }

  const toggleSize = (): void => {
    setMode((m) => {
      if (m === 'small') return 'large'
      if (m === 'large') return 'full'
      return 'small'
    })
  }

  const startDrag = (e: React.PointerEvent): void => {
    if (mode === 'full') return
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const fromX = pos.x
    const fromY = pos.y

    const onMove = (ev: PointerEvent): void => {
      const nx = fromX + (ev.clientX - startX)
      const ny = fromY + (ev.clientY - startY)
      const maxX = Math.max(0, window.innerWidth - panelSize.w - 12)
      const maxY = Math.max(0, window.innerHeight - panelSize.h - 12)
      setPos({ x: clamp(nx, 8, maxX), y: clamp(ny, 8, maxY) })
    }

    const onUp = (): void => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const panelStyle: React.CSSProperties =
    mode === 'full'
      ? { left: 12, top: 12, right: 12, bottom: 12 }
      : {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${panelSize.w}px`,
          height: `${panelSize.h}px`
        }

  return (
    <>
      {!open && (
        <button
          className={`rec-fab ${recording ? 'live' : ''}`}
          style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
          title="Open video recorder"
          onPointerDown={startDrag}
          onDoubleClick={() => setOpen(true)}
          onClick={() => setOpen(true)}
        >
          {recording ? 'REC' : 'VIDEO'}
        </button>
      )}

      {open && (
        <div className={`rec-panel ${mode}`} style={panelStyle}>
          <div className="rec-header" onPointerDown={startDrag}>
            <strong>Video Recorder</strong>
            <div className="rec-actions">
              <button className="rec-btn" onClick={toggleSize} title="Resize / fullscreen">
                {mode === 'full' ? 'Exit Full' : 'Resize'}
              </button>
              <button className="rec-btn" onClick={() => setOpen(false)} title="Hide recorder">
                Hide
              </button>
            </div>
          </div>

          <div className="rec-video-wrap">
            <video ref={videoRef} autoPlay muted playsInline />
            {!cameraOn && <div className="rec-placeholder">Camera is off</div>}
          </div>

          <div className="rec-controls">
            {!cameraOn ? (
              <button className="rec-btn primary" onClick={() => void startCamera()}>
                Start Camera
              </button>
            ) : (
              <>
                <button className="rec-btn" onClick={stopCamera}>
                  Stop Camera
                </button>
                {!recording ? (
                  <button className="rec-btn primary" onClick={startRecording}>
                    Start Recording
                  </button>
                ) : (
                  <button className="rec-btn danger" onClick={stopRecording}>
                    Stop & Save
                  </button>
                )}
              </>
            )}
          </div>

          {error && <div className="rec-error">{error}</div>}
        </div>
      )}
    </>
  )
}
