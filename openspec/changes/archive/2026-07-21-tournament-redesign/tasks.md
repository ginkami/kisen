## 1. Domain schema updates

- [x] 1.1 Remove `isOnline` from `tournamentSchema` and related types.
- [x] 1.2 Make `country` required (`z.string().length(2)`) in `tournamentSchema` and `publishedTournamentSchema`.
- [x] 1.3 Replace `arbiters: z.array(arbiterSchema).default([])` with a single `arbiter: arbiterSchema` containing only localized `familyName` and `givenName`.
- [x] 1.4 Update `Tournament`, `PublishedTournament`, and `DraftTournament` inferred types.

## 2. Service layer updates

- [x] 2.1 Add `detectLocationByIp()` helper to `TournamentService` with fallback to `{ country: 'BY', city: '' }`.
- [x] 2.2 Make `createDraft` async and pre-fill `country` plus `locales.*.location` from IP detection.
- [x] 2.3 Remove `isOnline` from `CreateTournamentInput` and `UpdateTournamentInput`.
- [x] 2.4 Make `country` required (`string`) in service inputs.
- [x] 2.5 Replace `arbiters` with `arbiter` in create/update logic and default values.

## 3. Form hook updates

- [x] 3.1 Remove `isOnline` from `TournamentFormState`.
- [x] 3.2 Make `country` required (`string`) in `TournamentFormState`.
- [x] 3.3 Update `tournamentToFormState` and `formStateToUpdateInput` to match the new shape.
- [x] 3.4 Handle async `createDraft` call in `useTournamentForm`.

## 4. UI updates

- [x] 4.1 Remove the online tournament checkbox and conditional country block from `TournamentEditForm.tsx`.
- [x] 4.2 Make the country select always visible and bound to a non-null value.
- [x] 4.3 Remove the "Arbiters" tab from the tab list and its placeholder panel.

## 5. Localization updates

- [x] 5.1 Remove `tournament.edit.online` from `en/translation.json` and `ru/translation.json`.
- [x] 5.2 Remove `tournament.edit.tabs.arbiters` from both translation files.

## 6. OpenSpec context update

- [x] 6.1 Update `openspec/config.yaml` to remove `isOnline` mentions and reflect `country`/`arbiter` changes.

## 7. Validation and verification

- [x] 7.1 Review `firestore.rules` and `firestore.indexes.json` for impact.
- [x] 7.2 Run `npm run lint` and fix errors.
- [x] 7.3 Run `npm run test:run` and fix failures.
