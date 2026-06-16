import { useEffect, useState } from 'react'
import type { WeylusInfo } from '../../../../electron/preload'

function localFallback(): WeylusInfo {
  return {
    enabled: true,
    startedByEditor: false,
    command: 'weylus',
    port: 1701,
    primaryUrl: 'restart editor for phone URL',
    urls: [],
    bridgeReady: false
  }
}

export default function WeylusStatus() {
  const [info, setInfo] = useState<WeylusInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = async (): Promise<void> => {
      try {
        const next = (await window.desktop?.getWeylusInfo?.()) ?? localFallback()
        if (alive) setInfo(next)
      } catch {
        if (alive) setInfo(localFallback())
      }
    }
    void load()
    const id = window.setInterval(load, 5000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  if (!info) return null

  const copy = async (url: string): Promise<void> => {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    window.setTimeout(() => setCopied(null), 1400)
  }

  const phoneUrls = info.urls.filter((url) => !url.includes('localhost'))
  const macOnlyUrls = info.urls.filter((url) => url.includes('localhost'))

  return (
    <div className="weylus-wrap">
      <button
        className={`weylus-pill ${info.startedByEditor ? 'on' : ''} ${info.enabled ? '' : 'off'}`}
        title="Weylus phone writing pad URL"
        onClick={() => setOpen((v) => !v)}
      >
        <span>📱</span>
        <span className="weylus-url">{info.primaryUrl}</span>
      </button>
      {open && (
        <div className="weylus-popover">
          <div className="weylus-head">
            <strong>Weylus</strong>
            <span>{info.startedByEditor ? 'running' : info.enabled ? 'check app' : 'off'}</span>
          </div>
          <div className="weylus-list">
            {phoneUrls.map((url) => (
              <button key={url} className="weylus-copy" onClick={() => copy(url)}>
                <span>{url}</span>
                <b>{copied === url ? 'copied' : 'copy'}</b>
              </button>
            ))}
            {phoneUrls.length === 0 && <div className="weylus-warning">No phone-reachable URL detected yet.</div>}
            {macOnlyUrls.map((url) => (
              <button key={url} className="weylus-copy muted" onClick={() => copy(url)}>
                <span>{url}</span>
                <b>Mac only</b>
              </button>
            ))}
          </div>
          <div className="weylus-note">
            {info.bridgeReady === false
              ? 'Restart the editor once so the new Weylus bridge can report your Mac IP.'
              : 'Open the non-localhost address on the S24 while both devices are on the same Wi-Fi.'}
          </div>
        </div>
      )}
    </div>
  )
}
