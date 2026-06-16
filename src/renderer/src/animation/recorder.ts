// In-app animation export: capture the canvas to a WebM video using the
// browser MediaRecorder API (no ffmpeg needed). The animation is played back
// in real time while the canvas stream is recorded.

export interface RecordOptions {
  duration: number
  fps: number
  /** Move the playhead (seconds) — triggers a canvas redraw via the store. */
  setTime: (t: number) => void
  /** Called with 0..1 progress during capture. */
  onProgress?: (p: number) => void
}

export function isRecordingSupported(): boolean {
  return typeof MediaRecorder !== 'undefined' && 'captureStream' in HTMLCanvasElement.prototype
}

function preferredMime(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
  ]
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c
  }
  return 'video/webm'
}

export async function recordAnimation(
  canvas: HTMLCanvasElement,
  opts: RecordOptions
): Promise<Blob> {
  const stream = canvas.captureStream(opts.fps)
  const mimeType = preferredMime()
  const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 12_000_000 })
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
  })

  opts.setTime(0)
  rec.start()

  const t0 = performance.now()
  await new Promise<void>((resolve) => {
    const step = (now: number): void => {
      const t = (now - t0) / 1000
      if (t >= opts.duration) {
        opts.setTime(opts.duration)
        opts.onProgress?.(1)
        requestAnimationFrame(() => resolve())
        return
      }
      opts.setTime(t)
      opts.onProgress?.(opts.duration > 0 ? t / opts.duration : 1)
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  })

  // Let the last frame land in the recorder before stopping.
  await new Promise((r) => setTimeout(r, 150))
  rec.stop()
  return done
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
