## 1. Domain schema updates

- [ ] 1.1 Remove `isOnline` from `tournamentSchema` and related types.
- [ ] 1.2 Make `country` required (`z.string().length(2)`) in `tournamentSchema` and `publishedTournamentSchema`.
- [ ] 1.3 Replace `arbiters: z.array(arbiterSchema).default([])` with a single `arbiter: arbiterSchema` containing only localized `familyName` and `givenName`.
- [ ] 1.4 Update `Tournament`, `PublishedTournament`, and `DraftTournament` inferred types.

## 2. Service layer updates

- [ ] 2.1 Add `detectLocationByIp()` helper to `TournamentService` with fallback to `{ country: 'BY', city: '' }`.
- [ ] 2.2 Make `createDraft` async and pre-fill `country` plus `locales.*.location` from IP detection.
- [ ] 2.3 Remove `isOnline` from `CreateTournamentInput` and `UpdateTournamentInput`.
- [ ] 2.4 Make `country` required (`string`) in service inputs.
- [ ] 2.5 Replace `arbiters` with `arbiter` in create/update logic and default values.

## 3. Form hook updates

- [ ] 3.1 Remove `isOnline` from `TournamentFormState`.
- [ ] 3.2 Make `country` required (`string`) in `TournamentFormState`.
- [ ] 3.3 Update `tournamentToFormState` and `formStateToUpdateInput` to match the new shape.
- [ ] 3.4 Handle async `createDraft` call in `useTournamentForm`.

## 4. UI updates

- [ ] 4.1 Remove the online tournament checkbox and conditional country block from `TournamentEditForm.tsx`.
- [ ] 4.2 Make the country select always visible and bound to a non-null value.
- [ ] 4.3 Remove the "Arbiters" tab from the tab list and its placeholder panel.

## 5. Localization updates

- [ ] 5.1 Remove `tournament.edit.online` from `en/translation.json` and `ru/translation.json`.
- [ ] 5.2 Remove `tournament.edit.tabs.arbiters` from both translation files.

## 6. OpenSpec context update

- [ ] 6.1 Update `openspec/config.yaml` to remove `isOnline` mentions and reflect `country`/`arbiter` changes.

## 7. Validation and verification

- [ ] 7.1 Review `firestore.rules` and `firestore.indexes.json` for impact.
- [ ] 7.2 Run `npm run lint` and fix errors.
- [ ] 7.3 Run `npm run test:run` and fix failures.
