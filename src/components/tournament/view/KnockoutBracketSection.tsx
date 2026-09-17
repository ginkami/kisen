import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BsInfoCircleFill } from 'react-icons/bs'
import type { Game, Participant } from '../../../domain/tournament.ts'
import { buildBracketView } from '../pairings/knockoutEngine.ts'
import type { SupportedLocale } from '../../../domain/locale.ts'

interface KnockoutBracketSectionProps {
  participants: Participant[]
  games: Game[]
  publishedRounds: number
  bracketSize: number
  startRound: number
}

export function KnockoutBracketSection({
  participants,
  games,
  publishedRounds,
  bracketSize,
  startRound,
}: KnockoutBracketSectionProps) {
  const { t } = useTranslation()

  const view = useMemo(
    () => buildBracketView({ participants, games, publishedRounds, bracketSize, startRound }),
    [participants, games, publishedRounds, bracketSize, startRound],
  )

  if (!view) {
    return (
      <div className="alert alert-info">
        <BsInfoCircleFill className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{t('tournament.view.bracket.unavailable')}</span>
      </div>
    )
  }

  return <BracketBoard view={view} participants={participants} />
}

function BracketBoard({
  view,
  participants,
}: {
  view: NonNullable<ReturnType<typeof buildBracketView>>
  participants: Participant[]
}) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language as SupportedLocale) ?? 'ru'
  const byId = useMemo(() => new Map(participants.map((p) => [p.id, p])), [participants])
  const columns = view.rounds

  return (
    <div className="knockout-bracket-section w-[calc(100vw-32px)] md:w-auto overflow-x-auto overflow-y-hidden pb-2">
      <div className="flex min-w-max items-stretch">
        {columns.map((column, c) => {
          const isLast = c === columns.length - 1
          const matchCount = column.matches.length
          const title =
            matchCount === 1
              ? t('tournament.view.bracket.final')
              : t('tournament.view.bracket.roundOf', { x: matchCount, y: matchCount * 2 })
          return (
            <div key={column.round} className="knockout-round-col flex flex-col">
              <div className="mb-2 text-center text-xs font-semibold opacity-70">
                {title}
                <span className="ml-1 font-normal opacity-70">
                  {t('tournament.view.bracket.roundN', { round: column.round })}
                </span>
              </div>
              <div
                className={[
                  'flex flex-1 flex-col gap-1',
                  isLast ? 'justify-center' : 'justify-around',
                ].join(' ')}
              >
                {column.matches.map((match, k) => {
                  const row = (
                    <MatchRow
                      match={match}
                      byId={byId}
                      locale={locale}
                      hasLeftStub={c > 0}
                      hasRightStub={!isLast}
                    />
                  )
                  // Matches pair up two-by-two to feed the next round; the
                  // pair wrapper draws the vertical spine between the two
                  // incoming lines (their centers sit at 25% / 75%).
                  if (!isLast && k % 2 === 0) {
                    const next = column.matches[k + 1]
                    return (
                      <div
                        key={`${column.round}-${k}`}
                        className="relative flex flex-1 flex-col justify-around gap-1"
                      >
                        {row}
                        <MatchRow
                          match={next}
                          byId={byId}
                          locale={locale}
                          hasLeftStub={c > 0}
                          hasRightStub={!isLast}
                        />
                        <div
                          className="vertical-connector pointer-events-none absolute bottom-1/4 right-0 top-1/4 w-px bg-base-300"
                          aria-hidden="true"
                        />
                      </div>
                    )
                  }
                  if (!isLast && k % 2 === 1) return null // rendered with the pair above
                  return (
                    <div key={`${column.round}-${k}`} className="flex flex-1 items-center">
                      {row}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {view.complete && (
          <div className="flex flex-col">
            <div className="mb-2 text-center text-xs font-semibold opacity-70">
              {t('tournament.view.bracket.champion')}
            </div>
            <div className="flex flex-1 items-center">
              <div className="h-px w-4 bg-success" aria-hidden="true" />
              <div className="w-40 rounded border border-success bg-base-100 px-2 py-1.5 text-xs font-semibold text-success">
                {playerName(
                  byId.get(view.rounds[view.rounds.length - 1].matches[0].winner ?? 0),
                  locale,
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MatchRow({
  match,
  byId,
  locale,
  hasLeftStub,
  hasRightStub,
}: {
  match: { a: number | null; b: number | null; winner: number | null; bye: boolean }
  byId: Map<number, Participant>
  locale: SupportedLocale
  hasLeftStub: boolean
  hasRightStub: boolean
}) {
  return (
    <div className="flex items-center">
      {hasLeftStub && <div className="horizontal-connector h-px w-4 shrink-0 bg-base-300" aria-hidden="true" />}
      {match.a == null && match.b == null ? (
        // Undetermined slot (the winners of earlier rounds are not known yet).
        <div className="w-40 rounded border border-dashed border-base-300 text-xs opacity-70">
          <div className="px-2 py-1.5">&nbsp;</div>
          <div className="px-2 py-1.5">&nbsp;</div>
        </div>
      ) : (
        // Classic vertical match block: the two opponents stacked, the
        // winner row highlighted; the connector leaves the block center.
        <div className="w-40 divide-y divide-base-300 rounded border border-base-300 bg-base-100 text-xs">
          <PlayerRow id={match.a} byId={byId} locale={locale} winner={match.winner} />
          {!match.bye && match.b != null ? (
            <PlayerRow id={match.b} byId={byId} locale={locale} winner={match.winner} />
          ) : (
            <div className="px-2 py-1.5">&nbsp;</div>
          )}
        </div>
      )}
      {hasRightStub && (
        <div className="min-w-6 flex-1">
          <div className="h-px w-full bg-base-300" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
function PlayerRow({
  id,
  byId,
  locale,
  winner,
}: {
  id: number | null
  byId: Map<number, Participant>
  locale: SupportedLocale
  winner: number | null
}) {
  const isWinner = winner != null && winner === id
  return (
    <div
      className={[
        'px-2 py-1.5 whitespace-nowrap overflow-hidden text-ellipsis',
        isWinner ? 'font-semibold text-success' : 'opacity-80',
      ].join(' ')}
    >
      {id == null ? '—' : playerName(byId.get(id), locale)}
    </div>
  )
}

function playerName(participant: Participant | undefined, locale: SupportedLocale): string {
  const loc = participant?.locales[locale] ?? participant?.locales.ru ?? participant?.locales.en
  if (!loc) return '—'
  return `${loc.familyName}, ${loc.givenName}`
}

