'use client'

import { Trash2 } from 'lucide-react'

interface Props {
  value: Record<string, string>
  onChange: (next: Record<string, string>) => void
}

export default function PersonaMessagesEditor({ value, onChange }: Props) {
  const entries = Object.entries(value)

  const updateKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return
    const next: Record<string, string> = {}
    for (const [k, v] of entries) {
      next[k === oldKey ? newKey : k] = v
    }
    onChange(next)
  }

  const updateValue = (key: string, newVal: string) => {
    onChange({ ...value, [key]: newVal })
  }

  const remove = (key: string) => {
    const next = { ...value }
    delete next[key]
    onChange(next)
  }

  const addRow = () => {
    const base = 'New persona'
    let key = base
    let n = 1
    while (key in value) {
      key = `${base} ${n++}`
    }
    onChange({ ...value, [key]: '' })
  }

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <div className="text-xs text-gray-400 italic py-2">
          No persona messages yet. Add one below.
        </div>
      )}
      {entries.map(([key, msg]) => (
        <div key={key} className="border rounded-md p-3" style={{ borderColor: 'var(--tulip-border)', backgroundColor: '#F8F8F6' }}>
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={key}
              onChange={e => updateKey(key, e.target.value)}
              placeholder="Persona name (e.g. VP Quality)"
              className="flex-1 text-sm px-3 py-1.5 border rounded-md outline-none focus:border-[#008CB9] font-semibold"
              style={{ borderColor: 'var(--tulip-border)' }}
            />
            <button
              type="button"
              onClick={() => remove(key)}
              className="text-gray-400 hover:text-red-600 p-1.5 rounded transition-colors"
              title="Remove persona"
              aria-label="Remove persona"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <textarea
            value={msg}
            onChange={e => updateValue(key, e.target.value)}
            placeholder="Message tailored to this persona's pains and priorities"
            rows={3}
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical font-normal"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50"
        style={{ borderColor: 'var(--tulip-border)', color: '#00263E' }}
      >
        + Add persona
      </button>
    </div>
  )
}
