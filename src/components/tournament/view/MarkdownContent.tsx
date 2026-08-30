import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

const SAFE_SCHEME_RE = /^(?:https?:|mailto:)/i

/**
 * Link scheme allow-list per the input-sanitization renderer contract:
 * only `http:`, `https:`, and `mailto:` URLs are usable; relative and
 * fragment URLs are allowed; anything else is stripped so the element
 * renders without a usable URL target.
 */
export function safeUrlTransform(url: string): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('?')) {
    return url
  }
  if (trimmed.startsWith('./') || trimmed.startsWith('../')) {
    return url
  }
  return SAFE_SCHEME_RE.test(trimmed) ? url : ''
}

const components: Components = {
  a({ node: _node, children, href, ...props }) {
    const isExternal = typeof href === 'string' && /^https?:\/\//i.test(href)
    return (
      <a
        {...props}
        href={href}
        {...(isExternal ? { target: '_blank', rel: 'noreferrer' } : {})}
      >
        {children}
      </a>
    )
  },
  p({ node: _node, children, ...props }) {
    return (
      <p {...props} className="my-2 first:mt-0 last:mb-0">
        {children}
      </p>
    )
  },
  ul({ node: _node, children, ...props }) {
    return (
      <ul {...props} className="my-2 list-disc ps-6 space-y-1">
        {children}
      </ul>
    )
  },
  ol({ node: _node, children, ...props }) {
    return (
      <ol {...props} className="my-2 list-decimal ps-6 space-y-1">
        {children}
      </ol>
    )
  },
  blockquote({ node: _node, children, ...props }) {
    return (
      <blockquote {...props} className="my-2 border-s-4 border-base-300 ps-3 opacity-80">
        {children}
      </blockquote>
    )
  },
  code({ node: _node, className, children, ...props }) {
    const isBlock = typeof className === 'string' && className.includes('language-')
    if (isBlock) {
      return (
        <code {...props} className={`${className ?? ''} block overflow-x-auto rounded bg-base-200 p-3 text-sm`}>
          {children}
        </code>
      )
    }
    return (
      <code {...props} className="rounded bg-base-200 px-1 py-0.5 text-sm">
        {children}
      </code>
    )
  },
  pre({ node: _node, children, ...props }) {
    return (
      <pre {...props} className="my-2">
        {children}
      </pre>
    )
  },
  table({ node: _node, children, ...props }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table {...props} className="table table-sm">
          {children}
        </table>
      </div>
    )
  },
  th({ node: _node, children, ...props }) {
    return (
      <th {...props} className="border-b border-base-300 px-2 py-1 text-start font-semibold">
        {children}
      </th>
    )
  },
  td({ node: _node, children, ...props }) {
    return (
      <td {...props} className="border-b border-base-200 px-2 py-1 align-top">
        {children}
      </td>
    )
  },
  hr() {
    return <hr className="my-4 border-base-300" />
  },
}

interface MarkdownContentProps {
  content: string
}

/** Renders Markdown text as React elements: raw HTML disabled, safe link schemes only. */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} urlTransform={safeUrlTransform} components={components}>
      {content}
    </Markdown>
  )
}
