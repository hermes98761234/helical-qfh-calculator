import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { UK, tr } from './i18n'

describe('i18n', () => {
  it('interpolates', () => {
    expect(tr('en', 'a {0} b {1}', 1, 'x')).toBe('a 1 b x')
    expect(tr('uk', 'Dimensions')).toBe('Розміри')
    expect(tr('uk', 'unknown {0}', 2)).toBe('unknown 2')
  })

  it('keeps placeholders in every translation', () => {
    for (const [en, uk] of Object.entries(UK)) {
      const ph = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort().join()
      expect(ph(uk), en).toBe(ph(en))
    }
  })

  it('has a translation for every t() string in the UI', () => {
    const files = ['src/App.tsx', 'src/components/BuildSheet.tsx']
    const missing: string[] = []
    for (const f of files) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) {
        const s = m[1].replace(/\\'/g, "'")
        if (!(s in UK)) missing.push(s)
      }
    }
    expect(missing).toEqual([])
  })
})
