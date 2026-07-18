## Why

The current `tournament` entity is more complex than needed for the MVP. The boolean `isOnline` flag, nullable `country`, and multi-arbiter array create extra UI branches and validation paths that slow down tournament creation. Simplifying the model to a single required country, a single chief arbiter, and removing the online/offline distinction will streamline both the data model and the editing experience.

## What Changes

- **BREAKING**: Remove `isOnline` field from the tournament entity and all related UI.
- **BREAKING**: Make `country` a required `ISO 3166-1 alpha-2` field (no longer nullable).
- **BREAKING**: Replace the `arbiters: Arbiter[]` array with a single optional `arbiter: ChiefArbiter` object containing only localized `familyName` and `givenName`.
- Add IP-based default detection for `country` and `locales.*.location` when a new tournament draft is created.
- Remove the "Arbiters" tab from the tournament edit form (the chief arbiter will be edited in a future iteration, not in this change).
- Update Zod schemas, service layer, form hook, UI component, i18n files, and OpenSpec context to reflect the simplified model.

## Capabilities

### New Capabilities
- `ip-location-detection`: Detect the user's country and city from their IP address when creating a tournament draft, used to pre-fill defaults.

### Modified Capabilities
- `tournament-management`: Requirements for the tournament entity and editing form change: remove online flag, require country, replace arbiter list with a single chief arbiter.

## Impact

- `src/domain/tournament.ts` — schema changes for `isOnline`, `country`, `arbiters` → `arbiter`.
- `src/services/tournamentService.ts` — IP detection helper and updated create/update logic.
- `src/hooks/useTournamentForm.ts` — updated form state shape and draft creation handling.
- `src/components/tournament/TournamentEditForm.tsx` — removed online checkbox and Arbiters tab.
- `src/locales/en/translation.json` and `ru/translation.json` — removed obsolete keys.
- `openspec/config.yaml` — updated project context where tournament fields are mentioned.
- `firestore.rules` / `firestore.indexes.json` — reviewed, no index/rule changes required.

## Non-goals

- No changes to tournament statuses, publishing rules, or Firestore security logic.
- No new backend functions or Cloud Functions.
- No full implementation of the chief arbiter editor UI in this change (the field is introduced in the schema only).
