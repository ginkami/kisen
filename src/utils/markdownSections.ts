/**
 * Splits Markdown content into a tree of sections by ATX headings
 * (`#`–`######`, levels 1–6). Heading-like lines inside fenced code
 * blocks are not treated as headings. Setext headings are not supported.
 *
 * Content before the first heading (and documents without any heading)
 * becomes a section with `level === 0` and an empty `title`.
 */
export interface MarkdownSection {
  /** Heading level 1–6, or 0 when the section has no heading. */
  level: number
  /** Heading text without the leading hashes, or '' when the section has no heading. */
  title: string
  /** Markdown content of the section (excluding its own heading line), trimmed. */
  raw: string
  /** Sections opened by headings nested inside this section. */
  children: MarkdownSection[]
}

const HEADING_RE = /^(#{1,6})(\s+.*)?$/
const FENCE_OPEN_RE = /^\s*(`{3,}|~{3,})/

interface Frame {
  node: MarkdownSection
}

function titleFromHeadingLine(line: string): string {
  return line
    .replace(HEADING_RE, (_, hashes: string, rest: string | undefined) => (rest ?? '').trim())
    .replace(/\s+#+\s*$/, '')
    .trim()
}

function normalizeRaw(lines: string[]): string {
  return lines.join('\n').replace(/^\s*\n+/, '').replace(/\n+\s*$/, '').trim()
}

export function buildMarkdownSections(md: string): MarkdownSection[] {
  if (!md || md.trim() === '') return []

  const lines = md.split(/\r?\n/)
  const preamble: string[] = []
  const roots: MarkdownSection[] = []
  const stack: Frame[] = []
  let current: MarkdownSection | null = null
  let currentLines: string[] = []

  let fenceChar: string | null = null
  let fenceLength = 0

  const flushCurrent = () => {
    if (current) {
      current.raw = normalizeRaw(currentLines)
      current = null
      currentLines = []
    }
  }

  for (const line of lines) {
    const fenceMatch = FENCE_OPEN_RE.exec(line)
    if (fenceChar === null && fenceMatch) {
      fenceChar = fenceMatch[1][0]
      fenceLength = fenceMatch[1].length
    } else if (
      fenceChar !== null &&
      fenceMatch &&
      fenceMatch[1][0] === fenceChar &&
      fenceMatch[1].length >= fenceLength &&
      line.trim() === fenceMatch[1]
    ) {
      fenceChar = null
      fenceLength = 0
    }

    const headingMatch = fenceChar === null ? HEADING_RE.exec(line) : null
    if (headingMatch) {
      flushCurrent()
      const node: MarkdownSection = {
        level: headingMatch[1].length,
        title: titleFromHeadingLine(line),
        raw: '',
        children: [],
      }
      while (stack.length > 0 && stack[stack.length - 1]!.node.level >= node.level) {
        stack.pop()
      }
      if (stack.length === 0) {
        roots.push(node)
      } else {
        stack[stack.length - 1]!.node.children.push(node)
      }
      stack.push({ node })
      current = node
      currentLines = []
    } else if (current) {
      currentLines.push(line)
    } else {
      preamble.push(line)
    }
  }
  flushCurrent()

  const preambleRaw = normalizeRaw(preamble)
  if (roots.length === 0) {
    // No headings at all: the whole document is a single heading-less section.
    return [{ level: 0, title: '', raw: preambleRaw, children: [] }]
  }
  if (preambleRaw !== '') {
    roots.unshift({ level: 0, title: '', raw: preambleRaw, children: [] })
  }
  return roots
}
