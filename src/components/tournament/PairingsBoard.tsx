import { useMemo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type CollisionDetection,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PlayerCard } from '../player/PlayerCard.tsx'
import type { Game, Participant } from '../../domain/tournament.ts'
import type { ParticipantRow } from '../../hooks/useTournamentForm.ts'
import {
  containersFromGames,
  withParticipantDropped,
  withResultCycled,
  withForfeit,
  participantToPlayerLike,
  resultToSymbol,
} from './pairings/pairingsModel.ts'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PairingsBoardProps {
  games: Game[]
  participants: Participant[] | ParticipantRow[]
  round: number
  currentRound: number
  considerSente: boolean
  locale: string
  onGamesChange: (games: Game[]) => void
}

// ---------------------------------------------------------------------------
// Sortable card — draggable card inside any container
// ---------------------------------------------------------------------------

function SortableCard({
  participantId,
  participants,
  locale,
  isForfeit,
  isDraggable,
  onToggleForfeit,
  forfeitTooltip,
}: {
  participantId: number
  participants: Map<number, { participant: Participant; points?: number }>
  locale: string
  isForfeit: boolean
  isDraggable: boolean
  onToggleForfeit: (checked: boolean) => void
  forfeitTooltip: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `p-${participantId}` })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.25 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  }

  const entry = participants.get(participantId)
  if (!entry) return null
  const player = participantToPlayerLike(entry.participant, locale)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isDraggable ? listeners : {})}
      className={`rounded-lg border px-3 py-2 select-none ${
        isForfeit
          ? 'border-warning bg-warning/10 opacity-60'
          : 'border-base-300 bg-base-100'
      } ${isDraggable ? 'cursor-grab touch-none' : 'cursor-default'}`}
    >
      <PlayerCard
        player={player}
        locale={locale}
        points={entry.points}
        showToggle
        toggleChecked={!isForfeit}
        onToggleChange={onToggleForfeit}
        toggleTooltip={forfeitTooltip}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drag overlay card
// ---------------------------------------------------------------------------

function DragOverlayCard({
  participantId,
  participants,
  locale,
}: {
  participantId: number
  participants: Map<number, { participant: Participant; points?: number }>
  locale: string
}) {
  const entry = participants.get(participantId)
  if (!entry) return null
  const player = participantToPlayerLike(entry.participant, locale)
  return (
    <div className="rounded-lg border border-primary bg-primary/10 px-3 py-2 shadow-2xl w-64">
      <PlayerCard player={player} locale={locale} points={entry.points} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableContainer — useDroppable OUTSIDE, SortableContext INSIDE
// This is the correct pattern from @dnd-kit Multiple Containers example.
// useDroppable and SortableContext must be on SEPARATE DOM nodes.
// ---------------------------------------------------------------------------

function SortableContainer({
  id,
  items,
  children,
  className,
}: {
  id: string
  items: string[]
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Participant data helpers
// ---------------------------------------------------------------------------

function useParticipantData(participants: Participant[] | ParticipantRow[], locale: string) {
  const participantsMap = useMemo(() => {
    const map = new Map<number, { participant: Participant; points?: number }>()
    for (const p of participants) {
      if ('rowId' in p) {
        map.set(p.id, {
          participant: {
            id: p.id,
            player: p.player,
            locales: p.locales as unknown as Participant['locales'],
            nationality: p.nationality || undefined,
            residence: p.residence || undefined,
            capturedRating: {
              value: p.ratingValue ? Number(p.ratingValue) : null,
              rank: p.rank,
            },
            startingPoints: 0,
          },
          points: 0,
        })
      } else {
        map.set(p.id, { participant: p, points: p.startingPoints })
      }
    }
    return map
  }, [participants, locale])

  const participantArray = useMemo((): Participant[] => {
    if (participants.length === 0) return []
    if ('rowId' in participants[0]) {
      return (participants as ParticipantRow[]).map((p) => ({
        id: p.id,
        player: p.player,
        locales: p.locales as unknown as Participant['locales'],
        nationality: p.nationality || undefined,
        residence: p.residence || undefined,
        capturedRating: {
          value: p.ratingValue ? Number(p.ratingValue) : null,
          rank: p.rank,
        },
        startingPoints: 0,
      }))
    }
    return participants as Participant[]
  }, [participants])

  return { participantsMap, participantArray }
}

// ---------------------------------------------------------------------------
// PairingsBoard
// ---------------------------------------------------------------------------

export function PairingsBoard({
  games,
  participants,
  round,
  currentRound,
  considerSente,
  locale,
  onGamesChange,
}: PairingsBoardProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Ensure round/currentRound are valid numbers
  const safeRound = Number.isFinite(round) ? round : 1
  const safeCurrentRound = Number.isFinite(currentRound) ? currentRound : 0
  const isPublished = safeRound <= safeCurrentRound

  const { participantsMap, participantArray } = useParticipantData(participants, locale)

  const containers = useMemo(
    () => containersFromGames(games, participantArray, safeRound),
    [games, participantArray, safeRound]
  )

  const forfeitIds = useMemo(() => {
    const ids = new Set<number>()
    for (const g of games) {
      if (g.round === safeRound && g.status === 'forfeit') ids.add(g.player1)
    }
    return ids
  }, [games, safeRound])

  // Sortable id arrays per container
  const unpairedItems = useMemo(
    () => containers.unpaired.map((id) => `p-${id}`),
    [containers.unpaired]
  )

  const rowItems = useMemo(() => {
    return containers.games.map((_, i) => {
      const p1 = containers.players1[i]
      const p2 = containers.players2[i]
      return {
        p1Items: p1 != null ? [`p-${p1}`] : [],
        p2Items: p2 != null ? [`p-${p2}`] : [],
      }
    })
  }, [containers])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  )

  // Custom collision detection: try pointerWithin first, filter active element
  const collisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    const filtered = pointerCollisions.filter((c) => c.id !== args.active.id)
    if (filtered.length > 0) return filtered

    const rectCollisions = rectIntersection(args)
    const filteredRect = rectCollisions.filter((c) => c.id !== args.active.id)
    if (filteredRect.length > 0) return filteredRect

    const cornerCollisions = closestCorners(args)
    return cornerCollisions.filter((c) => c.id !== args.active.id)
  }, [])

  const handleDragStart = useCallback(
    (event: DragStartEvent) => setActiveId(event.active.id as string),
    []
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over || isPublished) return

      const activeStr = active.id as string
      const overId = over.id as string

      const participantId = Number(activeStr.replace('p-', ''))
      if (isNaN(participantId)) return

      if (activeStr === overId) return

      let targetContainer: 'unpaired' | 'players1' | 'players2'
      let targetIndex: number

      if (overId === 'unpaired') {
        targetContainer = 'unpaired'
        targetIndex = containers.unpaired.length
      } else if (overId.startsWith('p1-row-')) {
        targetContainer = 'players1'
        targetIndex = parseInt(overId.replace('p1-row-', ''), 10)
      } else if (overId.startsWith('p2-row-')) {
        targetContainer = 'players2'
        targetIndex = parseInt(overId.replace('p2-row-', ''), 10)
      } else if (overId.startsWith('p-')) {
        const overPid = Number(overId.replace('p-', ''))
        let idx = containers.unpaired.indexOf(overPid)
        if (idx !== -1) {
          targetContainer = 'unpaired'
          targetIndex = idx
        } else if ((idx = containers.players1.indexOf(overPid)) !== -1) {
          targetContainer = 'players1'
          targetIndex = idx
        } else if ((idx = containers.players2.indexOf(overPid)) !== -1) {
          targetContainer = 'players2'
          targetIndex = idx
        } else {
          return
        }
      } else {
        return
      }

      const newGames = withParticipantDropped(
        games,
        participantArray,
        safeRound,
        participantId,
        targetContainer,
        targetIndex,
        considerSente
      )
      onGamesChange(newGames)
    },
    [games, containers, participantArray, safeRound, considerSente, onGamesChange, isPublished]
  )

  const handleResultCycle = useCallback(
    (gameId: string) => {
      if (safeRound !== safeCurrentRound) return
      onGamesChange(withResultCycled(games, gameId))
    },
    [games, onGamesChange, safeRound, safeCurrentRound]
  )

  const handleForfeitToggle = useCallback(
    (participantId: number, checked: boolean) => {
      if (isPublished) return
      onGamesChange(withForfeit(games, safeRound, participantId, !checked, considerSente))
    },
    [games, safeRound, considerSente, onGamesChange, isPublished]
  )

  const activeParticipantId = activeId?.startsWith('p-')
    ? Number(activeId.replace('p-', ''))
    : null

  const forfeitTooltip = t('tournament.edit.pairings.forfeit')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* --- pairing rows --- */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-2">
        <div className="text-xs font-semibold opacity-60 text-center pb-1">1</div>
        <div className="w-10" />
        <div className="text-xs font-semibold opacity-60 text-center pb-1">2</div>

        {containers.games.length > 0 ? (
          containers.games.map((game, i) => {
            const p1Id = containers.players1[i]
            const p2Id = containers.players2[i]
            const hasResult = game.result != null
            const resultDisabled = safeRound !== safeCurrentRound

            return (
              <Row
                key={game.id}
                game={game}
                p1Id={p1Id}
                p2Id={p2Id}
                rowIndex={i}
                hasResult={hasResult}
                resultDisabled={resultDisabled}
                isPublished={isPublished}
                forfeitIds={forfeitIds}
                participantsMap={participantsMap}
                locale={locale}
                forfeitTooltip={forfeitTooltip}
                onResultCycle={handleResultCycle}
                onForfeitToggle={handleForfeitToggle}
                p1Items={rowItems[i]?.p1Items ?? []}
                p2Items={rowItems[i]?.p2Items ?? []}
              />
            )
          })
        ) : !isPublished ? (
          <EmptyRow />
        ) : (
          <div className="col-span-3 text-sm opacity-50 py-4 text-center">—</div>
        )}
      </div>

      {/* --- unpaired container --- */}
      <div className="mt-4">
        <div className="text-xs font-semibold opacity-60 mb-2">
          {t('tournament.edit.pairings.unpaired')}
        </div>
        <SortableContainer
          id="unpaired"
          items={unpairedItems}
          className="min-h-[3rem] rounded-lg border border-dashed border-base-300 p-2 space-y-2"
        >
          {containers.unpaired.map((pid) => (
            <SortableCard
              key={pid}
              participantId={pid}
              participants={participantsMap}
              locale={locale}
              isForfeit={forfeitIds.has(pid)}
              isDraggable={!isPublished}
              onToggleForfeit={(checked) => handleForfeitToggle(pid, checked)}
              forfeitTooltip={forfeitTooltip}
            />
          ))}
          {containers.unpaired.length === 0 && (
            <div className="text-xs opacity-40 text-center py-4 select-none">
              {t('tournament.edit.pairings.allPaired')}
            </div>
          )}
        </SortableContainer>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeParticipantId != null ? (
          <DragOverlayCard
            participantId={activeParticipantId}
            participants={participantsMap}
            locale={locale}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

// ---------------------------------------------------------------------------
// Single pairing row
// ---------------------------------------------------------------------------

function Row({
  game,
  p1Id,
  p2Id,
  rowIndex,
  hasResult,
  resultDisabled,
  isPublished,
  forfeitIds,
  participantsMap,
  locale,
  forfeitTooltip,
  onResultCycle,
  onForfeitToggle,
  p1Items,
  p2Items,
}: {
  game: Game
  p1Id: number | null
  p2Id: number | null
  rowIndex: number
  hasResult: boolean
  resultDisabled: boolean
  isPublished: boolean
  forfeitIds: Set<number>
  participantsMap: Map<number, { participant: Participant; points?: number }>
  locale: string
  forfeitTooltip: string
  onResultCycle: (gameId: string) => void
  onForfeitToggle: (participantId: number, checked: boolean) => void
  p1Items: string[]
  p2Items: string[]
}) {
  return (
    <>
      {/* players1 slot */}
      <SortableContainer
        id={`p1-row-${rowIndex}`}
        items={p1Items}
        className="min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center"
      >
        {p1Id != null ? (
          <SortableCard
            participantId={p1Id}
            participants={participantsMap}
            locale={locale}
            isForfeit={forfeitIds.has(p1Id)}
            isDraggable={!isPublished && !hasResult}
            onToggleForfeit={(checked) => onForfeitToggle(p1Id, checked)}
            forfeitTooltip={forfeitTooltip}
          />
        ) : (
          <span className="text-xs opacity-40 select-none">-</span>
        )}
      </SortableContainer>

      {/* result button */}
      <div className="w-10 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onResultCycle(game.id)}
          disabled={resultDisabled}
          className={`btn btn-xs btn-circle ${hasResult ? 'btn-primary' : 'btn-ghost'}`}
          title={resultToSymbol(game.result)}
        >
          {resultToSymbol(game.result)}
        </button>
      </div>

      {/* players2 slot */}
      <SortableContainer
        id={`p2-row-${rowIndex}`}
        items={p2Items}
        className="min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center"
      >
        {p2Id != null ? (
          <SortableCard
            participantId={p2Id}
            participants={participantsMap}
            locale={locale}
            isForfeit={forfeitIds.has(p2Id)}
            isDraggable={!isPublished && !hasResult}
            onToggleForfeit={(checked) => onForfeitToggle(p2Id, checked)}
            forfeitTooltip={forfeitTooltip}
          />
        ) : (
          <span className="text-xs opacity-40 select-none">-</span>
        )}
      </SortableContainer>
    </>
  )
}

// ---------------------------------------------------------------------------
// Empty placeholder row
// ---------------------------------------------------------------------------

function EmptyRow() {
  const { t } = useTranslation()
  return (
    <>
      <SortableContainer
        id="p1-row-0"
        items={[]}
        className="min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center text-xs opacity-40"
      >
        <span className="select-none">{t('tournament.edit.pairings.dropHere')}</span>
      </SortableContainer>
      <div className="w-10" />
      <SortableContainer
        id="p2-row-0"
        items={[]}
        className="min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center text-xs opacity-40"
      >
        <span className="select-none">{t('tournament.edit.pairings.dropHere')}</span>
      </SortableContainer>
    </>
  )
}