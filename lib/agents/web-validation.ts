// Web-source validation for AccountIntelligenceAgent. Every web-sourced fact
// the agent wants to write to the database has to clear two checks:
//
//   1. URL is reachable (HTTP 200-399).
//   2. The exact_quote_from_source the agent claims is substring-present
//      in the page's visible text (case-insensitive, whitespace-normalized).
//
// If either check fails, the finding is rejected. This is the mechanical
// safety net behind the WEB_RESEARCH_RULES contract — fabrication isn't
// just discouraged in the prompt, it's literally impossible to save without
// a verifiable quote at a verifiable URL.
//
// The validator is intentionally conservative. False rejects (e.g. a JS-heavy
// site that returns mostly empty HTML to a server-side fetch) are preferred
// to false accepts. The agent gets the rejection reason back as the tool
// result and can try a different source.

export interface ValidationResult {
  ok: boolean
  reason?: string
}

const FETCH_TIMEOUT_MS = 8000
const MAX_BODY_BYTES = 2_000_000  // 2 MB — anything larger is unlikely to be a primary source page

// Strip HTML tags + decode the most common entities. Not a full parser —
// just enough to make the substring match work against typical news/press
// pages. Returns lowercase, whitespace-normalized text.
function htmlToPlainText(html: string): string {
  return html
    // Drop <script>...</script> and <style>...</style> blocks entirely
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode the common entities the agent's quotes are likely to encounter
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    // Numeric entity fallback for the rest
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    // Collapse whitespace to single spaces
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

// Normalize a quote the same way as the page text so substring search works.
// Smart quotes / em-dashes / non-breaking spaces are all common sources of
// false negatives if not normalized on both sides.
function normalizeQuote(q: string): string {
  return q
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim()
}

// Validate that the URL is well-formed and uses http(s).
function validateUrlShape(url: string): ValidationResult {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, reason: 'Malformed URL — could not parse as a valid URL.' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: `Unsupported URL protocol: ${parsed.protocol} — only http and https are accepted.` }
  }
  return { ok: true }
}

// HEAD-check the URL. Some servers refuse HEAD; we fall back to GET if HEAD
// returns 405 / 501. We accept any 2xx or 3xx status as "reachable."
async function checkUrlReachable(url: string): Promise<ValidationResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let res = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })
    if (res.status === 405 || res.status === 501) {
      // Server doesn't support HEAD — retry with GET, abort body
      res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    }
    if (res.status >= 200 && res.status < 400) return { ok: true }
    return { ok: false, reason: `URL returned HTTP ${res.status} — not reachable.` }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: `URL fetch failed: ${msg}` }
  } finally {
    clearTimeout(timer)
  }
}

// Fetch the full URL body and return up to MAX_BODY_BYTES of plain text.
// Skips non-text content types (images, PDFs, video) — those can't be
// quote-validated by substring.
async function fetchPlainText(url: string): Promise<{ ok: boolean; text?: string; reason?: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    if (res.status < 200 || res.status >= 400) {
      return { ok: false, reason: `URL returned HTTP ${res.status} — cannot validate quote.` }
    }
    const contentType = (res.headers.get('content-type') ?? '').toLowerCase()
    if (!contentType.includes('text/') && !contentType.includes('application/xhtml')) {
      return { ok: false, reason: `Content-type "${contentType}" is not text/html — quote cannot be substring-validated.` }
    }
    // Read body up to the cap. fetch() doesn't expose a streaming length cap natively;
    // we read fully, then truncate. Good enough for typical pages (<200KB).
    const buf = await res.arrayBuffer()
    if (buf.byteLength > MAX_BODY_BYTES) {
      return { ok: false, reason: `Page too large (${buf.byteLength} bytes) — refusing to validate quote against truncated body.` }
    }
    const html = new TextDecoder('utf-8').decode(buf)
    return { ok: true, text: htmlToPlainText(html) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: `URL fetch failed: ${msg}` }
  } finally {
    clearTimeout(timer)
  }
}

// The full validator. Pass an exact quote the agent extracted from a URL,
// returns ok if the URL is reachable AND the quote substring exists in
// the fetched page text.
export async function validateWebFinding(url: string, exactQuote: string): Promise<ValidationResult> {
  const shape = validateUrlShape(url)
  if (!shape.ok) return shape

  if (!exactQuote || exactQuote.trim().length < 8) {
    return { ok: false, reason: 'exact_quote_from_source is missing or too short (need ≥ 8 characters).' }
  }

  const fetched = await fetchPlainText(url)
  if (!fetched.ok) return { ok: false, reason: fetched.reason }

  const haystack = fetched.text!
  const needle = normalizeQuote(exactQuote)

  if (haystack.includes(needle)) return { ok: true }

  // Try a softer match — first 80 normalized chars of the quote — to handle
  // cases where the agent paraphrased slightly. If even the soft match fails,
  // reject. (This is a guardrail against the agent inventing a quote that
  // isn't actually on the page.)
  const softNeedle = needle.slice(0, 80)
  if (softNeedle.length >= 40 && haystack.includes(softNeedle)) {
    return { ok: false, reason: `Quote partially matches but not exactly. The substring "${softNeedle.slice(0, 60)}..." appears, but the full quote does not. Re-extract the exact text from the page.` }
  }

  return { ok: false, reason: `Quote not found at the URL. The agent's exact_quote_from_source must be a verbatim substring of the page text. URL fetched ${haystack.length} chars; quote not present.` }
}

// Lightweight URL-only check, for the firmographic-update path where the
// agent has already cited a finding (and we already validated the quote)
// but is now writing a second tool call against the same URL.
export async function validateUrlOnly(url: string): Promise<ValidationResult> {
  const shape = validateUrlShape(url)
  if (!shape.ok) return shape
  return await checkUrlReachable(url)
}
