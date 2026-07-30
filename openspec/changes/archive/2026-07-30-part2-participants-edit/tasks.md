## 1. Participant validation

- [x] 1.1 In `src/hooks/useTournamentForm.ts`, add participant name validation to `validateTournamentPublishForm`: each participant must have at least one locale with non-empty trimmed `familyName` and `givenName`; if any fails → `errors.participants = 'required'`.
- [x] 1.2 In `src/components/tournament/ParticipantRow.tsx`, add `*` markers to `familyName` and `givenName` labels; add `validationErrors?: Record<string, string>` prop and apply `input-error` class to inputs when `validationErrors.participants` is set.
- [x] 1.3 In `src/components/tournament/ParticipantsSection.tsx`, accept and forward `validationErrors` to each `ParticipantRow`.
- [x] 1.4 In `src/components/tournament/TournamentEditForm.tsx`, pass `validationErrors` to `ParticipantsSection`.

## 2. Role-based player-linking visibility

- [x] 2.1 In `src/components/tournament/ParticipantRow.tsx`, add `canLinkPlayers: boolean` prop; when `false`, hide the player-link controls row and the familyName autocomplete popover.
- [x] 2.2 In `src/components/tournament/ParticipantsSection.tsx`, accept and forward `canLinkPlayers` to each `ParticipantRow`.
- [x] 2.3 In `src/components/tournament/TournamentEditForm.tsx`, compute `canLinkPlayers = user?.role === 'admin' || user?.role === 'manager'` and pass it to `ParticipantsSection`.

## 3. Verification

- [x] 3.1 Run `npx tsc -b --noEmit` and resolve any type errors.
