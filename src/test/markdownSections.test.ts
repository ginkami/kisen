import { describe, expect, it } from 'vitest'
import { buildMarkdownSections } from '../utils/markdownSections.ts'

describe('buildMarkdownSections', () => {
  it('returns an empty array for empty input', () => {
    expect(buildMarkdownSections('')).toEqual([])
    expect(buildMarkdownSections('   \n\n  ')).toEqual([])
  })

  it('returns a single heading-less section for content without headings', () => {
    const md = 'Paragraph one.\n\n- item a\n- item b'
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({ level: 0, title: '', children: [] })
    expect(sections[0]!.raw).toBe(md)
  })

  it('splits content by headings into nested sections', () => {
    const md = [
      '# Main',
      'Intro paragraph.',
      'Second paragraph.',
      '## Sub',
      'Sub content.',
    ].join('\n')
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(1)
    const main = sections[0]!
    expect(main.level).toBe(1)
    expect(main.title).toBe('Main')
    expect(main.raw).toBe('Intro paragraph.\nSecond paragraph.')
    expect(main.children).toHaveLength(1)
    const sub = main.children[0]!
    expect(sub).toMatchObject({ level: 2, title: 'Sub', raw: 'Sub content.' })
    expect(sub.children).toHaveLength(0)
  })

  it('renders sibling sections for same-level headings', () => {
    const md = ['## First', 'a', '## Second', 'b'].join('\n')
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ level: 2, title: 'First', raw: 'a' })
    expect(sections[1]).toMatchObject({ level: 2, title: 'Second', raw: 'b' })
  })

  it('supports deep nesting (h1 → h2 → h3)', () => {
    const md = ['# A', '## B', '### C', 'deep'].join('\n')
    const sections = buildMarkdownSections(md)
    const c = sections[0]!.children[0]!.children[0]!
    expect(c).toMatchObject({ level: 3, title: 'C', raw: 'deep' })
  })

  it('nests a deeper heading under the nearest shallower one after a section jump', () => {
    const md = ['## Top', 'intro', '#### Deep', 'deep text', '## Tail', 'tail text'].join('\n')
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(2)
    const top = sections[0]!
    expect(top.title).toBe('Top')
    expect(top.children[0]).toMatchObject({ level: 4, title: 'Deep', raw: 'deep text' })
    expect(sections[1]).toMatchObject({ level: 2, title: 'Tail', raw: 'tail text' })
  })

  it('does not treat heading-like lines inside fenced code blocks as headings', () => {
    const md = ['# Real', 'text', '```', '# not a heading', 'code', '```', 'after'].join('\n')
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(1)
    expect(sections[0]!.raw).toContain('# not a heading')
    expect(sections[0]!.children).toHaveLength(0)
  })

  it('tracks tilde fences and requires a closing fence of the same marker', () => {
    const md = ['~~~', '## in fence', '~~~', '## Out', 'text'].join('\n')
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(2)
    // Fenced content before the first heading stays inside the heading-less preamble section.
    expect(sections[0]).toMatchObject({ level: 0, title: '' })
    expect(sections[0]!.raw).toContain('## in fence')
    expect(sections[1]).toMatchObject({ level: 2, title: 'Out', raw: 'text' })
  })

  it('puts content before the first heading into a leading heading-less section', () => {
    const md = ['Lead paragraph.', '# H', 'body'].join('\n')
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({ level: 0, title: '', raw: 'Lead paragraph.' })
    expect(sections[1]).toMatchObject({ level: 1, title: 'H', raw: 'body' })
  })

  it('strips trailing hashes from heading titles', () => {
    const md = '## Title ##\nbody'
    const sections = buildMarkdownSections(md)
    expect(sections[0]!.title).toBe('Title')
  })

  it('does not treat #Title without a space as a heading', () => {
    const sections = buildMarkdownSections('#Tag trending')
    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({ level: 0, title: '' })
  })

  it('ignores headings deeper than level 6', () => {
    const md = '####### seven\nbody'
    const sections = buildMarkdownSections(md)
    expect(sections).toHaveLength(1)
    expect(sections[0]).toMatchObject({ level: 0 })
    expect(sections[0]!.raw).toContain('####### seven')
  })
})
