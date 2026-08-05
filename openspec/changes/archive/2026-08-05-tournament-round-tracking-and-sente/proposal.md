## Why

The tournament model needs to track the currently active round (`currentRound`) so the UI and pairing/result logic can reference it, and to support future tie-break/pairing features the tournament must be able to mark whether player piece color ("sente"/first move) is taken into account for game results (`settings.considerSente`). Both fields have already been added to the human-readable schema (`schemas/tournament.jsonс`), but the TypeScript domain schema, service defaults, and the tournament edit form do not yet know about them. This change brings the code in line with the schema and exposes the new `considerSente` toggle in the editor.

## What Changes

- Add `currentRound: number` to the `tournamentSchema` in `src/domain/tournament.ts` (integer, defaults to `0`) and `considerSente: boolean` to `tournamentSettingsSchema` (defaults to `false`). Defaults keep existing Firestore documents valid.
- Initialize `currentRound: 0` in `TournamentService.create` and `TournamentService.createDraft`, and `considerSente: false` in `defaultSettings()` (`src/services/tournamentService.ts`). Firestore repository mappers need no changes (they serialize/deserialize the whole object).
- Add an `updateConsiderSente(value: boolean)` updater to `useTournamentForm` (`src/hooks/useTournamentForm.ts`) and expose it from the hook.
- Add a new "Advanced" (`Дополнительно`) section to the tournament edit form's Settings tab (`src/components/tournament/TournamentEditForm.tsx`) containing a checkbox/toggle "Учитывать цвет в результатах партий" bound to `settings.considerSente`.
- Add i18n keys `tournament.edit.advanced.title` and `tournament.edit.advanced.considerSente` to both `ru` and `en` translations.

## Capabilities

### New Capabilities
<!-- No new capabilities; the change extends existing tournament management. -->

### Modified Capabilities
- `tournament-management`: Adds the `currentRound` field to the tournament entity and the `considerSente` setting to `tournamentSettings`, with persistence and form-editing behavior for `considerSente`.

## Impact

- **Domain**: `src/domain/tournament.ts` — new `currentRound` field on `tournamentSchema`, new `considerSente` field on `tournamentSettingsSchema`.
- **Service**: `src/services/tournamentService.ts` — defaults in `defaultSettings()`, `create()`, `createDraft()`.
- **Hook**: `src/hooks/useTournamentForm.ts` — new `updateConsiderSente` updater; existing settings round-trip already covers both fields.
- **UI**: `src/components/tournament/TournamentEditForm.tsx` — new `AdvancedSettingsSection` component rendered on the Settings tab.
- **i18n**: `src/locales/ru/translation.json`, `src/locales/en/translation.json` — new keys under `tournament.edit.advanced`.
- **No changes** to Firestore rules, repository mappers, or routing. Existing documents remain valid thanks to Zod `.default()`.