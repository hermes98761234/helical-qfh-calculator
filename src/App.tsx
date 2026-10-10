import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react'
import { tr, type T } from './i18n'
import { designHelix, turnsForGain, type HelixInput, type HelixResult } from './lib/helix'
import { designQfh, type QfhInput } from './lib/qfh'
import { microstripTransformer, coaxRatio } from './lib/matching'
import { helixPathFor, qfhPaths } from './lib/geometry'
import { HELIX_PRESETS, QFH_PRESETS } from './lib/presets'
import { discSheet, helixWrapSheet, pageCount, qfhWrapSheet, type Sheet } from './lib/template'
import { fmtLen, fmtNum } from './lib/format'
import { invalidHelix, invalidQfh, loadState, saveState, type AppState, type Mode, type Settings } from './lib/state'
import { toDb } from './lib/rf'
import NumField from './components/NumField'
import { SheetPages, SheetPreview } from './components/BuildSheet'
import type { Scene3D } from './components/Preview3D'

const Preview3D = lazy(() => import('./components/Preview3D'))

const REPO = 'https://github.com/hermes98761234/helical-qfh-calculator'

type Row = [label: string, value: ReactNode, note?: string]

function Table({ rows }: { rows: Row[] }) {
  return (
    <table className="data">
      <tbody>
        {rows.map(([k, v, n]) => (
          <tr key={k}>
            <td>{k}</td>
            <td>
              <b>{v}</b>
              {n ? <span className="hint"> {n}</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function GainChart({ input, t }: { input: HelixInput; t: T }) {
  const W = 320
  const H = 160
  const pad = { l: 34, r: 8, t: 8, b: 32 }
  const maxN = 30
  const pts: [number, number][] = []
  for (let n = 1; n <= maxN; n++) pts.push([n, designHelix({ ...input, turns: n }).gainDbi])
  const gMax = Math.ceil(Math.max(...pts.map((p) => p[1]), designHelix(input).gainDbi) / 5) * 5
  const gMin = Math.floor(Math.min(...pts.map((p) => p[1])) / 5) * 5
  const x = (n: number) => pad.l + ((n - 1) / (maxN - 1)) * (W - pad.l - pad.r)
  const y = (g: number) => pad.t + (1 - (g - gMin) / (gMax - gMin || 1)) * (H - pad.t - pad.b)
  const cur = designHelix(input)
  const ticks: number[] = []
  for (let g = gMin; g <= gMax; g += 5) ticks.push(g)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('Gain against number of turns')}>
      {ticks.map((g) => (
        <g key={g}>
          <line x1={pad.l} x2={W - pad.r} y1={y(g)} y2={y(g)} className="grid" />
          <text x={pad.l - 4} y={y(g) + 3} textAnchor="end" className="tick">{g}</text>
        </g>
      ))}
      {[1, 5, 10, 15, 20, 25, 30].map((n) => (
        <text key={n} x={x(n)} y={H - 14} textAnchor="middle" className="tick">{n}</text>
      ))}
      <polyline fill="none" className="curve" points={pts.map(([n, g]) => `${x(n)},${y(g)}`).join(' ')} />
      {input.turns >= 1 && input.turns <= maxN && <circle cx={x(input.turns)} cy={y(cur.gainDbi)} r={4} className="dot" />}
      <text x={pad.l} y={pad.t + 8} className="tick">dBi</text>
      <text x={W / 2} y={H - 1} textAnchor="middle" className="tick">{t('turns')}</text>
    </svg>
  )
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState)
  const { settings, mode } = state
  const t = useMemo<T>(() => (s, ...a) => tr(settings.lang, s, ...a), [settings.lang])
  const set = (patch: Partial<AppState>) => setState((s) => ({ ...s, ...patch }))
  const setSettings = (p: Partial<Settings>) => setState((s) => ({ ...s, settings: { ...s.settings, ...p } }))

  useEffect(() => saveState(state), [state])
  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    root.lang = settings.lang
  }, [settings.theme, settings.lang])

  const tabs: [Mode, string][] = [
    ['qfh', t('Quadrifilar helix (QFH)')],
    ['helix', t('Axial-mode helix')],
  ]

  return (
    <div className="app">
      <header className="toolbar no-print">
        <span className="brand">{t('Helical & QFH antenna calculator')}</span>
        <span className="hint">{t('Dimensions, gain, matching, 3D preview and a printable build sheet.')}</span>
        <span className="spacer" />
        <div className="seg" role="tablist" aria-label={t('Antenna type')}>
          {tabs.map(([m, label]) => (
            <button key={m} role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''} onClick={() => set({ mode: m })}>
              {label}
            </button>
          ))}
        </div>
      </header>
      {mode === 'helix' ? (
        <HelixView state={state} set={set} t={t} />
      ) : (
        <QfhView state={state} set={set} t={t} />
      )}
      <details className="settings no-print">
        <summary>{t('Settings')}</summary>
        <div className="row">
          <label className="field">
            {t('Units')}
            <select value={settings.unit} onChange={(e) => setSettings({ unit: e.target.value === 'in' ? 'in' : 'mm' })}>
              <option value="mm">{t('Millimetres')}</option>
              <option value="in">{t('Inches')}</option>
            </select>
          </label>
          <label className="field">
            {t('Paper')}
            <select value={settings.page} onChange={(e) => setSettings({ page: e.target.value === 'Letter' ? 'Letter' : 'A4' })}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </label>
          <label className="field">
            {t('Language')}
            <select value={settings.lang} onChange={(e) => setSettings({ lang: e.target.value === 'uk' ? 'uk' : 'en' })}>
              <option value="en">English</option>
              <option value="uk">Українська</option>
            </select>
          </label>
          <label className="field">
            {t('Theme')}
            <select value={settings.theme} onChange={(e) => setSettings({ theme: e.target.value === 'light' ? 'light' : e.target.value === 'dark' ? 'dark' : 'auto' })}>
              <option value="auto">{t('System')}</option>
              <option value="light">{t('Light')}</option>
              <option value="dark">{t('Dark')}</option>
            </select>
          </label>
        </div>
      </details>
      <p className="hint foot no-print">
        {t('Formulas are textbook estimates (Kraus; Kilgus). Model and trim on an analyser before relying on the numbers. Everything runs in your browser.')}{' '}
        <a href={REPO}>{t('Source on GitHub')}</a>
      </p>
    </div>
  )
}

interface ViewProps {
  state: AppState
  set: (p: Partial<AppState>) => void
  t: T
}

function warnText(w: string, t: T): string {
  switch (w) {
    case 'cOutside':
      return t('C/λ is outside 0.75 to 1.33, so the helix will not radiate in the axial mode.')
    case 'pitchOutside':
      return t('Pitch angles of 12° to 14° give the best axial-mode behaviour.')
    case 'fewTurns':
      return t('With fewer than 3 turns the end effects dominate and the formulas are rough.')
    case 'smallGround':
      return t('A ground plane smaller than 0.75 λ in diameter degrades the pattern.')
    case 'thickWire':
      return t('The conductor is very thick for this wavelength; expect the resonance to shift.')
    case 'tooShort':
      return t('The height is too large for the loop length: reduce the height ratio.')
    default:
      return w
  }
}

function Warnings({ list, t }: { list: string[]; t: T }) {
  if (!list.length) return null
  return (
    <ul className="warnings">
      {list.map((w) => (
        <li key={w} className="warn-text">
          {warnText(w, t)}
        </li>
      ))}
    </ul>
  )
}

function BuildSheet({ sheets, settings, t, title, children }: { sheets: Sheet[]; settings: Settings; t: T; title: string; children: ReactNode }) {
  return (
    <>
      <section className="box no-print">
        <div className="row">
          <h3>{t('Build sheet')}</h3>
          <span className="spacer" />
          <button onClick={() => window.print()}>{t('Print build sheet')}</button>
        </div>
        <p className="hint">
          {t('Templates print at 100% scale and are split into {0} pages when they exceed the paper. Check the 100 mm bar after printing.', sheets.reduce((n, s) => n + pageCount(s, settings.page), 0))}
        </p>
        <div className="sheets">
          {sheets.map((s) => (
            <figure key={s.title}>
              <SheetPreview sheet={s} />
              <figcaption className="hint">
                {s.title}: {Math.round(s.widthMm)} × {Math.round(s.heightMm)} mm, {t('{0} page(s)', pageCount(s, settings.page))}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
      <div className="print-only">
        <div className="print-page print-summary">
          <h1>{title}</h1>
          {children}
        </div>
        {sheets.map((s) => (
          <SheetPages key={s.title} sheet={s} page={settings.page} t={t} />
        ))}
      </div>
    </>
  )
}

function PresetSelect({ value, options, onPick, t }: { value: string; options: { id: string; name: string }[]; onPick: (id: string) => void; t: T }) {
  return (
    <label className="field">
      {t('Preset')}
      <select value={value} onChange={(e) => onPick(e.target.value)}>
        <option value="">{t('Custom')}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function HelixView({ state, set, t }: ViewProps) {
  const { helix, settings, substrate } = state
  const u = settings.unit
  const bad = useMemo(() => invalidHelix(helix), [helix])
  const ok = bad.size === 0
  const r: HelixResult | null = useMemo(() => (ok ? designHelix(helix) : null), [helix, ok])
  const [presetId, setPresetId] = useState('uhf-sat')
  const [gainTarget, setGainTarget] = useState(14)
  const patch = (p: Partial<HelixInput>) => {
    setPresetId('')
    set({ helix: { ...helix, ...p } })
  }
  const strip = useMemo(() => (r ? microstripTransformer(r.zin, helix.z0, helix.fMHz, substrate.er, substrate.hMm) : null), [r, helix.z0, helix.fMHz, substrate])
  const scene: Scene3D | null = useMemo(
    () => (r ? { wires: [helixPathFor(r)], groundDiameter: r.groundDiameterM, wireDiameter: helix.wireMm / 1000 } : null),
    [r, helix.wireMm],
  )
  const sheets: Sheet[] = useMemo(() => {
    if (!r) return []
    return [
      helixWrapSheet(t('Helix wrap template'), r.diameterM * 1000, r.spacingM * 1000, helix.turns, { turn: t('Turn'), glue: t('Wrap around a tube of this circumference; the line is the wire path') }),
      discSheet(t('Ground plane disc'), r.groundDiameterM * 1000),
    ]
  }, [r, helix.turns, t])

  const summary = r && (
    <Table
      rows={[
        [t('Frequency'), `${helix.fMHz} MHz`],
        [t('Helix diameter (centre line)'), fmtLen(r.diameterM, u)],
        [t('Circumference'), fmtLen(r.circumferenceM, u)],
        [t('Turn spacing'), fmtLen(r.spacingM, u)],
        [t('Number of turns'), String(helix.turns)],
        [t('Axial length'), fmtLen(r.heightM, u)],
        [t('Wire length (total)'), fmtLen(r.totalWireM, u)],
        [t('Ground plane diameter'), fmtLen(r.groundDiameterM, u)],
        [t('Gain'), `${fmtNum(r.gainDbi)} dBic`],
        [t('Feed resistance'), `${fmtNum(r.zin, 0)} Ω`],
        [t('Matching transformer'), `${fmtNum(r.matchZ, 1)} Ω, ${strip ? fmtLen(strip.lengthMm / 1000, u) : ''}`],
      ]}
    />
  )

  return (
    <div className="body">
      <aside className="side no-print">
        <div className="panel">
          <h3>{t('Design')}</h3>
          <PresetSelect
            t={t}
            value={presetId}
            options={HELIX_PRESETS}
            onPick={(id) => {
              setPresetId(id)
              const p = HELIX_PRESETS.find((x) => x.id === id)
              if (p) set({ helix: { ...helix, fMHz: p.fMHz, cOverLambda: p.cOverLambda, pitchDeg: p.pitchDeg, turns: p.turns, wireMm: p.wireMm, groundOverLambda: p.groundOverLambda } })
            }}
          />
          <div className="grid2">
            <NumField label={t('Frequency')} suffix="MHz" value={helix.fMHz} step={1} bad={bad.has('fMHz')} onChange={(v) => patch({ fMHz: v })} />
            <NumField label={t('Turns')} value={helix.turns} step={0.25} bad={bad.has('turns')} onChange={(v) => patch({ turns: v })} />
            <NumField label="C/λ" value={helix.cOverLambda} step={0.01} bad={bad.has('cOverLambda')} hint={t('0.75 to 1.33 for the axial mode; 1.0 is the centre')} onChange={(v) => patch({ cOverLambda: v })} />
            <NumField label={t('Pitch angle')} suffix="°" value={helix.pitchDeg} step={0.5} bad={bad.has('pitchDeg')} onChange={(v) => patch({ pitchDeg: v })} />
            <NumField label={t('Conductor ⌀')} suffix="mm" value={helix.wireMm} step={0.5} bad={bad.has('wireMm')} onChange={(v) => patch({ wireMm: v })} />
            <NumField label={t('Ground plane ⌀')} suffix="λ" value={helix.groundOverLambda} step={0.05} bad={bad.has('groundOverLambda')} onChange={(v) => patch({ groundOverLambda: v })} />
            <NumField label={t('Feed line')} suffix="Ω" value={helix.z0} step={1} bad={bad.has('z0')} onChange={(v) => patch({ z0: v })} />
          </div>
          <h3>{t('Inverse design')}</h3>
          <div className="row">
            <NumField label={t('Target gain')} suffix="dBic" value={gainTarget} step={0.5} onChange={setGainTarget} />
            <button
              onClick={() => ok && patch({ turns: turnsForGain(gainTarget, helix.cOverLambda, helix.pitchDeg) })}
              disabled={!ok || !(gainTarget > 0 && gainTarget < 40)}
            >
              {t('Set turns for this gain')}
            </button>
          </div>
          <h3>{t('Matching substrate')}</h3>
          <div className="grid2">
            <NumField label="εr" value={substrate.er} step={0.1} bad={!(substrate.er >= 1)} onChange={(v) => set({ substrate: { ...substrate, er: v } })} />
            <NumField label={t('Thickness')} suffix="mm" value={substrate.hMm} step={0.1} bad={!(substrate.hMm > 0)} onChange={(v) => set({ substrate: { ...substrate, hMm: v } })} />
          </div>
        </div>
      </aside>
      <main className="main">
        {!r || !strip ? (
          <section className="box no-print">
            <p className="verdict err">{t('Fix the highlighted fields.')}</p>
          </section>
        ) : (
          <>
            <section className="box no-print">
              <p className={`verdict ${r.inAxialMode && r.warnings.length === 0 ? 'ok' : 'warn'}`}>
                {t('{0} dBic gain, {1}° beamwidth, circular polarisation', fmtNum(r.gainDbi, 1), fmtNum(r.hpbwDeg, 0))}
              </p>
              <Warnings list={r.warnings} t={t} />
              <Suspense fallback={<div className="scene-canvas" />}>
                <Preview3D scene={scene!} msgNoGl={t('WebGL is not available, so the 3D preview is off.')} />
              </Suspense>
              <p className="hint">{t('Drag to orbit, scroll to zoom. The grey disc is the ground plane.')}</p>
            </section>
            <div className="cols no-print">
              <section className="box">
                <h3>{t('Dimensions')}</h3>
                <Table
                  rows={[
                    [t('Wavelength'), fmtLen(r.lambdaM, u)],
                    [t('Helix diameter (centre line)'), fmtLen(r.diameterM, u)],
                    [t('Circumference'), fmtLen(r.circumferenceM, u)],
                    [t('Turn spacing'), fmtLen(r.spacingM, u)],
                    [t('Wire per turn'), fmtLen(r.turnLengthM, u)],
                    [t('Wire length (total)'), fmtLen(r.totalWireM, u)],
                    [t('Axial length'), fmtLen(r.heightM, u)],
                    [t('Ground plane diameter'), fmtLen(r.groundDiameterM, u)],
                    [t('Usable band for this size'), `${fmtNum(r.bandMHz[0], 0)} – ${fmtNum(r.bandMHz[1], 0)} MHz`],
                  ]}
                />
              </section>
              <section className="box">
                <h3>{t('Performance (Kraus)')}</h3>
                <Table
                  rows={[
                    [t('Directivity'), `${fmtNum(toDb(r.directivity))} dBi`, `D = 15 N C²S/λ³`],
                    [t('Half-power beamwidth'), `${fmtNum(r.hpbwDeg, 1)}°`],
                    [t('First-null beamwidth'), `${fmtNum(r.bwfnDeg, 1)}°`],
                    [t('Axial ratio'), `${fmtNum(r.axialRatio, 3)} (${fmtNum(r.axialRatioDb, 2)} dB)`],
                    [t('Feed resistance'), `${fmtNum(r.zin, 0)} Ω`, `≈ 140 C/λ`],
                    [t('VSWR into {0} Ω, unmatched', helix.z0), fmtNum(r.vswrUnmatched, 2)],
                  ]}
                />
                <GainChart input={helix} t={t} />
              </section>
              <section className="box">
                <h3>{t('Matching section')}</h3>
                <p className="hint">{t('A quarter-wave transformer between the helix feed and the coax brings the VSWR to about 1. Pick one of the two builds.')}</p>
                <Table
                  rows={[
                    [t('Transformer impedance'), `${fmtNum(strip.z, 1)} Ω`],
                    [t('Microstrip width'), fmtLen(strip.widthMm / 1000, u), `εr ${substrate.er}, h ${substrate.hMm} mm`],
                    [t('Microstrip length (λg/4)'), fmtLen(strip.lengthMm / 1000, u)],
                    [t('Or air coax: D/d ratio'), fmtNum(coaxRatio(strip.z), 2)],
                    [t('Or air coax: length (λ/4)'), fmtLen(r.lambdaM / 4, u)],
                  ]}
                />
              </section>
            </div>
            <BuildSheet sheets={sheets} settings={settings} t={t} title={`${t('Axial-mode helix')} ${helix.fMHz} MHz`}>
              {summary}
            </BuildSheet>
          </>
        )}
      </main>
    </div>
  )
}

function QfhView({ state, set, t }: ViewProps) {
  const { qfh, settings } = state
  const u = settings.unit
  const bad = useMemo(() => invalidQfh(qfh), [qfh])
  const ok = bad.size === 0
  const r = useMemo(() => (ok ? designQfh(qfh) : null), [qfh, ok])
  const [presetId, setPresetId] = useState('noaa')
  const patch = (p: Partial<QfhInput>) => {
    setPresetId('')
    set({ qfh: { ...qfh, ...p } })
  }
  const geomOk = r && r.warnings.indexOf('tooShort') < 0
  const scene: Scene3D | null = useMemo(() => {
    if (!r || !geomOk) return null
    const p = qfhPaths(r.big, r.small)
    return { wires: p.big, accent: p.small, wireDiameter: qfh.wireMm / 1000 }
  }, [r, geomOk, qfh.wireMm])
  const sheets: Sheet[] = useMemo(() => {
    if (!r || !geomOk) return []
    const labels = { filar: t('Filar A; filar B is the same line, half a turn round the tube'), bar: t('Top bar joins the two filar ends') }
    return [
      qfhWrapSheet(t('Large loop wrap template'), r.big.diameterM * 1000, r.big.heightM * 1000, labels),
      qfhWrapSheet(t('Small loop wrap template'), r.small.diameterM * 1000, r.small.heightM * 1000, labels),
    ]
  }, [r, geomOk, t])

  const cut = r && geomOk && (
    <Table
      rows={[
        [t('Large loop: filars (×2)'), fmtLen(r.big.filarM, u)],
        [t('Large loop: top bar (×1)'), fmtLen(r.big.barM, u)],
        [t('Small loop: filars (×2)'), fmtLen(r.small.filarM, u)],
        [t('Small loop: top bar (×1)'), fmtLen(r.small.barM, u)],
        [t('Phasing coax (λ/4 × VF)'), fmtLen(r.phasingCoaxM, u)],
      ]}
    />
  )

  return (
    <div className="body">
      <aside className="side no-print">
        <div className="panel">
          <h3>{t('Design')}</h3>
          <PresetSelect
            t={t}
            value={presetId}
            options={QFH_PRESETS}
            onPick={(id) => {
              setPresetId(id)
              const p = QFH_PRESETS.find((x) => x.id === id)
              if (p) set({ qfh: { ...qfh, fMHz: p.fMHz, heightOverLambda: p.heightOverLambda, wireMm: p.wireMm } })
            }}
          />
          <div className="grid2">
            <NumField label={t('Frequency')} suffix="MHz" value={qfh.fMHz} step={0.1} bad={bad.has('fMHz')} onChange={(v) => patch({ fMHz: v })} />
            <NumField label={t('Height / λ')} value={qfh.heightOverLambda} step={0.005} bad={bad.has('heightOverLambda')} hint={t('About 0.22 to 0.27; taller makes the antenna narrower')} onChange={(v) => patch({ heightOverLambda: v })} />
            <NumField label={t('Conductor ⌀')} suffix="mm" value={qfh.wireMm} step={0.5} bad={bad.has('wireMm')} onChange={(v) => patch({ wireMm: v })} />
            <NumField label={t('Coax velocity factor')} value={qfh.coaxVf} step={0.01} bad={bad.has('coaxVf')} hint={t('0.66 solid polyethylene, 0.8 foam')} onChange={(v) => patch({ coaxVf: v })} />
            <NumField label={t('Feed line')} suffix="Ω" value={qfh.z0} step={1} bad={bad.has('z0')} onChange={(v) => patch({ z0: v })} />
          </div>
          <p className="hint">{t('Two crossed half-turn loops, fed in quadrature, give right-hand circular polarisation over almost the whole sky, the standard antenna for NOAA APT and Meteor LRPT.')}</p>
        </div>
      </aside>
      <main className="main">
        {!r ? (
          <section className="box no-print">
            <p className="verdict err">{t('Fix the highlighted fields.')}</p>
          </section>
        ) : (
          <>
            <section className="box no-print">
              <p className={`verdict ${geomOk && r.warnings.length === 0 ? 'ok' : 'warn'}`}>
                {geomOk
                  ? t('About {0} dBic peak gain, {1}° beamwidth, right-hand circular polarisation', fmtNum(r.gainDbic, 0), fmtNum(r.hpbwDeg, 0))
                  : t('No solution for this height.')}
              </p>
              <Warnings list={r.warnings} t={t} />
              {scene && (
                <Suspense fallback={<div className="scene-canvas" />}>
                  <Preview3D scene={scene} msgNoGl={t('WebGL is not available, so the 3D preview is off.')} />
                </Suspense>
              )}
              <p className="hint">{t('Blue is the large loop, amber the small loop. Drag to orbit, scroll to zoom.')}</p>
            </section>
            {geomOk && (
              <>
                <div className="cols no-print">
                  <section className="box">
                    <h3>{t('Loop dimensions')}</h3>
                    <table className="data">
                      <thead>
                        <tr>
                          <th />
                          <th>{t('Large loop')}</th>
                          <th>{t('Small loop')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            [t('Diameter (centre line)'), r.big.diameterM, r.small.diameterM],
                            [t('Height'), r.big.heightM, r.small.heightM],
                            [t('Filar length (each of 2)'), r.big.filarM, r.small.filarM],
                            [t('Top bar'), r.big.barM, r.small.barM],
                            [t('Total conductor'), r.big.loopM, r.small.loopM],
                          ] as [string, number, number][]
                        ).map(([k, a, b]) => (
                          <tr key={k}>
                            <td>{k}</td>
                            <td><b>{fmtLen(a, u)}</b></td>
                            <td><b>{fmtLen(b, u)}</b></td>
                          </tr>
                        ))}
                        <tr>
                          <td>{t('Angle from the axis')}</td>
                          <td><b>{fmtNum(r.big.angleFromAxisDeg, 1)}°</b></td>
                          <td><b>{fmtNum(r.small.angleFromAxisDeg, 1)}°</b></td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="hint">{t('Wavelength {0}. Add a few millimetres at each end for joints and trim to resonance.', fmtLen(r.lambdaM, u))}</p>
                  </section>
                  <section className="box">
                    <h3>{t('Cut list')}</h3>
                    {cut}
                  </section>
                  <section className="box">
                    <h3>{t('Feeding')}</h3>
                    <ol className="steps">
                      <li>{t('Connect both loops at the bottom feed point: one loop directly to the feed coax, the other through a quarter-wave phasing line ({0}) so it lags by 90°.', fmtLen(r.phasingCoaxM, u))}</li>
                      <li>{t('Join the two feeds in parallel at the main coax of {0} Ω.', qfh.z0)}</li>
                      <li>{t('Wind {0} turns of the feed coax, about {1} across, as a choke just below the feed point so the cable does not become part of the antenna.', r.chokeTurns, fmtLen(r.chokeDiameterM, u))}</li>
                      <li>{t('The large loop must be the longer one: it leads by 45° and the small loop lags by 45°.')}</li>
                    </ol>
                  </section>
                </div>
                <BuildSheet sheets={sheets} settings={settings} t={t} title={`${t('Quadrifilar helix (QFH)')} ${qfh.fMHz} MHz`}>
                  {cut}
                </BuildSheet>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
