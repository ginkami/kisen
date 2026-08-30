import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownCollapsibleSections } from '../components/tournament/view/MarkdownCollapsibleSections.tsx'

describe('MarkdownCollapsibleSections', () => {
  it('renders a collapse block per top-level heading and nested ones inside', () => {
    const md = ['# A', 'text a', '## B', 'text b', '# C', 'text c'].join('\n')
    const { container } = render(<MarkdownCollapsibleSections markdown={md} />)
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(3)
    const summaries = Array.from(container.querySelectorAll('summary')).map((s) => s.textContent)
    expect(summaries.some((t) => t?.includes('A'))).toBe(true)
    expect(summaries.some((t) => t?.includes('B'))).toBe(true)
    expect(summaries.some((t) => t?.includes('C'))).toBe(true)
    // The h2 section nests inside the first h1 section's collapse content.
    const nested = details[0]!.querySelectorAll('details')
    expect(nested).toHaveLength(1)
    expect(nested[0]!.querySelector('summary')?.textContent).toContain('B')
    // Sibling h1 sections are not nested inside each other.
    expect(details[1]!.querySelectorAll('details')).toHaveLength(0)
  })

  it('renders deep nesting (h1 → h2 → h3)', () => {
    const md = ['# A', '## B', '### C', 'deep'].join('\n')
    const { container } = render(<MarkdownCollapsibleSections markdown={md} />)
    const details = container.querySelectorAll('details')
    expect(details).toHaveLength(3)
    expect(details[0]!.querySelector('summary')?.textContent).toContain('A')
    expect(details[1]!.querySelector('summary')?.textContent).toContain('B')
    expect(details[2]!.querySelector('summary')?.textContent).toContain('C')
  })

  it('starts collapsed', () => {
    const md = '# A\ntext'
    const { container } = render(<MarkdownCollapsibleSections markdown={md} />)
    const details = container.querySelector('details')!
    expect(details.hasAttribute('open')).toBe(false)
  })

  it('renders content without headings as plain Markdown without collapse blocks', () => {
    const md = 'Plain **text** with no headings.'
    const { container } = render(<MarkdownCollapsibleSections markdown={md} />)
    expect(container.querySelector('details')).toBeNull()
    expect(screen.getByText('text').tagName).toBe('STRONG')
  })

  it('renders nothing for empty markdown', () => {
    const { container } = render(<MarkdownCollapsibleSections markdown="   " />)
    expect(container.children).toHaveLength(0)
  })

  it('does not create a collapse for a heading inside a fenced code block', () => {
    const md = ['```', '# not a heading', '```'].join('\n')
    const { container } = render(<MarkdownCollapsibleSections markdown={md} />)
    expect(container.querySelector('details')).toBeNull()
    expect(container.textContent).toContain('# not a heading')
  })
})
