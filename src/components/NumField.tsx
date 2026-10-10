import { useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  bad?: boolean
  step?: number
  suffix?: string
  hint?: string
}

/** Number input that keeps what the user types until it parses, so partial input like "1." survives. */
export default function NumField({ label, value, onChange, bad, step = 0.01, suffix, hint }: Props) {
  const [text, setText] = useState(String(value))
  // Keep the typed text while it still means the current value; otherwise show the value (preset or other edit).
  const shown = text !== '' && Number(text) === value ? text : String(Number(value.toPrecision(10)))
  return (
    <label className="field">
      <span>
        {label}
        {suffix ? ` (${suffix})` : ''}
      </span>
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={shown}
        className={bad ? 'bad' : undefined}
        aria-invalid={bad || undefined}
        title={hint}
        onChange={(e) => {
          setText(e.target.value)
          const v = e.target.valueAsNumber
          if (Number.isFinite(v)) onChange(v)
        }}
      />
    </label>
  )
}
