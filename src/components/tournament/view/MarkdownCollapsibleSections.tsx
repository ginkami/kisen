import { useMemo } from 'react'
import { BsCaretDownFill } from 'react-icons/bs'
import type { MarkdownSection } from '../../../utils/markdownSections.ts'
import { buildMarkdownSections } from '../../../utils/markdownSections.ts'
import { MarkdownContent } from './MarkdownContent.tsx'

interface MarkdownCollapsibleSectionsProps {
  markdown: string
}

function SectionView({ section }: { section: MarkdownSection }) {
  // A heading-less section (document preamble or a heading-free document)
  // renders as plain Markdown without a collapse block.
  if (section.level === 0) {
    return section.raw === '' ? null : <MarkdownContent content={section.raw} />
  }
  return (
    <details className="collapse group">
      <summary className="collapse-title">
        <BsCaretDownFill className="me-2 inline-block h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
        <span className="font-semibold">{section.title}</span>
      </summary>
      <div className="collapse-content">
        {section.raw !== '' && <MarkdownContent content={section.raw} />}
        {section.children.map((child, index) => (
          <SectionView key={index} section={child} />
        ))}
      </div>
    </details>
  )
}

/** Splits Markdown by headings and renders nested daisyUI collapse sections. */
export function MarkdownCollapsibleSections({ markdown }: MarkdownCollapsibleSectionsProps) {
  const sections = useMemo(() => buildMarkdownSections(markdown), [markdown])
  if (sections.length === 0) return null
  return (
    <div className="space-y-3">
      {sections.map((section, index) => (
        <SectionView key={index} section={section} />
      ))}
    </div>
  )
}
