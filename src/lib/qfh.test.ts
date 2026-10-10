import { describe, expect, it } from 'vitest'
import { designQfh, loopLength, quarterWaveCoaxM, solveDiameter } from './qfh'
import { filarPath, qfhPaths, helixPath } from './geometry'
import { discSheet, helixWrapSheet, qfhWrapSheet, tiles } from './template'

const input = { fMHz: 137.5, heightOverLambda: 0.245, wireMm: 10, coaxVf: 0.66, z0: 50 }

describe('QFH', () => {
  it('loopLength matches the straight-line geometry', () => {
    // d=0 degenerates to a straight wire up and back
    expect(loopLength(0, 0.5)).toBeCloseTo(1, 9)
    // h=0: two half circles plus the diameter
    expect(loopLength(1, 0)).toBeCloseTo(Math.PI + 1, 9)
  })

  it('solveDiameter inverts loopLength', () => {
    const d = solveDiameter(1.5, 0.5)
    expect(loopLength(d, 0.5)).toBeCloseTo(1.5, 9)
    expect(solveDiameter(0.9, 0.5)).toBeNaN()
  })

  it('137.5 MHz NOAA QFH has sensible proportions', () => {
    const r = designQfh(input)
    expect(r.lambdaM).toBeCloseTo(2.1801, 3)
    expect(r.big.heightM).toBeCloseTo(0.534, 2)
    expect(r.big.loopM).toBeGreaterThan(r.small.loopM)
    expect(r.big.diameterM).toBeGreaterThan(r.small.diameterM)
    expect(r.big.diameterM).toBeGreaterThan(0.2)
    expect(r.big.diameterM).toBeLessThan(0.32)
    expect(r.phasingCoaxM).toBeCloseTo(0.3597, 3)
    expect(r.warnings).toEqual([])
  })

  it('scales inversely with frequency', () => {
    const a = designQfh({ ...input, wireMm: 0 })
    const b = designQfh({ ...input, wireMm: 0, fMHz: 275 })
    expect(a.big.diameterM / b.big.diameterM).toBeCloseTo(2, 6)
    expect(a.big.loopM / b.big.loopM).toBeCloseTo(2, 6)
  })

  it('flags a too-short height ratio', () => {
    expect(designQfh({ ...input, heightOverLambda: 0.5 }).warnings).toContain('tooShort')
  })

  it('quarter-wave coax length', () => {
    expect(quarterWaveCoaxM(137.5, 0.66)).toBeCloseTo(0.3597, 3)
  })
})

describe('geometry', () => {
  it('helix path has the right radius and height', () => {
    const p = helixPath(0.2, 0.05, 4)
    expect(p[0]).toEqual([0.1, 0, 0])
    const last = p[p.length - 1]
    expect(last[2]).toBeCloseTo(0.2, 9)
    for (const [x, y] of p) expect(Math.hypot(x, y)).toBeCloseTo(0.1, 9)
  })

  it('filar turns a half turn', () => {
    const f = filarPath(0.2, 0.5, 0)
    expect(f[0][0]).toBeCloseTo(0.1, 9)
    expect(f[f.length - 1][0]).toBeCloseTo(-0.1, 9)
  })

  it('qfh paths contain three segments per loop and the measured filar length', () => {
    const r = designQfh(input)
    const p = qfhPaths(r.big, r.small)
    expect(p.big).toHaveLength(3)
    // polyline length approximates the analytic filar length
    const len = p.big[0].reduce((s, q, i, a) => (i ? s + Math.hypot(q[0] - a[i - 1][0], q[1] - a[i - 1][1], q[2] - a[i - 1][2]) : 0), 0)
    expect(len).toBeCloseTo(r.big.filarM, 2)
  })
})

describe('templates', () => {
  const labels = { turn: 'Turn', glue: 'glue' }
  it('helix wrap sheet is circumference wide and N*S tall', () => {
    const s = helixWrapSheet('t', 100, 20, 3, labels)
    expect(s.widthMm).toBeGreaterThan(Math.PI * 100)
    const rect = s.shapes.find((x) => x.k === 'rect')
    expect(rect).toMatchObject({ w: Math.PI * 100, h: 60 })
    expect(s.shapes.filter((x) => x.k === 'line' && x.w === 1)).toHaveLength(3)
  })

  it('qfh wrap sheet is half a circumference wide with one filar line', () => {
    const s = qfhWrapSheet('t', 80, 200, { filar: 'Filar', bar: 'Bar' })
    expect(s.shapes.filter((x) => x.k === 'line' && x.w === 1)).toHaveLength(1)
    expect(s.shapes.find((x) => x.k === 'rect')).toMatchObject({ w: (Math.PI * 80) / 2, h: 200 })
  })

  it('tiles cover the sheet with overlap', () => {
    const s = discSheet('d', 500)
    const t = tiles(s, 'A4')
    expect(t.cols).toBe(3)
    expect(t.rows).toBe(2)
    expect(t.tiles).toHaveLength(6)
    expect(tiles(discSheet('d', 100), 'A4').tiles).toHaveLength(1)
    expect(tiles(discSheet('d', 100), 'Letter').tiles).toHaveLength(1)
  })
})
