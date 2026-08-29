/**
 * Text sanitization for form inputs and service write paths.
 *
 * Contract (OpenSpec change: form-input-sanitization):
 * - All persisted text is plain text / Markdown. Raw HTML is disabled: HTML is
 *   silently stripped on entry and again before persistence, never rendered.
 * - Any future Markdown renderer of stored `description` fields MUST render
 *   with raw HTML disabled and MUST restrict link schemes to the allow-list
 *   `http:`, `https:`, `mailto:`.
 * - Dangerous Markdown link targets (`](javascript:`, `](vbscript:`,
 *   `](data:text/html`) are neutralized to `](about:blank#` case-insensitively.
 * - Persistence is Firestore: every value is stored as a typed literal, so
 *   SQL/NoSQL operator injection does not apply — payloads such as
 *   `'; DROP TABLE users; --` or `{"$gt": ""}` are stored and rendered as
 *   ordinary text. NUL bytes and control characters are removed so
 *   terminator-style payloads cannot embed them.
 *
 * Sanitization order: `<script>…</script>` / `<style>…</style>` blocks (with
 * their content), then remaining tag-shaped sequences `<[^>]*>`, then NUL +
 * control characters (keeping `\n` and `\t`). Markdown marker characters are
 * never touched. Values are not trimmed.
 */

const SCRIPT_BLOCK = /<script\b[^>]*>[\s\S]*?<\/script\s*>/gi
const STYLE_BLOCK = /<style\b[^>]*>[\s\S]*?<\/style\s*>/gi
const ANY_TAG = /<[^>]*>/g
const DANGEROUS_MARKDOWN_SCHEME =
  /\]\((?:javascript:|vbscript:|data:text\/html)/gi
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g

/**
 * Strip HTML and dangerous link schemes from a single text value.
 * Markdown markers, line breaks, tabs, and ordinary text pass through.
 */
export function sanitizeTextInput(value: string): string {
  if (!value) return value
  return value
    .replace(SCRIPT_BLOCK, '')
    .replace(STYLE_BLOCK, '')
    .replace(ANY_TAG, '')
    .replace(DANGEROUS_MARKDOWN_SCHEME, '](about:blank#')
    .replace(CONTROL_CHARS, '')
}

/**
 * Recursively sanitize every string in a nested write candidate
 * (objects, arrays, records). Non-string primitives and `Date` instances
 * pass through unchanged. Used by services before `schema.parse()` so the
 * gate holds regardless of which client produced the input.
 */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === 'string') return sanitizeTextInput(value) as T
  if (value === null || typeof value !== 'object') return value
  if (value instanceof Date) return value
  if (Array.isArray(value)) return value.map(sanitizeDeep) as T
  const result: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = sanitizeDeep(entry)
  }
  return result as T
}
