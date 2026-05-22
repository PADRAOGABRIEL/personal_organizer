import { useState } from 'react'
import { parseRecurrenceRule, formatRecurrenceRule } from '../../lib/recurrence'
import type { RecurrenceFrequency } from '../../types'

interface RecurrencePickerProps {
  value: string | null
  onChange: (rule: string | null) => void
}

const WEEKDAYS = [
  { key: 'MO', label: 'S' },
  { key: 'TU', label: 'T' },
  { key: 'WE', label: 'Q' },
  { key: 'TH', label: 'Q' },
  { key: 'FR', label: 'S' },
  { key: 'SA', label: 'S' },
  { key: 'SU', label: 'D' },
]

const WEEKDAY_NAMES: Record<string, string> = {
  MO: 'Seg', TU: 'Ter', WE: 'Qua', TH: 'Qui', FR: 'Sex', SA: 'Sáb', SU: 'Dom',
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const parsed = value ? parseRecurrenceRule(value) : null

  const [frequency, setFrequency] = useState<RecurrenceFrequency>(parsed?.frequency ?? 'WEEKLY')
  const [interval, setInterval] = useState(parsed?.interval ?? 1)
  const [weekdays, setWeekdays] = useState<string[]>(parsed?.weekdays ?? [])
  const [expanded, setExpanded] = useState(false)

  const presets = [
    { label: 'Não repete', rule: null },
    { label: 'Todo dia', rule: 'DAILY:1' },
    { label: 'Toda semana', rule: 'WEEKLY:1' },
    { label: 'Todo mês', rule: 'MONTHLY:1' },
    { label: 'Todo ano', rule: 'YEARLY:1' },
    { label: 'Personalizado', rule: 'custom' },
  ]

  const handlePreset = (rule: string | null) => {
    if (rule === 'custom') {
      setExpanded(true)
      return
    }
    setExpanded(false)
    onChange(rule)
  }

  const isCustomActive =
    value &&
    !presets.slice(0, -1).some(p => p.rule === value)

  const applyCustom = () => {
    const rule = formatRecurrenceRule({
      frequency,
      interval,
      weekdays: frequency === 'WEEKLY' ? weekdays : undefined,
    })
    onChange(rule)
    setExpanded(false)
  }

  const toggleWeekday = (day: string) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map(p => (
          <button
            key={p.rule ?? 'none'}
            type="button"
            onClick={() => handlePreset(p.rule)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
              (p.rule === null && !value) ||
              (p.rule !== null && p.rule !== 'custom' && value === p.rule) ||
              (p.rule === 'custom' && (expanded || isCustomActive))
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 bg-slate-900 rounded-xl p-3 mt-1">
          <div className="flex gap-2 items-center">
            <span className="text-slate-500 text-xs">A cada</span>
            <input
              type="number"
              min={1}
              max={99}
              value={interval}
              onChange={e => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-14 bg-slate-800 text-slate-100 text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={frequency}
              onChange={e => setFrequency(e.target.value as RecurrenceFrequency)}
              className="flex-1 bg-slate-800 text-slate-100 text-sm rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 border border-slate-700"
            >
              <option value="DAILY">dia(s)</option>
              <option value="WEEKLY">semana(s)</option>
              <option value="MONTHLY">mês(es)</option>
              <option value="YEARLY">ano(s)</option>
            </select>
          </div>

          {frequency === 'WEEKLY' && (
            <div className="flex flex-col gap-1">
              <span className="text-slate-500 text-xs">Nos dias</span>
              <div className="flex gap-1.5">
                {WEEKDAYS.map(({ key }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleWeekday(key)}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      weekdays.includes(key)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {WEEKDAY_NAMES[key].slice(0, 1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={applyCustom}
            className="self-end px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
