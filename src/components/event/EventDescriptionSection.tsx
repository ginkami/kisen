import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import type { Event } from '../../domain/event.ts'
import type { SupportedLocale } from '../../domain/locale.ts'
import { regulationService } from '../../services/regulationService.ts'
import { MarkdownCollapsibleSections } from '../tournament/view/MarkdownCollapsibleSections.tsx'

interface EventDescriptionSectionProps {
  event: Event
}

function regulationDescription(
  regulation: { locales: Record<string, { description?: string }> } | null,
  locale: SupportedLocale
): string {
  if (!regulation) return ''
  return regulation.locales[locale]?.description || regulation.locales.ru?.description || ''
}

/**
 * Public event page content when the event has no public tournaments:
 * event description, then descriptions of all event regulations —
 * rendered as safely sanitized Markdown with heading-based collapse blocks.
 * Renders nothing when there is no content at all.
 */
export function EventDescriptionSection({ event }: EventDescriptionSectionProps) {
  const { i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const regulationIds = event.regulations ?? []
  const regulationQueries = useQueries({
    queries: regulationIds.map((id) => ({
      queryKey: ['regulation', id],
      queryFn: () => regulationService.getById(id),
    })),
  })

  const eventDescription =
    event.locales[locale]?.description || event.locales.ru?.description || ''
  const regulationDescriptions = regulationQueries.map((query) =>
    regulationDescription(query.data ?? null, locale)
  )

  const markdown = [eventDescription, ...regulationDescriptions]
    .filter((chunk) => chunk.trim() !== '')
    .join('\n\n')

  if (markdown === '') {
    return null
  }

  return <MarkdownCollapsibleSections markdown={markdown} />
}