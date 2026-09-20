# Tasks

## 1. Optimistic concurrency (core)

- [x] 1.1 `src/domain/tournament.ts`: `revision` in `tournamentSchema` (int, min 0, default 0); `TournamentConflictError`
- [x] 1.2 `firestoreTournamentRepository.ts`: `withDefaultRevision` in `fromFirestore`; `update` via `runTransaction` with revision comparison + increment; `updateMany` bumps revisions without conflict checks; `create` writes revision 0
- [x] 1.3 `tournamentService.ts`: `UpdateTournamentInput.revision` propagated into the updated document; passthrough subscribe/presence methods; repository interface additions
- [x] 1.4 `useTournamentForm.ts`: `revision` in `TournamentFormState`/`tournamentToFormState`/update input; conflict and remote-change states; reload (with clipboard rescue) and force-save flows
- [x] 1.5 `TournamentEditForm.tsx`: conflict banner with reload/force-save actions
- [x] 1.6 `firestore.rules`: revision step check on tournament update

## 2. Realtime awareness and presence

- [x] 2.1 `firestoreTournamentRepository.ts`: `subscribeToTournament` (onSnapshot), `announceEditingSession`/`removeEditingSession`/`subscribeToEditingSessions` on `tournaments/{id}/sessions` with 30 s staleness filter
- [x] 2.2 `useTournamentForm.ts`: document subscription (clean form → silent refresh, dirty form → remote-change flag); 15 s presence heartbeat and cleanup on unmount
- [x] 2.3 `TournamentEditForm.tsx`: «Сейчас редактируют: …» chips (own session excluded)
- [x] 2.4 `firestore.rules`: sessions subcollection — read for authenticated users, write only the own session document

## 3. i18n and tests

- [x] 3.1 i18n ru/en: conflict banner and presence strings
- [x] 3.2 Repository/service tests: transaction conflict + increment, passthrough methods; updated repository mocks
- [x] 3.3 `tsc -b`, `vitest run`, `openspec validate tournament-edit-conflict-safety` pass
