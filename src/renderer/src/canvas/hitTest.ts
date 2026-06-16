import type { Camera, Layer, SceneObject, Vec2 } from '../types'
import { distanceToStroke, objectBounds, pointInBounds, screenToWorld } from '../geometry'

/** Convert a screen point into the coordinate space the object lives in. */
function toObjectSpace(screen: Vec2, obj: SceneObject, cam: Camera): Vec2 {
  return obj.pinned ? screen : screenToWorld(screen, cam)
}

/** Build a set of layer ids that block selection (hidden or locked). */
function blockedLayers(layers?: Layer[]): Set<string> {
  return new Set((layers ?? []).filter((l) => !l.visible || l.locked).map((l) => l.id))
}

/** Returns the topmost (highest zIndex) object hit at the given screen point. */
export function hitTest(
  objects: SceneObject[],
  screen: Vec2,
  cam: Camera,
  layers?: Layer[]
): SceneObject | null {
  const blocked = blockedLayers(layers)
  const ordered = [...objects].sort((a, b) => b.zIndex - a.zIndex)
  for (const obj of ordered) {
    if (obj.locked || blocked.has(obj.layerId)) continue
    const p = toObjectSpace(screen, obj, cam)
    if (obj.type === 'stroke') {
      if (distanceToStroke(p, obj) <= obj.size + 6) return obj
    } else if (pointInBounds(p, objectBounds(obj))) {
      return obj
    }
  }
  return null
}

/** Returns ids of strokes within `radius` (screen px) of the screen point. */
export function strokesNear(
  objects: SceneObject[],
  screen: Vec2,
  cam: Camera,
  radius: number,
  layers?: Layer[]
): string[] {
  const blocked = blockedLayers(layers)
  const hits: string[] = []
  for (const obj of objects) {
    if (obj.locked || blocked.has(obj.layerId)) continue
    if (obj.type !== 'stroke') continue
    const p = toObjectSpace(screen, obj, cam)
    const scale = obj.pinned ? 1 : cam.scale
    const worldRadius = radius / scale
    if (distanceToStroke(p, obj) <= worldRadius + obj.size) hits.push(obj.id)
  }
  return hits
}
