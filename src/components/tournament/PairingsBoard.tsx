import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
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
  calculateParticipantPoints,
  sortRoundGamesByPairStrength,
  withPlayersSwapped,
  withHandicapCycled,
  withHandicapReset,
  withAutoForfeits,
  handicapToSymbol,
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
  updateStartingPoints?: (participantId: number, value: number) => void
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
  cumulativePoints,
  startingPoints,
  onStartingPointsChange,
  forfeitToggleDisabled,
}: {
  participantId: number
  participants: Map<number, { participant: Participant; points?: number }>
  locale: string
  isForfeit: boolean
  isDraggable: boolean
  onToggleForfeit: (checked: boolean) => void
  forfeitTooltip: string
  cumulativePoints?: number
  startingPoints?: number
  onStartingPointsChange?: (value: number) => void
  forfeitToggleDisabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `p-${participantId}` })

  // Guard dnd-kit listeners so that keyboard/pointer events originating from
  // interactive controls inside the card (startingPoints input, forfeit toggle)
  // never activate a drag: pressing Enter in the input used to bubble up to the
  // KeyboardSensor activator on the card node and spawn a DragOverlay that
  // blocked the UI until Escape.
  const guardedListeners = useMemo(() => {
    if (!listeners) return undefined
    const guard =
      (handler: (event: unknown) => void) =>
      (event: unknown) => {
        const target = (event as { target?: EventTarget | null }).target
        if (target instanceof Element && target.closest('input, button, select, textarea, label')) {
          return
        }
        handler(event)
      }
    const wrapped = { ...listeners } as Record<string, (event: unknown) => void>
    if (wrapped.onKeyDown) wrapped.onKeyDown = guard(wrapped.onKeyDown)
    if (wrapped.onPointerDown) wrapped.onPointerDown = guard(wrapped.onPointerDown)
    return wrapped
  }, [listeners])

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
      {...(isDraggable ? guardedListeners ?? {} : {})}
      className={`rounded-lg border px-3 py-1 select-none w-full truncate ${
        isForfeit
          ? 'border-warning bg-warning/10 opacity-60'
          : 'border-base-300 bg-base-100'
      } ${isDraggable ? 'cursor-grab touch-none' : 'cursor-default'}`}
    >
      <PlayerCard
        player={player}
        locale={locale}
        points={cumulativePoints ?? entry.points}
        startingPoints={startingPoints}
        onStartingPointsChange={onStartingPointsChange}
        toggleChecked={!isForfeit}
        onToggleChange={onToggleForfeit}
        toggleTooltip={forfeitTooltip}
        toggleDisabled={forfeitToggleDisabled}
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
    <div className="rounded-lg border border-primary bg-primary/10 px-3 py-1 shadow-2xl w-64">
      <PlayerCard player={player} locale={locale} points={entry.points} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// SortableContainer — useDroppable OUTSIDE, SortableContext INSIDE
// Used ONLY for the unpaired container (allows sorting within).
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
// DropZone — useDroppable only, no SortableContext.
// Used for pairing rows (p1-row-N, p2-row-N) to prevent @dnd-kit from
// reordering cards within individual columns independently.
// ---------------------------------------------------------------------------

function DropZone({
  id,
  children,
  className,
}: {
  id: string
  children: React.ReactNode
  className?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ''} ${isOver ? 'ring-2 ring-primary ring-inset' : ''}`}
    >
      {children}
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
  updateStartingPoints,
}: PairingsBoardProps) {
  const { t } = useTranslation()
  const [activeId, setActiveId] = useState<string | null>(null)

  // Ensure round/currentRound are valid numbers
  const safeRound = Number.isFinite(round) ? round : 1
  const safeCurrentRound = Number.isFinite(currentRound) ? currentRound : 0
  const isPastRound = safeRound < safeCurrentRound
  const { participantsMap, participantArray } = useParticipantData(participants, locale)

  // Auto-forfeit effect: when viewing a past round, create forfeits for unpaired participants
  useEffect(() => {
    if (safeRound >= safeCurrentRound || safeCurrentRound === 0) return
    const withForfeits = withAutoForfeits(games, participantArray, safeRound, safeCurrentRound, considerSente)
    if (withForfeits !== games) {
      onGamesChange(withForfeits)
    }
  }, [games, participantArray, safeRound, safeCurrentRound, considerSente, onGamesChange])

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

  // Defensive: make sure a stuck overlay can always be dismissed (e.g. Escape
  // during a keyboard drag).
  const handleDragCancel = useCallback(() => setActiveId(null), [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

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

      // Detect swap: participant is in opposite column at same row index
      const activeInP1 = containers.players1.indexOf(participantId)
      const activeInP2 = containers.players2.indexOf(participantId)
      const isSwap =
        (targetContainer === 'players2' && activeInP1 === targetIndex) ||
        (targetContainer === 'players1' && activeInP2 === targetIndex)

      if (isSwap) {
        const targetGame = containers.games[targetIndex]
        if (targetGame) {
          onGamesChange(sortRoundGamesByPairStrength(withPlayersSwapped(games, targetGame.id), participantArray, safeRound))
        }
        return
      }

      const newGames = withParticipantDropped(
        games,
        participantArray,
        safeRound,
        participantId,
        targetContainer,
        targetIndex,
        considerSente,
        safeCurrentRound,
      )
      onGamesChange(sortRoundGamesByPairStrength(newGames, participantArray, safeRound))
    },
    [games, containers, participantArray, safeRound, safeCurrentRound, considerSente, onGamesChange]
  )

  const handleResultCycle = useCallback(
    (gameId: string, direction: 1 | -1 = 1) => {
      onGamesChange(withResultCycled(games, gameId, direction, safeCurrentRound))
    },
    [games, onGamesChange, safeCurrentRound]
  )

  const handleForfeitToggle = useCallback(
    (participantId: number, checked: boolean) => {
      onGamesChange(withForfeit(games, safeRound, participantId, !checked, considerSente))
    },
    [games, safeRound, considerSente, onGamesChange]
  )

  const handleHandicapCycle = useCallback(
    (gameId: string, direction: 1 | -1 = 1) => {
      onGamesChange(withHandicapCycled(games, gameId, direction))
    },
    [games, onGamesChange]
  )

  const handleHandicapReset = useCallback(
    (gameId: string) => {
      onGamesChange(withHandicapReset(games, gameId))
    },
    [games, onGamesChange]
  )

  const activeParticipantId = activeId?.startsWith('p-')
    ? Number(activeId.replace('p-', ''))
    : null

  // Build a map of startingPoints per participant id
  const startingPointsMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of participants) {
      if ('rowId' in p) {
        map.set(p.id, (p as ParticipantRow).startingPoints ?? 0)
      } else {
        map.set(p.id, (p as Participant).startingPoints ?? 0)
      }
    }
    return map
  }, [participants])

  // Cumulative points per participant for this round
  const pointsMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const pid of startingPointsMap.keys()) {
      const sp = startingPointsMap.get(pid) ?? 0
      map.set(pid, calculateParticipantPoints(games, pid, safeRound, sp))
    }
    return map
  }, [games, safeRound, startingPointsMap])

  const forfeitTooltip = t('tournament.edit.pairings.forfeit')

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >

      <div className='grid grid-cols-1 md:grid-cols-2 md:grid-cols-[30%_70%] gap-1'>
        {/* --- unpaired container --- */}
        <div className="order-2 md:order-1 mb-4">
          <h3 className="mb-2 text-lg">
            {t('tournament.edit.pairings.unpaired')}
          </h3>
          <SortableContainer
            id="unpaired"
            items={unpairedItems}
            className="min-h-[3rem] rounded-lg border border-dashed border-base-300 p-1 space-y-1"
          >
            {containers.unpaired.map((pid) => (
              <SortableCard
                key={pid}
                participantId={pid}
                participants={participantsMap}
                locale={locale}
                isForfeit={forfeitIds.has(pid)}
                isDraggable={true}
                onToggleForfeit={(checked) => handleForfeitToggle(pid, checked)}
                forfeitTooltip={forfeitTooltip}
                cumulativePoints={pointsMap.get(pid)}
                startingPoints={startingPointsMap.get(pid)}
                onStartingPointsChange={updateStartingPoints ? (v) => updateStartingPoints(pid, v) : undefined}
                forfeitToggleDisabled={isPastRound}
              />
            ))}
            {containers.unpaired.length === 0 && (
              <div className="text-xs opacity-40 text-center py-4 select-none">
                {t('tournament.edit.pairings.allPaired')}
              </div>
            )}
          </SortableContainer>
        </div>
        {/* --- pairing rows --- */}
        <div className="order-1 md:order-2 items-start mb-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <h3 className="text-center text-lg">☗</h3>
            <div className="w-10" />
            <h3 className="text-center text-lg">☖</h3>

            {(() => {
              const gameRows = containers.games.length
              const placedParticipants =
                containers.players1.filter((x) => x != null).length +
                containers.players2.filter((x) => x != null).length
              const totalParticipants = placedParticipants + containers.unpaired.length
              const neededRows = Math.ceil(totalParticipants / 2)
              const extraRows = Math.max(1, neededRows - gameRows)

              return (
                <>
                  {gameRows > 0 &&
                    containers.games.map((game, i) => {
                      const p1Id = containers.players1[i]
                      const p2Id = containers.players2[i]
                      const hasResult = game.result != null

                      return (
                        <Row
                          key={game.id}
                          game={game}
                          p1Id={p1Id}
                          p2Id={p2Id}
                          rowIndex={i}
                          hasResult={hasResult}
                          resultDisabled={game.status === 'forfeit'}
                          handicapDisabled={game.player2 == null}
                          forfeitIds={forfeitIds}
                          participantsMap={participantsMap}
                          locale={locale}
                          forfeitTooltip={forfeitTooltip}
                          onResultCycle={handleResultCycle}
                          onForfeitToggle={handleForfeitToggle}
                          onHandicapCycle={handleHandicapCycle}
                          onHandicapReset={handleHandicapReset}
                          pointsMap={pointsMap}
                          startingPointsMap={startingPointsMap}
                          updateStartingPoints={updateStartingPoints}
                        />
                      )
                    })
                  }
                  {Array.from({ length: extraRows }, (_, j) => (
                    <EmptyRow key={`extra-${j}`} rowIndex={gameRows + j} />
                  ))}
                </>
              )
            })()}
          </div>
        </div>
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
  handicapDisabled,
  forfeitIds,
  participantsMap,
  locale,
  forfeitTooltip,
  onResultCycle,
  onForfeitToggle,
  onHandicapCycle,
  onHandicapReset,
  pointsMap,
  startingPointsMap,
  updateStartingPoints,
}: {
  game: Game
  p1Id: number | null
  p2Id: number | null
  rowIndex: number
  hasResult: boolean
  resultDisabled: boolean
  handicapDisabled: boolean
  forfeitIds: Set<number>
  participantsMap: Map<number, { participant: Participant; points?: number }>
  locale: string
  forfeitTooltip: string
  onResultCycle: (gameId: string, direction?: 1 | -1) => void
  onForfeitToggle: (participantId: number, checked: boolean) => void
  onHandicapCycle: (gameId: string, direction?: 1 | -1) => void
  onHandicapReset: (gameId: string) => void
  pointsMap?: Map<number, number>
  startingPointsMap?: Map<number, number>
  updateStartingPoints?: (participantId: number, value: number) => void
}) {
  const { t } = useTranslation()
  const handicapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleResultContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    onResultCycle(game.id, -1)
  }, [game.id, onResultCycle])

  const handleHandicapClick = useCallback((e: React.MouseEvent) => {
    if (handicapTimerRef.current) {
      clearTimeout(handicapTimerRef.current)
      handicapTimerRef.current = null
    }
    // Double click: second click of the series (detail >= 2) resets immediately.
    // This is more reliable than onDoubleClick across browsers/environments.
    if (e.detail >= 2) {
      onHandicapReset(game.id)
      return
    }
    handicapTimerRef.current = setTimeout(() => {
      handicapTimerRef.current = null
      onHandicapCycle(game.id, 1)
    }, 250)
  }, [game.id, onHandicapCycle, onHandicapReset])

  const handleHandicapDoubleClick = useCallback(() => {
    if (handicapTimerRef.current) {
      clearTimeout(handicapTimerRef.current)
      handicapTimerRef.current = null
    }
    onHandicapReset(game.id)
  }, [game.id, onHandicapReset])

  const handleHandicapContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (handicapTimerRef.current) {
      clearTimeout(handicapTimerRef.current)
      handicapTimerRef.current = null
    }
    onHandicapCycle(game.id, -1)
  }, [game.id, onHandicapCycle])

  useEffect(() => {
    return () => {
      if (handicapTimerRef.current) clearTimeout(handicapTimerRef.current)
    }
  }, [])

  return (
    <>
      {/* players1 slot */}
      <DropZone
        id={`p1-row-${rowIndex}`}
        className="sente-card drop-zone-card min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center"
      >
        {p1Id != null ? (
          <SortableCard
            participantId={p1Id}
            participants={participantsMap}
            locale={locale}
            isForfeit={forfeitIds.has(p1Id)}
            isDraggable={true}
            onToggleForfeit={(checked) => onForfeitToggle(p1Id, checked)}
            forfeitTooltip={forfeitTooltip}
            cumulativePoints={pointsMap?.get(p1Id)}
            startingPoints={startingPointsMap?.get(p1Id)}
            onStartingPointsChange={updateStartingPoints ? (v) => updateStartingPoints(p1Id, v) : undefined}
          />
        ) : (
          <span className="text-xs opacity-40 select-none">{t('tournament.edit.pairings.dropHere')}</span>
        )}
      </DropZone>

      {/* result button */}
      <div className="w-10 flex flex-col gap-1 items-center justify-center">
        <button
          type="button"
          onClick={() => onResultCycle(game.id)}
          onContextMenu={handleResultContextMenu}
          disabled={resultDisabled}
          className={`btn btn-sm flex btn-circle relative z-1 ${hasResult ? 'btn-primary' : 'btn-neutral'}`}
          data-val={resultToSymbol(game.result)}
        >
          {resultToSymbol(game.result)}
        </button>
        <button
          type="button"
          onClick={handleHandicapClick}
          onDoubleClick={handleHandicapDoubleClick}
          onContextMenu={handleHandicapContextMenu}
          disabled={handicapDisabled}
          className={`btn btn-xs -mt-2.5 btn-circle flex ${game.handicap != null ? 'btn-warning' : ''}`}
        >
          <span className="tooltip tooltip-secondary z-10" data-tip={t('tournament.edit.pairings.handicap')}>
            {handicapToSymbol(game.handicap as string | null)}
          </span>
        </button>
      </div>

      {/* players2 slot */}
      <DropZone
        id={`p2-row-${rowIndex}`}
        className="gote-card drop-zone-card min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center"
      >
        {p2Id != null ? (
          <SortableCard
            participantId={p2Id}
            participants={participantsMap}
            locale={locale}
            isForfeit={forfeitIds.has(p2Id)}
            isDraggable={true}
            onToggleForfeit={(checked) => onForfeitToggle(p2Id, checked)}
            forfeitTooltip={forfeitTooltip}
            cumulativePoints={pointsMap?.get(p2Id)}
            startingPoints={startingPointsMap?.get(p2Id)}
            onStartingPointsChange={updateStartingPoints ? (v) => updateStartingPoints(p2Id, v) : undefined}
          />
        ) : (
          <span className="text-xs opacity-40 select-none">{t('tournament.edit.pairings.dropHere')}</span>
        )}
      </DropZone>
    </>
  )
}

// ---------------------------------------------------------------------------
// Empty placeholder row
// ---------------------------------------------------------------------------

function EmptyRow({ rowIndex }: { rowIndex: number }) {
  const { t } = useTranslation()
  return (
    <>
      <DropZone
        id={`p1-row-${rowIndex}`}
        className="min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center text-xs opacity-40"
      >
        <span className="select-none">{t('tournament.edit.pairings.dropHere')}</span>
      </DropZone>
      <div className="w-10" />
      <DropZone
        id={`p2-row-${rowIndex}`}
        className="min-h-[3rem] rounded border border-dashed border-base-300 flex items-center justify-center text-xs opacity-40"
      >
        <span className="select-none">&nbsp;</span>
      </DropZone>
    </>
  )
}