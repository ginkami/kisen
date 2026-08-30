import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownContent } from '../components/tournament/view/MarkdownContent.tsx'

function hrefOf(text: string): string | null {
  return screen.getByText(text).getAttribute('href')
}

describe('MarkdownContent', () => {
  it('allows http, https and mailto link schemes', () => {
    const md = '[http](http://example.com) [https](https://example.com) [mail](mailto:a@b.c)'
    render(<MarkdownContent content={md} />)
    expect(hrefOf('http')).toBe('http://example.com')
    expect(hrefOf('https')).toBe('https://example.com')
    expect(hrefOf('mail')).toBe('mailto:a@b.c')
  })

  it('allows relative and fragment URLs', () => {
    const md = '[frag](#section) [root](/path) [rel](./doc.md)'
    render(<MarkdownContent content={md} />)
    expect(hrefOf('frag')).toBe('#section')
    expect(hrefOf('root')).toBe('/path')
    expect(hrefOf('rel')).toBe('./doc.md')
  })

  it('renders a javascript: link without a usable href', () => {
    render(<MarkdownContent content="[x](javascript:alert(1))" />)
    const href = hrefOf('x')
    expect(href === null || href === '').toBe(true)
  })

  it('strips other non-allow-listed schemes', () => {
    render(<MarkdownContent content="[ftp](ftp://example.com) [data](data:text/html,hi)" />)
    expect(hrefOf('ftp') ?? '').not.toContain('ftp:')
    expect(hrefOf('data') ?? '').not.toContain('data:')
  })

  it('opens external links in a new tab with a safe rel', () => {
    render(<MarkdownContent content="[ext](https://example.com) [local](/local)" />)
    const ext = screen.getByText('ext')
    expect(ext.getAttribute('target')).toBe('_blank')
    expect(ext.getAttribute('rel')).toBe('noreferrer')
    const local = screen.getByText('local')
    expect(local.getAttribute('target')).toBeNull()
  })

  it('does not create elements from raw HTML', () => {
    const md = 'before\n\n<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\nafter'
    const { container } = render(<MarkdownContent content={md} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders GFM tables and lists', () => {
    const md = '| a | b |\n| - | - |\n| 1 | 2 |\n\n- item'
    const { container } = render(<MarkdownContent content={md} />)
    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelector('ul')).not.toBeNull()
    expect(screen.getByText('item')).not.toBeNull()
  })
})
