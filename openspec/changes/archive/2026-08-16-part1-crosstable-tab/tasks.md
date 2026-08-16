## 1. Crosstable model (pure functions)

- [x] 1.1 Create `src/components/tournament/crosstable/crosstableModel.ts` with `rankToColor(rank: PlayerRank): string` implementing the 6 rank-range colors (20k-10k, 9k-7k, 6k-4k, 3k-1k, 1d-3d, 4d-9d) per spec.
- [x] 1.2 Implement `computeStandings(games, participants, tieBreaks, upToRound): StandingRow[]` with `StandingRow = { participantId, place, points, tieBreakValues, games }`. Internal per-participant points via existing `calculateParticipantPoints` from `pairingsModel.ts` (include startingPoints). Two-pass: points/BH-family/SB/W first, then DE (direct encounter against equal-points opponents).
- [x] 1.3 Implement tie-break calculators with spec definitions: BH (Σ opponents' points), BHC (BH − N lowest, N=cutCount clamped), BHM (BH − highest − lowest, <2 opponents → BH), BH+ (Σ (opp points + own result points)), SB (Σ defeated opp points + 0.5 × Σ drawn opp points), W (wins incl. byes). Bye games contribute no opponent; forfeit opponent points contribute 0.
- [x] 1.4 Implement descending multi-key sort by `tieBreaks` chain order with stable fallback by participant id; assign 1-based `place`.

## 2. Country name helper

- [x] 2.1 Add `getCountryName(code: string, lang: string): string` to `src/utils/countries.ts` wrapping `i18n-iso-countries.getName(code, lang)` with graceful fallback to the code itself.

## 3. CrosstableSection component

- [x] 3.1 Create `src/components/tournament/CrosstableSection.tsx` with props `{ games, participants: ParticipantRow[], roundCount, considerSente, tieBreaks, updateStartingPoints }`. Locale from `i18n.language`. Derive standings via `computeStandings` (memoized) and `standingByParticipantId` place map.
- [x] 3.2 Render scroll container (`overflow-auto max-h-[70vh]`) + `<table className="table table-xs">`. Sticky header row (`sticky top-0 z-20 bg-base-100`) and sticky first 4 columns (№ / flag / rank badge / name — `sticky left-* z-10 bg-base-100`, header corner cells `z-30`). Name column fixed width with truncation.
- [x] 3.3 Render identity columns: row number (place), nationality flag (`country-flag-icons/react/3x2`, tooltip = `getCountryName`), rank badge (white text on `rankToColor`, `PiCrownSimple` + title tooltip when `locales[locale].title` non-empty, no badge when rank null), `<FamilyName, GivenName>` in global locale, residence cell (location + residence flag with tooltip when residence ≠ nationality, as in `PlayerCard`), rating `ratingValue`.
- [x] 3.4 Render round columns 1..roundCount: per-cell button per spec — `☗`/`☖` (only when considerSente, sente = player1) + opponent place number + `+`/`-`/`=` colored `text-success`/`text-error`/default + `bg-base-200` handicap badge when `handicap != null`; bye → `+` only; forfeit → `-` only; no game → `-` placeholder span.
- [x] 3.5 Render SP column: `input input-xs` bound to `startingPoints`, tooltip header with full localized description, onChange → `updateStartingPoints(id, value)`.
- [x] 3.6 Render tie-break columns for ALL `tieBreaks` in order: header = abbreviation (BH/BHC/BHM/BH+/SB/DE/W) with `tournament.tieBreak.<type>` tooltip; `points` column header = localized «Очки»/«Pts» without tooltip; cells = values from `tieBreakValues`.

## 4. Tab integration

- [x] 4.1 In `TournamentEditForm.tsx`: extend `TabId` with `'crosstable'`, add tab entry with `BsGrid3X2` icon and `t('tournament.edit.tabs.crosstable')` after pairings; render `<CrosstableSection>` with `formState.games`, `formState.participants`, round count from `scheduleRows`, `formState.settings.considerSente`, `formState.settings.tieBreaks`, `updateStartingPoints`.

## 5. i18n

- [x] 5.1 Add keys to `src/locales/ru/translation.json`: `tournament.edit.tabs.crosstable` = "Таблица"; `tournament.edit.crosstable.*`: `name` = "Имя", `residence` = "Город", `rating` = "Рейтинг", `sp` = "СО", `spTooltip` = full description, `points` = "Очки".
- [x] 5.2 Add keys to `src/locales/en/translation.json`: `tournament.edit.tabs.crosstable` = "Crosstable"; `tournament.edit.crosstable.*`: `name` = "Name", `residence` = "Residence", `rating` = "Rating", `sp` = "SP", `spTooltip` = full description, `points` = "Pts".

## 6. Unit tests

- [x] 6.1 Create `src/test/crosstableModel.test.ts`: `rankToColor` — one representative rank per range (6) + null handling at component level.
- [x] 6.2 Tests for each tie-break calculator: points (win/draw/bye/forfeit/starting points), BH (Σ opponents' cumulative points, bye/forfeit excluded), BHC (cut lowest N, clamp), BHM (median), BH+ (opp points + own result), SB (wins + 0.5·draws contributions), W (wins incl. bye).
- [x] 6.3 Tests for `computeStandings` sorting: by points, then by second tie-break in chain; opponent place numbers derived from sorted positions; DE between equal-points participants.
