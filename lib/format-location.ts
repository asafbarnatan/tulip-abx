// US state + territory short codes. When a headquarters string ends with one
// of these (preceded by a comma, e.g. "Marlborough, MA"), we append ", US" so
// the location reads unambiguously for global readers. Tulip is a global product,
// so "MA" alone is context-dependent — "MA, US" is not.

const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA',
  'ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
  'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP', // DC + US territories
])

// Accepts strings like "Marlborough, MA" or "Dallas, TX" and returns "Marlborough, MA, US".
// Leaves anything else untouched: "Osaka, Japan" → "Osaka, Japan".
// Already-suffixed values ("Marlborough, MA, US") are returned as-is.
export function formatLocation(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Already has a US-ish country suffix — leave alone.
  if (/\b(US|USA|United States)\s*$/i.test(trimmed)) return trimmed

  // Split on commas. Last token needs to be a state code for us to append.
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) return trimmed

  const lastToken = parts[parts.length - 1].toUpperCase()
  if (US_STATE_CODES.has(lastToken)) {
    return `${trimmed}, US`
  }

  return trimmed
}

// Fallback helper: returns headquarters if set, otherwise the geography label
// (e.g. "Japan", "Europe", "North America"). Apply formatLocation to both so
// US headquarters gets the "US" suffix and "North America" stays as-is.
export function displayLocation(headquarters: string | null | undefined, geography: string | null | undefined): string {
  if (headquarters && headquarters.trim()) return formatLocation(headquarters)
  return (geography ?? '').trim()
}
