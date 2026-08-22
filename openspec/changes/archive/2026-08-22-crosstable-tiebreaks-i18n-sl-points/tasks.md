## 1. Domain schema

- [x] 1.1 `src/domain/tieBreak.ts`: add `'sl_points'` to `tieBreakTypeSchema` and `baseTieBreakSchema.extend({ type: z.literal('sl_points') })` to `tieBreakSchema`
- [x] 1.2 `schemas/tieBreak.ts` (documentation mirror): add `'sl_points' // СЛ Баллы (SL Pts)` to `TieBreakType`

## 2. SL Points calculation

- [x] 2.1 `src/components/tournament/crosstable/crosstableModel.ts`: add `SL_POINTS_BY_POSITION = [55, 34, 21, 13, 8, 5, 3, 2]` (index 8+ → 1) and a pure helper `buildSlPointsByPointsValue(pointsMap): Map<number, number>` — distinct points values sorted descending, 1-based index = group position, map through the constant
- [x] 2.2 `computeStandings`: initialize `sl_points: 0` in `tieBreakValues`; build the SL map once (only when `sl_points` is configured); `case 'sl_points'` assigns the group value from the map; keep the existing sort chain untouched

## 3. Locale-dependent abbreviations

- [x] 3.1 `src/locales/ru/translation.json`: add nested `abbr` object under `tournament.tieBreak` — «Очки», «Бухг.», «УБ», «МБ», «Бухг.+», «Берг.», «ЛВ», «ЧВ», «СЛБ»; add `sl_points` full name «СЛ Баллы»; align ru full names with the dictionary («Бухгольц усеченный», «Бухгольц медианный», «Бергер», «Личная встреча», «Число побед»)
- [x] 3.2 `src/locales/en/translation.json`: add the `abbr` object — "Pts", "BH", "BHC", "MCH", "BH+", "SB", "DE", "WIN", "SL Pts"; add `sl_points` full name "SL Points"
- [x] 3.3 `src/components/tournament/CrosstableSection.tsx`: header renders `t(`tournament.tieBreak.abbr.${tb.type}`)` for non-points columns, with `${cutCount}` suffix for `buchholz_cut`; remove the `TIEBREAK_ABBR` import
- [x] 3.4 `src/components/tournament/crosstable/crosstableModel.ts`: remove the `TIEBREAK_ABBR` export

## 4. Tests

- [x] 4.1 `src/test/crosstableModel.test.ts`: remove the `TIEBREAK_ABBR` describe block and its import
- [x] 4.2 Add SL Points tests: five participants with distinct points → 55/34/21/13/8; shared score group at the top → both 55, next group at position 3 → 21; score-group position ≥ 9 → 1
- [x] 4.3 Add sort-interplay test: `tieBreaks = [points, sl_points]` never contradicts points ordering; equal SL within a group falls through to the next tie-break

## 5. Verification

- [x] 5.1 Run `npx vitest run src/test/crosstableModel.test.ts` — all tests green
- [x] 5.2 Run type check (`npx tsc --noEmit` or project build) — exhaustive `Record<TieBreakType, ...>` and i18n keys compile
- [x] 5.3 Manual check: Settings tab dropdown lists «СЛ Баллы» / "SL Points"; crosstable headers show localized abbreviations («Бухг.»/«УБ1»/«СЛБ» in ru; "BH"/"BHC1"/"SL Pts" in en) with full-name tooltips

## 7. Bugfix: SL Points group position (post-QA)

- [x] 7.1 `crosstableModel.ts` `buildSlPointsByPointsValue`: group position = cumulative participants count through the group end (last member), not the first occurrence index
- [x] 7.2 Update SL Points tests (group-end example 2/1/1/1/0/0 → 55/13/13/13/5/5; all-tied-10 → position 10 → 1; exact values in monotonicity test)
- [x] 7.3 Update delta spec + design + proposal wording (group end position semantics, new scenario)
- [x] 7.4 Re-run vitest (94/94 green) + tsc (clean)

## 6. Docs

- [ ] 6.1 Mark tasks complete and archive the change via /opsx:archive after user acceptance