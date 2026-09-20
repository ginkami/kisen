## Why

Tournament edits are currently last-write-wins: two browser tabs or two managers editing the same tournament silently overwrite each other's changes on save (classic lost update), and there is no indication that someone else is editing. The edit form holds the whole tournament (settings, participants, games) in local state with an explicit save.

## What Changes

- **Optimistic concurrency control**: the tournament document gains a monotonic `revision` (0 for new/legacy documents). `tournamentService.update` runs inside a Firestore transaction that compares the loaded revision with the stored one and throws a typed `TournamentConflictError` on mismatch; a successful write increments the revision. The Firestore rule for tournament updates enforces the same revision step, protecting writes that bypass the service.
- **Conflict UX**: when a save hits a conflict (or a remote change is detected while the form is dirty), the edit form shows a banner offering «Перезагрузить» (discards local state, copies the unsaved form state to the clipboard first) or «Сохранить принудительно» (re-saves over the fresh revision, intentionally overwriting).
- **Realtime change awareness**: the edit form subscribes to the tournament document; while the form is clean, remote changes are pulled in silently; while dirty, a non-blocking banner warns about a newer revision.
- **Editing presence**: each open editor announces itself in the `tournaments/{id}/sessions` subcollection (heartbeat every 15 s, cleaned up on unmount, stale after 30 s); the form header lists «Сейчас редактируют: …» (own session excluded).
- The pairing engine and the crosstable computation are not affected (they consume face-value points and saved games).

## Capabilities

### Modified Capabilities
- `tournament-edit-form-ux`: ADDED requirements — optimistic concurrency control with revision/transaction and conflict resolution UI; realtime change awareness; editing presence indicator.

## Impact

- **Affected specs:** `openspec/specs/tournament-edit-form-ux/spec.md`.
- **Affected code:** `src/domain/tournament.ts` (`revision`, `TournamentConflictError`), `src/services/firestoreTournamentRepository.ts` (transaction update, snapshot/presence APIs, legacy revision default), `src/services/repository.ts` (interface), `src/services/tournamentService.ts` (revision propagation, passthroughs), `src/hooks/useTournamentForm.ts` (revision in form state, subscription, conflict/force flows), `src/components/tournament/TournamentEditForm.tsx` (banner, presence chips), `firestore.rules` (revision step, sessions), i18n, tests.
