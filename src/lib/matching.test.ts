import { describe, expect, it } from 'vitest'
import { coaxRatio, coaxZ0, microstripEpsEff, microstripTransformer, microstripWidthRatio, microstripZ0, mismatch, quarterWaveZ } from './matching'

describe('matching', () => {
  it('quarter-wave transformer is the geometric mean', () => {
    expect(quarterWaveZ(100, 25)).toBeCloseTo(50, 9)
    expect(quarterWaveZ(140, 50)).toBeCloseTo(83.666, 3)
  })

  it('50 ohm microstrip on FR4 (er 4.4) is about 1.9 h wide with eps_eff near 3.3', () => {
    const u = microstripWidthRatio(50, 4.4)
    expect(u).toBeGreaterThan(1.8)
    expect(u).toBeLessThan(2.0)
    expect(microstripEpsEff(u, 4.4)).toBeGreaterThan(3.2)
    expect(microstripEpsEff(u, 4.4)).toBeLessThan(3.4)
  })

  it('width solver round-trips through the analysis formula', () => {
    for (const z of [30, 50, 84, 110]) expect(microstripZ0(microstripWidthRatio(z, 3.55), 3.55)).toBeCloseTo(z, 4)
  })

  it('microstrip transformer from 140 ohm to 50 ohm at 1.6 mm FR4', () => {
    const t = microstripTransformer(140, 50, 435, 4.4, 1.6)
    expect(t.z).toBeCloseTo(83.67, 2)
    expect(t.widthMm).toBeGreaterThan(0.7)
    expect(t.widthMm).toBeLessThan(1.4)
    // quarter of the guided wavelength, between lambda/4/sqrt(er) and lambda/4
    expect(t.lengthMm).toBeGreaterThan(689.19 / 4 / Math.sqrt(4.4))
    expect(t.lengthMm).toBeLessThan(689.19 / 4)
  })

  it('coax ratio for 50 ohm air line is 2.30 and 75 ohm polyethylene is about 6.5', () => {
    expect(coaxRatio(50)).toBeCloseTo(2.303, 2)
    expect(coaxRatio(75, 2.25)).toBeCloseTo(6.53, 1)
    expect(coaxZ0(coaxRatio(50), 1)).toBeCloseTo(50, 9)
  })

  it('VSWR and return loss', () => {
    const m = mismatch(100, 50)
    expect(m.vswr).toBeCloseTo(2, 9)
    expect(m.returnLossDb).toBeCloseTo(9.542, 3)
  })
})
