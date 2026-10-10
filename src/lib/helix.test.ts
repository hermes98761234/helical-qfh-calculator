import { describe, expect, it } from 'vitest'
import { designHelix, pitchFromSpacing, turnsForGain, type HelixInput } from './helix'
import { frequencyMHz, wavelength } from './rf'

const base: HelixInput = { fMHz: 435, cOverLambda: 1, pitchDeg: 13, turns: 10, wireMm: 4, groundOverLambda: 1, z0: 50 }

describe('rf', () => {
  it('converts frequency and wavelength', () => {
    expect(wavelength(300)).toBeCloseTo(0.99931, 4)
    expect(frequencyMHz(wavelength(435))).toBeCloseTo(435, 9)
  })
})

describe('Kraus axial-mode helix', () => {
  it('matches the textbook example: N=10, C=lambda, S=0.25 lambda gives 15.7 dBi and 33 deg', () => {
    // pitch angle for S/C = 0.25
    const pitch = pitchFromSpacing(1, 0.25)
    expect(pitch).toBeCloseTo(14.036, 2)
    const r = designHelix({ ...base, pitchDeg: pitch })
    expect(r.directivity).toBeCloseTo(37.5, 6)
    expect(r.gainDbi).toBeCloseTo(15.74, 2)
    expect(r.hpbwDeg).toBeCloseTo(32.9, 1)
    expect(r.bwfnDeg).toBeCloseTo(72.7, 1)
    expect(r.zin).toBeCloseTo(140, 9)
  })

  it('computes dimensions at 435 MHz', () => {
    const r = designHelix(base)
    expect(r.lambdaM).toBeCloseTo(0.68919, 4)
    expect(r.circumferenceM).toBeCloseTo(r.lambdaM, 9)
    expect(r.diameterM).toBeCloseTo(r.lambdaM / Math.PI, 9)
    expect(r.spacingM).toBeCloseTo(r.lambdaM * Math.tan((13 * Math.PI) / 180), 9)
    expect(r.turnLengthM).toBeCloseTo(r.lambdaM / Math.cos((13 * Math.PI) / 180), 9)
    expect(r.heightM).toBeCloseTo(10 * r.spacingM, 9)
    expect(r.totalWireM).toBeCloseTo(10 * r.turnLengthM, 9)
  })

  it('axial ratio is (2N+1)/2N', () => {
    const r = designHelix(base)
    expect(r.axialRatio).toBeCloseTo(1.05, 9)
    expect(r.axialRatioDb).toBeCloseTo(0.4238, 3)
  })

  it('quarter-wave match for 140 ohm into 50 ohm is 83.7 ohm', () => {
    const r = designHelix(base)
    expect(r.matchZ).toBeCloseTo(83.67, 2)
    expect(r.vswrUnmatched).toBeCloseTo(2.8, 6)
  })

  it('frequency band for the fixed geometry spans 0.75..1.33 C/lambda', () => {
    const [lo, hi] = designHelix(base).bandMHz
    expect(lo).toBeCloseTo(326.25, 6)
    expect(hi).toBeCloseTo(578.55, 6)
  })

  it('warns outside the axial mode', () => {
    expect(designHelix({ ...base, cOverLambda: 0.5 }).warnings).toContain('cOutside')
    expect(designHelix({ ...base, pitchDeg: 20 }).warnings).toContain('pitchOutside')
    expect(designHelix({ ...base, turns: 2 }).warnings).toContain('fewTurns')
    expect(designHelix({ ...base, groundOverLambda: 0.5 }).warnings).toContain('smallGround')
    expect(designHelix(base).warnings).toEqual([])
  })

  it('finds the turns that reach a target gain, to a quarter turn', () => {
    const n = turnsForGain(15, 1, 13)
    const g = designHelix({ ...base, turns: n }).gainDbi
    expect(g).toBeGreaterThanOrEqual(15)
    expect(designHelix({ ...base, turns: n - 0.25 }).gainDbi).toBeLessThan(15)
  })

  it('gain rises 3 dB when turns double', () => {
    const a = designHelix({ ...base, turns: 5 }).gainDbi
    const b = designHelix({ ...base, turns: 10 }).gainDbi
    expect(b - a).toBeCloseTo(3.0103, 3)
  })
})
