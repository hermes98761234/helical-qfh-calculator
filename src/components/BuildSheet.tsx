import type { PageSize, Sheet, Shape } from '../lib/template'
import { PAGES, tiles } from '../lib/template'
import type { T } from '../i18n'

function ShapeEl({ s }: { s: Shape }) {
  const dash = 'dash' in s && s.dash ? '4 3' : undefined
  switch (s.k) {
    case 'line':
      return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} strokeWidth={s.w ?? 0.4} strokeDasharray={dash} />
    case 'rect':
      return <rect x={s.x} y={s.y} width={s.w} height={s.h} strokeWidth={0.4} strokeDasharray={dash} fill="none" />
    case 'circle':
      return <circle cx={s.cx} cy={s.cy} r={s.r} strokeWidth={0.6} strokeDasharray={dash} fill="none" />
    case 'text':
      return (
        <text x={s.x} y={s.y} fontSize={s.size ?? 4} textAnchor={s.anchor ?? 'start'} stroke="none" fill="currentColor">
          {s.s}
        </text>
      )
  }
}

/** One sheet scaled to fit the screen. */
export function SheetPreview({ sheet }: { sheet: Sheet }) {
  return (
    <svg className="sheet-svg" viewBox={`0 0 ${sheet.widthMm} ${sheet.heightMm}`} stroke="currentColor" fill="none" role="img" aria-label={sheet.title}>
      {sheet.shapes.map((s, i) => (
        <ShapeEl key={i} s={s} />
      ))}
    </svg>
  )
}

/** The same sheet at 1:1 scale, cut into pages for printing. */
export function SheetPages({ sheet, page, t }: { sheet: Sheet; page: PageSize; t: T }) {
  const { w, h } = PAGES[page]
  const { tiles: list, cols, rows } = tiles(sheet, page)
  return (
    <>
      {list.map((tl) => (
        <div className="print-page" key={`${tl.col}-${tl.row}`}>
          <svg width={`${w}mm`} height={`${h}mm`} viewBox={`${tl.x} ${tl.y} ${w} ${h}`} stroke="#000" fill="none" color="#000">
            {sheet.shapes.map((s, i) => (
              <ShapeEl key={i} s={s} />
            ))}
            <rect x={tl.x + 0.2} y={tl.y + 0.2} width={w - 0.4} height={h - 0.4} strokeWidth={0.2} strokeDasharray="1 2" stroke="#888" />
            <text x={tl.x + 3} y={tl.y + h - 3} fontSize={3} stroke="none" fill="#555">
              {`${sheet.title}: ${t('page {0} of {1}', tl.row * cols + tl.col + 1, cols * rows)} (${t('column {0}, row {1}', tl.col + 1, tl.row + 1)})`}
            </text>
          </svg>
        </div>
      ))}
    </>
  )
}
