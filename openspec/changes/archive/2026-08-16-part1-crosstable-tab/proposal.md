## Why

The tournament edit form has a Pairings tab for round-by-round pairing management, but there is no way to see the overall tournament standings. Arbiters need a crosstable (tournament grid) that shows each participant, their per-round game results, starting points, and tie-break calculations — sorted by current tournament standing — to verify pairings and enter results with full context.

## What Changes

- Add a new "Таблица" / "Crosstable" tab (icon `BsGrid3X2`) to `TournamentEditForm.tsx`, rendered after the Pairings tab.
- The tab contains a single section without a heading: a crosstable grid with columns: row number (no header), nationality flag with country-name tooltip (no header), rank badge with rank-dependent background color and white text + optional title icon `PiCrownSimple` with title tooltip (no header), Name (localized header), Residence (localized header, residence flag when residence country differs from nationality — as in `PlayerCard`), Rating (localized header), one column per tournament round (header = round number), starting points `СО`/`SP` (localized header + full-description tooltip, editable input), and one column per tie-break from `settings.tieBreaks` (locale-independent abbreviations BH/BHC/BHM/BH+/SB/DE/W with localized tooltips; the `points` tie-break column header is localized "Очки"/"Pts" without tooltip).
- Each round cell renders a default button (no click action yet) containing, in one line: the player color symbol ☗/☖ (only when `settings.considerSente == true`), the opponent crosstable number and result symbol +/-/= (text color success for win, error for loss, default for draw), and a handicap badge (background base-200) when the game was played with handicap.
- Rows are sorted by current tournament standing: points, then the chain of tie-breaks configured in `settings.tieBreaks` (all tie-breaks are displayed, `isVisible` is ignored).
- The table scrolls inside its container; the header row and the first 4 columns (No., Flag, Rank, Name) are sticky.

## Capabilities

### New Capabilities

- `tournament-crosstable`: Crosstable grid rendering, per-round game cell presentation, rank badge coloring, tie-break computation and standings sorting for the tournament edit form.

### Modified Capabilities

(none — the new tab is additive; existing requirements are unchanged)

## Impact

- **New files:**
  - `src/components/tournament/crosstable/crosstableModel.ts` — pure functions: `rankToColor`, tie-break calculators (points/BH/BHC/BHM/BH+/SB/DE/W), `computeStandings`
  - `src/components/tournament/CrosstableSection.tsx` — the single section with the sticky-scrollable grid
  - `src/test/crosstableModel.test.ts` — unit tests
- **Modified files:**
  - `src/components/tournament/TournamentEditForm.tsx` — new tab `crosstable` (BsGrid3X2), renders `CrosstableSection`
  - `src/utils/countries.ts` — add `getCountryName(code, lang)` for flag tooltips
  - `src/locales/ru/translation.json`, `src/locales/en/translation.json` — keys under `tournament.edit.tabs.crosstable` and `tournament.edit.crosstable.*`
- **Dependencies:** none new (`country-flag-icons`, `react-icons/pi` already used)
