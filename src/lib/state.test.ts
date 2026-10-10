import { describe, expect, it } from 'vitest'
import { defaultState, invalidHelix, invalidQfh, parseState } from './state'
import { fmtLen } from './format'

describe('state', () => {
  it('falls back to defaults on junk', () => {
    expect(parseState('not json')).toEqual(defaultState())
    expect(parseState(null)).toEqual(defaultState())
    expect(parseState('[1]')).toEqual(defaultState())
  })

  it('keeps valid saved values and ignores malformed ones', () => {
    const s = parseState(JSON.stringify({ mode: 'helix', helix: { turns: 7, fMHz: 'x' }, settings: { unit: 'in', theme: 'nope' } }))
    expect(s.mode).toBe('helix')
    expect(s.helix.turns).toBe(7)
    expect(s.helix.fMHz).toBe(defaultState().helix.fMHz)
    expect(s.settings.unit).toBe('in')
    expect(s.settings.theme).toBe('auto')
  })

  it('validates inputs', () => {
    expect(invalidHelix(defaultState().helix).size).toBe(0)
    expect(invalidQfh(defaultState().qfh).size).toBe(0)
    expect(invalidHelix({ ...defaultState().helix, turns: 0 }).has('turns')).toBe(true)
    expect(invalidQfh({ ...defaultState().qfh, coaxVf: 2 }).has('coaxVf')).toBe(true)
  })

  it('formats lengths', () => {
    expect(fmtLen(0.0254, 'in')).toBe('1.00 in')
    expect(fmtLen(0.1234, 'mm')).toBe('123.4 mm')
    expect(fmtLen(1.5, 'mm')).toBe('1500 mm')
    expect(fmtLen(NaN, 'mm')).toBe('–')
  })
})
