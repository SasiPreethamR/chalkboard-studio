import type { AnimClip, AnimSample, ClipKind } from '../types'
import { ease } from './easing'

export const IDENTITY: AnimSample = {
  dx: 0,
  dy: 0,
  scale: 1,
  rotate: 0,
  opacity: 1,
  reveal: 1
}

/** Human-facing metadata for each animation primitive. */
export const CLIP_META: Record<ClipKind, { label: string; icon: string; entrance: boolean }> = {
  fadeIn: { label: 'Fade In', icon: '🌑', entrance: true },
  draw: { label: 'Draw On', icon: '✍️', entrance: true },
  grow: { label: 'Grow', icon: '🌱', entrance: true },
  slideIn: { label: 'Slide In', icon: '➡️', entrance: true },
  fadeOut: { label: 'Fade Out', icon: '🌗', entrance: false },
  move: { label: 'Move', icon: '🧭', entrance: false },
  spin: { label: 'Spin', icon: '🌀', entrance: false },
  pulse: { label: 'Pulse', icon: '💓', entrance: false }
}

export const CLIP_ORDER: ClipKind[] = [
  'fadeIn',
  'draw',
  'grow',
  'slideIn',
  'move',
  'spin',
  'pulse',
  'fadeOut'
]

function isEntrance(kind: ClipKind): boolean {
  return CLIP_META[kind].entrance
}

/**
 * Compose all clips for one object into a single sample at time `t` (seconds).
 * Entrance clips hide the object before they start; other clips are neutral
 * before they begin and hold their end-state afterwards.
 */
export function sampleClips(clips: AnimClip[], t: number): AnimSample {
  const s: AnimSample = { ...IDENTITY }
  const hasEntrance = clips.some((c) => isEntrance(c.kind))
  // If there's an entrance, the object starts hidden until it plays.
  if (hasEntrance) {
    s.opacity = 0
    s.reveal = 0
    s.scale = 1
  }

  const sorted = [...clips].sort((a, b) => a.start - b.start)
  for (const c of sorted) {
    const dur = Math.max(0.0001, c.duration)
    const raw = (t - c.start) / dur
    const before = t < c.start
    const p = ease(raw, c.easing)

    switch (c.kind) {
      case 'fadeIn':
        s.opacity = Math.max(s.opacity, before ? 0 : p)
        s.reveal = Math.max(s.reveal, before ? 0 : 1)
        break
      case 'draw':
        s.reveal = before ? 0 : p
        s.opacity = Math.max(s.opacity, before ? 0 : 1)
        break
      case 'grow':
        s.scale = before ? 0 : p
        s.opacity = Math.max(s.opacity, before ? 0 : 1)
        s.reveal = Math.max(s.reveal, before ? 0 : 1)
        break
      case 'slideIn':
        s.opacity = Math.max(s.opacity, before ? 0 : 1)
        s.reveal = Math.max(s.reveal, before ? 0 : 1)
        s.dx += (1 - (before ? 0 : p)) * (c.dx ?? 0)
        s.dy += (1 - (before ? 0 : p)) * (c.dy ?? 0)
        break
      case 'fadeOut':
        s.opacity *= before ? 1 : 1 - p
        break
      case 'move':
        s.dx += (before ? 0 : p) * (c.dx ?? 0)
        s.dy += (before ? 0 : p) * (c.dy ?? 0)
        break
      case 'spin':
        s.rotate += (before ? 0 : p) * (c.turns ?? 1) * Math.PI * 2
        break
      case 'pulse': {
        // one in-out bounce of scale during the clip, neutral outside.
        const within = !before && raw <= 1
        if (within) s.scale *= 1 + 0.25 * Math.sin(Math.PI * raw)
        break
      }
    }
  }
  s.opacity = Math.min(1, Math.max(0, s.opacity))
  s.scale = Math.max(0, s.scale)
  s.reveal = Math.min(1, Math.max(0, s.reveal))
  return s
}

/** Sample every animated object at time `t`. */
export function sampleAll(
  clipsByObject: Record<string, AnimClip[]>,
  t: number
): Record<string, AnimSample> {
  const out: Record<string, AnimSample> = {}
  for (const id in clipsByObject) {
    const clips = clipsByObject[id]
    if (clips && clips.length > 0) out[id] = sampleClips(clips, t)
  }
  return out
}

/** Latest time at which any clip is still running, for auto-duration. */
export function clipsEnd(clipsByObject: Record<string, AnimClip[]>): number {
  let end = 0
  for (const id in clipsByObject) {
    for (const c of clipsByObject[id]) end = Math.max(end, c.start + c.duration)
  }
  return end
}
