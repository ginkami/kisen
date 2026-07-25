## 1. i18n — Add new translation keys

- [x] 1.1 Add `program.roundOption` key to `src/locales/ru/translation.json` (value: "Тур")
- [x] 1.2 Add `program.roundOption` key to `src/locales/en/translation.json` (value: "Round")

## 2. ScheduleEventCombobox — Round badge rendering

- [x] 2.1 Add early return in `ScheduleEventCombobox` for `row.kind === 'round'` — render `<span className="badge badge-info">` with `t('tournament.edit.program.round', { n: row.number })` instead of the combobox input
- [x] 2.2 Remove the round→event conversion logic from `handleTextChange` (lines 557–568) — simplify to always update `locales[activeLocale].title`

## 3. ScheduleEventCombobox — Dropdown round option

- [x] 3.1 Change the first dropdown item label from `t('tournament.edit.program.round', { n: nextRoundNumber })` to `t('tournament.edit.program.roundOption')`
- [x] 3.2 Add `bg-info` class to the first dropdown item `<button>` for visual distinction
- [x] 3.3 Remove unused `nextRoundNumber` variable (the number is now only shown in the badge, sourced from `row.number`)

## 4. ScheduleEventCombobox — Fix preset localization

- [x] 4.1 Replace `t()` with `i18n.getFixedT(locale)` in `handleSelectPreset` so each locale slot receives its own correctly localized title
- [x] 4.2 Add `i18n` to the component's destructured hooks (`const { t, i18n } = useTranslation()`)

## 5. Fix: Immediate round renumbering

- [x] 5.1 Add `renumberRounds` helper function in `useTournamentForm.ts` — renumbers all `kind: 'round'` rows sequentially based on their position in the array
- [x] 5.2 Refactor `sortAndRenumber` to use `renumberRounds` internally
- [x] 5.3 Update `updateScheduleRow` to call `renumberRounds` after applying the patch, so round badges show correct numbers immediately (not only after datetime blur)

## 6. Verification

- [x] 6.1 Run `npm run lint` — no new errors (pre-existing warnings only)
- [x] 6.2 Run `npm run test:run` — 39/39 tests pass (App.test.tsx failure is pre-existing)
- [x] 6.3 Manual smoke test: verify round badge renders, dropdown shows "Тур" with `bg-info`, preset selection writes per-locale titles, round numbers recalculate on add/change
