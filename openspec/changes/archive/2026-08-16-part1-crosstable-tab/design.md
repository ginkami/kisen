## Context

The tournament edit form has tabs: general, settings, schedule, participants, pairings. `formState` (from `useTournamentForm`) holds `participants: ParticipantRow[]`, `games: Game[]`, `settings.tieBreaks`, `settings.considerSente`, `scheduleRows`. `pairingsModel.ts` already has `calculateParticipantPoints(games, participantId, upToRound, startingPoints)` — points = startingPoints + wins + 0.5·draws + byes. No standings/tie-break computation exists yet. `PlayerCard` shows flags via `country-flag-icons/react/3x2`; country names are available via `i18n-iso-countries` (`src/utils/countries.ts`, currently only `getCountryList`).

## Goals / Non-Goals

**Goals:**
- New "Crosstable" tab with a single heading-less section showing the full tournament grid
- Rank badges with rank-range colors, titles, flags, per-round game cells, starting points input
- Pure tie-break calculators + standings sorting reused from `settings.tieBreaks`
- Sticky header row and sticky first 4 columns inside a scroll container

**Non-Goals:**
- No click actions on game cells (placeholder buttons only)
- No public-facing crosstable view (editor UI only)
- No Firestore schema/security-rule changes
- `isVisible` on tie-breaks is ignored — all configured tie-breaks are shown

## Decisions

### Decision 1: Pure model in `crosstableModel.ts`

`src/components/tournament/crosstable/crosstableModel.ts` with:
- `rankToColor(rank: PlayerRank): string` — kyu/dan range → oklch/hex constant (6 ranges, see spec); `null` rank renders no badge (component-level check)
- `computeStandings(games, participants, tieBreaks, upToRound): StandingRow[]` where `StandingRow = { participantId, place, points, tieBreakValues: Record<TieBreakType, number>, games: Game[] }`
- Internal opponent-points map: for each opponent, points = `calculateParticipantPoints(games, oppId, upToRound, opp.startingPoints)` (byes excluded in current round only where relevant — reuse existing semantics)

Tie-break formulas (points of opponent = their cumulative points incl. starting points; bye = win; forfeit = 0):
- `BH` = Σ opponents' points (only real opponents — bye/forfeit games have no opponent and contribute nothing)
- `BHC` = BH − N lowest opponents' points (N = `cutCount`, clamped to list length)
- `BHM` = BH − highest − lowest (lists with <2 opponents → just BH)
- `BH+` = Σ (opponent points + own result points in that game)
- `SB` = Σ points of defeated opponents + 0.5 × Σ points of drawn opponents
- `DE` = points scored in games against opponents currently on equal total points (computed after points known; may be 0)
- `W` = wins count including byes

Sorting: `tieBreaks.reduce` comparator chain, each descending; stable fallback by participant id.

### Decision 2: Round cell content derivation

For each participant × round find the game (`games.find(g => g.round === r && (g.player1 === id || g.player2 === id))`):
- `status === 'bye'` → `+` only
- `status === 'forfeit'` → `-` only
- regular game → `☗`/`☖` (only if `considerSente`; sente = participant is `player1`) + opponent place number + `+`/`-`/`=` (colored `text-success`/`text-error`/default) + optional `bg-base-200` handicap badge
- no game → `-` placeholder span

Opponent place number comes from `standingByParticipantId` map built from `computeStandings` output.

### Decision 3: Sticky implementation via CSS

Container: `<div className="overflow-auto max-h-[70vh]">` wrapping `<table className="table table-xs">`.
- Header: `<thead><tr><th className="sticky top-0 z-20 bg-base-100">…`
- First 4 columns (`th`/`td`): `sticky left-0/left-[28px]/left-[64px]/left-[112px] z-10 bg-base-100` — exact offsets tuned to actual column widths; header cells of these columns get `z-30` (both top and left sticky).
Opaque `bg-base-100` prevents see-through while scrolling. Tailwind arbitrary values keep it in-class.

### Decision 4: `CrosstableSection` props and rendering

```tsx
interface CrosstableSectionProps {
  games: Game[]
  participants: ParticipantRow[]
  roundCount: number
  considerSente: boolean
  tieBreaks: TieBreak[]
  updateStartingPoints: (participantId: number, value: number) => void
}
```
Locale from `useTranslation()` → `i18n.language` (global, same decision as Pairings). Country names via new `getCountryName(code, lang)` helper wrapping `i18n-iso-countries.getName`. Rank badge: `<span className="badge badge-xs text-white" style={{ backgroundColor: rankToColor(rank) }}>` + `PiCrownSimple` tooltip when title exists. SP input reuses the `input input-xs w-14` pattern from `PlayerCard`.

### Decision 5: Abbreviation map for tie-break headers

```ts
const TIEBREAK_ABBR: Record<TieBreakType, string> = {
  points: 't:points', // localized «Очки»/«Pts», no tooltip
  buchholz: 'BH', buchholz_cut: 'BHC', buchholz_median: 'BHM',
  buchholz_plus: 'BH+', sonneborn_berger: 'SB',
  direct_encounter: 'DE', wins_count: 'W',
}
```
Tooltips for non-points columns = existing `tournament.tieBreak.<type>` translations.

## Risks / Trade-offs

- **DE is order-dependent**: direct encounter needs all participants' points first → computed in a second pass inside `computeStandings`; may be 0 for most participants (acceptable, standard behavior).
- **Sticky column offsets are pixel-fixed**: with long names the name column has fixed width (`max-w` + truncate) so offsets stay stable; if fonts change, offsets need retuning.
- **`buchholz_cut` cutCount > opponents count**: clamp N to the number of real opponents (result = BH of remaining, ≥ 0).
