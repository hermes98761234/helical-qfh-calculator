import type { HelixResult } from './helix'
import type { QfhLoop } from './qfh'

export type Vec3 = [number, number, number]

/** Centre line of an axial-mode helix: z up the axis, starting at angle 0 on the ground plane. */
export function helixPath(diameter: number, spacing: number, turns: number, segmentsPerTurn = 48): Vec3[] {
  const n = Math.max(2, Math.ceil(turns * segmentsPerTurn))
  const pts: Vec3[] = []
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * turns
    const a = u * 2 * Math.PI
    pts.push([(diameter / 2) * Math.cos(a), (diameter / 2) * Math.sin(a), u * spacing])
  }
  return pts
}

export function helixPathFor(r: HelixResult): Vec3[] {
  return helixPath(r.diameterM, r.spacingM, r.heightM / r.spacingM)
}

/** One filar of a half-turn bifilar loop: rises `height` while turning 180 degrees from `startAngle`. */
export function filarPath(diameter: number, height: number, startAngle: number, segments = 32): Vec3[] {
  const pts: Vec3[] = []
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const a = startAngle + t * Math.PI
    pts.push([(diameter / 2) * Math.cos(a), (diameter / 2) * Math.sin(a), t * height])
  }
  return pts
}

export interface QfhPaths {
  /** Each entry is a polyline of the conductor. */
  big: Vec3[][]
  small: Vec3[][]
}

/** Both loops: the big one in the x-z plane at the feed, the small one rotated 90 degrees. */
export function qfhPaths(big: QfhLoop, small: QfhLoop): QfhPaths {
  const loop = (l: QfhLoop, rot: number, zTop: number): Vec3[][] => {
    const a = filarPath(l.diameterM, l.heightM, rot)
    const b = filarPath(l.diameterM, l.heightM, rot + Math.PI)
    const top: Vec3[] = [a[a.length - 1], b[b.length - 1]].map(([x, y]) => [x, y, zTop] as Vec3)
    return [a, b, top]
  }
  return { big: loop(big, 0, big.heightM), small: loop(small, Math.PI / 2, small.heightM) }
}
