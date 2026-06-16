// Caches decoded HTMLImageElements keyed by their data URL so we don't decode
// on every animation frame.
const cache = new Map<string, HTMLImageElement>()

export function getImage(src: string, onLoad: () => void): HTMLImageElement | null {
  const existing = cache.get(src)
  if (existing) return existing.complete ? existing : null
  const img = new Image()
  img.onload = onLoad
  img.src = src
  cache.set(src, img)
  return null
}
