## Why

The tournament edit form's "Settings" tab has two gaps. First, the tie-breaks section prevents adding multiple "Buchholz cut" entries with different `cutCount` values — a legitimate tournament-ranking scenario. Second, new tournament drafts default to an "absolute" time control and a single "points" tie-break, which does not match typical shogi tournament conventions (byoyomi time control and a standard three-item tie-break sequence).

## What Changes

- **Tie-breaks UX — multiple `buchholz_cut` entries:** The `TieBreaksSection` component and the `addTieBreak` handler SHALL allow adding multiple `buchholz_cut` tie-breaks, each with its own `cutCount`. A numeric input for `cutCount` SHALL appear when `buchholz_cut` is selected. Other tie-break types SHALL remain unique (one instance per type).
- **Default time control on draft creation:** `TournamentService.createDraft` SHALL initialize `settings.timeControl` to a `byoyomi` time control (with `mainTime: 0`, `byoyomiTime: 0`, `byoyomiPeriods: 1`) instead of the current `absolute` default.
- **Default tie-breaks on draft creation:** `TournamentService.createDraft` SHALL initialize `settings.tieBreaks` to `[{ type: 'points' }, { type: 'buchholz' }, { type: 'sonneborn_berger' }]` instead of the current single-element `[{ type: 'points' }]`.
- **i18n:** A new `tournament.edit.tieBreaks.cutCount` translation key SHALL be added to both `en` and `ru` locale files.

## Capabilities

### New Capabilities

_(none — all changes modify existing capabilities)_

### Modified Capabilities

- `tournament-edit-form-ux`: The tie-breaks section requirements are extended to support multiple `buchholz_cut` entries with configurable `cutCount` and to reflect the new default tie-break sequence and byoyomi time control on draft creation.

## Impact

- **Affected code:**
  - `src/components/tournament/TournamentEditForm.tsx` — `TieBreaksSection` component (filter logic, `cutCount` input, key strategy).
  - `src/hooks/useTournamentForm.ts` — `addTieBreak` callback signature and logic.
  - `src/services/tournamentService.ts` — `defaultSettings()` function.
  - `src/locales/en/translation.json`, `src/locales/ru/translation.json` — new `cutCount` key.
- **Domain schemas:** No changes to Zod schemas in `src/domain/` — `tieBreaksSchema` already supports multiple `buchholz_cut` entries with `cutCount`.
- **Firestore:** No changes to `firestore.rules` or `firestore.indexes.json` — this change only affects default values and UI behavior.
- **Tests:** New test file `src/services/tournamentService.test.ts` covering `createDraft` defaults; existing tests unaffected.