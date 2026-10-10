/** Print templates: shapes in millimetres on a flat sheet, tiled onto pages at 1:1 scale. */

export type Shape =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; dash?: boolean; w?: number }
  | { k: 'rect'; x: number; y: number; w: number; h: number; dash?: boolean }
  | { k: 'circle'; cx: number; cy: number; r: number; dash?: boolean }
  | { k: 'text'; x: number; y: number; s: string; size?: number; anchor?: 'start' | 'middle' | 'end' }

export interface Sheet {
  title: string
  widthMm: number
  heightMm: number
  shapes: Shape[]
}

export const MARGIN = 10

/** Unrolled cylinder with the helix drawn on it: wrap this around a tube of the helix diameter. */
export function helixWrapSheet(title: string, diameterMm: number, spacingMm: number, turns: number, labels: { turn: string; glue: string }): Sheet {
  const c = Math.PI * diameterMm
  const h = spacingMm * turns
  const m = MARGIN
  const shapes: Shape[] = [{ k: 'rect', x: m, y: m, w: c, h, dash: true }]
  const whole = Math.floor(turns)
  const frac = turns - whole
  // Sheet y grows downwards; the helix starts at the bottom edge, so flip.
  const Y = (z: number) => m + h - z
  for (let t = 0; t < whole; t++) {
    shapes.push({ k: 'line', x1: m, y1: Y(t * spacingMm), x2: m + c, y2: Y((t + 1) * spacingMm), w: 1 })
    shapes.push({ k: 'text', x: m + c + 2, y: Y((t + 0.5) * spacingMm), s: `${labels.turn} ${t + 1}`, size: 3 })
  }
  if (frac > 1e-9) {
    shapes.push({ k: 'line', x1: m, y1: Y(whole * spacingMm), x2: m + c * frac, y2: Y(turns * spacingMm), w: 1 })
  }
  shapes.push({ k: 'text', x: m + c / 2, y: m + h + 8, s: labels.glue, size: 3.5, anchor: 'middle' })
  return { title, widthMm: c + m * 2 + 24, heightMm: h + m * 2 + 8, shapes: addScaleBar(shapes, m, h + m + 14) }
}

/**
 * Unrolled half of the former for one QFH loop: a filar climbs the full height while going half way round,
 * so one straight line on a half-circumference sheet. Filar B is the same line rotated 180 degrees around the tube.
 */
export function qfhWrapSheet(title: string, diameterMm: number, heightMm: number, labels: { filar: string; bar: string }): Sheet {
  const half = (Math.PI * diameterMm) / 2
  const m = MARGIN
  const Y = (z: number) => m + heightMm - z
  const shapes: Shape[] = [
    { k: 'rect', x: m, y: m, w: half, h: heightMm, dash: true },
    { k: 'line', x1: m, y1: Y(0), x2: m + half, y2: Y(heightMm), w: 1 },
    { k: 'text', x: m + half / 2, y: Y(heightMm / 2) - 3, s: labels.filar, size: 3.5, anchor: 'middle' },
    { k: 'text', x: m + half / 2, y: m - 3, s: labels.bar, size: 3.5, anchor: 'middle' },
  ]
  return { title, widthMm: half + m * 2, heightMm: heightMm + m * 2 + 12, shapes: addScaleBar(shapes, m, heightMm + m + 8) }
}

/** Disc template for the ground plane or reflector. */
export function discSheet(title: string, diameterMm: number): Sheet {
  const m = MARGIN
  const r = diameterMm / 2
  const shapes: Shape[] = [
    { k: 'circle', cx: m + r, cy: m + r, r },
    { k: 'line', x1: m + r - 5, y1: m + r, x2: m + r + 5, y2: m + r },
    { k: 'line', x1: m + r, y1: m + r - 5, x2: m + r, y2: m + r + 5 },
  ]
  return { title, widthMm: diameterMm + 2 * m, heightMm: diameterMm + 2 * m + 12, shapes: addScaleBar(shapes, m, diameterMm + m + 8) }
}

/** 100 mm bar to check that the printout is at 100% scale. */
function addScaleBar(shapes: Shape[], x: number, y: number): Shape[] {
  return [
    ...shapes,
    { k: 'line', x1: x, y1: y, x2: x + 100, y2: y, w: 0.8 },
    { k: 'line', x1: x, y1: y - 1.5, x2: x, y2: y + 1.5 },
    { k: 'line', x1: x + 100, y1: y - 1.5, x2: x + 100, y2: y + 1.5 },
    { k: 'text', x: x + 50, y: y - 2, s: '100 mm', size: 3, anchor: 'middle' },
  ]
}

export interface Tile {
  /** Top-left corner of the tile in sheet coordinates. */
  x: number
  y: number
  col: number
  row: number
}

export const PAGES = {
  A4: { w: 190, h: 277 },
  Letter: { w: 196, h: 254 },
} as const
export type PageSize = keyof typeof PAGES

/** Cuts a sheet into pages of the printable area, with a 5 mm overlap so pieces can be taped. */
export function tiles(sheet: Sheet, page: PageSize): { tiles: Tile[]; cols: number; rows: number } {
  const { w, h } = PAGES[page]
  const overlap = 5
  const stepX = w - overlap
  const stepY = h - overlap
  const cols = Math.max(1, Math.ceil((sheet.widthMm - overlap) / stepX))
  const rows = Math.max(1, Math.ceil((sheet.heightMm - overlap) / stepY))
  const out: Tile[] = []
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) out.push({ x: col * stepX, y: row * stepY, col, row })
  return { tiles: out, cols, rows }
}

export function pageCount(sheet: Sheet, page: PageSize): number {
  return tiles(sheet, page).tiles.length
}
