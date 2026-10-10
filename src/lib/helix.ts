import { deg, rad, toDb, wavelength } from './rf'
import { mismatch, quarterWaveZ } from './matching'

/** Normal-mode / axial-mode boundaries from Kraus: the axial mode works for 0.75 < C/λ < 1.33. */
export const AXIAL_MIN = 0.75
export const AXIAL_MAX = 1.33

export interface HelixInput {
  fMHz: number
  /** Circumference in wavelengths (C/λ). */
  cOverLambda: number
  /** Pitch angle in degrees. */
  pitchDeg: number
  turns: number
  /** Conductor (wire / tube) diameter in mm. */
  wireMm: number
  /** Ground plane diameter in wavelengths. */
  groundOverLambda: number
  /** Feed line impedance, ohm. */
  z0: number
}

export interface HelixResult {
  lambdaM: number
  circumferenceM: number
  diameterM: number
  /** Axial spacing between turns, m. */
  spacingM: number
  /** Wire length of one turn, m. */
  turnLengthM: number
  totalWireM: number
  /** Axial length of the helix, N * S, m. */
  heightM: number
  groundDiameterM: number
  /** Directivity (linear). */
  directivity: number
  gainDbi: number
  hpbwDeg: number
  bwfnDeg: number
  /** Axial ratio (linear) for the ideal travelling-wave helix. */
  axialRatio: number
  axialRatioDb: number
  /** Input resistance at the helix terminals, ohm. */
  zin: number
  /** Quarter-wave transformer impedance to reach `z0`. */
  matchZ: number
  /** VSWR into `z0` without any matching. */
  vswrUnmatched: number
  /** C/λ is inside the axial-mode window. */
  inAxialMode: boolean
  /** Frequency range (MHz) where the fixed geometry stays in 0.75 < C/λ < 1.33. */
  bandMHz: [number, number]
  warnings: HelixWarning[]
}

export type HelixWarning = 'cOutside' | 'pitchOutside' | 'fewTurns' | 'smallGround' | 'thickWire'

/** Spacing S for a pitch angle: tan(α) = S / C. */
export function spacingFromPitch(cM: number, pitchDeg: number): number {
  return cM * Math.tan(rad(pitchDeg))
}

export function pitchFromSpacing(cM: number, sM: number): number {
  return deg(Math.atan(sM / cM))
}

/** Kraus axial-mode helix design equations. */
export function designHelix(inp: HelixInput): HelixResult {
  const lambda = wavelength(inp.fMHz)
  const c = inp.cOverLambda * lambda
  const s = spacingFromPitch(c, inp.pitchDeg)
  const n = inp.turns
  const cl = inp.cOverLambda
  const sl = s / lambda
  // D = 15 N (C/λ)^2 (S/λ)
  const directivity = 15 * n * cl * cl * sl
  // HPBW = 52 / ((C/λ) sqrt(N S/λ))
  const hpbw = 52 / (cl * Math.sqrt(n * sl))
  const bwfn = 115 / (cl * Math.sqrt(n * sl))
  const ar = (2 * n + 1) / (2 * n)
  const zin = 140 * cl
  const turnLen = Math.hypot(c, s)
  const warnings: HelixWarning[] = []
  if (cl < AXIAL_MIN || cl > AXIAL_MAX) warnings.push('cOutside')
  if (inp.pitchDeg < 12 || inp.pitchDeg > 14) warnings.push('pitchOutside')
  if (n < 3) warnings.push('fewTurns')
  if (inp.groundOverLambda < 0.75) warnings.push('smallGround')
  if (inp.wireMm / 1000 > 0.05 * lambda) warnings.push('thickWire')
  return {
    lambdaM: lambda,
    circumferenceM: c,
    diameterM: c / Math.PI,
    spacingM: s,
    turnLengthM: turnLen,
    totalWireM: turnLen * n,
    heightM: n * s,
    groundDiameterM: inp.groundOverLambda * lambda,
    directivity,
    gainDbi: toDb(directivity),
    hpbwDeg: hpbw,
    bwfnDeg: bwfn,
    axialRatio: ar,
    axialRatioDb: 20 * Math.log10(ar),
    zin,
    matchZ: quarterWaveZ(zin, inp.z0),
    vswrUnmatched: mismatch(zin, inp.z0).vswr,
    inAxialMode: cl >= AXIAL_MIN && cl <= AXIAL_MAX,
    bandMHz: [(inp.fMHz * AXIAL_MIN) / cl, (inp.fMHz * AXIAL_MAX) / cl],
    warnings,
  }
}

/** Number of turns (rounded up to a quarter turn) that reaches a target gain in dBi. */
export function turnsForGain(targetDbi: number, cOverLambda: number, pitchDeg: number): number {
  const sl = cOverLambda * Math.tan(rad(pitchDeg))
  const n = 10 ** (targetDbi / 10) / (15 * cOverLambda * cOverLambda * sl)
  return Math.max(0.25, Math.ceil(n * 4) / 4)
}
