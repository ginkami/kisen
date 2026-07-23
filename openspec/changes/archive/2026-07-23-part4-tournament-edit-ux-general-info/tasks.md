## 1. Localization

- [x] 1.1 Add `tournament.edit.timeControl.title` key to `src/locales/ru/translation.json` ("Контроль времени").
- [x] 1.2 Add `tournament.edit.timeControl.title` key to `src/locales/en/translation.json` ("Time control").

## 2. Time Control section heading

- [x] 2.1 In `src/components/tournament/TournamentEditForm.tsx`, update `TimeControlSection` to use `t('tournament.edit.timeControl.title')` as its card title.

## 3. Reorganize tab content

- [x] 3.1 Remove `TimeControlSection`, `TieBreaksSection`, and `ScheduleSection` from the General tab render block.
- [x] 3.2 Render `TimeControlSection` and `TieBreaksSection` inside the Settings tab render block, replacing the placeholder card.
- [x] 3.3 Render `ScheduleSection` inside the Schedule tab render block, replacing the placeholder card.
- [x] 3.4 Leave the General tab with only `GeneralInfoSection` and `BindingSection`.

## 4. Verification

- [x] 4.1 Run `npm run build` and confirm it succeeds.
- [x] 4.2 Run `npx vitest run` and confirm all tests pass.
- [x] 4.3 Run `npm run lint` and check for any new errors introduced by these changes (no new errors; remaining errors are pre-existing in other files).
