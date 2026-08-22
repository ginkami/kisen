## Why

Tie-break column headers in the crosstable are hardcoded Latin abbreviations (`TIEBREAK_ABBR` in `crosstableModel.ts`): they do not depend on the UI locale, contradict the tie-breaks dictionary `schemas/tieBreaks.jsonс` (code has BHC/BHM/W, dictionary defines BHC1/MCH/WIN plus Russian «Бухг.»/«УБ»/«МБ»/«ЛВ»/«ЧВ»), and the dictionary already declares a new tournament-specific coefficient «СЛ Баллы» (`sl_points`) that has no implementation in the domain schema or the standings model.

## What Changes

- Tie-break abbreviations become locale-dependent: new nested i18n keys `tournament.tieBreak.abbr.<type>` in `src/locales/{ru,en}/translation.json` with values taken from `schemas/tieBreaks.jsonс`; the crosstable column headers render via i18n (with a `cutCount` suffix appended for `buchholz_cut` entries, e.g. «УБ1» / «BHC1»); the hardcoded `TIEBREAK_ABBR` export is removed from `crosstableModel.ts` and its tests.
- New tie-break type `sl_points` («СЛ Баллы» / "SL Points"): added to the domain schema (`tieBreakTypeSchema`, `tieBreakSchema` in `src/domain/tieBreak.ts`), mirrored in the documentation schema `schemas/tieBreak.ts`, and selectable in the tournament Settings tab automatically (the dropdown is driven by `tieBreakTypeSchema.options`).
- SL Points calculation in `computeStandings` (`crosstableModel.ts`): (1) based only on scored points; (2) participants are grouped and sorted by points descending into score groups; (3) each score group is identified by the position of its last (lowest-ranked) member in the overall points-sorted list (the cumulative count of participants with points >= the group points); (4) every member of a score group receives the same SL Points value determined by that position; (5) position→value mapping: 1→55, 2→34, 3→21, 4→13, 5→8, 6→5, 7→3, 8→2, 9 and beyond→1.
- Full tie-break names in tooltips/badges stay on `tournament.tieBreak.<type>` keys (ru names aligned with the dictionary: «Бухгольц усеченный», «Бергер», «Число побед», «СЛ Баллы»).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `tournament-crosstable`: tie-break column headers become locale-dependent abbreviations from `tournament.tieBreak.abbr.<type>` (with `cutCount` suffix for `buchholz_cut`) instead of locale-independent Latin abbreviations; the tie-break computation requirement gains the SL Points (`sl_points`) definition with the score-group/position mapping.

## Impact

- `src/domain/tieBreak.ts` — add `sl_points` to `tieBreakTypeSchema` enum and `tieBreakSchema` discriminated union (no migration: `tieBreaks` is an optional array element, old documents keep parsing).
- `schemas/tieBreak.ts` — documentation mirror: add `sl_points` to `TieBreakType`.
- `src/components/tournament/crosstable/crosstableModel.ts` — remove `TIEBREAK_ABBR`; add SL Points constant + score-group calculator; extend `tieBreakValues` initialization and the `computeStandings` switch.
- `src/components/tournament/CrosstableSection.tsx` — render headers via `t('tournament.tieBreak.abbr.<type>')`, drop `TIEBREAK_ABBR` import.
- `src/locales/ru/translation.json`, `src/locales/en/translation.json` — new `abbr` object under `tournament.tieBreak` (9 types), `sl_points` full name, ru full-name alignment with the dictionary.
- `src/test/crosstableModel.test.ts` — remove `TIEBREAK_ABBR` describe block; add SL Points tests (distinct points, shared score groups, position ≥ 9, sort interplay).
- `openspec/specs/tournament-crosstable/spec.md` — main spec updated on sync (locale-dependent header abbreviations, SL Points definition).
- No Firestore schema/rules/index changes; no new dependencies.