// Shared parser/serializer for account_actions.notes — the field holds either:
//   (a) Play-activation JSON { play_id, play_name, target, opener, why_now[],
//       rationale[], activated_by, activated_role, activator_note, activated_at }
//   (b) Stage-move JSON      { from_stage, to_stage, note }
//   (c) Free-text string     (older / quick-log interactions)
//
// The display (components/ActionLog.tsx ActionNotesRendered) and the edit modal
// (components/ActionLog/EditActionModal.tsx) BOTH use this module so the fields
// rendered on the card and the fields editable in the modal stay in lockstep.

export interface StructuredNotes {
  // Core play-activation shape
  play_id?: string | null
  play_name?: string | null
  target?: string | null
  opener?: string | null
  why_now?: string[]
  rationale?: string[]

  // Activation attribution (set when a play was activated from the Plays tab)
  activated_by?: string | null
  activated_role?: string | null
  activator_note?: string | null
  activated_at?: string | null

  // Stage-move shape
  from_stage?: string | null
  to_stage?: string | null
  note?: string | null

  // Pass-through — preserves any key we don't model explicitly
  [key: string]: unknown
}

// Returns the parsed JSON object if `notes` is a JSON object, otherwise null.
// Arrays and primitives are treated as not-structured.
export function parseStructuredNotes(raw: string | null | undefined): StructuredNotes | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as StructuredNotes
    }
  } catch { /* not JSON, fall through */ }
  return null
}

// Merge a partial update into an existing structured notes object. Keys set to
// undefined are left untouched; keys set to null clear the field; arrays
// fully replace (caller is responsible for list edits).
export function mergeStructuredNotes(base: StructuredNotes, patch: Partial<StructuredNotes>): StructuredNotes {
  const out: StructuredNotes = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue
    out[k] = v
  }
  return out
}

// True if the structured notes contain at least one "rich play" field —
// i.e. the action was created from a play activation and deserves the
// full opener/why_now/rationale editor UI.
export function isRichPlayNote(n: StructuredNotes | null): boolean {
  if (!n) return false
  return !!(n.play_name || n.opener || (Array.isArray(n.why_now) && n.why_now.length > 0) || (Array.isArray(n.rationale) && n.rationale.length > 0) || n.target)
}

// True if the structured notes represent a stage move (which has its own
// minimal shape and shouldn't get the rich editor).
export function isStageMoveNote(n: StructuredNotes | null): boolean {
  if (!n) return false
  return !!(n.from_stage && n.to_stage)
}

// Serialize a structured notes object to the string stored in the DB. Empty
// strings become null so the UI doesn't render blank sections.
export function serializeStructuredNotes(n: StructuredNotes): string {
  const clean: StructuredNotes = {}
  for (const [k, v] of Object.entries(n)) {
    if (v === null || v === undefined) { clean[k] = null; continue }
    if (typeof v === 'string') {
      const trimmed = v.trim()
      clean[k] = trimmed === '' ? null : trimmed
      continue
    }
    if (Array.isArray(v)) {
      const filtered = v.filter(item => typeof item === 'string' ? !!item.trim() : item != null)
      clean[k] = filtered.map(item => typeof item === 'string' ? item.trim() : item)
      continue
    }
    clean[k] = v
  }
  return JSON.stringify(clean)
}
