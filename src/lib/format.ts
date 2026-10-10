import type { Unit } from './state'

/** Formats a length given in metres in the chosen unit. */
export function fmtLen(m: number, unit: Unit): string {
  if (!Number.isFinite(m)) return '–'
  if (unit === 'in') return `${(m / 0.0254).toFixed(2)} in`
  const mm = m * 1000
  return `${mm >= 1000 ? mm.toFixed(0) : mm.toFixed(1)} mm`
}

export function fmtNum(x: number, digits = 2): string {
  return Number.isFinite(x) ? x.toFixed(digits) : '–'
}

