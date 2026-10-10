import { C0 } from './rf'

/** Quarter-wave transformer impedance that matches a load `zLoad` to a line `z0`. */
export function quarterWaveZ(zLoad: number, z0: number): number {
  return Math.sqrt(zLoad * z0)
}

/** Effective permittivity of a microstrip line (Hammerstad-Jensen, zero thickness). */
export function microstripEpsEff(wOverH: number, er: number): number {
  const u = wOverH
  const a = 1 + Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) / 49 + Math.log(1 + (u / 18.1) ** 3) / 18.7
  const b = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053
  return (er + 1) / 2 + ((er - 1) / 2) * (1 + (10 / u)) ** (-a * b)
}

/** Characteristic impedance of a microstrip line (Hammerstad-Jensen). */
export function microstripZ0(wOverH: number, er: number): number {
  const u = wOverH
  const f = 6 + (2 * Math.PI - 6) * Math.exp(-((30.666 / u) ** 0.7528))
  const z01 = (376.730313 / (2 * Math.PI)) * Math.log(f / u + Math.sqrt(1 + (2 / u) ** 2))
  return z01 / Math.sqrt(microstripEpsEff(u, er))
}

/** Microstrip width/height ratio for a target impedance (bisection on the analysis formula). */
export function microstripWidthRatio(z0: number, er: number): number {
  let lo = 0.01
  let hi = 50
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi)
    // Impedance falls as the strip widens.
    if (microstripZ0(mid, er) > z0) lo = mid
    else hi = mid
  }
  return Math.sqrt(lo * hi)
}

export interface QuarterWaveStrip {
  /** Required transformer impedance, ohm. */
  z: number
  /** Strip width in mm. */
  widthMm: number
  /** Physical quarter-wave length in mm. */
  lengthMm: number
  epsEff: number
}

/** Microstrip quarter-wave transformer from `zLoad` to `z0` on a substrate of height `hMm`. */
export function microstripTransformer(zLoad: number, z0: number, fMHz: number, er: number, hMm: number): QuarterWaveStrip {
  const z = quarterWaveZ(zLoad, z0)
  const u = microstripWidthRatio(z, er)
  const epsEff = microstripEpsEff(u, er)
  const lambdaG = C0 / (fMHz * 1e6) / Math.sqrt(epsEff)
  return { z, widthMm: u * hMm, lengthMm: (lambdaG / 4) * 1000, epsEff }
}

/** Coax characteristic impedance from inner and outer diameters with dielectric constant `er`. */
export function coaxZ0(dOuter: number, dInner: number, er = 1): number {
  return (59.9585 / Math.sqrt(er)) * Math.log(dOuter / dInner)
}

/** Outer/inner diameter ratio for a coax of impedance `z` in dielectric `er`. */
export function coaxRatio(z: number, er = 1): number {
  return Math.exp((z * Math.sqrt(er)) / 59.9585)
}

/** Return loss in dB and VSWR when a load `zLoad` (real) is fed from a line `z0`. */
export function mismatch(zLoad: number, z0: number): { vswr: number; returnLossDb: number } {
  const g = Math.abs((zLoad - z0) / (zLoad + z0))
  return { vswr: (1 + g) / (1 - g || 1e-12), returnLossDb: g === 0 ? Infinity : -20 * Math.log10(g) }
}
