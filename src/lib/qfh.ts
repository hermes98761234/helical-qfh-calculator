import { C0, wavelength } from './rf'

/**
 * Quadrifilar helix (QFH, Kilgus) design.
 *
 * Two bifilar half-turn loops are crossed at 90 degrees and fed in phase quadrature.
 * The larger loop is slightly longer than resonance (inductive, current leads by 45 deg) and the
 * smaller one slightly shorter (capacitive, lags by 45 deg), so the two together make circular
 * polarisation with a cardioid, near-hemispherical pattern.
 *
 * The loop wire lengths below are the proportions used by the widely built 137 MHz weather-satellite
 * QFH designs (large loop about 0.725 lambda of conductor, small loop about 0.685 lambda). They are a
 * starting point: trim on an analyser or by checking the received pass.
 */
export const LOOP_BIG_LAMBDA = 0.725
export const LOOP_SMALL_LAMBDA = 0.685

export interface QfhInput {
  fMHz: number
  /** Height of the helix in wavelengths. */
  heightOverLambda: number
  /** Conductor diameter in mm (tube or wire). Thicker conductors need slightly shorter loops. */
  wireMm: number
  /** Velocity factor of the phasing/feed coax. */
  coaxVf: number
  /** Feed line impedance, ohm. */
  z0: number
}

export interface QfhLoop {
  /** Helix diameter (centre line to centre line), m. */
  diameterM: number
  heightM: number
  /** Length of one helical filar, m. */
  filarM: number
  /** Top cross bar (one diameter), m. */
  barM: number
  /** Total conductor length of the loop (two filars + top bar), m. */
  loopM: number
  /** Pitch of the filar against the axis, degrees from vertical. */
  angleFromAxisDeg: number
}

export interface QfhResult {
  lambdaM: number
  big: QfhLoop
  small: QfhLoop
  /** Electrical quarter wave of the phasing coax, physical length in m. */
  phasingCoaxM: number
  /** Turns of the feed coax wound as a current choke just below the feed point. */
  chokeTurns: number
  /** Diameter of the choke coil in m (about lambda / 25). */
  chokeDiameterM: number
  /** Typical peak gain, dBic. */
  gainDbic: number
  hpbwDeg: number
  /** Nominal feed impedance after combining the loops, ohm. */
  zin: number
  warnings: QfhWarning[]
}

export type QfhWarning = 'tooShort' | 'thickWire'

/** Wire length of a half-turn loop for helix diameter `d` and height `h`: two filars plus the top bar. */
export function loopLength(d: number, h: number): number {
  return 2 * Math.hypot(h, (Math.PI * d) / 2) + d
}

/** Diameter whose loop length is `target` for height `h`; NaN when even d = 0 is too long. */
export function solveDiameter(target: number, h: number): number {
  if (target <= 2 * h) return NaN
  let lo = 0
  let hi = target
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2
    if (loopLength(mid, h) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function makeLoop(target: number, h: number): QfhLoop {
  const d = solveDiameter(target, h)
  const filar = Math.hypot(h, (Math.PI * d) / 2)
  return {
    diameterM: d,
    heightM: h,
    filarM: filar,
    barM: d,
    loopM: loopLength(d, h),
    angleFromAxisDeg: (Math.atan2((Math.PI * d) / 2, h) * 180) / Math.PI,
  }
}

export function designQfh(inp: QfhInput): QfhResult {
  const lambda = wavelength(inp.fMHz)
  const h = inp.heightOverLambda * lambda
  // Thick conductors act electrically larger: shorten by about the diameter-to-length ratio.
  const k = 1 - Math.min(0.1, (inp.wireMm / 1000 / lambda) * 1.5)
  const big = makeLoop(LOOP_BIG_LAMBDA * lambda * k, h)
  const small = makeLoop(LOOP_SMALL_LAMBDA * lambda * k, h)
  const warnings: QfhWarning[] = []
  if (!Number.isFinite(big.diameterM) || !Number.isFinite(small.diameterM)) warnings.push('tooShort')
  if (inp.wireMm / 1000 > 0.02 * lambda) warnings.push('thickWire')
  return {
    lambdaM: lambda,
    big,
    small,
    phasingCoaxM: (lambda / 4) * inp.coaxVf,
    chokeTurns: 6,
    chokeDiameterM: lambda / 25,
    gainDbic: 3,
    hpbwDeg: 125,
    zin: 50,
    warnings,
  }
}

/** Quarter-wave phasing line length in m for a frequency and velocity factor (convenience). */
export function quarterWaveCoaxM(fMHz: number, vf: number): number {
  return (C0 / (fMHz * 1e6) / 4) * vf
}
