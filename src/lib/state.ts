import { HELIX_PRESETS, QFH_PRESETS } from './presets'
import type { HelixInput } from './helix'
import type { QfhInput } from './qfh'

export type Lang = 'en' | 'uk'
export type Theme = 'auto' | 'light' | 'dark'
export type Unit = 'mm' | 'in'
export type Mode = 'helix' | 'qfh'
export type Page = 'A4' | 'Letter'

export interface Settings {
  lang: Lang
  theme: Theme
  unit: Unit
  page: Page
}

export interface AppState {
  mode: Mode
  helix: HelixInput
  /** Substrate for the microstrip transformer. */
  substrate: { er: number; hMm: number }
  qfh: QfhInput
  settings: Settings
}

const hp = HELIX_PRESETS[0]
const qp = QFH_PRESETS[0]

export function defaultState(): AppState {
  return {
    mode: 'qfh',
    helix: { fMHz: hp.fMHz, cOverLambda: hp.cOverLambda, pitchDeg: hp.pitchDeg, turns: hp.turns, wireMm: hp.wireMm, groundOverLambda: hp.groundOverLambda, z0: 50 },
    substrate: { er: 4.4, hMm: 1.6 },
    qfh: { fMHz: qp.fMHz, heightOverLambda: qp.heightOverLambda, wireMm: qp.wireMm, coaxVf: 0.66, z0: 50 },
    settings: { lang: navigator.language?.toLowerCase().startsWith('uk') ? 'uk' : 'en', theme: 'auto', unit: 'mm', page: 'A4' },
  }
}

const KEY = 'helical-qfh-calculator/v1'

type Rec = Record<string, unknown>
const isRec = (x: unknown): x is Rec => typeof x === 'object' && x !== null

/** Copies finite numbers from `src` over `base`, keeping the defaults for anything missing or malformed. */
function mergeNumbers<T extends object>(base: T, src: unknown): T {
  if (!isRec(src)) return base
  const out: Rec = { ...(base as Rec) }
  for (const k of Object.keys(base)) {
    const v = src[k]
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v
  }
  return out as T
}

export function parseState(raw: string | null): AppState {
  const d = defaultState()
  if (!raw) return d
  try {
    const j: unknown = JSON.parse(raw)
    if (!isRec(j)) return d
    const s = isRec(j.settings) ? j.settings : {}
    return {
      mode: j.mode === 'helix' || j.mode === 'qfh' ? j.mode : d.mode,
      helix: mergeNumbers(d.helix, j.helix),
      substrate: mergeNumbers(d.substrate, j.substrate),
      qfh: mergeNumbers(d.qfh, j.qfh),
      settings: {
        lang: s.lang === 'en' || s.lang === 'uk' ? s.lang : d.settings.lang,
        theme: s.theme === 'light' || s.theme === 'dark' || s.theme === 'auto' ? s.theme : d.settings.theme,
        unit: s.unit === 'mm' || s.unit === 'in' ? s.unit : d.settings.unit,
        page: s.page === 'A4' || s.page === 'Letter' ? s.page : d.settings.page,
      },
    }
  } catch {
    return d
  }
}

export function loadState(): AppState {
  try {
    return parseState(localStorage.getItem(KEY))
  } catch {
    return defaultState()
  }
}

export function saveState(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: settings just won't persist */
  }
}

/** Fields that must be positive for the maths to be meaningful. */
export function invalidHelix(h: HelixInput): Set<keyof HelixInput> {
  const bad = new Set<keyof HelixInput>()
  if (!(h.fMHz > 0.1 && h.fMHz < 100000)) bad.add('fMHz')
  if (!(h.cOverLambda > 0.2 && h.cOverLambda < 3)) bad.add('cOverLambda')
  if (!(h.pitchDeg > 1 && h.pitchDeg < 45)) bad.add('pitchDeg')
  if (!(h.turns >= 0.25 && h.turns <= 100)) bad.add('turns')
  if (!(h.wireMm >= 0 && h.wireMm < 200)) bad.add('wireMm')
  if (!(h.groundOverLambda > 0 && h.groundOverLambda < 10)) bad.add('groundOverLambda')
  if (!(h.z0 > 1 && h.z0 < 1000)) bad.add('z0')
  return bad
}

export function invalidQfh(q: QfhInput): Set<keyof QfhInput> {
  const bad = new Set<keyof QfhInput>()
  if (!(q.fMHz > 0.1 && q.fMHz < 100000)) bad.add('fMHz')
  if (!(q.heightOverLambda > 0.05 && q.heightOverLambda < 0.5)) bad.add('heightOverLambda')
  if (!(q.wireMm >= 0 && q.wireMm < 200)) bad.add('wireMm')
  if (!(q.coaxVf > 0.3 && q.coaxVf <= 1)) bad.add('coaxVf')
  if (!(q.z0 > 1 && q.z0 < 1000)) bad.add('z0')
  return bad
}
