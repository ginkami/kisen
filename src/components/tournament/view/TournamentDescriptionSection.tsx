import { useTranslation } from 'react-i18next'
import { useQueries } from '@tanstack/react-query'
import type { Event } from '../../../domain/event.ts'
import type { Tournament } from '../../../domain/tournament.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'
import { regulationService } from '../../../services/regulationService.ts'
import { MarkdownCollapsibleSections } from './MarkdownCollapsibleSections.tsx'

interface TournamentDescriptionSectionProps {
  tournament: Tournament
  event: Event | null
}

function regulationDescription(
  regulation: { locales: Record<string, { description?: string }> } | null,
  locale: SupportedLocale
): string {
  if (!regulation) return ''
  return regulation.locales[locale]?.description || regulation.locales.ru?.description || ''
}

/**
 * Public tournament «Описание» tab: event description, then tournament
 * description, then event regulations, then tournament regulations — all
 * rendered as safely sanitized Markdown with heading-based collapse blocks.
 * Renders nothing when there is no content at all.
 */
export function TournamentDescriptionSection({ tournament, event }: TournamentDescriptionSectionProps) {
  const { i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'

  const tournamentRegulationIds = tournament.regulations ?? []
  // Event regulations already attached to the tournament are skipped:
  // the tournament's own copy wins and is rendered exactly once.
  const eventRegulationIds = (event?.regulations ?? []).filter(
    (id) => !tournamentRegulationIds.includes(id)
  )
  const regulationIds = [...eventRegulationIds, ...tournamentRegulationIds]

  const regulationQueries = useQueries({
    queries: regulationIds.map((id) => ({
      queryKey: ['regulation', id],
      queryFn: () => regulationService.getById(id),
    })),
  })

  const eventDescription = event
    ? event.locales[locale]?.description || event.locales.ru?.description || ''
    : ''
  const tournamentDescription =
    tournament.locales[locale]?.description || tournament.locales.ru?.description || ''
  const regulationDescriptions = regulationQueries.map((query) =>
    regulationDescription(query.data ?? null, locale)
  )

  const markdown = [eventDescription, tournamentDescription, ...regulationDescriptions]
    .filter((chunk) => chunk.trim() !== '')
    .join('\n\n')

  if (markdown === '') {
    return null
  }

  return <MarkdownCollapsibleSections markdown={markdown} />
}
