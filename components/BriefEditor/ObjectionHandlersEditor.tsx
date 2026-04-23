'use client'

import { Trash2 } from 'lucide-react'

interface Objection {
  objection: string
  response: string
}

interface Props {
  value: Objection[]
  onChange: (next: Objection[]) => void
}

export default function ObjectionHandlersEditor({ value, onChange }: Props) {
  const update = (i: number, next: Objection) => {
    const copy = [...value]
    copy[i] = next
    onChange(copy)
  }
  const remove = (i: number) => {
    onChange(value.filter((_, j) => j !== i))
  }
  const add = () => {
    onChange([...value, { objection: '', response: '' }])
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <div className="text-xs text-gray-400 italic py-2">No objection handlers yet.</div>
      )}
      {value.map((item, i) => (
        <div key={i} className="border rounded-md p-3" style={{ borderColor: 'var(--tulip-border)', backgroundColor: '#F8F8F6' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">Objection {i + 1}</div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
              title="Remove"
              aria-label="Remove objection handler"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <input
            type="text"
            value={item.objection}
            onChange={e => update(i, { ...item, objection: e.target.value })}
            placeholder="The customer's concern (e.g. 'We just installed SAP MII — why do we need another layer?')"
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] mb-2"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
          <div className="text-[11px] font-bold uppercase tracking-wider text-green-700 mb-1">Response</div>
          <textarea
            value={item.response}
            onChange={e => update(i, { ...item, response: e.target.value })}
            placeholder="How we respond (2-3 sentences)"
            rows={2}
            className="w-full text-sm px-3 py-2 border rounded-md outline-none focus:border-[#008CB9] resize-vertical"
            style={{ borderColor: 'var(--tulip-border)' }}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="text-xs font-semibold px-3 py-1.5 rounded-md border transition-colors hover:bg-gray-50"
        style={{ borderColor: 'var(--tulip-border)', color: '#00263E' }}
      >
        + Add objection handler
      </button>
    </div>
  )
}
